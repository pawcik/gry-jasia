# CLAUDE.md

The rules for talking to Jaś, building and code style are in `../CLAUDE.md`. This file describes only this game.

## The game

NAZWA_GRY: (describe the idea here: who the hero is, what the hero does, how the game is won or lost).

## How to run

- `mise run serwer` - local server with live reload on port 8080. Use this while developing.
- `mise run graj` - just opens `index.html` in the browser.

## Code structure

2D game drawn on `<canvas id="plansza">` with the 2D context.

- `game.js` - the whole game. Constants Jaś can change by hand are at the top (`SZYBKOSC`, `KOLOR_TLA`, `KOLOR_BOHATERA`). The hero `bohater` keeps `x`, `y`, `rozmiar`. `klawisze` holds the keys pressed right now. `krokGry()` moves the hero (arrows or WASD) 60 times per second, `rysuj()` paints the background and the hero, `petlaGry()` runs the steps and then draws. P toggles `pauza`.
- `index.html` / `style.css` - full-window canvas with the title, `#punkty` and the hint text `.podpowiedz` laid over it.
