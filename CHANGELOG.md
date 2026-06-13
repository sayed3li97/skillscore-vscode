# Changelog

All notable changes to the Skillscore extension are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] - 2026-06-13

### Added

- Inline diagnostics with squiggly underlines, rule ID, fix hint, and "Explain and Fix" lightbulb action
- **Skillscore** sidebar panel with score header, 7-category progress bars, and per-finding jump-to-line
- Status bar item (`Skillscore: 77/100  C`) that updates on every open and save
- `skillscore.scoreThisSkill` command registered in the editor title bar and command palette
- Auto-score on `onDidOpenTextDocument` and `onDidSaveTextDocument` (600 ms debounce)
- Binary discovery chain: user-configured path → bundled platform binary → `~/.pub-cache/bin/skillscore` → system PATH
- Bundled native binary for `darwin-arm64` (Apple Silicon); CI builds `linux-x64`, `darwin-x64`, and `win32-x64`
- Four configuration settings: `executablePath`, `target`, `autoScore`, `minScore`
- Multi-target ruleset support: `universal`, `claude`, `codex`, `antigravity`
- Activation event `workspaceContains:**/SKILL.md` (zero startup cost for non-SKILL.md projects)
- Published to VS Marketplace and Open VSX Registry
