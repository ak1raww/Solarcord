/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { SolarcordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { User } from "@vencord/discord-types";
import { React } from "@webpack/common";

import { settings } from "./settings";
import { UserChatButton, UserDeafenButton, UserMuteButton } from "./utils";

export default definePlugin({
    name: "SolarVoiceButtons",
    description: "Adds DM, Mute, and Deafen buttons next to every user in the voice panel. Server mute/deafen is applied when you have permission (for yourself too if serverSelf is enabled); otherwise, local mute/deafen is used.",
    tags: ["Servers", "Utility", "Voice"],
    authors: [SolarcordDevs.yiiky_],
    settings,
    patches: [
        {
            find: ".VOICE_PANEL}}",
            replacement: [
                {
                    match: /\}\),children:\[(?=.{0,50}#{intl::PRIORITY_SPEAKER})/,
                    replace: "$&$self.renderButtons(arguments[0]?.user),"
                }
            ]
        }
    ],
    renderButtons(user: User) {
        if (!user) return null;
        const positionClass = settings.store.buttonPosition === "right"
            ? "voice-user-buttons-right"
            : "voice-user-buttons-left";

        return (
            <Flex flexDirection="row" className={`voice-user-buttons ${positionClass}`}>
                {settings.store.showChatButton && <UserChatButton user={user} />}
                {settings.store.showMuteButton && <UserMuteButton user={user} />}
                {settings.store.showDeafenButton && <UserDeafenButton user={user} />}
            </Flex>
        );
    }
});
