# CLAUDE.md

The rules for talking to Jaś, building and code style are in `../CLAUDE.md`. This file describes only this game.

## The game

Sudoku: a paper sudoku for one player, on a phone or a computer. It is for Pawel (an adult), so the screen stays quiet: off-white paper, thin grey lines, thick box lines, printed givens in a serif face, the player's digits in a pencil handwriting font. No gradients and no red marks while typing.

Once the page has been opened from the server, a service worker keeps every file, so a later visit works with no network (a long flight). Puzzles are built in the browser, so offline play does not run out. A small optional pack can be fetched when online (`paczki/zestaw-1.json`) and is then remembered on the device. Progress, notes, undo and saved custom puzzles live in `localStorage` under the key `sudoku`.

Sizes: 4×4 (boxes 2×2), 6×6 (2×3), 9×9 (3×3), 12×12 (3×4) and 16×16 (4×4). Symbols are `1-4`, `1-6`, `1-9`, `1-9` plus `A-C`, and `1-9` plus `A-G`. Difficulties are Łatwy, Średni, Trudny and Ekspert. Easy boards keep many givens and only need a naked single. Harder boards leave fewer givens and, from 9×9 up, need a hidden single or a harder step (naked pair, pointing, box-line, hidden pair, naked triple). 4×4 and 6×6 mostly differ by how many givens remain, because those grids stay solvable by simple steps. The bands live in `PASMA` in `silnik.js`.

The player may type any allowed symbol into a cell that was not printed. Nothing blocks a mistake and nothing turns red until Sprawdź. Sprawdź then marks wrong digits (they differ from the solution) and repeats in a row, column or box. Podpowiedź fills the next digit that follows from the grid, with a short Polish note naming the technique, or reveals one correct digit when no simple step is left. Notatki toggles pencil marks. The checkbox "Wymazuj tę cyfrę z notatek obok" (on by default) clears that digit from notes in the same row, column and box. Cofnij and Ponów, and on a keyboard Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y.

Keyboard: arrows move, digits and letters A–G fill the cell, Backspace clears, N toggles notes (N is not a symbol on any size). On a phone the pad sits under the board. A finished correct grid says "Gotowe." without painting the mistakes.

Własna plansza is the editor. The player fills givens, then "Czy jest jedno rozwiązanie?" counts solutions (it stops at two). It says if there is one, none, or more than one, or if the check ran out of time. One solution can be played, saved on the device, and copied as a short code `S1.<size>.<L|M|T|E|W>.<grid>` (`.` is empty). On http(s) the box also contains a link `?p=`. Pasting a code or a link loads it. A link opened in the address bar starts the puzzle when it has one solution.

There is no Node game server. Caddy serves the files. `mise run wdroz` copies them to `/srv/sudoku` and appends this game's site block to the shared Caddyfile. It does not recreate the Caddy container, so other games keep running. The first time, that container still needs the volume and the published port (see How to run).

## How to run

- `mise run serwer` - live reload on port 8082 (Kraina Wiśni uses 8080, Statki 8081).
- `mise run graj` - opens `index.html`. The generator works from a file too. The installable offline copy needs http or https, because a service worker does not run from `file://`.
- `mise run test` - generator, unique-solution check, Sprawdź, hints and the code format.
- `mise run wdroz` - copies the game to the home server. `SERWER` and `DOMENA` live in `mise.local.toml` (not in git). `PORT_SUDOKU` is optional and defaults to 18442. The task uploads `/srv/sudoku`, writes `/srv/caddy/sudoku.Caddyfile`, and splices that block into `/srv/caddy/Caddyfile` between `# BEGIN sudoku` and `# END sudoku`. It reloads Caddy when the container is already running and does not deploy by itself in the sense of recreating containers.

One-time change on the shared `caddy` container, when a quiet moment is fine (it briefly drops the other games):

- mount `-v /srv/sudoku:/srv/sudoku:ro`
- publish `-p 18442:18442` (or whatever `PORT_SUDOKU` is)
- if the port is not 18442, also `-e PORT_SUDOKU=...` (the site block is `{$DOMENA}:{$PORT_SUDOKU:18442}`)

`DOMENA` is already the environment variable Statki's Caddy uses. Do not put the real domain or the forwarded port's private notes in git. Suggested public port: 18442.

## Code structure

HTML buttons, not a canvas. There is no `krokGry` loop: nothing moves on its own. A new puzzle is built in small slices so a 16×16 board does not freeze the phone.

- `silnik.js` - rules shared by the page and by `node --test`. Sizes in `ROZMIARY`, difficulty bands in `PASMA`. `wzorzec` / `wymieszaj` build a full valid grid by shuffling a pattern (fast on a phone). `rozwiazLogicznie` uses naked singles, hidden singles, naked pairs, pointing, box-line, hidden pairs and (up to 12×12) naked triples. `liczRozwiazania` / `ocenUklad` count solutions up to a limit and a work budget. `generuj` / `noweLosowanie` / `krokLosowania` dig clues down to the band, still with one solution. `sprawdz` marks wrong entries and conflicts. `podpowiedz` names the technique or reveals one correct digit. `koduj` / `dekoduj` are the text code and the `?p=` link. `module.exports` when Node loads the file.
- `game.js` - the screens (menu, play, editor), the pad, notes, undo, localStorage key `sudoku`, the optional pack button, and the service worker registration. It does not register a worker from `file://`.
- `sw.js` - caches the listed files on install. While online it fetches fresh copies and updates the cache. When the network fails it serves the cache, including a puzzle opened with `?p=`.
- `index.html` / `style.css` - paper look. The handwriting font is Patrick Hand in `czcionki/` (SIL OFL, `czcionki/OFL.txt`). Givens fall back to Georgia or Times. The tab icon is `ikona.svg`, plus `ikona-32.png`, `favicon.ico` and `ikona-180.png`.
- `manifest.webmanifest` - installable PWA, `standalone`, paper colour.
- `paczki/zestaw-1.json` - a few ready puzzles. Play does not need them.
- `test.js` - `mise run test`.
- `wdrozenie/Caddyfile` - the site block only.
