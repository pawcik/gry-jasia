# CLAUDE.md

The rules for talking to Jaś, building and code style are in `../CLAUDE.md`. This file describes only this page. It is not a game: do not copy `szablon/` here and do not add a game loop.

## The page

Start: a calm landing page for the family. It shows a grid of tiles, one per game. Each tile has a name, an emoji and one Polish sentence, and the whole tile is a link to that game. Plain HTML and CSS. Caddy serves the files. There is no build step and no game server.

The list lives in one place: the array `GRY` in `gry.js`. Adding a game is one line:

```js
{ nazwa: "Nowa", opis: "Jedno zdanie po polsku.", port: 18444, ikona: "🎲" },
```

`port` is the public port on the same host as this page. The browser builds the link from the page's own protocol and hostname plus that port, so the real domain stays out of git. On the home server, Statki is port 18441 and Sudoku is port 18442, which is the same place the tiles open. An optional `adres` replaces the built link when a game is not on this host. Leave `adres` out otherwise: a full URL would put the domain in git.

Do not put the domain, the server name, an IP or router notes in this folder.

## How to run

- `mise run serwer` - live reload on port 8083 (Kraina Wiśni uses 8080, Statki 8081, Sudoku 8082).
- `mise run graj` - opens `index.html`. The tiles still render from a file. The links need http or https, because a file has no hostname.
- `mise run wdroz` - copies the page to the home server. `SERWER` and `DOMENA` live in `mise.local.toml` (not in git). `PORT_START` is optional and defaults to 18440. The task uploads `/srv/start`, writes `/srv/caddy/start.Caddyfile`, and splices that block into `/srv/caddy/Caddyfile` between `# BEGIN start` and `# END start`. It reloads Caddy when the container is already running and does not recreate it, so the games keep running.

Suggested public port: 18440. Statki is 18441, Sudoku is 18442. 18443 is the LAN preview; this page does not use it.

One-time change on the shared `caddy` container, when a quiet moment is fine (it briefly drops the other games):

- mount `-v /srv/start:/srv/start:ro`
- publish `-p 18440:18440` (or whatever `PORT_START` is)
- if the port is not 18440, also `-e PORT_START=...` (the site block is `{$DOMENA}:{$PORT_START:18440}`)

`DOMENA` is already the environment variable the other games' Caddy uses.

## Code structure

- `gry.js` - the only list of games (`GRY`). One object per line: `nazwa`, `opis`, `ikona`, and `port` (or `adres`).
- `strona.js` - builds one tile per line. `adresGry` makes the link. Text goes in with `textContent`.
- `index.html` / `style.css` - light paper page. One column of wide tiles on a phone, two columns from 720px. Safe areas for an iPhone. The whole tile is the link, tall enough for a finger.
- `ikona.svg` - the tab icon: two small tiles.
- `wdrozenie/Caddyfile` - this site's block only. `mise run wdroz` inserts it and does not replace the shared Caddyfile.
