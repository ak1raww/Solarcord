/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Card } from "@components/Card";
import ErrorBoundary from "@components/ErrorBoundary";
import { Heading } from "@components/Heading";
import { SolarcordDevs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import type { User } from "@vencord/discord-types";
import { Avatar, Button, ChannelStore, IconUtils, Menu, NavigationRouter, React, showToast, Text, Toasts } from "@webpack/common";

// Definizione delle impostazioni per configurare l'ID del canale
const settings = definePluginSettings({
    notesChannelId: {
        type: OptionType.STRING,
        description: "ID del canale di testo in cui inviare il comando Notes.",
        default: "1527023005379596368",
    }
});

interface StaffToolContentProps {
    user: User;
    onClose: () => void;
}

const StaffToolContent = ({ user, onClose }: StaffToolContentProps) => {
    const avatarUrl = IconUtils.getUserAvatarURL(user, false, 80);

    const handleNotesClick = () => {
        const targetChannelId = settings.store.notesChannelId;
        if (!targetChannelId) {
            showToast("Il canale per le note non è configurato.", Toasts.Type.FAILURE);
            return;
        }

        // Invia il comando usando il wrapper ufficiale
        sendMessage(targetChannelId, { content: `?Notes ${user.id}` });

        onClose();

        // Naviga al canale (opzionale)
        const channel = ChannelStore.getChannel(targetChannelId);
        const guildId = channel?.guild_id ?? "@me";
        NavigationRouter.transitionTo(`/channels/${guildId}/${targetChannelId}`);
    };

    return (
        <div style={{ display: "flex", gap: "20px", alignItems: "stretch" }}>
            {/* Sezione di sinistra: Card dell'utente */}
            <div style={{ flex: 1, minWidth: "220px" }}>
                <Card style={{ padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", height: "100%", justifyContent: "center", backgroundColor: "var(--background-secondary)" }}>
                    <Avatar size="SIZE_80" src={avatarUrl} />
                    <div style={{ textAlign: "center" }}>
                        <Heading style={{ marginBottom: "4px", fontSize: "16px", fontWeight: "600" }}>
                            {user.username}
                        </Heading>
                        <Text variant="text-sm/normal" color="text-muted" style={{ userSelect: "text" }}>
                            ID: {user.id}
                        </Text>
                    </div>
                </Card>
            </div>

            {/* Sezione di destra: Pulsanti dello Staff Tool (1 attivo, 5 placeholder) */}
            <div style={{ flex: 1.5, display: "flex", flexDirection: "column", gap: "12px", justifyContent: "center" }}>
                <Button onClick={handleNotesClick} color={Button.Colors.BRAND} style={{ width: "100%" }}>
                    Notes
                </Button>
                <Button disabled color={Button.Colors.PRIMARY} style={{ width: "100%", opacity: 0.6 }}>
                    Placeholder 1
                </Button>
                <Button disabled color={Button.Colors.PRIMARY} style={{ width: "100%", opacity: 0.6 }}>
                    Placeholder 2
                </Button>
                <Button disabled color={Button.Colors.PRIMARY} style={{ width: "100%", opacity: 0.6 }}>
                    Placeholder 3
                </Button>
                <Button disabled color={Button.Colors.PRIMARY} style={{ width: "100%", opacity: 0.6 }}>
                    Placeholder 4
                </Button>
                <Button disabled color={Button.Colors.PRIMARY} style={{ width: "100%", opacity: 0.6 }}>
                    Placeholder 5
                </Button>
            </div>
        </div>
    );
};

// Incapsulamento del componente React per prevenire crash imprevisti
const SafeStaffToolContent = ErrorBoundary.wrap(StaffToolContent, { noop: true });

function openStaffToolModal(user: User) {
    openModal(props => (
        <ModalRoot size={ModalSize.MEDIUM} {...props}>
            <ModalHeader>
                <Text variant="heading-lg/semibold">SolarCord Staff Tool</Text>
            </ModalHeader>
            <ModalContent style={{ padding: "24px" }}>
                <SafeStaffToolContent user={user} onClose={props.onClose} />
            </ModalContent>
        </ModalRoot>
    ));
}

// Handler per l'aggiunta della voce nel menu contestuale
const UserContext: NavContextMenuPatchCallback = (children, { user }) => {
    // Esclude i bot dall'apparizione dello strumento
    if (!user || user.bot) return;

    children.push(
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="solarcord-staff-tool"
                label="SolarCord Staff Tool"
                action={() => openStaffToolModal(user)}
            />
        </Menu.MenuGroup>
    );
};

export default definePlugin({
    name: "SolarStaffTool",
    description: "Vediamo va.",
    tags: ["Servers"],
    authors: [SolarcordDevs.yiiky_],
    settings,
    contextMenus: {
        "user-context": UserContext
    }
});
