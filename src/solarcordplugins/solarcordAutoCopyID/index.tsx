/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { SolarcordDevs } from "@utils/constants";
import { copyWithToast, insertTextIntoChatInputBox, openUserProfile } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ComponentDispatch, useState } from "@webpack/common";

function KeybindComponent({ setValue }: { setValue(val: string): void }) {
    const [isRecording, setIsRecording] = useState(false);
    const key = settings.store.keybind || "c";

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const pressedKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        setValue(pressedKey);
        setIsRecording(false);
    };

    if (!settings.store.useKeybindMode) return null;

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
            <Button
                size={Button.Sizes.SMALL}
                color={isRecording ? Button.Colors.RED : Button.Colors.BRAND}
                onClick={() => setIsRecording(true)}
                onKeyDown={isRecording ? handleKeyDown : undefined}
            >
                {isRecording ? "Press any key..." : `Key: ${key.toUpperCase()}`}
            </Button>
            <Button
                size={Button.Sizes.SMALL}
                color={Button.Colors.PRIMARY}
                onClick={() => setValue("c")}
            >
                Reset
            </Button>
        </div>
    );
}

const settings = definePluginSettings({
    showIdPill: {
        description: "Show a floating ID pill near the cursor when hovering over a user.",
        type: OptionType.BOOLEAN,
        default: true
    },
    autoFocusChatBar: {
        description: "Automatically focus the chat bar after copying an ID.",
        type: OptionType.BOOLEAN,
        default: true
    },
    autoPasteId: {
        description: "Automatically paste the copied ID into the chat bar.",
        type: OptionType.BOOLEAN,
        default: false
    },
    useKeybindMode: {
        description: "Enable keybind mode on hover (disables single left-click copy).",
        type: OptionType.BOOLEAN,
        default: false
    },
    keybind: {
        description: "Keybind to copy ID on hover (only active when Keybind Mode is enabled).",
        type: OptionType.COMPONENT,
        component: KeybindComponent,
        default: "c"
    }
});

let clickTimer: ReturnType<typeof setTimeout> | undefined;
let lastClickedUserId: string | undefined;
let hoveredUserId: string | undefined;
let idPillElement: HTMLDivElement | undefined;

function ensureIdPillElement(): HTMLDivElement {
    if (!idPillElement) {
        idPillElement = document.createElement("div");
        idPillElement.className = "solar-autocopy-id-pill";
        idPillElement.style.position = "fixed";
        idPillElement.style.pointerEvents = "none";
        idPillElement.style.zIndex = "999999";
        idPillElement.style.padding = "4px 10px";
        idPillElement.style.borderRadius = "8px";
        idPillElement.style.backgroundColor = "var(--background-floating, rgba(18, 18, 20, 0.9))";
        idPillElement.style.backdropFilter = "blur(8px)";
        idPillElement.style.border = "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))";
        idPillElement.style.color = "var(--text-normal, #f2f3f5)";
        idPillElement.style.fontSize = "14px";
        idPillElement.style.fontFamily = "var(--font-monospace, Consolas, monospace)";
        idPillElement.style.fontWeight = "600";
        idPillElement.style.letterSpacing = "0.5px";
        idPillElement.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.35)";
        idPillElement.style.display = "none";
        document.body.appendChild(idPillElement);
    }
    return idPillElement;
}

function removeIdPillElement() {
    if (idPillElement) {
        idPillElement.remove();
        idPillElement = undefined;
    }
}

function updateIdPill(e: MouseEvent) {
    if (!settings.store.showIdPill || !hoveredUserId) {
        if (idPillElement) {
            idPillElement.style.display = "none";
        }
        return;
    }

    const pill = ensureIdPillElement();
    pill.textContent = hoveredUserId;

    const offsetX = e.clientX + 16;
    const offsetY = e.clientY - 10;
    const maxLeft = window.innerWidth - 180;
    const maxTop = window.innerHeight - 36;

    pill.style.left = `${Math.min(offsetX, maxLeft)}px`;
    pill.style.top = `${Math.max(8, Math.min(offsetY, maxTop))}px`;
    pill.style.display = "block";
}

function executeCopyAction(userId: string) {
    copyWithToast(userId);

    if (settings.store.autoPasteId) {
        insertTextIntoChatInputBox(userId);
    }

    if (settings.store.autoFocusChatBar || settings.store.autoPasteId) {
        ComponentDispatch.dispatch("TEXTAREA_FOCUS");
    }
}

function isVoiceOrStreamElement(element: HTMLElement): boolean {
    return Boolean(
        element.closest(`
            [class*="voiceUser"],
            [class*="voiceChannel"],
            [class*="voiceState"],
            [class*="voice-"],
            [class*="tile-"],
            [class*="stream-"],
            [data-list-item-id*="voice"],
            [data-list-item-id*="channel"]
        `)
    );
}

function handleMouseMove(e: MouseEvent) {
    const { target } = e;
    if (!(target instanceof HTMLElement)) {
        hoveredUserId = undefined;
        updateIdPill(e);
        return;
    }

    const userElement = target.closest("[data-user-id], [data-author-id]");
    if (userElement) {
        hoveredUserId = userElement.getAttribute("data-user-id") || userElement.getAttribute("data-author-id") || undefined;
    } else {
        hoveredUserId = undefined;
    }

    updateIdPill(e);
}

function handleKeyDown(e: KeyboardEvent) {
    if (!settings.store.useKeybindMode || !hoveredUserId) return;

    const currentKey = (settings.store.keybind || "c").toLowerCase();
    const pressedKey = e.key.toLowerCase();

    if (pressedKey === currentKey) {
        e.preventDefault();
        e.stopPropagation();
        executeCopyAction(hoveredUserId);
    }
}

function handleGlobalClick(e: MouseEvent) {
    if (settings.store.useKeybindMode) return;
    if (e.button !== 0) return;

    const { target } = e;
    if (!(target instanceof HTMLElement)) return;

    const userElement = target.closest("[data-user-id], [data-author-id]");
    if (!userElement) return;

    const userId = userElement.getAttribute("data-user-id") || userElement.getAttribute("data-author-id");
    if (!userId) return;

    const isVoice = isVoiceOrStreamElement(target);

    // Doppio click entro 250ms sullo stesso utente -> Apre il profilo
    if (clickTimer && lastClickedUserId === userId) {
        clearTimeout(clickTimer);
        clickTimer = undefined;
        lastClickedUserId = undefined;

        if (isVoice) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            openUserProfile(userId);
        }
        // Se si trova in chat o lista membri, lascia che Discord apra il mini-profilo nativo
        return;
    }

    // Blocca il singolo click per impedire l'apertura del canale vocale o del mini-profilo
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (clickTimer) {
        clearTimeout(clickTimer);
    }

    lastClickedUserId = userId;

    // Singolo click -> Esegue l'azione di copia dopo 250ms
    clickTimer = setTimeout(() => {
        clickTimer = undefined;
        lastClickedUserId = undefined;
        executeCopyAction(userId);
    }, 250);
}

export default definePlugin({
    name: "SolarAutoCopyUserId",
    description: "Automatically copies user ID to clipboard via left-click or keybind on hover, with auto-focus, auto-paste, and floating ID pill support.",
    authors: [SolarcordDevs.yiiky_],

    settings,

    start() {
        window.addEventListener("click", handleGlobalClick, true);
        window.addEventListener("mousemove", handleMouseMove, true);
        window.addEventListener("keydown", handleKeyDown, true);
    },

    stop() {
        window.removeEventListener("click", handleGlobalClick, true);
        window.removeEventListener("mousemove", handleMouseMove, true);
        window.removeEventListener("keydown", handleKeyDown, true);

        if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = undefined;
        }

        lastClickedUserId = undefined;
        hoveredUserId = undefined;
        removeIdPillElement();
    }
});
