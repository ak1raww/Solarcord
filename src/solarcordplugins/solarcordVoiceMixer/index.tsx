/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { SolarcordDevs } from "@utils/constants";
import {
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    type ModalProps,
    ModalRoot,
    ModalSize,
    openModal
} from "@utils/modal";
import definePlugin from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { find, findByCode, findByPropsLazy } from "@webpack";
import {
    Avatar,
    GuildMemberStore,
    IconUtils,
    MediaEngineStore,
    React,
    ScrollerThin,
    Slider,
    Tooltip,
    UserStore,
    useStateFromStores,
    VoiceStateStore
} from "@webpack/common";

const AudioActions = findByPropsLazy("setLocalVolume");

let cachedConverters: { toSlider: (v: number) => number; toStore: (v: number) => number; } | null = null;

function getConverters() {
    if (cachedConverters) return cachedConverters;

    try {
        const mod = find(m => {
            if (!m || typeof m !== "object") return false;
            const fns = Object.values(m).filter(f => typeof f === "function");
            if (fns.length !== 2) return false;
            const code = fns.map(f => f.toString()).join(" ");
            return (code.includes("Math.pow") || code.includes("**")) && (code.includes("Math.log") || code.includes("log10"));
        }) || findByCode("Math.pow(10,", "Math.log");

        if (mod) {
            const fns = Object.values(mod).filter(f => typeof f === "function") as ((n: number) => number)[];
            if (fns.length >= 2) {
                const [f1, f2] = fns;
                if (Math.round(f1(118)) >= 120) {
                    cachedConverters = { toSlider: f1, toStore: f2 };
                    return cachedConverters;
                } else if (Math.round(f2(118)) >= 120) {
                    cachedConverters = { toSlider: f2, toStore: f1 };
                    return cachedConverters;
                }
            }
        }
    } catch { }

    cachedConverters = {
        toSlider: (amp: number) => {
            if (amp <= 0) return 0;
            if (amp <= 100) {
                const db = 20 * Math.log10(amp / 100);
                return Math.max(0, Math.round(((db + 50) / 50) * 100));
            }
            const db = 20 * Math.log10(amp / 100);
            return Math.round(100 + (db / 6) * 100);
        },
        toStore: (perc: number) => {
            if (perc <= 0) return 0;
            if (perc <= 100) {
                const db = (perc / 100) * 50 - 50;
                return Math.pow(10, db / 20) * 100;
            }
            const db = ((perc - 100) / 100) * 6;
            return Math.pow(10, db / 20) * 100;
        }
    };

    return cachedConverters;
}

function MixerIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M4 21v-7" />
            <path d="M4 10V3" />
            <path d="M12 21v-9" />
            <path d="M12 8V3" />
            <path d="M20 21v-5" />
            <path d="M20 12V3" />
            <path d="M1 14h6" />
            <path d="M9 8h6" />
            <path d="M17 16h6" />
        </svg>
    );
}

function RotateCcwIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
        </svg>
    );
}

interface UserVolumeRowProps {
    userId: string;
    guildId?: string;
    resetKey?: number;
}

function UserVolumeRow({ userId, guildId, resetKey }: UserVolumeRowProps) {
    const user = useStateFromStores([UserStore], () => UserStore.getUser(userId), [userId]);
    const member = useStateFromStores(
        [GuildMemberStore],
        () => (guildId ? GuildMemberStore.getMember(guildId, userId) : null),
        [guildId, userId]
    );

    const rawVolume = useStateFromStores(
        [MediaEngineStore],
        () => MediaEngineStore.getLocalVolume(userId) ?? 100,
        [userId]
    );

    const [sliderKey, setSliderKey] = React.useState(0);

    React.useEffect(() => {
        if (resetKey !== undefined) {
            setSliderKey(k => k + 1);
        }
    }, [resetKey]);

    if (!user) return null;

    const { toSlider, toStore } = getConverters();
    const volume = Math.round(toSlider(rawVolume));

    const displayName = member?.nick ?? user.globalName ?? user.username;
    const avatarUrl = IconUtils.getUserAvatarURL(user, false, 32);

    const multiplier =
        (window as any).Vencord?.Plugins?.plugins?.VolumeBooster?.settings?.store?.multiplier ?? 2;
    const maxVolume = 200 * multiplier;

    const handleVolumeChange = (value: number) => {
        const rounded = Math.round(value);
        AudioActions?.setLocalVolume(userId, toStore(rounded));
    };

    const handleReset = () => {
        AudioActions?.setLocalVolume(userId, toStore(100));
        setSliderKey(key => key + 1);
    };

    const handleQuickSet = (targetValue: number) => {
        AudioActions?.setLocalVolume(userId, toStore(targetValue));
        setSliderKey(key => key + 1);
    };

    const markers = [0, 50, 100, 150, 200];
    for (let m = 250; m <= maxVolume; m += 50) {
        markers.push(m);
    }

    const quickValues = [0, 50, 100, 150, 200, 250, 300, 350, 400].filter(v => v <= maxVolume);

    return (
        <div className="vc-svm-row">
            <div className="vc-svm-user-left">
                <Avatar src={avatarUrl} size="SIZE_32" aria-label={displayName} />
                <div className="vc-svm-user-info">
                    <span className="vc-svm-displayname">{displayName}</span>
                    {user.username !== displayName && (
                        <span className="vc-svm-username">@{user.username}</span>
                    )}
                </div>
            </div>

            <div className="vc-svm-controls-right">
                <Tooltip text="Default to 100%">
                    {tooltipProps => (
                        <button
                            {...tooltipProps}
                            type="button"
                            className="vc-svm-reset-button"
                            onClick={handleReset}
                            aria-label="Default to 100%"
                        >
                            <RotateCcwIcon />
                        </button>
                    )}
                </Tooltip>

                <div className="vc-svm-slider-container">
                    <Slider
                        key={sliderKey}
                        minValue={0}
                        maxValue={maxVolume}
                        initialValue={volume}
                        onValueChange={handleVolumeChange}
                        onValueRender={(v: number) => `${Math.round(v)}%`}
                        markers={markers}
                        stickToMarkers={false}
                    />
                    <div className="vc-svm-quick-btn-overlay">
                        {quickValues.map(val => {
                            const percent = (val / maxVolume) * 100;
                            return (
                                <button
                                    key={val}
                                    type="button"
                                    className="vc-svm-quick-btn"
                                    data-val={val}
                                    style={{ left: `${percent}%` }}
                                    onClick={() => handleQuickSet(val)}
                                >
                                    {val}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface VoiceMixerModalProps extends ModalProps {
    channel: Channel;
}

function VoiceMixerModal({ channel, ...modalProps }: VoiceMixerModalProps) {
    const currentUserId = useStateFromStores([UserStore], () => UserStore.getCurrentUser()?.id);
    const voiceStates = useStateFromStores(
        [VoiceStateStore],
        () => VoiceStateStore.getVoiceStatesForChannel(channel.id),
        [channel.id]
    );

    const [globalResetKey, setGlobalResetKey] = React.useState(0);
    const { toStore } = getConverters();
    const userIds = Object.keys(voiceStates ?? {}).filter(id => id !== currentUserId);

    const handleDefaultAll = () => {
        userIds.forEach(id => {
            AudioActions?.setLocalVolume(id, toStore(100));
        });
        setGlobalResetKey(k => k + 1);
    };

    return (
        <ModalRoot size={ModalSize.LARGE} {...modalProps}>
            <ModalHeader>
                <div className="vc-svm-header">
                    <img
                        src="https://i.imgur.com/qmlmDi6.png"
                        alt="Solar Voice Mixer"
                        className="vc-svm-header-icon"
                    />
                    <span className="vc-svm-title">Solar Voice Mixer</span>

                    <div className="vc-svm-header-actions">
                        <button
                            type="button"
                            className="vc-svm-default-all-button"
                            onClick={handleDefaultAll}
                        >
                            <RotateCcwIcon />
                            Default ALL to 100%
                        </button>
                    </div>

                    <ModalCloseButton onClick={modalProps.onClose} />
                </div>
            </ModalHeader>

            <ModalContent>
                <ScrollerThin className="vc-svm-content">
                    {userIds.length === 0 ? (
                        <div className="vc-svm-empty-state">
                            No other users in this voice channel.
                        </div>
                    ) : (
                        userIds.map(userId => (
                            <UserVolumeRow
                                key={userId}
                                userId={userId}
                                guildId={channel.guild_id}
                                resetKey={globalResetKey}
                            />
                        ))
                    )}
                </ScrollerThin>
            </ModalContent>
        </ModalRoot>
    );
}

function VoiceMixerChannelButton({ channel }: { channel: Channel; }) {
    return (
        <Tooltip text="Solar Voice Mixer">
            {tooltipProps => (
                <div
                    {...tooltipProps}
                    className="vc-svm-btn"
                    role="button"
                    tabIndex={0}
                    onClick={event => {
                        event.stopPropagation();
                        event.preventDefault();

                        openModal(modalProps => (
                            <VoiceMixerModal channel={channel} {...modalProps} />
                        ));
                    }}
                >
                    <MixerIcon />
                </div>
            )}
        </Tooltip>
    );
}

export default definePlugin({
    name: "SolarVoiceMixer",
    description: "Adds a voice mixer button to voice channels on hover to adjust individual user volumes.",
    authors: [SolarcordDevs.yiiky_],
    dependencies: ["VolumeBooster"],

    patches: [
        {
            find: "VoiceChannel.renderPopout: There must always be something to render",
            all: true,

            replacement: {
                match: /(\i)\.renderOpenChatButton\(\)/g,
                replace:
                    "$self.renderMixerButton($1?.props?.channel),$1.renderOpenChatButton()"
            }
        }
    ],

    renderMixerButton(channel?: Channel) {
        if (!channel || channel.type !== 2) {
            return null;
        }

        return (
            <VoiceMixerChannelButton channel={channel} />
        );
    }
});
