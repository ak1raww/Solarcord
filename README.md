# [<img src="./browser/solarcord.png" width="40" align="left" alt="Solarcord">](https://github.com/ak1raww/Solarcord) Solarcord

[![Upstream](https://img.shields.io/badge/Upstream-Equicord-grey?style=flat)](https://github.com/Equicord/Equicord)

Solarcord is a custom fork of [Equicord](https://github.com/Equicord/Equicord), focused on moderation workflows, utilities and quality-of-life improvements. This project comes along with a fork of [Equilotl](https://github.com/Equicord/Equilotl), for ease-of-use purposes, [Solari](https://github.com/ak1raww/Solari).

Rather than replacing Equicord, Solarcord builds on top of it by maintaining upstream compatibility and shipping additional features, embedded plugins and project-specific enhancements.

## Features

- Tracks the latest Equicord upstream.
- Custom plugins and patches.
- Automated upstream synchronization.
- Embedded third-party plugins.
- Built for long-term maintainability.

## Included Plugins

Solarcord ships with all plugins provided by Equicord in addition to Solarcord-specific plugins.

<details><summary> List of Solarcord (and other) Plugins: </summary><blockquote>

  

<details><summary> SolarVoiceUtils </summary><blockquote>

TeamSpeak-style multi-user selection to Discord voice channels, letting you Ctrl+Click multiple users and perform bulk actions (move, mute, deafen, disconnect) via context menu or drag‑and‑drop, with built‑in cooldown and request chunking.

</blockquote></details>

  

<details><summary> SolarGuildSelector </summary><blockquote>

</blockquote></details>

  

<details><summary> StreamProofEnhanced (credits to ImHisako) </summary><blockquote>

Automatically hides sensitive chat content (messages, media, usernames) with blur, dim, or blackout when screen sharing, with manual toggle, hover/click reveal, and per‑element protection controls.

</blockquote></details>

  

<details><summary> FakeMuteAndDefean (credits to ImHisako)</summary><blockquote>

Lets you fake your mute, deafen, and camera status in voice channels, appearing muted/deafened to others while still being able to speak and be heard.

</blockquote></details>

  

---

</blockquote></details>

## Installing Solarcord

---

### Method 1: Solari (RECOMMENDED IN 99% OF CASES)

[Solari](https://github.com/ak1raww/Solari) is a fork of [Equilotl](https://github.com/Equicord/Equilotl) (the official installer for [Equicord](https://github.com/Equicord/Equicord)), modified **specifically** for **syncing** and installing **Solarcord** while **keeping both official updates** from **Equicord** and **Solarcord**.

### Direct downloads:

### Windows:
- [SolariCli.exe](https://github.com/ak1raww/Solari/releases/latest/SolariCli.exe) (recommended, easier).
- [Solari.exe](https://github.com/ak1raww/Solari/releases/latest/Solari.exe) (GUI).

### Linux:
- Check the [latest release](https://github.com/ak1raww/Solari/releases/latest).
---

### Method 2: Build it yourself

### Dependencies

The following software is required:

- [Git](https://git-scm.com/download)
- [Node.js LTS](https://nodejs.org/)
- `pnpm`

Install `pnpm` globally:

```sh
npm install -g pnpm
```

> [!WARNING]
> Do not continue using an administrator/root shell after installing `pnpm`.
> Building or injecting from an elevated shell may corrupt your Discord installation.

Clone **Solarcord**:

```sh
git clone https://github.com/ak1raww/Solarcord.git
cd Solarcord
```

**Install** dependencies:

```sh
pnpm install --frozen-lockfile
```

Synchronize with **Equicord** upstream:

```sh
pnpm sync:all
```

This command:

- updates the Equicord upstream;
- applies Solarcord patches;
- synchronizes bundled plugins;
- keeps the repository ready to build.

Build:

```sh
pnpm build
```

Inject into Discord:

```sh
pnpm inject
```
### Congrats, installation is done.

---
## EXTRA
Build the web extension (ONLY IF YOU USE IT!):

```sh
pnpm buildWeb
```

The generated extension archives are available inside the `dist/` directory.

---

## Credits

Solarcord would not exist without the work of the following projects and contributors.

- [Equicord](https://github.com/Equicord/Equicord)
- [Vencord](https://github.com/Vendicated/Vencord)
- [Vendicated](https://github.com/Vendicated)
- [verticalsync](https://github.com/verticalsync)
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
