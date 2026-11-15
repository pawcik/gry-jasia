---
name: nowa-gra
description: Start a new browser game for Jaś from the szablon/ starter. Use when he says he wants a new game, has an idea for a game, or types /nowa-gra ("nowa gra", "zróbmy nową grę", "mam pomysł na grę").
---

# Nowa gra

Creates a new game folder in the games root (the folder that contains `szablon/` and `monkey/`). Talk to Jaś in Polish, in short simple sentences, as the root `CLAUDE.md` says.

## 1. Ask about the idea

If Jaś already described his idea (in the message or the skill arguments), use it and ask only about what is missing. Ask one question at a time, at most these three:

1. "O czym będzie twoja gra?" (who is the hero and what does the hero do)
2. "Jak się nazywa gra?"
3. "Czy gra ma być płaska, jak rysunek (2D), czy przestrzenna, jak Monkey World (3D)?" Skip this when the idea makes it obvious. When he does not know, choose 2D: it is simpler and quicker to see results.

Do not ask about anything technical.

## 2. Create the folder

- Folder name: the game name in lowercase, no Polish diacritics, words joined with `-` (e.g. "Kosmiczny Kot" becomes `kosmiczny-kot`). If the folder exists, ask Jaś for another name.
- Copy everything from `szablon/` into the new folder.
- In the new folder replace every `NAZWA_GRY` with the game name (`index.html`, `CLAUDE.md`). When the game later saves progress to `localStorage`, use the folder name as the key so games don't overwrite each other.
- For a 3D game: copy `monkey/biblioteki/three.min.js` into `biblioteki/` in the new folder, add `<script src="biblioteki/three.min.js"></script>` before `game.js`, and rewrite `game.js` to a minimal Three.js scene (ground, light, one hero made of simple shapes, camera behind the hero) that keeps the same `krokGry` / `petlaGry` fixed-step loop.

## 3. Make it his game

Do the first small step of his idea so the game is already his: turn the starter square into his hero (simple shapes, his colours), set the title and the hint text under the game. Only one step; the rest comes later, one idea at a time.

Fill in the new folder's `CLAUDE.md`: the "The game" section with his idea in two or three sentences, and "Code structure" with what the files hold now. Leave no placeholder text.

## 4. Save and show

- Add the game to the "Folders" list in the root `CLAUDE.md` (one line: folder and what the game is).
- Commit the new folder and the root `CLAUDE.md` together with the message `Początek gry <nazwa>`. All games share one public repository: before committing, check that no private data went in (see the root `CLAUDE.md`).
- Start it: `mise trust` and `mise run serwer` in the new folder, in the background. If port 8080 is taken by another game, tell Jaś to close the other game's server first. If starting fails for any other reason (e.g. the sandbox blocks opening the browser or the port), don't show him the error: tell him to type `! mise run serwer`, or to double-click `index.html` in the game folder.
- Tell Jaś in two sentences what he sees on the screen and how to move the hero, then suggest one small next idea.
