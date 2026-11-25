# Gry Jasia

Gry w przeglądarce, które Jaś wymyśla, a tata i [Claude Code](https://claude.com/claude-code) pomagają mu je zbudować.
Wszystko to zwykły HTML i JavaScript: bez instalowania, bez budowania.

*Browser games designed by a kid and built together with his dad and Claude Code. Plain HTML and JavaScript, no build step.*

| Gra | Co to jest | Jak zagrać |
|---|---|---|
| [`monkey/`](monkey/) | Monkey World: przygoda małpki Kiko w 3D, wilki, skarby, wioska | otwórz `index.html` |
| [`kraina-wisni/`](kraina-wisni/) | Kraina Wiśni: lisi duszek z mieczem w dawnej Japonii, dwa drążki na telefonie, gra z innymi w tym samym Wi-Fi | `mise run serwer` albo otwórz `index.html` |
| [`statki/`](statki/) | Statki dla całej rodziny: 2 i więcej graczy, telefony i komputery razem, wersja klasyczna i szybka | `mise run serwer` |
| [`sudoku/`](sudoku/) | Sudoku jak na papierze: 4×4 do 16×16, też bez sieci po pierwszym otwarciu | otwórz `index.html` albo `mise run serwer` |
| [`szablon/`](szablon/) | Początek każdej nowej gry | |

## Uruchamianie

Gry jednoosobowe działają po dwukliku w `index.html`. Gry dla wielu graczy mają mały serwer w Node.js (tylko wbudowane moduły); narzędzia instaluje [mise](https://mise.jdx.dev):

```sh
cd statki
mise run serwer
```

Serwer pokazuje adres, który trzeba otworzyć na telefonie w tym samym Wi-Fi.

## Jak powstają gry

Plik [`CLAUDE.md`](CLAUDE.md) mówi Claude Code, jak pomagać dziecku: po polsku, prostymi słowami, małymi krokami. Nowa gra zaczyna się od `/nowa-gra` (umiejętność w [`.claude/skills/nowa-gra`](.claude/skills/nowa-gra/SKILL.md)).

Gry 3D używają [three.js](https://threejs.org) r128 (licencja MIT), dołączonego w folderach `biblioteki/`.
