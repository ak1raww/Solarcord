# [<img src="./browser/solarcord.png" width="40" align="left" alt="Solarcord">](https://github.com/ak1raww/Solarcord) Solarcord

[![Upstream](https://img.shields.io/badge/Upstream-Equicord-grey?style=flat)](https://github.com/Equicord/Equicord)

Solarcord is a custom fork of [Equicord](https://github.com/Equicord/Equicord), focused on moderation workflows, utilities and quality-of-life improvements. This project comes along with a fork of [Equilotl](https://github.com/Equicord/Equilotl), for ease-of-use purposes, [Solari](#method-1-solari-recommended-in-99-of-cases).

Rather than replacing Equicord, Solarcord builds on top of it by maintaining upstream compatibility and shipping additional features, embedded plugins and project-specific enhancements.

> **New to this ecosystem?** [Vencord](https://github.com/Vendicated/Vencord) is the base client mod. [Equicord](https://github.com/Equicord/Equicord) forked Vencord and added more plugins. Solarcord forked Equicord, added own plugins & moderation tools.

## FYI

This repository is automatically synced with the Equicord upstream, meaning Solarcord will always have the latest Equicord patches and updates.

## Included Plugins

Solarcord ships with all plugins provided by Equicord in addition to Solarcord-specific plugins.

<details><summary> List of Solarcord (and other) Plugins: </summary><blockquote>

<details><summary> SolarVoiceUtils </summary><blockquote>

TeamSpeak-style multi-user selection to Discord voice channels, letting you Ctrl+Click multiple users and perform bulk actions (move, mute, deafen, disconnect) via context menu or drag‑and‑drop, with built‑in cooldown and request chunking.

</blockquote></details>

<details><summary> SolarAutoCopyUserId </summary><blockquote>

Automatically copies user ID to clipboard via left-click or keybind on hover, with auto-focus, auto-paste, and floating ID pill support.

</blockquote></details>

<details><summary> SolarNoGuildSpam </summary><blockquote>

Automatically configures notification settings, mutes optional server features, and hides voice channel usernames for newly joined servers while offering a management blacklist to fully mute specific servers.

</blockquote></details>

<details><summary> SolarAutoUnmute </summary><blockquote>

Automatically unmutes and undeafens when you are server muted/deafened, if you have permissions.

</blockquote></details>

<details><summary> SolarDiscordOptimizer </summary><blockquote>

Optimize Discord spring animations, activity/member rendering, and background CPU usage.

</blockquote></details>

<details><summary> SolarSentinel </summary><blockquote>

Monitor users/servers through a dashboard for moderation purposes.

</blockquote></details>

<details><summary> StreamProofEnhanced (full credits to ImHisako) </summary><blockquote>

Automatically hides sensitive chat content (messages, media, usernames) with blur, dim, or blackout when screen sharing, with manual toggle, hover/click reveal, and per‑element protection controls.

</blockquote></details>

<details><summary> FakeMuteAndDeafen (full credits to ImHisako)</summary><blockquote>

Lets you fake your mute, deafen, and camera status in voice channels, appearing muted/deafened to others while still being able to speak and be heard.

</blockquote></details>

<details><summary> SolarDetector </summary><blockquote>

Alerts (toast/notification + sound) when staff join or leave your VC.

</blockquote></details>

<details><summary> SolarSniper </summary><blockquote>

Automatically redeems Nitro gift links sent in chat.

</blockquote></details>

<details><summary> SolarVoiceButtons </summary><blockquote>

Adds DM, Mute, and Deafen buttons next to every user in the voice panel. Server mute/deafen is applied when you have permission (for yourself too if serverSelf is enabled); otherwise, local mute/deafen is used. Rewritten from the original plugin to fix stability issues and ensure it works correctly.

</blockquote></details>

<details><summary> SolarVoiceMixer </summary><blockquote>

Adds a voice mixer button to voice channels on hover to adjust individual user volumes. (It's a white audio mixer icon on every voice channel)

</blockquote></details>

</blockquote></details>

---

# Installing Solarcord

## Method 1: Solari (RECOMMENDED IN 99% OF CASES)

[Solari](https://github.com/ak1raww/Solari) is a fork of [Equilotl](https://github.com/Equicord/Equilotl) (the official installer for [Equicord](https://github.com/Equicord/Equicord)), modified **specifically** for **syncing** and installing **Solarcord** while **keeping both official updates** from **Equicord** and **Solarcord**.

Solari ships prebuilt executables for **Windows** and **Linux**. There is no official **macOS** build; macOS users must [build from source](#method-2-build-it-yourself-from-source) instead.

# Direct downloads:

## Windows:
- [SolariCli.exe](https://github.com/ak1raww/Solari/releases/download/latest/SolariCli.exe) (recommended, easier).
- [Solari.exe](https://github.com/ak1raww/Solari/releases/download/latest/Solari.exe) (GUI).

## Linux:

Solari provides prebuilt binaries for Linux to install and patch Solarcord into your Discord client.

### 1. Download the Correct Installer Binary

Head to the [latest Solari releases](https://github.com/ak1raww/Solari/releases/latest) and pick the binary for your setup:

|Binary|Description|
|---|---|
|`Solari`|Universal GUI binary built with both X11 and Wayland support.|
|`Solari-wayland`|Optimized GUI installer specifically for native Wayland sessions.|
|`Solari-x11`|Optimized GUI installer for pure X11 sessions.|
|`SolariCli-linux`|Terminal-based installer if you prefer running it from the command line.|

### 2. Make the Installer Executable

> [!IMPORTANT]
By default, downloaded binaries do not have execution permissions.

Open your terminal in your Downloads folder (or wherever you saved the binary) and run:

```sh
chmod +x Solari*
```

Run the binary by double-clicking it in your file manager or launching it from the terminal:

```sh
./Solari
# or ./SolariCli-linux
```

### Distribution Recommendations & Wayland Setup

<details><summary> Arch-Based Distributions (Arch, Manjaro, EndeavourOS) </summary><blockquote>

On Arch and Wayland desktop environments (Hyprland, Sway, KDE Wayland, GNOME Wayland), using **Discord Canary** is recommended for better stability and native Wayland integration. Install it via your package manager or AUR:

```sh
sudo pacman -S discord-canary
```

</blockquote></details> <details><summary> Ubuntu, Linux Mint, and Fedora </summary><blockquote>

For Debian/Ubuntu-based distros (Mint, Pop!_OS, Ubuntu) and Fedora, the standard `.deb`, `.rpm`, or official tarball installs work best with Solari.

</blockquote></details>

### Optional: Enabling Native Wayland Flags

> [!TIP]
If you experience screen-sharing issues, missing window decorations, or auto-idle bugs under Wayland, pass Electron Ozone flags to Discord.

Copy the desktop entry to your local applications directory:

For **Discord Stable**:

```sh
mkdir -p ~/.local/share/applications
cp /usr/share/applications/discord.desktop ~/.local/share/applications/
```

For **Discord Canary**:

```sh
mkdir -p ~/.local/share/applications
cp /usr/share/applications/discord-canary.desktop ~/.local/share/applications/
```

Edit the copied file (e.g., `nano ~/.local/share/applications/discord-canary.desktop`) and locate the `Exec=` line.

Append the Ozone flags to force native Wayland rendering:

```ini
Exec=/usr/bin/discord-canary --enable-features=UseOzonePlatform --ozone-platform=wayland %U
```


Sometimes releases for Linux may break, if that's the case, [build from source](#method-2-build-it-yourself-from-source) and [contact me on Telegram](https://t.me/narniainside) for issues.

## MacOS:
Unfortunately, since I'm not paying Apple (and I won't) to sign the executable, there is no official Solarcord release for MacOS. But you can still use Solarcord by [building from source](#method-2-build-it-yourself-from-source).

---

## Method 2: Build it yourself (from source)

> [!WARNING]
> **macOS & Core Developers Only**
> This method is intended strictly for macOS users, developers inspecting the codebase, or those building custom plugins alongside Solarcord.

> [!CAUTION]
> Building from source disables automatic updates from the official repositories. You must manually rebuild every time you make changes or want updates. If you are not in one of these scenarios, please stick with [**Solari**](#method-1-solari-recommended-in-99-of-cases).

### Dependencies

> [!IMPORTANT]
>
> The following software is required (install in order):
> - [Git](https://git-scm.com/download)
> - [Node.js LTS](https://nodejs.org/)
> - `pnpm` (Needs Node.js)
>

After you installed the components above, **make a new folder** in your desired location, then open a **Terminal** (CMD) in that directory, then:

Install `pnpm` **globally**:

```sh
npm install -g pnpm
```

> [!CAUTION]
> Do not continue using an administrator/root shell **after** installing `pnpm`.
> Building or injecting from an elevated shell may corrupt your Discord installation.
>
> **If you have an open Terminal with Administrator, close it, and open it normally without Admin privileges.**

### Proceed with:

Cloning **Solarcord**:

```sh
git clone https://github.com/ak1raww/Solarcord.git
cd Solarcord
```

**Installing** dependencies:

```sh
pnpm install --frozen-lockfile
```

Building:

```sh
pnpm build
```

Injecting into Discord:

```sh
pnpm inject
```

### Congrats, installation is done.

> [!TIP]
> Only run `pnpm inject` once. Unless Discord updates overwrite your installation or you run `pnpm uninject`, you only need to run `pnpm build` after making changes to the local source code. After building, press <kbd>Ctrl</kbd> + <kbd>R</kbd> in your patched Discord app to reload and view your changes.

---
## EXTRA
Build the web extension (ONLY IF YOU USE IT!):

```sh
pnpm buildWeb
```

The generated extension archives are available inside the `dist/` directory.

To load the unpacked extension for testing:

- **Chrome/Edge**: go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the extracted `dist/` folder.
- **Firefox**: go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select the `manifest.json` file inside the extracted `dist/` folder.

---

## Uninstalling

If you built from source and want to remove Solarcord:

```sh
pnpm uninject
```

This restores Discord to stock. Run once; no rebuild needed afterward.

If installed via **Solari**, re-run Solari, pick the **uninstall** option.

---

## Troubleshooting

**Discord update broke a plugin, Solarcord isn't there anymore or won't load?**

1. Close Discord fully (check taskbar/tray).
2. If you installed Solarcord with Solari, **re-run** [Solari Installation](#method-1-solari-recommended-in-99-of-cases).
If you installed Solarcord from source, run `pnpm build` & `pnpm inject` again.
3. Restart Discord.

**A plugin is missing after an update?**
Solarcord auto-syncs itself with Equicord upstream, so this shouldn't happen. If it does, try a clean install and contact me on [Telegram](https://t.me/narniainside).

**Still broken?**
[Contact me on Telegram](https://t.me/narniainside), with error or log details.

---

## Credits

Solarcord would not exist without the work of the following projects and contributors.

- [Equicord](https://github.com/Equicord/Equicord)
- [Vencord](https://github.com/Vendicated/Vencord)
- [Vendicated](https://github.com/Vendicated)
- [verticalsync](https://github.com/verticalsync)
## Special thanks
- [ImHisako](https://github.com/ImHisako) for some of the plugins Solarcord uses, from [Illegalcord](https://github.com/ImHisako/Illegalcord).

## Disclaimer

Discord is a trademark of Discord Inc. References to Discord are used solely for descriptive purposes and do not imply affiliation or endorsement.

Solarcord is an independent project and is not affiliated with Discord Inc., Vencord or Equicord.

<details>
<summary>Terms of Service</summary>

Client modifications violate Discord's Terms of Service.

Historically, Discord has not actively enforced bans against users solely for using reputable client modifications. Nevertheless, use Solarcord at your own risk.

If your Discord account is critical to you, you should avoid using any client modification.

Avoid sharing screenshots of Solarcord in communities where client modifications are prohibited.

</details>
