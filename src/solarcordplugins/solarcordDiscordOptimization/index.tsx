/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { disableStyle,enableStyle } from "@api/Styles";
import { IllegalcordDevs, SolarcordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { isObject } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findAll } from "@webpack";

interface SpringModule {
    Globals: {
        assign(options: { skipAnimation: boolean }): void;
    };
    Springs: object;
}

const logger = new Logger("SolarDiscordOptimizer");

// Hardware-accelerated offscreen rendering optimization CSS
const optimizedCss = `
.vc-sd-optimize-list [class*="member_"],
.vc-sd-optimize-list [class*="activityPanel_"],
.vc-sd-optimize-list [class*="container_"][class*="activity_"] {
    content-visibility: auto;
    contain-intrinsic-size: 0 44px;
}
`;

let springModules: SpringModule[] = [];
let started = false;

const settings = definePluginSettings({
    disableSpringAnimations: {
        type: OptionType.BOOLEAN,
        description: "Skip Discord spring animations.",
        default: true,
        disabled: () => isPluginEnabled("DisableAnimations"),
        onChange(value) {
            if (!started) return;
            if (value && springModules.length === 0) loadSpringModules();
            updateAnimationState();
        }
    },
    unfocusedOptimization: {
        type: OptionType.BOOLEAN,
        description: "Pause animations when Discord is minimized or in the background.",
        default: true,
        onChange() {
            if (started) updateAnimationState();
        }
    },
    optimizeMemberRendering: {
        type: OptionType.BOOLEAN,
        description: "Skip rendering offscreen member list items and activity cards.",
        default: true,
        onChange(value) {
            if (!started) return;
            if (value) enableStyle(optimizedCss);
            else disableStyle(optimizedCss);
        }
    },
    disableTypingDots: {
        type: OptionType.BOOLEAN,
        description: "Disable the CPU intensive typing dots animation.",
        default: true,
        disabled: () => isPluginEnabled("NoTypingAnimation"),
        restartNeeded: true
    }
});

function isSpringModule(value: unknown): value is SpringModule {
    if (!isObject(value)) return false;
    const module = value as Partial<Record<keyof SpringModule, unknown>>;
    return isObject(module.Globals) && typeof (module.Globals as Record<string, unknown>).assign === "function";
}

function loadSpringModules() {
    const modules: SpringModule[] = [];

    for (const module of findAll(isSpringModule)) {
        if (isSpringModule(module)) modules.push(module);
    }

    springModules = modules;
}

function setSpringAnimations(skipAnimation: boolean) {
    for (const module of springModules) {
        try {
            module.Globals.assign({ skipAnimation });
        } catch (error) {
            logger.warn("Failed to update a Discord animation module.", error);
        }
    }
}

function updateAnimationState() {
    if (!started || isPluginEnabled("DisableAnimations")) return;

    const isBackground = document.hidden || !document.hasFocus();
    const shouldDisable = settings.store.disableSpringAnimations || (settings.store.unfocusedOptimization && isBackground);

    if (springModules.length === 0 && shouldDisable) {
        loadSpringModules();
    }

    setSpringAnimations(shouldDisable);
}

function onWindowBlur() {
    if (settings.store.unfocusedOptimization) {
        updateAnimationState();
    }
}

function onWindowFocus() {
    if (settings.store.unfocusedOptimization) {
        updateAnimationState();
    }
}

export default definePlugin({
    name: "SolarDiscordOptimizer",
    description: "Optimize Discord spring animations, activity/member rendering, and background CPU usage.",
    authors: [IllegalcordDevs.irritably, SolarcordDevs.yiiky_],
    tags: ["Utility", "Appearance"],
    searchTerms: ["performance", "optimization", "lag", "activity", "animation", "fps"],
    enabledByDefault: true,
    isIllegalcord: true,
    settings,

    patches: [
        {
            find: "dotCycle",
            predicate: () => settings.store.disableTypingDots && !isPluginEnabled("NoTypingAnimation"),
            replacement: {
                match: /focused:(\i)/g,
                replace: (_, focused) => `_focused:${focused}=false`
            }
        }
    ],

    start() {
        started = true;

        if (settings.store.disableSpringAnimations || settings.store.unfocusedOptimization) {
            loadSpringModules();
            updateAnimationState();
        }

        if (settings.store.optimizeMemberRendering) {
            enableStyle(optimizedCss);
        }

        window.addEventListener("blur", onWindowBlur);
        window.addEventListener("focus", onWindowFocus);
        document.addEventListener("visibilitychange", updateAnimationState);
    },

    stop() {
        started = false;

        disableStyle(optimizedCss);

        window.removeEventListener("blur", onWindowBlur);
        window.removeEventListener("focus", onWindowFocus);
        document.removeEventListener("visibilitychange", updateAnimationState);

        if (springModules.length !== 0 && !isPluginEnabled("DisableAnimations")) {
            setSpringAnimations(false);
        }

        springModules = [];
    }
});
