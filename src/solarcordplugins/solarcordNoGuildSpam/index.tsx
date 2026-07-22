/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    findGroupChildrenByChildId,
    NavContextMenuPatchCallback
} from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { CogWheel } from "@components/Icons";
import { SolarcordDevs } from "@utils/constants";
import {
    ModalCloseButton as ModalCloseButton_,
    ModalContent as ModalContent_,
    ModalHeader as ModalHeader_,
    ModalRoot as ModalRoot_,
    ModalSize,
    openModal
} from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Guild } from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy, findStoreLazy, mapMangledModuleLazy } from "@webpack";
import {
    Button,
    ChannelStore,
    Checkbox,
    GuildStore,
    IconUtils,
    Menu,
    NavigationRouter,
    ScrollerThin,
    showToast,
    Toasts,
    useMemo,
    UserStore,
    useStateFromStores
} from "@webpack/common";
import type { ComponentType, CSSProperties, ReactNode } from "react";

const ModalRoot = ModalRoot_ as ComponentType<{ transitionState?: number; size?: string; children?: ReactNode }>;
const ModalHeader = ModalHeader_ as ComponentType<{ separator?: boolean; children?: ReactNode }>;
const ModalCloseButton = ModalCloseButton_ as ComponentType<{ onClick?: () => void }>;
const ModalContent = ModalContent_ as ComponentType<{ style?: CSSProperties; children?: ReactNode }>;

const { updateGuildNotificationSettings } = findByPropsLazy("updateGuildNotificationSettings");
const { toggleShowAllChannels } = mapMangledModuleLazy(".onboardExistingMember(", {
    toggleShowAllChannels: m => {
        const s = String(m);
        return s.length < 100 && !s.includes("onboardExistingMember") && !s.includes("getOptedInChannels");
    }
});
const isOptInEnabledForGuild = findByCodeLazy(".COMMUNITY)||", ".isOptInEnabled(");
const CollapsedVoiceChannelStore = findStoreLazy("CollapsedVoiceChannelStore");
const collapsedChannels = findByPropsLazy("toggleCollapseGuild");

function OpenBlacklistModalButton() {
    return (
        <Button
            size={Button.Sizes.SMALL}
            color={Button.Colors.BRAND}
            onClick={openBlacklistModal}
        >
            Server Notification Blacklist
        </Button>
    );
}

function ApplyToAllButton() {
    return (
        <Button
            size={Button.Sizes.SMALL}
            color={Button.Colors.GREEN}
            onClick={() => {
                const count = applyToAllGuilds();
                showToast(`Settings applied to ${count} servers.`, Toasts.Type.SUCCESS);
            }}
        >
            Apply Guild Settings To All Servers
        </Button>
    );
}

const settings = definePluginSettings({
    guild: {
        description: "Mute server automatically.",
        type: OptionType.BOOLEAN,
        default: true
    },
    messages: {
        description: "Server notification settings.",
        type: OptionType.SELECT,
        options: [
            { label: "All messages", value: 0 },
            { label: "Only @mentions", value: 1 },
            { label: "Nothing", value: 2 },
            { label: "Server default", value: 3, default: true }
        ]
    },
    everyone: {
        description: "Suppress @everyone and @here.",
        type: OptionType.BOOLEAN,
        default: true
    },
    role: {
        description: "Suppress all role @mentions.",
        type: OptionType.BOOLEAN,
        default: true
    },
    highlights: {
        description: "Suppress highlights automatically.",
        type: OptionType.BOOLEAN,
        default: true
    },
    events: {
        description: "Mute scheduled events automatically.",
        type: OptionType.BOOLEAN,
        default: true
    },
    showAllChannels: {
        description: "Show all channels automatically.",
        type: OptionType.BOOLEAN,
        default: true
    },
    mobilePush: {
        description: "Mute mobile push notifications automatically.",
        type: OptionType.BOOLEAN,
        default: true
    },
    voiceChannels: {
        description: "Hide names in voice channels automatically.",
        type: OptionType.BOOLEAN,
        default: false
    },
    blacklistButton: {
        description: "Manage the blacklist of explicitly muted servers.",
        type: OptionType.COMPONENT,
        component: OpenBlacklistModalButton
    },
    applyAllButton: {
        description: "Apply current settings to all servers (excluding blacklisted ones).",
        type: OptionType.COMPONENT,
        component: ApplyToAllButton
    }
}).withPrivateSettings<{ blacklist: Record<string, boolean> }>();

const SETTINGS_KEYS: (keyof typeof settings.plain)[] = ["blacklist"];

function isGuildBlacklisted(guildId: string): boolean {
    if (!guildId || !settings.store.blacklist) return false;
    return Boolean(settings.store.blacklist[guildId]);
}

function applyBlacklistSettings(guildId: string) {
    if (!guildId || guildId === "@me") return;

    updateGuildNotificationSettings(guildId, {
        muted: true,
        mobile_push: false,
        suppress_everyone: true,
        suppress_roles: true,
        mute_scheduled_events: true,
        notify_highlights: 0,
        message_notifications: 2
    });
}

function applyVoiceNameHidingToGuild(guildId: string) {
    if (!settings.store.voiceChannels || !CollapsedVoiceChannelStore || !collapsedChannels) return;

    try {
        const channelIds = ChannelStore.getChannelIds(guildId);
        if (!channelIds) return;

        channelIds.filter(channelId => {
            const channel = ChannelStore.getChannel(channelId);
            return channel?.isGuildVocal() && !CollapsedVoiceChannelStore.isCollapsed(channelId);
        }).forEach(id => collapsedChannels.update?.(id));
    } catch {
        // Safe fallback in case voice channels update fails
    }
}

function applyDefaultSettings(guildId: string | null) {
    if (guildId === "@me" || guildId === "null" || guildId == null) return;

    if (isGuildBlacklisted(guildId)) {
        applyBlacklistSettings(guildId);
        return;
    }

    updateGuildNotificationSettings(guildId, {
        muted: settings.store.guild,
        mobile_push: !settings.store.mobilePush,
        suppress_everyone: settings.store.everyone,
        suppress_roles: settings.store.role,
        mute_scheduled_events: settings.store.events,
        notify_highlights: settings.store.highlights ? 1 : 0
    });

    if (settings.store.messages !== 3) {
        updateGuildNotificationSettings(guildId, {
            message_notifications: settings.store.messages
        });
    }

    if (settings.store.showAllChannels && isOptInEnabledForGuild) {
        try {
            if (isOptInEnabledForGuild(guildId)) {
                toggleShowAllChannels?.(guildId);
            }
        } catch {
            // Opt-in toggle fallback
        }
    }

    if (settings.store.voiceChannels) {
        applyVoiceNameHidingToGuild(guildId);
    }
}

function toggleGuildBlacklist(guildId: string, enabled: boolean) {
    const blacklist = { ...(settings.store.blacklist ?? {}) };

    if (enabled) {
        blacklist[guildId] = true;
    } else {
        delete blacklist[guildId];
    }

    settings.store.blacklist = blacklist;

    if (enabled) {
        applyBlacklistSettings(guildId);
    } else {
        applyDefaultSettings(guildId);
    }
}

function applyToAllGuilds(): number {
    const guilds = GuildStore.getGuilds();
    if (!guilds) return 0;

    let appliedCount = 0;
    for (const guildId of Object.keys(guilds)) {
        if (isGuildBlacklisted(guildId)) {
            applyBlacklistSettings(guildId);
        } else {
            applyDefaultSettings(guildId);
            appliedCount++;
        }
    }
    return appliedCount;
}

interface GuildRowProps {
    guild: Guild;
    isBlacklisted: boolean;
    onCloseModal(): void;
}

function GuildRow({ guild, isBlacklisted, onCloseModal }: GuildRowProps) {
    const iconUrl = IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 32 });

    const handleNavigate = () => {
        onCloseModal();
        if (NavigationRouter?.transitionToGuild) {
            NavigationRouter.transitionToGuild(guild.id);
        } else if (NavigationRouter?.transitionTo) {
            NavigationRouter.transitionTo(`/channels/${guild.id}`);
        }
    };

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 0",
            borderBottom: "1px solid var(--background-modifier-accent)"
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                <Checkbox
                    value={isBlacklisted}
                    onChange={(_, checked) => toggleGuildBlacklist(guild.id, checked)}
                />
                {iconUrl ? (
                    <img
                        src={iconUrl}
                        alt={guild.name}
                        style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                ) : (
                    <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: "var(--background-secondary-alt)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: "bold",
                        color: "var(--text-normal)",
                        flexShrink: 0
                    }}>
                        {guild.name.substring(0, 2).toUpperCase()}
                    </div>
                )}
                <span style={{
                    color: "var(--header-primary)",
                    fontWeight: 500,
                    fontSize: "14px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                }}>
                    {guild.name}
                </span>
            </div>
            <Button
                size={Button.Sizes.SMALL}
                color={Button.Colors.PRIMARY}
                onClick={handleNavigate}
                style={{ marginLeft: "12px", flexShrink: 0 }}
            >
                Go to server
            </Button>
        </div>
    );
}

interface BlacklistModalProps {
    transitionState: number;
    onClose(): void;
}

function BlacklistModal({ transitionState, onClose }: BlacklistModalProps) {
    settings.use(SETTINGS_KEYS);

    const guilds = useStateFromStores([GuildStore], () => Object.values(GuildStore.getGuilds()));

    const sortedGuilds = useMemo(() => {
        return guilds.slice().sort((a, b) => a.name.localeCompare(b.name));
    }, [guilds]);

    return (
        <ModalRoot transitionState={transitionState} size={ModalSize.MEDIUM}>
            <ModalHeader separator={false}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <h2 style={{ color: "var(--header-primary)", margin: 0, fontSize: "20px", fontWeight: 600 }}>
                        Server Notification Blacklist
                    </h2>
                    <ModalCloseButton onClick={onClose} />
                </div>
            </ModalHeader>
            <ModalContent style={{ padding: "16px" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: 0, marginBottom: "16px", lineHeight: "1.4" }}>
                    Enabling the checkbox on a server will disable all notifications for that specific server (including role and personal mentions, @here, and @everyone).
                </p>
                <ScrollerThin style={{ maxHeight: "420px", paddingRight: "8px" }}>
                    {sortedGuilds.map(guild => (
                        <GuildRow
                            key={guild.id}
                            guild={guild}
                            isBlacklisted={Boolean(settings.store.blacklist?.[guild.id])}
                            onCloseModal={onClose}
                        />
                    ))}
                </ScrollerThin>
            </ModalContent>
        </ModalRoot>
    );
}

function openBlacklistModal() {
    openModal(props => (
        <ErrorBoundary>
            <BlacklistModal {...props} />
        </ErrorBoundary>
    ));
}

const makeContextMenuPatch = (shouldAddIcon: boolean): NavContextMenuPatchCallback => (children, { guild }: { guild: Guild; onClose(): void }) => {
    if (!guild) return;

    const group = findGroupChildrenByChildId("privacy", children);
    group?.push(
        <Menu.MenuItem
            label="Apply SolarNotification Settings"
            id="vc-solarnotifications-apply"
            icon={shouldAddIcon ? CogWheel : undefined}
            action={() => applyDefaultSettings(guild.id)}
        />
    );
};

export default definePlugin({
    name: "SolarNoGuildSpam",
    description: "Automatically configure server notification settings with server blacklist support.",
    tags: ["Servers", "Notifications"],
    authors: [SolarcordDevs.yiiky_],
    contextMenus: {
        "guild-context": makeContextMenuPatch(false),
        "guild-header-popout": makeContextMenuPatch(true)
    },
    patches: [
        {
            find: ",acceptInvite(",
            replacement: {
                match: /INVITE_ACCEPT_SUCCESS.+?,(\i)=\i\?\.guild_id.+?;/,
                replace: "$&$self.applyDefaultSettings($1);"
            }
        },
        {
            find: "{joinGuild:",
            replacement: {
                match: /guildId:(\i),lurker:(\i).{0,20}}\)\);/,
                replace: "$&if(!$2)$self.applyDefaultSettings($1);"
            }
        }
    ],
    settings,
    applyDefaultSettings,
    flux: {
        GUILD_JOIN_REQUEST_UPDATE({ guildId, request, status }) {
            if (status === "APPROVED" && request.user_id === UserStore.getCurrentUser()?.id) {
                applyDefaultSettings(guildId);
            }
        }
    }
});
