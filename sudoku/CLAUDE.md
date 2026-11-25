# CLAUDE.md

The rules for talking to Jaś, building and code style are in `../CLAUDE.md`. This file describes only this game.

## The game

Sudoku: a paper sudoku for one player, on a phone or a computer. It is for Pawel (an adult), so the screen stays quiet: off-white paper, thin grey lines, thick box lines, printed givens in a serif face, the player's digits in a pencil handwriting font. No gradients and no red marks while typing.

Once the page has been opened from the server, a service worker keeps every file, so a later visit works with no network (a long flight). Puzzles are built in the browser, so offline play does not run out. A small optional pack can be fetched when online (`paczki/zestaw-1.json`) and is then remembered on the device. Progress, notes, undo and saved custom puzzles live in `localStorage` under the key `sudoku`.

A quiet clock sits on the same line as the size and difficulty (for example 9×9 · Średni). It shows elapsed time as m:ss, and as h:mm:ss after an hour. It runs only while the page is visible (`visibilitychange` pauses it; coming back resumes it). Hiding the digits does not stop it. It stops when the grid is solved. The solved line is „Gotowe w 4:12.” Sprawdź on a finished grid says „Wszystko się zgadza. Czas: 4:12.” Nowa, and any fresh start of a puzzle, begins at 0:00. Milliseconds for the current puzzle are stored on the saved game as `gra.czas`. The show/hide choice is `pokazCzas` in the same `sudoku` blob (default true). A tap on the time hides it and leaves the word „czas”; the checkbox „Pokaż czas” in the menu shows it again. Old saves without these fields still open.

A newer copy does not take over by itself. When one is waiting, a slim paper strip under the title says „Jest nowa wersja”, with Odśwież and Nie teraz. It does not cover the board. Odśwież posts `{type:'SKIP_WAITING'}` to the waiting worker, that worker calls `skipWaiting()`, and the page reloads once (`controllerchange`, with a guard so it does not reload in a loop). The strip stays hidden on the first install, when nothing was controlling the page yet. Opening the app and coming back to it (`visibilitychange`) calls `registration.update()`. The reload does not clear the `sudoku` save.

A faint line at the bottom of the page shows the copy's version, for example „wersja 2026-11-25 19:52 a2b0af3”. It sits under every screen and is not a menu entry. A tap opens `zmiany.html`, the list of what the player can see, newest first, with „Wróć do gry” back to the board. Locally the line says „wersja dev”. The number is the commit time of `HEAD` in Asia/Bangkok (`YYYY-MM-DD HH:MM`) plus the short git sha. Bangkok does not change its clock for summer, so one commit always prints the same text. The `wersja: 1` field inside the `sudoku` localStorage save is the save format and stays as it is.

Sizes: 4×4 (boxes 2×2), 6×6 (2×3), 9×9 (3×3), 12×12 (3×4) and 16×16 (4×4). Symbols are `1-4`, `1-6`, `1-9`, `1-9` plus `A-C`, and `1-9` plus `A-G`. Difficulties are Łatwy, Średni, Trudny and Ekspert. Easy boards keep many givens and only need a naked single. Harder boards leave fewer givens and, from 9×9 up, need a hidden single or a harder step (naked pair, pointing, box-line, hidden pair, naked triple). 4×4 and 6×6 mostly differ by how many givens remain, because those grids stay solvable by simple steps. The bands live in `PASMA` in `silnik.js`.

The player may type any allowed symbol into a cell that was not printed. Nothing blocks a mistake and nothing turns red until Sprawdź. Sprawdź then marks wrong digits (they differ from the solution) and repeats in a row, column or box. Podpowiedź fills the next digit that follows from the grid. The button and the H key first ask „Na pewno chcesz podpowiedź?” in a small paper dialog (Tak / Anuluj), not `window.confirm`, so an installed copy behaves the same way. The dialog has „Nie pytaj więcej”; that choice is `pytajPrzedPodpowiedzia` in the `sudoku` localStorage blob and the checkbox „Pytaj przed podpowiedzią” turns it back on. After a hint, the cell, its row, column or box, and the cells that rule out other digits are marked, and a paper tooltip by the cell names the technique (Naga pojedyncza, Ukryta pojedyncza, Naga para, Wskazanie, Linia kwadratu, Ukryta para, Naga trójka, or Bez prostego kroku), gives a one-sentence definition, and a short concrete Polish explanation of this exact step. The reveal fallback says plainly that there was no simple step. A tap outside or Zamknij closes the tooltip. Notatki toggles pencil marks. The checkbox "Wymazuj tę cyfrę z notatek obok" (on by default) clears that digit from notes in the same row, column and box. Cofnij and Ponów, and on a keyboard Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y.

Keyboard: arrows move, digits and letters A–G fill the cell, Backspace clears, N toggles notes, H asks for a hint (N and H are not symbols on any size). On a phone the pad sits under the board. Its last key is a small eraser icon (`aria-label` and `title` „Wyczyść”), the same size as a digit key, so the word „czyść” does not spill out of the button on a narrow phone. A finished correct grid says "Gotowe w 4:12." (the final time) without painting the mistakes.

Holding a cell that is not a printed given (about 450 ms; a small finger wobble still counts, a real move cancels) selects it and opens a small paper popover beside the cell. A mouse does the same with a press-and-hold or a right-click. The popover lists every symbol for that size in the box shape (2×2, 3×2, 3×3, 4×3 or 4×4), an eraser, and a two-state switch „Wpis / Notatka”. That switch belongs only to the popover and never changes the Notatki button under the board. Each time the popover opens it starts in the opposite of that button (Notatki off → Notatka, Notatki on → Wpis), so a long press writes the other way at once and the pad under the board stays on the main mode. In Wpis, a symbol fills the cell (same undo, the same „Wymazuj tę cyfrę z notatek obok” clear, and the same save as the pad) and the popover closes. In Notatka, a symbol toggles that candidate, filled keys show the notes already set, the digits use the pencil font, and the popover stays open. A tap outside or Escape closes it. It flips right, left, below or above so it stays inside the viewport, including safe areas, and the keys stay finger-sized on a 16×16 board on a phone. A short tap still only selects the cell, and the pad under the board is unchanged. The board and the popover set `-webkit-touch-callout: none` and `user-select: none`, `contextmenu` is cancelled, and `touch-action: manipulation` keeps a double tap from zooming the page.

Własna plansza is the editor. The player fills givens, then "Czy jest jedno rozwiązanie?" counts solutions (it stops at two). It says if there is one, none, or more than one, or if the check ran out of time. One solution can be played, saved on the device, and copied as a short code `S1.<size>.<L|M|T|E|W>.<grid>` (`.` is empty). On http(s) the box also contains a link `?p=`. Pasting a code or a link loads it. A link opened in the address bar starts the puzzle when it has one solution.

There is no Node game server. Caddy serves the files. `mise run wdroz` stamps the version into a temporary copy, uploads that copy to `/srv/sudoku`, and appends this game's site block to the shared Caddyfile. It does not recreate the Caddy container, so other games keep running. The first time, that container still needs the volume and the published port (see How to run).

## How to run

- `mise run serwer` - live reload on port 8082 (Kraina Wiśni uses 8080, Statki 8081).
- `mise run graj` - opens `index.html`. The generator works from a file too. The installable offline copy needs http or https, because a service worker does not run from `file://`.
- `mise run test` - generator, unique-solution check, Sprawdź, hints, the code format, where the quick-entry popover sits, the offline update strip, the version stamp, and the puzzle clock.
- `mise run wdroz` - copies the game to the home server. `SERWER`, `DOMENA` and `PORT_SUDOKU` live in `mise.local.toml` (not in git). The task stamps the version into a temporary copy (see Version on deploy), uploads that copy to `/srv/sudoku`, writes `/srv/caddy/sudoku.Caddyfile`, and splices that block into `/srv/caddy/Caddyfile` between `# BEGIN sudoku` and `# END sudoku`. It reloads Caddy when the container is already running and does not deploy by itself in the sense of recreating containers. The git checkout keeps `dev`.

One-time change on the shared `caddy` container, when a quiet moment is fine (it briefly drops the other games):

- mount `-v /srv/sudoku:/srv/sudoku:ro`
- publish the port from `PORT_SUDOKU` (`-p` that port to itself)
- pass `-e PORT_SUDOKU=...` (the site block is `{$DOMENA}:{$PORT_SUDOKU}`)

`DOMENA` is already the environment variable Statki's Caddy uses. Do not put the real domain or the forwarded port in git.

## Version on deploy

The footer and the service-worker cache share one version string: the commit time of `HEAD` in Asia/Bangkok (`YYYY-MM-DD HH:MM`) and the 7-character sha, for example `2026-11-25 19:52 a2b0af3`. The cache name is `sudoku-` plus that string. A new commit changes the bytes of `sw.js`, so an already installed copy shows „Jest nowa wersja” and Odśwież. Activate still deletes every cache whose name is not the current one. The `localStorage` key stays `sudoku`.

Git keeps the placeholder `WERSJA_GRY = "dev"` and `CACHE = "sudoku-dev"`, so `mise run serwer` needs nothing extra.

`mise run wdroz` copies the files into a temporary folder, runs `node wstaw-wersje.js` on that copy, then uploads the copy. It leaves the checkout as `dev`.

The same stamp is a separate step, so a deploy from another machine with GNU tar over ssh can do it before `tar` (no macOS tar flags):

```
cd sudoku
WERSJA=$(node wstaw-wersje.js --wypisz)
STAGE=$(mktemp -d)
mkdir -p "$STAGE/pliki"
tar --exclude=.git --exclude=.DS_Store --exclude=.claude --exclude=wdrozenie --exclude=CLAUDE.local.md --exclude=mise.local.toml -cf "$STAGE/zrodlo.tar" .
tar -xf "$STAGE/zrodlo.tar" -C "$STAGE/pliki"
node wstaw-wersje.js "$STAGE/pliki" "$WERSJA"
tar -C "$STAGE/pliki" -czf - . | ssh "$SERWER" 'mkdir -p /srv/sudoku && tar -xzf - -C /srv/sudoku'
rm -rf "$STAGE"
```

`node wstaw-wersje.js --wypisz` only prints the version (date, time, short sha). `node wstaw-wersje.js <folder> [version]` rewrites `sw.js` and `wersja.js` in that folder. With no version it reads `HEAD` from the current directory, so run it in the git checkout and pass the staging folder. A version by hand looks like `2026-11-25 19:52` or `2026-11-25 19:52 a2b0af3`. The short sha is what makes two commits in the same minute still change `sw.js`. After the files are on the server, the Caddy steps are the same ones inside `mise run wdroz`.

## Changelog

`zmiany.html` lists what the player can see. The newest entry is first. Each entry has the time that change landed on `main`, in Asia/Bangkok (`YYYY-MM-DD HH:MM`), and a short plain-Polish sentence. The faint version in the footer links here. „Wróć do gry” goes back to `index.html`. The service worker caches `./zmiany.html` with the other files, so the list works offline.

Every future player-visible change must add an entry at the top of `zmiany.html` in the same change. A change only a developer sees (a refactor, a test, a comment) stays off the list.

## Code structure

HTML buttons, not a canvas. There is no `krokGry` loop: the board does not animate. The clock is a short interval while the page is visible. A new puzzle is built in small slices so a 16×16 board does not freeze the phone.

- `silnik.js` - rules shared by the page and by `node --test`. Sizes in `ROZMIARY`, difficulty bands in `PASMA`. `wzorzec` / `wymieszaj` build a full valid grid by shuffling a pattern (fast on a phone). `rozwiazLogicznie` uses naked singles, hidden singles, naked pairs, pointing, box-line, hidden pairs and (up to 12×12) naked triples. `liczRozwiazania` / `ocenUklad` count solutions up to a limit and a work budget. `generuj` / `noweLosowanie` / `krokLosowania` dig clues down to the band, still with one solution. `sprawdz` marks wrong entries and conflicts. `podpowiedz` names the technique or reveals one correct digit. `wyjasnijPodpowiedz` builds the Polish name, definition and the concrete sentence, plus the cells to mark. `koduj` / `dekoduj` are the text code and the `?p=` link. `notatkaNaStarcieOkienka`, `wyborTrybuOkienka` and `okienkoZostaje` choose the popover's own mode (opposite of the main Notatki button when it opens; the switch inside does not change that button; notes keep the popover open). `polozenieSzybkiego`, `ruchAnulujePrzytrzymanie` and `rozmiarKlawiszaSzybkiego` place the quick-entry popover and size its keys. `formatujCzas`, `uplynelo` and `czyCzasIdzie` format the clock and decide when it runs. `module.exports` when Node loads the file.
- `game.js` - the screens (menu, play, editor), the pad, the quick-entry popover, notes, undo, the puzzle clock, localStorage key `sudoku`, the optional pack button, and the service worker registration. It does not register a worker from `file://`. `czyCzekaNowaWersja` shows the update strip only when a controller already exists and a worker is waiting. `czyPrzeladowacStrone` reloads once after Odśwież, not on the first install and not twice. `zapiszTeraz` runs before that reload so the `sudoku` save is already written. `pokazWersje` fills the footer from `WERSJA_GRY` and does not touch the save.
- `wersja.js` - `WERSJA_GRY`. In git it is `"dev"`. Deploy writes the commit version into the staging copy.
- `wstaw-wersje.js` - Node script that prints or writes that version. The page does not load it. `mise run wdroz` and a manual tar deploy both use it.
- `sw.js` - caches the listed files on install under `CACHE`. In git that name is `sudoku-dev`. Deploy writes `sudoku-` plus the same version string, which changes the file bytes. Install does not call `skipWaiting`. A message `{type:'SKIP_WAITING'}` does. Activate deletes older caches and claims clients. While online it fetches fresh copies and updates the cache. When the network fails it serves the cache, including a puzzle opened with `?p=`.
- `index.html` / `style.css` - paper look. The handwriting font is Patrick Hand in `czcionki/` (SIL OFL, `czcionki/OFL.txt`). Givens fall back to Georgia or Times. The tab icon is `ikona.svg`, plus `ikona-32.png`, `favicon.ico` and `ikona-180.png`. The footer link `#stopkaWersji` is the faint version line and opens the changelog.
- `zmiany.html` - the changelog, newest first. Same paper look. „Wróć do gry” returns to `index.html`. Add a player-visible change at the top.
- `manifest.webmanifest` - installable PWA, `standalone`, paper colour.
- `paczki/zestaw-1.json` - a few ready puzzles. Play does not need them.
- `test.js` - `mise run test`.
- `wdrozenie/Caddyfile` - the site block only.
