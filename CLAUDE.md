# CLAUDE.md

This repository holds the browser games of Jaś, a young kid, and is public on GitHub (`pawcik/gry-jasia`). Each game lives in its own folder with its own `CLAUDE.md` describing that game; one git repository holds them all. The rules here apply to every game.

Never commit private data: home addresses, server names, IPs, domains, ports forwarded on the router, tokens, family details beyond Jaś's first name. Keep such things in `CLAUDE.local.md` or `mise.local.toml` (any folder), which git ignores and Claude still reads.

## Who you are talking to

Jaś decides what each game becomes; you help him build it.

- **Always reply in Polish**, even if the question comes in another language.
- Use short sentences and simple words a young kid understands. No jargon: say "pętla gry działa w kółko", not "requestAnimationFrame loop".
- Explain what you changed in one or two sentences, then tell him how to see it (refresh the page).
- Be encouraging. Suggest one small next idea at the end, never a long list.
- After every finished change, commit it (only that game's files, short Polish message describing what Jaś asked for), so nothing is lost. Jaś calls this "zapisywanie". Push only when asked.
- Make small changes, one idea at a time, so he can see each effect. If his idea is big, split it into steps and do the first one.
- Ask a simple question when an idea is unclear ("Czy wróg ma gonić bohatera, czy chodzić w kółko?").
- Keep every game original: no names, characters, art, music or maps from existing games, even when he asks for "like in ...". Offer an own version instead (own hero, own items, own places).

## Folders

- `monkey/` - Monkey World, a 3D adventure with the monkey Kiko (Three.js).
- `kraina-wisni/` - Kraina Wiśni, a 3D open world in old Japan with a fox-spirit kid and a sword, made for a phone in landscape with two touch sticks (Three.js). Multiplayer server on port 8080.
- `statki/` - Statki, battleship for the whole family (2+ players on phones and computers in the same Wi-Fi). Multiplayer server on port 8081; can also be deployed to a home server over HTTPS (`mise run wdroz`).
- `szablon/` - the starter every new game is copied from. Not a game itself; change it only to improve the starting point for future games.
- every other folder - one game.

When Jaś talks about a game, work only inside that game's folder and read its `CLAUDE.md` first. If it is unclear which game he means, ask ("Którą grę zmieniamy: małpkę czy ...?").

## Starting a new game

When Jaś wants a new game ("zróbmy nową grę", "mam pomysł na grę", `/nowa-gra`), follow the `nowa-gra` skill (`.claude/skills/nowa-gra/SKILL.md` in this folder; read that file directly when `/nowa-gra` is not available, e.g. when Claude was started inside a game folder). It asks him a few simple questions, copies `szablon/` into a new folder, commits it and starts the game in the browser.

## How every game is built

- No build step: plain HTML/JS that also works by double-clicking `index.html`. No `package.json`, bundlers, frameworks or ES modules (`type="module"` breaks when opened as a file). Code goes in plain `<script>` tags in `index.html`, loaded in order.
- Tooling lives in the game's `mise.toml`. Every reusable command goes there as a mise task. Each game has `mise run serwer` (live reload, use while developing) and `mise run graj` (just opens `index.html`).
- 2D games draw on a `<canvas>` with the 2D context, as in `szablon/`. Board and card games may use plain HTML elements instead (crisp grids, buttons that work with a finger).
- Games for several players in the same Wi-Fi run a small `serwer.js` (Node, built-in modules only) that serves the files, relays the game over Server-Sent Events plus POST requests, and reloads all browsers when a file changes; see `kraina-wisni/` and `statki/`. Each game gets its own port so they can run side by side. Anything that grabs the full screen on a phone needs a visible button to leave it. A 3D game copies `monkey/biblioteki/three.min.js` (r128, global `THREE`) into its own `biblioteki/` folder and loads it with a `<script>` tag before the game code.
- The game runs at a fixed 60 steps per second regardless of frame rate: `petlaGry()` runs `krokGry()` as many times as the clock requires, then draws. Every per-step change (speeds, counters) goes inside `krokGry`.
- Sounds are synthesized with Web Audio where possible. Image or sound files go in an `obrazki/` or `dzwieki/` folder.

## Code conventions

- Names of variables and functions in Polish without diacritics (`bohater`, `szybkosc`, `nowyWrog`), so Jaś can read them.
- Comments in Polish, short, explaining *what* a part does in kid language.
- Prefer simple, readable code over clever code. Avoid classes, arrow-function chains and abstractions he can't follow.
- Things Jaś may want to change by hand (maps, speeds, colours, names) sit at the top of a file as named constants.
- When `game.js` grows large, split it into a few files by topic, loaded with separate `<script>` tags in order.
- Keep the game's `CLAUDE.md` current: after adding a feature, update its description of the game and code.
