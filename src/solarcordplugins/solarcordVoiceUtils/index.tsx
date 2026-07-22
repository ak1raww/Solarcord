/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { SolarcordDevs } from "@utils/constants";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import type { Channel, User } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import {
    FluxDispatcher,
    GuildChannelStore,
    Menu,
    PermissionsBits,
    PermissionStore,
    React,
    RestAPI,
    UserStore,
} from "@webpack/common";

const VoiceStateStore = findStoreLazy("VoiceStateStore");

// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------

const settings = definePluginSettings({
    includeYourself: {
        type: OptionType.BOOLEAN,
        description: "Automatically include yourself in every action, without having to select yourself.",
        default: true,
    },
    maxApiCallsPerAction: {
        type: OptionType.SLIDER,
        description: "Max users per action (Default: 10)",
        default: 10,
        markers: makeRange(1, 20),
    },
});

// ---------------------------------------------------------------------
// Selection store
// ---------------------------------------------------------------------

const selected = new Set<string>();
const listeners = new Set<() => void>();

function emitChange() {
    listeners.forEach(l => l());
}

export const SelectionStore = {
    get(): ReadonlySet<string> {
        return selected;
    },
    has(id: string) {
        return selected.has(id);
    },
    toggle(id: string) {
        if (selected.has(id)) selected.delete(id);
        else selected.add(id);
        emitChange();
        applyHighlights();
    },
    clear() {
        if (selected.size === 0) return;
        selected.clear();
        emitChange();
        applyHighlights();
    },
    subscribe(cb: () => void) {
        listeners.add(cb);
        return () => listeners.delete(cb);
    },
};

// ---------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------

const HIGHLIGHT_CLASS = "solar-voiceutils-selected";
const STYLE_ID = "solar-voiceutils-style";

function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        [class*="voiceUser"].${HIGHLIGHT_CLASS},
        [class*="userVoiceState"].${HIGHLIGHT_CLASS},
        [class*="peopleListItem"].${HIGHLIGHT_CLASS} {
            background-color: rgba(255, 0, 0, 0.4) !important;
            border-radius: 4px !important;
            outline: 2px solid #ff0000 !important;
            outline-offset: -1px !important;
        }
    `;
    document.head.appendChild(style);
}

// Helper per dividere gli array in chunk
function chunkArray<T>(arr: T[], size: number): T[][] {
    if (size <= 0) return [arr];
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

function removeStyle() {
    document.getElementById(STYLE_ID)?.remove();
}

function getFiber(node: Element): any {
    const key = Object.keys(node).find(
        k => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")
    );
    return key ? (node as any)[key] : null;
}

function getUserIdFromNode(node: Element | null): string | null {
    if (!node) return null;
    let fiber = getFiber(node);
    for (let i = 0; i < 30 && fiber; i++) {
        const props = fiber.memoizedProps;
        if (props?.user?.id) return props.user.id;
        if (fiber.stateNode?.props?.user?.id) return fiber.stateNode.props.user.id;
        fiber = fiber.return;
    }
    return null;
}

function getChannelFromNode(node: Element | null): Channel | null {
    if (!node) return null;
    let fiber = getFiber(node);
    for (let i = 0; i < 30 && fiber; i++) {
        const props = fiber.memoizedProps;
        if (props?.channel) return props.channel;
        if (fiber.stateNode?.props?.channel) return fiber.stateNode.props.channel;
        fiber = fiber.return;
    }
    return null;
}

function getChannelIdFromNode(node: Element | null): string | null {
    return getChannelFromNode(node)?.id || null;
}

function getGuildIdFromNode(node: Element | null): string | null {
    if (!node) return null;
    let fiber = getFiber(node);
    for (let i = 0; i < 30 && fiber; i++) {
        const props = fiber.memoizedProps;
        if (props?.guildId) return props.guildId;
        if (props?.channel?.guild_id) return props.channel.guild_id;
        if (fiber.stateNode?.props?.guildId) return fiber.stateNode.props.guildId;
        fiber = fiber.return;
    }
    return null;
}

function findVoiceUserRow(target: Element | null): HTMLElement | null {
    if (!target) return null;
    const selectors = [
        '[class*="voiceUser_"]',
        '[class*="voiceUser__"]',
        '[class*="userVoiceState"]',
        '[class*="peopleListItem"]',
        '[class*="voiceUser"]',
    ];
    for (const sel of selectors) {
        const row = target.closest(sel);
        if (row) return row as HTMLElement;
    }
    return null;
}

function findVoiceChannel(target: Element | null): HTMLElement | null {
    if (!target) return null;
    const channelEl = target.closest('[class*="containerDefault_"]') || target.closest('[class*="containerDefault__"]');
    if (!channelEl) return null;

    const channel = getChannelFromNode(channelEl);
    if (channel && (channel.type === 2 || channel.type === 13)) {
        return channelEl as HTMLElement;
    }
    return null;
}

function applyHighlights() {
    const candidates = document.querySelectorAll(
        '[class*="voiceUser"], [class*="userVoiceState"], [class*="peopleListItem"]'
    );
    candidates.forEach(el => {
        const id = getUserIdFromNode(el);
        if (id && SelectionStore.has(id)) el.classList.add(HIGHLIGHT_CLASS);
        else el.classList.remove(HIGHLIGHT_CLASS);
    });
}

function clearChannelOutlines() {
    document.querySelectorAll('[class*="containerDefault_"], [class*="containerDefault__"]').forEach(el => {
        (el as HTMLElement).style.outline = "";
        (el as HTMLElement).style.outlineOffset = "";
    });
}

let mutationObserver: MutationObserver | null = null;

function startObserving() {
    mutationObserver = new MutationObserver(() => applyHighlights());
    mutationObserver.observe(document.body, { childList: true, subtree: true });
}

function stopObserving() {
    mutationObserver?.disconnect();
    mutationObserver = null;
}

// ---------------------------------------------------------------------
// Selection events
// ---------------------------------------------------------------------

function onGlobalMouseDown(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const row = findVoiceUserRow(target);

    if (!row) {
        if (SelectionStore.get().size > 0 && !target.closest('[class*="contextMenu_"], [role="menu"], [role="menuitem"]')) {
            SelectionStore.clear();
        }
        return;
    }

    if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        const userId = getUserIdFromNode(row);
        if (userId) SelectionStore.toggle(userId);
    }
}

function onGlobalClick(e: MouseEvent) {
    if (!e.ctrlKey) return;
    const row = findVoiceUserRow(e.target as HTMLElement);
    if (row) {
        e.preventDefault();
        e.stopPropagation();
    }
}

function onGlobalKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") SelectionStore.clear();
}

let lastGuildId: string | null = null;

function onChannelSelect({ guildId }: { guildId: string | null; }) {
    if (guildId !== lastGuildId) {
        lastGuildId = guildId;
        SelectionStore.clear();
    }
}

// ---------------------------------------------------------------------
// Drag & Drop visual tracking
// ---------------------------------------------------------------------

let dragData: string[] | null = null;
let dragSourceGuildId: string | null = null;

function onDragStart(e: DragEvent) {
    const target = e.target as HTMLElement;
    const row = findVoiceUserRow(target);
    if (!row) return;

    const selectedIds = Array.from(SelectionStore.get());
    if (selectedIds.length === 0) return;

    dragData = selectedIds;
    const guildId = getGuildIdFromNode(row);
    if (guildId) dragSourceGuildId = guildId;

    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", JSON.stringify(selectedIds));

        const ghost = document.createElement("div");
        ghost.textContent = `Moving ${selectedIds.length} user${selectedIds.length > 1 ? "s" : ""}`;
        ghost.style.cssText = "position:fixed; background:#2b2d31; color:white; padding:6px 12px; border-radius:4px; font-size:14px; pointer-events:none; z-index:9999;";
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 0);
        setTimeout(() => ghost.remove(), 0);
    }
}

function onDragOver(e: DragEvent) {
    if (!dragData) return;
    const target = e.target as HTMLElement;
    const channel = findVoiceChannel(target);
    clearChannelOutlines();
    if (channel) {
        channel.style.outline = "2px solid var(--brand-experiment)";
        channel.style.outlineOffset = "-2px";
    }
}

function onDragLeave(e: DragEvent) {
    if (!dragData) return;
    const target = e.target as HTMLElement;
    const channel = findVoiceChannel(target);
    if (channel) {
        channel.style.outline = "";
        channel.style.outlineOffset = "";
    }
}

function onDragEnd(e: DragEvent) {
    dragData = null;
    dragSourceGuildId = null;
    clearChannelOutlines();
}

// ---------------------------------------------------------------------
// Global cooldown & bulk action helper
// ---------------------------------------------------------------------

let cooldownPromise: Promise<void> = Promise.resolve();

function waitForCooldown(): Promise<void> {
    return cooldownPromise;
}

function startCooldown(): void {
    let resolve: () => void;
    cooldownPromise = new Promise<void>(r => { resolve = r; });
    setTimeout(() => resolve(), 2000);
}

/**
 * Process users in chunks with a global 2-second cooldown between chunks (actions).
 * Requests within a single chunk are processed sequentially with no delay.
 */
async function performBulkAction(
    guildId: string,
    body: Record<string, any>,
    userIds: string[],
    maxCalls: number
): Promise<void> {
    const limit = Math.min(15, Math.max(1, maxCalls));
    const chunks = chunkArray(userIds, limit);

    for (const chunk of chunks) {
        // Wait for any active cooldown
        await waitForCooldown();

        for (const userId of chunk) {
            try {
                await RestAPI.patch({
                    url: `/guilds/${guildId}/members/${userId}`,
                    body,
                    _bypassStaffer: true,
                } as any);
            } catch (error) {
                console.error(`[SolarVoiceUtils] Action failed for user ${userId}`, error);
            }
        }

        // Trigger the cooldown after the chunk action is complete
        startCooldown();
    }
}

// ---------------------------------------------------------------------
// Sequential Move Operations (used by drag & drop)
// ---------------------------------------------------------------------

async function moveUsers(guildId: string, userIds: string[], targetChannelId: string | null, limit: number) {
    await performBulkAction(guildId, { channel_id: targetChannelId }, userIds, limit);
}

// ---------------------------------------------------------------------
// Bulk action helper for the context menu
// ---------------------------------------------------------------------

function getTargetUserIds(): string[] {
    const ids = Array.from(SelectionStore.get());
    if (settings.store.includeYourself) {
        const myId = UserStore.getCurrentUser().id;
        if (!ids.includes(myId)) ids.push(myId);
    }
    return ids;
}

function sendPatch(guildId: string, body: Record<string, any>) {
    const userIds = getTargetUserIds();
    if (userIds.length === 0) return;

    const max = settings.store.maxApiCallsPerAction;
    performBulkAction(guildId, body, userIds, max);
}

// ---------------------------------------------------------------------
// API Interception
// ---------------------------------------------------------------------

let originalPatch: any = null;

function patchRestAPI() {
    originalPatch = RestAPI.patch;
    RestAPI.patch = function (options: any) {
        if (options && !options._bypassStaffer && typeof options.url === "string") {
            const match = options.url.match(/^\/guilds\/(\d+)\/members\/(\d+)$/);
            if (match && options.body && "channel_id" in options.body) {
                const guildId = match[1];
                const draggedUserId = match[2];
                const targetChannelId = options.body.channel_id;

                if (SelectionStore.has(draggedUserId)) {
                    const selectedIds = Array.from(SelectionStore.get());
                    const otherUserIds = selectedIds.filter(id => id !== draggedUserId);

                    if (settings.store.includeYourself) {
                        const myId = UserStore.getCurrentUser().id;
                        if (!selectedIds.includes(myId) && myId !== draggedUserId) {
                            otherUserIds.push(myId);
                        }
                    }

                    const maxCalls = settings.store.maxApiCallsPerAction;
                    // The dragged user consumes one API call, so leave room for (maxCalls - 1) more
                    const remainingSlots = Math.max(0, maxCalls - 1);
                    const firstChunk = otherUserIds.slice(0, remainingSlots);
                    const remainingChunks = otherUserIds.slice(remainingSlots);

                    // Call the original patch for the dragged user first,
                    // then move the rest of the group with cooldown management.
                    const originalResult = originalPatch.apply(this, arguments);
                    originalResult.then(async () => {
                        if (firstChunk.length > 0) {
                            await moveUsers(guildId, firstChunk, targetChannelId, remainingSlots);
                        }
                        if (remainingChunks.length > 0) {
                            await moveUsers(guildId, remainingChunks, targetChannelId, maxCalls);
                        }
                    }).then(() => {
                        SelectionStore.clear();
                    });
                    return originalResult;
                }
            }
        }
        return originalPatch.apply(this, arguments);
    };
}

function unpatchRestAPI() {
    if (originalPatch) {
        RestAPI.patch = originalPatch;
        originalPatch = null;
    }
}

// ---------------------------------------------------------------------
// Context menu – user-context
// ---------------------------------------------------------------------

interface UserContextProps {
    user: User;
    guildId?: string;
}

const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user, guildId }: UserContextProps) => {
    if (!guildId || !user) return;
    const selectedCount = SelectionStore.get().size;
    if (selectedCount === 0 || !SelectionStore.has(user.id)) return;

    const guildChannels = GuildChannelStore.getChannels(guildId);
    const voiceChannels = guildChannels.VOCAL
        .map(({ channel }) => channel)
        .filter(ch =>
            PermissionStore.can(PermissionsBits.VIEW_CHANNEL, ch) &&
            PermissionStore.can(PermissionsBits.CONNECT, ch)
        );

    const menuItems: any[] = [];

    if (voiceChannels.length > 0) {
        const moveItems = voiceChannels.map(vc => (
            <Menu.MenuItem
                key={vc.id}
                id={vc.id}
                label={vc.name}
                action={() => sendPatch(guildId, { channel_id: vc.id })}
            />
        ));
        menuItems.push(
            <Menu.MenuItem label="Move" key="solar-voiceutils-move" id="solar-voiceutils-move">
                {moveItems}
            </Menu.MenuItem>
        );
    }

    menuItems.push(
        <Menu.MenuItem key="solar-voiceutils-mute" id="solar-voiceutils-mute" label="Mute" action={() => sendPatch(guildId, { mute: true })} />,
        <Menu.MenuItem key="solar-voiceutils-unmute" id="solar-voiceutils-unmute" label="Unmute" action={() => sendPatch(guildId, { mute: false })} />,
        <Menu.MenuItem key="solar-voiceutils-deafen" id="solar-voiceutils-deafen" label="Deafen" action={() => sendPatch(guildId, { deaf: true })} />,
        <Menu.MenuItem key="solar-voiceutils-undeafen" id="solar-voiceutils-undeafen" label="Undeafen" action={() => sendPatch(guildId, { deaf: false })} />,
        <Menu.MenuItem key="solar-voiceutils-disconnect" id="solar-voiceutils-disconnect" label="Disconnect" action={() => sendPatch(guildId, { channel_id: null })} />
    );

    children.splice(
        -1,
        0,
        (<Menu.MenuItem label={`SolarVoiceUtils (${selectedCount})`} key="solar-voiceutils" id="solar-voiceutils">
            {menuItems}
        </Menu.MenuItem>) as any
    );
};

// ---------------------------------------------------------------------
// Context menu – channel-context
// ---------------------------------------------------------------------

interface VoiceChannelContextProps {
    channel: Channel;
}

const VoiceChannelContextPatch: NavContextMenuPatchCallback = (children, { channel }: VoiceChannelContextProps) => {
    // Solo per canali vocali e stage
    if (!channel || (channel.type !== 2 && channel.type !== 13)) return;

    const myId = UserStore.getCurrentUser().id;
    const voiceStatesObj = VoiceStateStore.getVoiceStatesForChannel(channel.id) || {};
    const voiceStates = Object.values(voiceStatesObj) as any[];

    // Escludi se stessi dalla lista degli utenti target
    const otherUsers = voiceStates.filter(vs => vs.userId !== myId);
    if (otherUsers.length === 0) return;

    // Determina se c'è almeno un utente non mutato lato server
    const hasUnmuted = otherUsers.some(vs => !vs.mute);

    const label = hasUnmuted ? "PANIC BUTTON" : "UNMUTE ALL";
    const targetMuteState = hasUnmuted; // se ce ne sono di non mutati, muta tutti (true), altrimenti smuta (false)

    const handleAction = () => {
        const otherUserIds = otherUsers.map(vs => vs.userId);
        if (otherUserIds.length === 0) return;

        const max = settings.store.maxApiCallsPerAction;
        performBulkAction(channel.guild_id, { mute: targetMuteState }, otherUserIds, max);
    };

    // Aggiunge solo ed esclusivamente il sottomenu SolarVoiceUtils contenente il Panic Button
    children.splice(
        -1,
        0,
        (<Menu.MenuItem label="SolarVoiceUtils" key="solar-voiceutils" id="solar-voiceutils">
            <Menu.MenuItem
                key="solar-voiceutils-panic"
                id="solar-voiceutils-panic"
                label={label}
                action={handleAction}
                color={hasUnmuted ? "danger" : undefined}
            />
        </Menu.MenuItem>) as any
    );
};

// ---------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------

export default definePlugin({
    name: "SolarVoiceUtils",
    description: "TeamSpeak-style multi-user selection to Discord voice channels, letting you Ctrl+Click multiple users and perform bulk actions (move, mute, deafen, disconnect) via context menu or drag‑and‑drop, with built‑in cooldown and request chunking.",
    category: "Voice",
    authors: [SolarcordDevs.yiiky_],

    settings,

    contextMenus: {
        "user-context": UserContextMenuPatch,
        "channel-context": VoiceChannelContextPatch,
    },

    start() {
        injectStyle();
        applyHighlights();
        startObserving();
        patchRestAPI();

        window.addEventListener("mousedown", onGlobalMouseDown, true);
        window.addEventListener("click", onGlobalClick, true);
        window.addEventListener("keydown", onGlobalKeyDown, true);
        FluxDispatcher.subscribe("CHANNEL_SELECT", onChannelSelect);

        window.addEventListener("dragstart", onDragStart, true);
        window.addEventListener("dragover", onDragOver, true);
        window.addEventListener("dragleave", onDragLeave, true);
        window.addEventListener("dragend", onDragEnd, true);
    },

    stop() {
        window.removeEventListener("mousedown", onGlobalMouseDown, true);
        window.removeEventListener("click", onGlobalClick, true);
        window.removeEventListener("keydown", onGlobalKeyDown, true);
        FluxDispatcher.unsubscribe("CHANNEL_SELECT", onChannelSelect);

        window.removeEventListener("dragstart", onDragStart, true);
        window.removeEventListener("dragover", onDragOver, true);
        window.removeEventListener("dragleave", onDragLeave, true);
        window.removeEventListener("dragend", onDragEnd, true);

        unpatchRestAPI();
        stopObserving();
        removeStyle();
        SelectionStore.clear();
        dragData = null;
        dragSourceGuildId = null;
    },
});
