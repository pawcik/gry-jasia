// ===== MAPY ŚWIATA =====
// Każdy poziom ma swoją mapę. Tu możesz rysować swój świat!
// Każda litera to jeden kawałek ziemi.
// Zmień literę, zapisz plik i zobacz, co się stało.
//
//   .  trawa        P  piasek
//   T  drzewo       W  woda
//   K  kamień       D  domek (DD nad DD = duży dom)
//   B  banan (do zebrania)
//   S  tu zaczyna małpka
//   =  mostek nad wodą
//   U  studnia
//   X  ukryty skarb
//   G  gwiazdki do rzucania
//   Z  wojownik (goni małpkę!)
//   M  kij bojowy (pokonuje wojowników)
//
// Ważne: w jednej mapie każdy wiersz musi mieć tyle samo liter!

const MAPY = [
  // ----- Poziom 1: Łąka -----
  [
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    "T..........TTT.........B.......KKK.....T",
    "T...S......TTT.................KKK..B..T",
    "T..........................T...........T",
    "T.......DD...B.........TTTTT....T......T",
    "T.......DD.............T...............T",
    "T....TTT.......WWWWW...T....B..........T",
    "T....TBT......WWWWWWW..T.......KK......T",
    "T....T.T.....=========.........KK......T",
    "T.............WWWWWWWPP................T",
    "T..B...........WWWWPPP......TTT........T",
    "T................PPPP.......TBT........T",
    "T...........................T.T........T",
    "TTTTTTTTTTTT...TTTTTTTTTTTTTT.TTTTTTTTTT",
    "T.............................Z........T",
    "T...KKK.......B..........WWWW......B...T",
    "T...K.K..................WWWW..........T",
    "T...KBK.......TTT........WWWW..........T",
    "T.............TMT......................T",
    "T......B......T........DD.....KKKKK....T",
    "T.............ZZZ......DD..............T",
    "T....WWWWWWWW......B..........K...K....T",
    "T....WWWWWWWW.................K.B.K....T",
    "T..............................K.K.....T",
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  ],

  // ----- Poziom 2: Las -----
  [
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    "T.S....T....T.....T.....B....T",
    "T......T..B.T..T..T..T.......T",
    "T..TT..T....T..T.....T..TTT..T",
    "T..TB.......T..T..TTTT..TB...T",
    "T..TT..TTTTTT..T.............T",
    "T..............TTTTT..Z..TTT.T",
    "TTTTT..T..B..............T...T",
    "T......T.....TTTTTT...T..T.B.T",
    "T..B...TTTT..T....T...TTTT...T",
    "T......T.....T.M..T..........T",
    "T..TTTTT.....T....T....B.....T",
    "T............TT..TT..TTTTTT..T",
    "T..B....T......ZZZ......T....T",
    "T.......T..........B.........T",
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  ],

  // ----- Poziom 3: Pustynia -----
  [
    "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
    "KSPPPPPPPPPPPPKKPPPPPPPPPPBPPK",
    "KPPPPPPBPPPPPPPPPPPPPKPPPPPPPK",
    "KPPKKPPPPPPPPPPPPWWPPKPPPZPPPK",
    "KPPKKPPPPPZPPPPPWWWWPPPPPPPPPK",
    "KPPPPPPPPPPPPPPPWWWWPPPPBPPPPK",
    "KPPPPBPPPKKKPPPPPWWPPPPPPPPPPK",
    "KPPPPPPPPKPPPPPPPPPPPPKKKKKPPK",
    "KPPKKKPPPKPPBPPPPPPPPPKPPPKPPK",
    "KPPKPPPPPPPPPPPPPKPPPPKPMPKPPK",
    "KPPKPBPPPPPPPPPPPKPPPPKPPPKPPK",
    "KPPPPPPPPPPPPPPPPPPPPPKKPKKPPK",
    "KPPPPPPPPKKPPPPBPPPPPPPZZZPPPK",
    "KPPBPPPPPKKPPPPPPPPPPPPPPPPBPK",
    "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
  ],

  // ----- Poziom 4: Wyspy -----
  [
    "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    "W.S...B.WWWWWWWWWWWW...B....WW",
    "W.......=============.......WW",
    "W...B...WWWWWWWWWWWW....Z...WW",
    "WW.....WWWWWWWWWWWWWW......WWW",
    "WWWW=WWWWWWWWWWWWWWWWWW=WWWWWW",
    "WWWW=WWWWWW......WWWWWW=WWWWWW",
    "WW.....WWW...TTT..WWW.....B.WW",
    "W...B...===..TMT..===.......WW",
    "W.Z.....WWW..T.T..WWW...Z...WW",
    "WW......WWW..ZZZ..WWW.......WW",
    "WWW....WWWWW.....WWWW..B..WWWW",
    "WWWW=WWWWWWWWWWWWWWWWWWW=WWWWW",
    "WWW....B....WWWWWWWW......B.WW",
    "WWW.........PPPPPPPP........WW",
    "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  ],

  // ----- Poziom 5: Góry -----
  [
    "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
    "KS.....K.......KKK......B....K",
    "K..KK..K..KKK..KKK..KKK......K",
    "K..KK..K..K.B..........K..Z..K",
    "K......K..K....KKKKK...K.....K",
    "KKKK..KK..KKKKKK...K...KKKK..K",
    "K.........Z........K.........K",
    "K..B..KKKKKK..KKK..KKKKK..B..K",
    "K.....K.......K.K............K",
    "KKK...K..KKK..K.KKKKK..KKKKKKK",
    "K.....K..KMK.....Z...........K",
    "K..B.....K.K.......KKKK...B..K",
    "K..KKKK..ZZZ..KKK..K.....KK..K",
    "K.......B.....K.....B.......KK",
    "KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK",
  ],

  // ----- Poziom 6: Wioska -----
  [
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    "T.S..........................T",
    "T....DD....DD....DD.....B.DD.T",
    "T..B.DD....DD....DD.......DD.T",
    "T..........................Z.T",
    "T.....Z......PPPPPP....DD..B.T",
    "T....DD......P....P....DD....T",
    "T....DD......P.B..P..........T",
    "T............PPPPPP.......B..T",
    "T..WWWW....TTTTT.....DD......T",
    "T..WWWW....T.M.T.....DD..DD..T",
    "T..B.......T...T.........DD..T",
    "T...DD.....TT.TT...B..DD.Z...T",
    "T...DD......ZZZ.......DD..B..T",
    "T............................T",
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  ],

  // ----- Poziom 7: Labirynt -----
  [
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    "TS....T.....B....T.......T..BT",
    "T.TTT.T.TTTTTTT..T.TTTTT.T.T.T",
    "T.T...T.......T....T...T...T.T",
    "T.T.TTTTTTT.T.TTTTTT.T.TTTTT.T",
    "T.T.....B.T.T........T....Z..T",
    "T.TTTTT.T.T.TTTTTTTTTTTTT.TTTT",
    "T.....T.T...T.......B...T....T",
    "TTTTT.T.TTTTT.TTTTTTTTT.TTTT.T",
    "T.Z...T.....T.T.......T......T",
    "T.TTTTTTTTT.T.T.TTTTT.TTTTTT.T",
    "T.....B...T...T.TMT.T.....Z..T",
    "T.TTTTTTT.TTTTT.T.T.TTTTTTT..T",
    "T.........Z......ZZZ.....B...T",
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  ],
];

// Jak wygląda każda litera.
//   kolor  - kolor ziemi
//   rzecz  - co stoi na ziemi (drzewo, kamien, domek, banan, woda, wojownik, kij)
//   sciana - true = małpka nie może tędy przejść
const KAFELKI = {
  ".": { kolor: "#7cb342" },
  "S": { kolor: "#7cb342" },
  "P": { kolor: "#ffe082" },
  "W": { kolor: "#29b6f6", rzecz: "woda", sciana: true },
  "T": { kolor: "#689f38", rzecz: "drzewo", sciana: true },
  "K": { kolor: "#7cb342", rzecz: "kamien", sciana: true },
  "D": { kolor: "#7cb342", rzecz: "domek", sciana: true },
  "B": { kolor: "#7cb342", rzecz: "banan" },
  "Z": { kolor: "#7cb342", rzecz: "wojownik" },
  "M": { kolor: "#7cb342", rzecz: "patyk" },
  "=": { kolor: "#29b6f6", rzecz: "mostek" },
  "U": { kolor: "#7cb342", rzecz: "studnia", sciana: true },
  "X": { kolor: "#7cb342" }, // tu jest ukryty skarb
  "G": { kolor: "#7cb342", rzecz: "gwiazdki", sciana: true }, // postument z gwiazdkami do rzucania
};
