// ===== Zasady gry w statki =====
// Ten plik jest używany i w przeglądarce, i na serwerze, więc zasady są w jednym miejscu.

// Rodzaje gry: jak duża plansza i jakie statki
var TRYBY = {
  klasyczna: { nazwa: "Klasyczna", opis: "plansza 10×10, 10 statków", rozmiar: 10, statki: [4, 3, 3, 2, 2, 2, 1, 1, 1, 1] },
  szybka: { nazwa: "Szybka", opis: "plansza 7×7, 5 statków", rozmiar: 7, statki: [3, 2, 2, 1, 1] }
};

// Kto wygrywa. Klasycznie zostaje po staremu. Na punkty liczy się tablica.
var SPOSOBY = {
  klasyczny: { nazwa: "Klasycznie", opis: "ostatni ze statkami wygrywa" },
  punkty: { nazwa: "Na punkty", opis: "najwięcej punktów wygrywa" }
};
var RUNDY_DO_WYBORU = [5, 10, 15];
var RUNDY_DOMYSLNIE = 10;

// Trafione pole to 1 punkt. Zatopienie dokłada jeszcze tyle, ile masztów.
function punktyZaStrzal(wynik, dlugosc) {
  if (wynik === "trafiony") return 1;
  if (wynik === "zatopiony") return 1 + dlugosc;
  return 0;
}

// Kto trafiał częściej. Zero strzałów jest gorsze niż same pudła.
function lepszaCelnosc(a, b) {
  if (!a.oddane && !b.oddane) return 0;
  if (!a.oddane) return -1;
  if (!b.oddane) return 1;
  var lewo = a.trafienia * b.oddane;
  var prawo = b.trafienia * a.oddane;
  if (lewo === prawo) return 0;
  return lewo > prawo ? 1 : -1;
}

// Najpierw punkty, potem celność. Zero znaczy remis.
function porownajWyniki(a, b) {
  if (a.punkty !== b.punkty) return b.punkty - a.punkty;
  return -lepszaCelnosc(a, b);
}

// Lista miejsc: 1, 2, 2, 4... przy remisie to samo miejsce.
function ranking(lista) {
  var kopia = [];
  for (var i = 0; i < lista.length; i++) kopia.push(lista[i]);
  kopia.sort(porownajWyniki);
  var wynik = [];
  for (var j = 0; j < kopia.length; j++) {
    var miejsce = j + 1;
    if (j > 0 && porownajWyniki(kopia[j - 1], kopia[j]) === 0) miejsce = wynik[j - 1].miejsce;
    var g = kopia[j];
    wynik.push({
      miejsce: miejsce,
      nr: g.nr,
      imie: g.imie,
      punkty: g.punkty,
      trafienia: g.trafienia,
      oddane: g.oddane
    });
  }
  return wynik;
}
var LITERY = "ABCDEFGHIJ";

// Pole to numer: wiersz * rozmiar + kolumna. Dla ludzi piszemy np. "B5".
function nazwaPola(pole, rozmiar) {
  return LITERY.charAt(pole % rozmiar) + (Math.floor(pole / rozmiar) + 1);
}

// Wszystkie pola dookoła (także po skosie)
function sasiedzi(pole, rozmiar) {
  var w = Math.floor(pole / rozmiar);
  var k = pole % rozmiar;
  var lista = [];
  for (var dw = -1; dw <= 1; dw++) {
    for (var dk = -1; dk <= 1; dk++) {
      if (dw === 0 && dk === 0) continue;
      var nw = w + dw;
      var nk = k + dk;
      if (nw >= 0 && nw < rozmiar && nk >= 0 && nk < rozmiar) lista.push(nw * rozmiar + nk);
    }
  }
  return lista;
}

// Z listy statków { w, k, dlugosc, poziomo } robi flotę dla danego trybu.
// Zwraca null, gdy statki wychodzą poza planszę, nachodzą na siebie albo się stykają.
// calaFlota = true sprawdza też, czy są dokładnie te statki, które trzeba.
function zbudujFlote(lista, tryb, calaFlota) {
  if (!Array.isArray(lista)) return null;
  var rozmiar = tryb.rozmiar;
  if (calaFlota) {
    if (lista.length !== tryb.statki.length) return null;
    var mamy = [];
    for (var m = 0; m < lista.length; m++) mamy.push(Number(lista[m].dlugosc));
    mamy.sort();
    var trzeba = tryb.statki.slice().sort();
    for (var t = 0; t < trzeba.length; t++) {
      if (mamy[t] !== trzeba[t]) return null;
    }
  }

  var naPolu = [];  // który statek stoi na polu (-1 = woda)
  for (var p = 0; p < rozmiar * rozmiar; p++) naPolu.push(-1);
  var statki = [];

  for (var i = 0; i < lista.length; i++) {
    var s = lista[i];
    var w = Number(s.w);
    var k = Number(s.k);
    var dlugosc = Number(s.dlugosc);
    if (!Number.isInteger(w) || !Number.isInteger(k) || !Number.isInteger(dlugosc) || dlugosc < 1 || dlugosc > 4) return null;
    var pola = [];
    for (var j = 0; j < dlugosc; j++) {
      var ww = s.poziomo === true ? w : w + j;
      var kk = s.poziomo === true ? k + j : k;
      if (ww < 0 || ww >= rozmiar || kk < 0 || kk >= rozmiar) return null;
      var pole = ww * rozmiar + kk;
      if (naPolu[pole] !== -1) return null;
      naPolu[pole] = i;
      pola.push(pole);
    }
    statki.push({ pola: pola, trafione: 0 });
  }

  // Statki nie mogą się stykać, nawet rogami
  for (var q = 0; q < naPolu.length; q++) {
    if (naPolu[q] === -1) continue;
    var obok = sasiedzi(q, rozmiar);
    for (var n = 0; n < obok.length; n++) {
      if (naPolu[obok[n]] !== -1 && naPolu[obok[n]] !== naPolu[q]) return null;
    }
  }
  return { statki: statki, naPolu: naPolu };
}

// Ustawia całą flotę losowo
function losujFlote(tryb) {
  for (var proba = 0; proba < 100; proba++) {
    var lista = [];
    var udalo = true;
    for (var i = 0; i < tryb.statki.length && udalo; i++) {
      var postawiony = false;
      for (var t = 0; t < 200 && !postawiony; t++) {
        var kandydat = {
          w: Math.floor(Math.random() * tryb.rozmiar),
          k: Math.floor(Math.random() * tryb.rozmiar),
          dlugosc: tryb.statki[i],
          poziomo: Math.random() < 0.5,
          nr: i
        };
        if (zbudujFlote(lista.concat([kandydat]), tryb, false)) {
          lista.push(kandydat);
          postawiony = true;
        }
      }
      if (!postawiony) udalo = false;
    }
    if (udalo) return lista;
  }
  return [];
}

// Serwer (Node) bierze zasady stąd
if (typeof module !== "undefined") {
  module.exports = {
    TRYBY: TRYBY,
    SPOSOBY: SPOSOBY,
    RUNDY_DO_WYBORU: RUNDY_DO_WYBORU,
    RUNDY_DOMYSLNIE: RUNDY_DOMYSLNIE,
    punktyZaStrzal: punktyZaStrzal,
    lepszaCelnosc: lepszaCelnosc,
    porownajWyniki: porownajWyniki,
    ranking: ranking,
    nazwaPola: nazwaPola,
    sasiedzi: sasiedzi,
    zbudujFlote: zbudujFlote,
    losujFlote: losujFlote
  };
}
