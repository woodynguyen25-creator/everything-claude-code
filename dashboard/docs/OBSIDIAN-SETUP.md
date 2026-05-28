# Obsidian Setup — Woody's Realm Agentic OS

## Goal

Embed the live dashboard inside Obsidian and give Woody a one-click workspace that opens the command center and terminal together.

## 1. Custom Frames

Install or open the **Custom Frames** plugin and add a frame with:

- Name: `Command Center`
- URL: `http://127.0.0.1:3737`
- Open as: dedicated pane
- Suggested icon: a compass / rune / dashboard glyph

This frame is the live Next.js Agentic OS. It replaces the need to live in `HOME.md` for day-to-day operation.

## 2. Terminal plugin

Install or open the **Terminal** plugin and create these profiles:

1. `Lebot James`
   - command: `claude`
   - args: use the Lebot persona context or start in the dashboard workspace
2. `Thor`
   - command: `claude`
   - args: same workspace, Thor persona flow
3. `Perseus`
   - command: `claude`
   - args: same workspace, Perseus persona flow
4. `Fenrir`
   - command: `claude`
   - args: same workspace, Fenrir persona flow
5. `Sauron`
   - command: `claude`
   - args: same workspace, Sauron persona flow
6. `Codex`
   - command: `codex`

Recommended working directory for all profiles:

- `C:\Github Repos\everything-claude-code\dashboard`

If you prefer the full hub context instead of just dashboard:

- `C:\Github Repos\everything-claude-code`

## 3. Recommended layout

Use this layout:

- Left pane: vault tree
- Center pane: `Command Center` Custom Frame
- Bottom dock: Terminal plugin at roughly `35%` height

This gives:

- the dashboard in the center
- the live AI terminal at the bottom
- your notes and project tree at the left

## 4. Workspaces plugin

Install or open the **Workspaces** plugin and save the full layout as:

- `Realm OS`

That gives Woody a one-click restore for the entire command center.

## 5. Optional HOME.md embed

If you want `HOME.md` to point at the live dashboard, embed the `Command Center` frame there with your preferred Custom Frames embed syntax.

Use `AIOS Digest.md` for the markdown digest.

Use the live `Command Center` pane for the interactive Agentic OS.

## 6. Auto-start

Once Woody is ready, run:

- [install-autostart.ps1](</C:/Github Repos/everything-claude-code/dashboard/scripts/tools/install-autostart.ps1>)

This registers a Windows Scheduled Task that starts the dashboard dev server on login after a 30s delay.

Codex did **not** run this automatically.

If the frame ever opens blank and you just want the server back quickly, run:

- [restart-dashboard.ps1](</C:/Github Repos/everything-claude-code/dashboard/scripts/tools/restart-dashboard.ps1>)
