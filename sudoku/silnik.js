// ===== Silnik sudoku =====
// Ten plik układa plansze, rozwiązuje je i sprawdza wpisane cyfry.
// Działa w przeglądarce i w testach (Node), bez rysowania.

// Rozmiary: n komórek w rzędzie, kwadrat ma wys wierszy i szer kolumn.
var ROZMIARY = {
  "4": { n: 4, wys: 2, szer: 2, znaki: "1234", nazwa: "4×4", opis: "kwadraty 2×2" },
  "6": { n: 6, wys: 2, szer: 3, znaki: "123456", nazwa: "6×6", opis: "kwadraty 2×3" },
  "9": { n: 9, wys: 3, szer: 3, znaki: "123456789", nazwa: "9×9", opis: "kwadraty 3×3" },
  "12": { n: 12, wys: 3, szer: 4, znaki: "123456789ABC", nazwa: "12×12", opis: "kwadraty 3×4" },
  "16": { n: 16, wys: 4, szer: 4, znaki: "123456789ABCDEFG", nazwa: "16×16", opis: "kwadraty 4×4" }
};

// Trudność: im wyższy poziom, tym trudniejszy krok trzeba zobaczyć.
var TRUDNOSCI = {
  latwy: { nazwa: "Łatwy", poziom: 1 },
  sredni: { nazwa: "Średni", poziom: 2 },
  trudny: { nazwa: "Trudny", poziom: 3 },
  ekspert: { nazwa: "Ekspert", poziom: 4 }
};

var LITERA_TRUDNOSCI = { L: "latwy", M: "sredni", T: "trudny", E: "ekspert", W: "wlasna" };
var TRUDNOSC_LITERA = { latwy: "L", sredni: "M", trudny: "T", ekspert: "E", wlasna: "W" };

// Modele wierszy, kolumn i kwadratów liczymy raz na rozmiar.
var MODELE = {};

function modelOpisu(opis) {
  var klucz = opis.n + ":" + opis.wys + ":" + opis.szer;
  if (MODELE[klucz]) return MODELE[klucz];
  var n = opis.n;
  var N = n * n;
  var h = opis.wys;
  var w = opis.szer;
  var jednostki = [];
  var r;
  var c;
  for (r = 0; r < n; r++) {
    var wiersz = [];
    for (c = 0; c < n; c++) wiersz.push(r * n + c);
    jednostki.push(wiersz);
  }
  for (c = 0; c < n; c++) {
    var kolumna = [];
    for (r = 0; r < n; r++) kolumna.push(r * n + c);
    jednostki.push(kolumna);
  }
  var ileBr = n / h;
  var ileBc = n / w;
  var br;
  var bc;
  for (br = 0; br < ileBr; br++) {
    for (bc = 0; bc < ileBc; bc++) {
      var pud = [];
      var dr;
      var dc;
      for (dr = 0; dr < h; dr++) {
        for (dc = 0; dc < w; dc++) pud.push((br * h + dr) * n + (bc * w + dc));
      }
      jednostki.push(pud);
    }
  }
  var sasiedzi = [];
  var i;
  for (i = 0; i < N; i++) sasiedzi.push([]);
  var u;
  for (u = 0; u < jednostki.length; u++) {
    var jed = jednostki[u];
    var a;
    var b;
    for (a = 0; a < jed.length; a++) {
      for (b = 0; b < jed.length; b++) {
        if (a !== b) sasiedzi[jed[a]].push(jed[b]);
      }
    }
  }
  for (i = 0; i < N; i++) {
    var widziane = {};
    var czyste = [];
    var lista = sasiedzi[i];
    var k;
    for (k = 0; k < lista.length; k++) {
      var q = lista[k];
      if (!widziane[q]) {
        widziane[q] = true;
        czyste.push(q);
      }
    }
    sasiedzi[i] = czyste;
  }
  MODELE[klucz] = { jednostki: jednostki, sasiedzi: sasiedzi };
  return MODELE[klucz];
}

function zakres(n) {
  var a = [];
  var i;
  for (i = 0; i < n; i++) a.push(i);
  return a;
}

function tasuj(tab, los) {
  var a = tab.slice();
  var i;
  for (i = a.length - 1; i > 0; i--) {
    var j = Math.floor(los() * (i + 1));
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

// Losowanie, które da się powtórzyć w testach (ta sama liczba na starcie = te same plansze).
function losujZSeed(seed) {
  var s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function bitWartosci(v) {
  return (1 << v) >>> 0;
}

function ileBitow(x) {
  x = x >>> 0;
  var n = 0;
  while (x) {
    x &= x - 1;
    n++;
  }
  return n;
}

function pierwszyBit(x) {
  x = x >>> 0;
  var i = 0;
  while ((x & 1) === 0) {
    x >>>= 1;
    i++;
  }
  return i;
}

function pustePola(opis) {
  var a = [];
  var i;
  var N = opis.n * opis.n;
  for (i = 0; i < N; i++) a.push(-1);
  return a;
}

// Wzór pełnej planszy. Potem tylko mieszamy wiersze, kolumny i cyfry,
// więc plansza dalej jest poprawna, a liczy się to bardzo szybko.
function wzorzec(opis) {
  var n = opis.n;
  var h = opis.wys;
  var w = opis.szer;
  var pola = [];
  var r;
  var c;
  for (r = 0; r < n; r++) {
    for (c = 0; c < n; c++) {
      pola.push((c + Math.floor(r / h) + (r % h) * w) % n);
    }
  }
  return pola;
}

function wymieszaj(opis, los) {
  var n = opis.n;
  var h = opis.wys;
  var w = opis.szer;
  var pola = wzorzec(opis);
  var perm = tasuj(zakres(n), los);
  var i;
  for (i = 0; i < pola.length; i++) pola[i] = perm[pola[i]];
  var wiersze = [];
  var pasma = tasuj(zakres(n / h), los);
  var p;
  for (p = 0; p < pasma.length; p++) {
    var wPasmie = tasuj(zakres(h), los);
    var k;
    for (k = 0; k < h; k++) wiersze.push(pasma[p] * h + wPasmie[k]);
  }
  var kolumny = [];
  var stosy = tasuj(zakres(n / w), los);
  var s;
  for (s = 0; s < stosy.length; s++) {
    var wStosie = tasuj(zakres(w), los);
    var t;
    for (t = 0; t < w; t++) kolumny.push(stosy[s] * w + wStosie[t]);
  }
  var nowe = [];
  var r;
  var c;
  for (r = 0; r < n; r++) {
    for (c = 0; c < n; c++) nowe.push(pola[wiersze[r] * n + kolumny[c]]);
  }
  return nowe;
}

// Czy wpisane cyfry nie kłócą się w wierszu, kolumnie ani kwadracie.
// Puste pola (ujemne) są dozwolone.
function czyPoprawna(opis, pola) {
  if (!pola || pola.length !== opis.n * opis.n) return false;
  var model = modelOpisu(opis);
  var u;
  for (u = 0; u < model.jednostki.length; u++) {
    var widz = {};
    var jed = model.jednostki[u];
    var i;
    for (i = 0; i < jed.length; i++) {
      var v = pola[jed[i]];
      if (v < 0) continue;
      if (v >= opis.n) return false;
      if (widz[v]) return false;
      widz[v] = true;
    }
  }
  return true;
}

function czyPelna(opis, pola) {
  if (!czyPoprawna(opis, pola)) return false;
  var i;
  for (i = 0; i < pola.length; i++) if (pola[i] < 0) return false;
  return true;
}

function zapiszPole(stan, pole) {
  stan.stos.push(pole, stan.wartosc[pole], stan.maska[pole]);
}

function cofnij(stan, doDlugosci) {
  while (stan.stos.length > doDlugosci) {
    var maska = stan.stos.pop();
    var wartosc = stan.stos.pop();
    var pole = stan.stos.pop();
    stan.wartosc[pole] = wartosc;
    stan.maska[pole] = maska;
  }
}

// Wpisz cyfrę i wymaż ją z sąsiadów. Jak się nie da, wołający cofa stos.
function wpisz(stan, pole, v) {
  if (stan.wartosc[pole] === v) return true;
  if (stan.wartosc[pole] !== -1) return false;
  var bit = bitWartosci(v);
  if ((stan.maska[pole] & bit) === 0) return false;
  zapiszPole(stan, pole);
  stan.wartosc[pole] = v;
  stan.maska[pole] = bit;
  var lista = stan.model.sasiedzi[pole];
  var i;
  for (i = 0; i < lista.length; i++) {
    var p = lista[i];
    if (stan.wartosc[p] === v) return false;
    if (stan.maska[p] & bit) {
      zapiszPole(stan, p);
      stan.maska[p] = (stan.maska[p] & ~bit) >>> 0;
      if (stan.maska[p] === 0 && stan.wartosc[p] === -1) return false;
    }
  }
  return true;
}

function nowyStan(opis, pola) {
  var model = modelOpisu(opis);
  var N = opis.n * opis.n;
  var stan = {
    opis: opis,
    model: model,
    n: opis.n,
    N: N,
    h: opis.wys,
    w: opis.szer,
    pelna: (1 << opis.n) - 1,
    wartosc: new Array(N),
    maska: new Array(N),
    stos: [],
    ok: true
  };
  var i;
  for (i = 0; i < N; i++) {
    stan.wartosc[i] = -1;
    stan.maska[i] = stan.pelna;
  }
  for (i = 0; i < N; i++) {
    if (!pola || pola[i] < 0) continue;
    if (pola[i] >= opis.n) {
      stan.ok = false;
      break;
    }
    var punkt = stan.stos.length;
    if (!wpisz(stan, i, pola[i])) {
      cofnij(stan, punkt);
      stan.ok = false;
      break;
    }
  }
  return stan;
}

function kompletne(stan) {
  var i;
  for (i = 0; i < stan.N; i++) if (stan.wartosc[i] < 0) return false;
  return true;
}

function gdzieJednostki(stan, u) {
  if (u < stan.n) return "wiersz";
  if (u < stan.n * 2) return "kolumna";
  return "kwadrat";
}

function znajdzNagaJedynke(stan, preferowane) {
  if (preferowane >= 0 && stan.wartosc[preferowane] < 0 && ileBitow(stan.maska[preferowane]) === 1) {
    return { pole: preferowane, wartosc: pierwszyBit(stan.maska[preferowane]) };
  }
  var i;
  for (i = 0; i < stan.N; i++) {
    if (stan.wartosc[i] !== -1) continue;
    if (ileBitow(stan.maska[i]) === 1) return { pole: i, wartosc: pierwszyBit(stan.maska[i]) };
  }
  return null;
}

// Ukryta jedynka: w wierszu, kolumnie albo kwadracie cyfra ma tylko jedno wolne pole.
function znajdzUkrytaJedynke(stan, preferowane) {
  var pierwsza = null;
  var jednostki = stan.model.jednostki;
  var u;
  for (u = 0; u < jednostki.length; u++) {
    var jed = jednostki[u];
    var zajete = 0;
    var i;
    for (i = 0; i < jed.length; i++) {
      if (stan.wartosc[jed[i]] >= 0) zajete |= bitWartosci(stan.wartosc[jed[i]]);
    }
    var v;
    for (v = 0; v < stan.n; v++) {
      var bit = bitWartosci(v);
      if (zajete & bit) continue;
      var gdzie = -1;
      var ile = 0;
      for (i = 0; i < jed.length; i++) {
        var p = jed[i];
        if (stan.wartosc[p] >= 0) continue;
        if (stan.maska[p] & bit) {
          ile++;
          gdzie = p;
          if (ile > 1 && gdzie !== preferowane) break;
        }
      }
      if (ile !== 1) continue;
      var znal = { pole: gdzie, wartosc: v, gdzie: gdzieJednostki(stan, u), jednostka: jed.slice() };
      if (gdzie === preferowane) return znal;
      if (!pierwsza) pierwsza = znal;
    }
  }
  return pierwsza;
}

function zbierzKasowanie(stan, pola, maskaZakaz) {
  var kasuj = [];
  var i;
  for (i = 0; i < pola.length; i++) {
    var p = pola[i];
    if (stan.wartosc[p] >= 0) continue;
    var extra = stan.maska[p] & maskaZakaz;
    if (!extra) continue;
    var v;
    for (v = 0; v < stan.n; v++) {
      var bit = bitWartosci(v);
      if (extra & bit) kasuj.push({ pole: p, bit: bit });
    }
  }
  return kasuj;
}

function nagaPara(stan) {
  var jednostki = stan.model.jednostki;
  var u;
  for (u = 0; u < jednostki.length; u++) {
    var jed = jednostki[u];
    var puste = [];
    var i;
    for (i = 0; i < jed.length; i++) {
      if (stan.wartosc[jed[i]] < 0) puste.push(jed[i]);
    }
    var a;
    var b;
    for (a = 0; a < puste.length; a++) {
      for (b = a + 1; b < puste.length; b++) {
        var ma = stan.maska[puste[a]];
        if (ma !== stan.maska[puste[b]]) continue;
        if (ileBitow(ma) !== 2) continue;
        var inni = [];
        var k;
        for (k = 0; k < puste.length; k++) {
          if (k !== a && k !== b) inni.push(puste[k]);
        }
        var kasuj = zbierzKasowanie(stan, inni, ma);
        if (kasuj.length) {
          return {
            typ: "kasuj",
            poziom: 3,
            technika: "para",
            kasuj: kasuj,
            pola: [puste[a], puste[b]],
            maska: ma,
            dom: gdzieJednostki(stan, u),
            jednostka: jed.slice()
          };
        }
      }
    }
  }
  return null;
}

function kasujPoza(stan, rAlboC, poKolumnie, br, bc, bit) {
  var kasuj = [];
  var i;
  for (i = 0; i < stan.n; i++) {
    var r = poKolumnie ? i : rAlboC;
    var c = poKolumnie ? rAlboC : i;
    if (Math.floor(r / stan.h) === br && Math.floor(c / stan.w) === bc) continue;
    var p = r * stan.n + c;
    if (stan.wartosc[p] < 0 && (stan.maska[p] & bit)) kasuj.push({ pole: p, bit: bit });
  }
  return kasuj;
}

// Wskazanie: w kwadracie cyfra stoi tylko w jednym wierszu albo jednej kolumnie.
function wskazanie(stan) {
  var n = stan.n;
  var h = stan.h;
  var w = stan.w;
  var ileBr = n / h;
  var ileBc = n / w;
  var br;
  var bc;
  for (br = 0; br < ileBr; br++) {
    for (bc = 0; bc < ileBc; bc++) {
      var v;
      for (v = 0; v < n; v++) {
        var bit = bitWartosci(v);
        var minR = -1;
        var maxR = -1;
        var minC = -1;
        var maxC = -1;
        var ile = 0;
        var zajete = false;
        var wskazane = [];
        var dr;
        var dc;
        for (dr = 0; dr < h && !zajete; dr++) {
          for (dc = 0; dc < w; dc++) {
            var r = br * h + dr;
            var c = bc * w + dc;
            var p = r * n + c;
            if (stan.wartosc[p] === v) {
              zajete = true;
              break;
            }
            if (stan.wartosc[p] < 0 && (stan.maska[p] & bit)) {
              ile++;
              wskazane.push(p);
              if (minR < 0) {
                minR = maxR = r;
                minC = maxC = c;
              } else {
                if (r < minR) minR = r;
                if (r > maxR) maxR = r;
                if (c < minC) minC = c;
                if (c > maxC) maxC = c;
              }
            }
          }
        }
        if (zajete || ile < 2) continue;
        if (minR === maxR) {
          var kasuj = kasujPoza(stan, minR, false, br, bc, bit);
          if (kasuj.length) {
            return {
              typ: "kasuj",
              poziom: 3,
              technika: "wskazanie",
              kasuj: kasuj,
              wartosc: v,
              dom: "wiersz",
              pola: wskazane,
              linia: polaLiniiStan(stan, minR, false)
            };
          }
        }
        if (minC === maxC) {
          var kasujK = kasujPoza(stan, minC, true, br, bc, bit);
          if (kasujK.length) {
            return {
              typ: "kasuj",
              poziom: 3,
              technika: "wskazanie",
              kasuj: kasujK,
              wartosc: v,
              dom: "kolumna",
              pola: wskazane,
              linia: polaLiniiStan(stan, minC, true)
            };
          }
        }
      }
    }
  }
  return null;
}

// Linia: w wierszu albo kolumnie cyfra mieści się w jednym kwadracie.
function liniaWKwadrat(stan) {
  var n = stan.n;
  var r;
  var v;
  for (r = 0; r < n; r++) {
    for (v = 0; v < n; v++) {
      var bit = bitWartosci(v);
      var minC = -1;
      var maxC = -1;
      var ile = 0;
      var zajete = false;
      var miejsca = [];
      var c;
      for (c = 0; c < n; c++) {
        var p = r * n + c;
        if (stan.wartosc[p] === v) {
          zajete = true;
          break;
        }
        if (stan.wartosc[p] < 0 && (stan.maska[p] & bit)) {
          ile++;
          miejsca.push(p);
          if (minC < 0) minC = maxC = c;
          else {
            if (c < minC) minC = c;
            if (c > maxC) maxC = c;
          }
        }
      }
      if (!zajete && ile >= 2 && Math.floor(minC / stan.w) === Math.floor(maxC / stan.w)) {
        var bc = Math.floor(minC / stan.w);
        var br = Math.floor(r / stan.h);
        var kasuj = [];
        var dr;
        var dc;
        for (dr = 0; dr < stan.h; dr++) {
          for (dc = 0; dc < stan.w; dc++) {
            var rr = br * stan.h + dr;
            var cc = bc * stan.w + dc;
            if (rr === r) continue;
            var p2 = rr * n + cc;
            if (stan.wartosc[p2] < 0 && (stan.maska[p2] & bit)) kasuj.push({ pole: p2, bit: bit });
          }
        }
        if (kasuj.length) {
          return {
            typ: "kasuj",
            poziom: 3,
            technika: "linia",
            kasuj: kasuj,
            wartosc: v,
            dom: "wiersz",
            pola: miejsca,
            pudlo: polaPudlaStan(stan, br, bc)
          };
        }
      }
    }
  }
  var c2;
  for (c2 = 0; c2 < n; c2++) {
    for (v = 0; v < n; v++) {
      var bit2 = bitWartosci(v);
      var minR = -1;
      var maxR = -1;
      var ile2 = 0;
      var zajete2 = false;
      var miejsca2 = [];
      for (r = 0; r < n; r++) {
        var p3 = r * n + c2;
        if (stan.wartosc[p3] === v) {
          zajete2 = true;
          break;
        }
        if (stan.wartosc[p3] < 0 && (stan.maska[p3] & bit2)) {
          ile2++;
          miejsca2.push(p3);
          if (minR < 0) minR = maxR = r;
          else {
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
          }
        }
      }
      if (!zajete2 && ile2 >= 2 && Math.floor(minR / stan.h) === Math.floor(maxR / stan.h)) {
        var br2 = Math.floor(minR / stan.h);
        var bc2 = Math.floor(c2 / stan.w);
        var kasuj2 = [];
        var dr2;
        var dc2;
        for (dr2 = 0; dr2 < stan.h; dr2++) {
          for (dc2 = 0; dc2 < stan.w; dc2++) {
            var rr2 = br2 * stan.h + dr2;
            var cc2 = bc2 * stan.w + dc2;
            if (cc2 === c2) continue;
            var p4 = rr2 * n + cc2;
            if (stan.wartosc[p4] < 0 && (stan.maska[p4] & bit2)) kasuj2.push({ pole: p4, bit: bit2 });
          }
        }
        if (kasuj2.length) {
          return {
            typ: "kasuj",
            poziom: 3,
            technika: "linia",
            kasuj: kasuj2,
            wartosc: v,
            dom: "kolumna",
            pola: miejsca2,
            pudlo: polaPudlaStan(stan, br2, bc2)
          };
        }
      }
    }
  }
  return null;
}

function ukrytaPara(stan) {
  var jednostki = stan.model.jednostki;
  var n = stan.n;
  var u;
  for (u = 0; u < jednostki.length; u++) {
    var jed = jednostki[u];
    var v1;
    for (v1 = 0; v1 < n; v1++) {
      var v2;
      for (v2 = v1 + 1; v2 < n; v2++) {
        var b1 = bitWartosci(v1);
        var b2 = bitWartosci(v2);
        var gdzie = [];
        var c1 = 0;
        var c2 = 0;
        var zaDuzo = false;
        var i;
        for (i = 0; i < jed.length; i++) {
          var p = jed[i];
          if (stan.wartosc[p] === v1 || stan.wartosc[p] === v2) {
            zaDuzo = true;
            break;
          }
          if (stan.wartosc[p] >= 0) continue;
          var m = stan.maska[p];
          if ((m & b1) || (m & b2)) {
            gdzie.push(p);
            if (m & b1) c1++;
            if (m & b2) c2++;
            if (gdzie.length > 2) {
              zaDuzo = true;
              break;
            }
          }
        }
        if (zaDuzo || gdzie.length !== 2 || c1 !== 2 || c2 !== 2) continue;
        var dozwolone = (b1 | b2) >>> 0;
        var kasuj = zbierzKasowanie(stan, gdzie, ~dozwolone >>> 0);
        if (kasuj.length) {
          return {
            typ: "kasuj",
            poziom: 4,
            technika: "ukrytaPara",
            kasuj: kasuj,
            pola: gdzie.slice(),
            wartosci: [v1, v2],
            dom: gdzieJednostki(stan, u),
            jednostka: jed.slice()
          };
        }
      }
    }
  }
  return null;
}

function nagaTrojka(stan) {
  var jednostki = stan.model.jednostki;
  var u;
  for (u = 0; u < jednostki.length; u++) {
    var jed = jednostki[u];
    var puste = [];
    var i;
    for (i = 0; i < jed.length; i++) {
      if (stan.wartosc[jed[i]] >= 0) continue;
      var lb = ileBitow(stan.maska[jed[i]]);
      if (lb >= 2 && lb <= 3) puste.push(jed[i]);
    }
    if (puste.length < 3) continue;
    var a;
    for (a = 0; a < puste.length; a++) {
      var b;
      for (b = a + 1; b < puste.length; b++) {
        var c;
        for (c = b + 1; c < puste.length; c++) {
          var uni = (stan.maska[puste[a]] | stan.maska[puste[b]] | stan.maska[puste[c]]) >>> 0;
          if (ileBitow(uni) !== 3) continue;
          var inni = [];
          var k;
          for (k = 0; k < jed.length; k++) {
            var p = jed[k];
            if (p !== puste[a] && p !== puste[b] && p !== puste[c]) inni.push(p);
          }
          var kasuj = zbierzKasowanie(stan, inni, uni);
          if (kasuj.length) {
            return {
              typ: "kasuj",
              poziom: 4,
              technika: "trojka",
              kasuj: kasuj,
              pola: [puste[a], puste[b], puste[c]],
              maska: uni,
              dom: gdzieJednostki(stan, u),
              jednostka: jed.slice()
            };
          }
        }
      }
    }
  }
  return null;
}

// Najprostszy następny krok. maxPoziom ucina trudniejsze sztuczki.
function nastepnyKrok(stan, maxPoziom, preferowane) {
  var naga = znajdzNagaJedynke(stan, preferowane);
  if (naga) return { typ: "wpis", pole: naga.pole, wartosc: naga.wartosc, poziom: 1, technika: "naga" };
  if (maxPoziom < 2) return null;
  var ukryta = znajdzUkrytaJedynke(stan, preferowane);
  if (ukryta) {
    return {
      typ: "wpis",
      pole: ukryta.pole,
      wartosc: ukryta.wartosc,
      poziom: 2,
      technika: "ukryta",
      gdzie: ukryta.gdzie,
      jednostka: ukryta.jednostka
    };
  }
  if (maxPoziom < 3) return null;
  var para = nagaPara(stan);
  if (para) return para;
  var wsk = wskazanie(stan);
  if (wsk) return wsk;
  var lin = liniaWKwadrat(stan);
  if (lin) return lin;
  if (maxPoziom < 4) return null;
  var up = ukrytaPara(stan);
  if (up) return up;
  if (stan.n <= 12) {
    var tr = nagaTrojka(stan);
    if (tr) return tr;
  }
  return null;
}

function zastosuj(stan, krok) {
  var punkt = stan.stos.length;
  var ok = true;
  if (krok.typ === "wpis") {
    ok = wpisz(stan, krok.pole, krok.wartosc);
  } else {
    var i;
    for (i = 0; i < krok.kasuj.length; i++) {
      var z = krok.kasuj[i];
      var p = z.pole;
      if (stan.wartosc[p] !== -1) continue;
      if ((stan.maska[p] & z.bit) === 0) continue;
      zapiszPole(stan, p);
      stan.maska[p] = (stan.maska[p] & ~z.bit) >>> 0;
      if (stan.maska[p] === 0) {
        ok = false;
        break;
      }
    }
  }
  if (!ok) cofnij(stan, punkt);
  return ok;
}

// Rozwiązanie samymi logicznymi krokami, bez zgadywania.
function rozwiazLogicznie(opis, pola, maxPoziom) {
  var stan = nowyStan(opis, pola);
  if (!stan.ok) return { kompletne: false, sprzecznosc: true, poziom: 0, pola: null };
  var poziom = 0;
  var guard = stan.N * 4 + 8;
  while (guard-- > 0 && !kompletne(stan)) {
    var krok = nastepnyKrok(stan, maxPoziom, -1);
    if (!krok) break;
    if (krok.poziom > poziom) poziom = krok.poziom;
    if (!zastosuj(stan, krok)) return { kompletne: false, sprzecznosc: true, poziom: poziom, pola: null };
  }
  return {
    kompletne: kompletne(stan),
    sprzecznosc: false,
    poziom: poziom,
    pola: stan.wartosc.slice()
  };
}

// Stawianie oczywistych cyfr przed zgadywaniem. Dzięki temu liczenie rozwiązań jest krótkie.
function propagujProste(stan) {
  var guard = stan.N + 2;
  while (guard-- > 0) {
    var postawione = false;
    var i;
    for (i = 0; i < stan.N; i++) {
      if (stan.wartosc[i] !== -1) continue;
      var bity = ileBitow(stan.maska[i]);
      if (bity === 0) return false;
      if (bity === 1) {
        if (!wpisz(stan, i, pierwszyBit(stan.maska[i]))) return false;
        postawione = true;
      }
    }
    if (postawione) continue;
    var ukryta = znajdzUkrytaJedynke(stan, -1);
    if (!ukryta) return true;
    if (!wpisz(stan, ukryta.pole, ukryta.wartosc)) return false;
  }
  return false;
}

function szukajRozwiazan(stan, limit, budzet, licznik) {
  if (licznik.ile >= limit) return;
  licznik.wezly++;
  if (licznik.wezly > budzet) {
    licznik.budzet = true;
    return;
  }
  var punkt = stan.stos.length;
  if (!propagujProste(stan)) {
    cofnij(stan, punkt);
    return;
  }
  var puste = -1;
  var najlepsza = 99;
  var i;
  for (i = 0; i < stan.N; i++) {
    if (stan.wartosc[i] !== -1) continue;
    var b = ileBitow(stan.maska[i]);
    if (b < najlepsza) {
      najlepsza = b;
      puste = i;
      if (b <= 1) break;
    }
  }
  if (puste < 0) {
    licznik.ile++;
    if (!licznik.rozwiazanie) licznik.rozwiazanie = stan.wartosc.slice();
    cofnij(stan, punkt);
    return;
  }
  if (najlepsza === 0) {
    cofnij(stan, punkt);
    return;
  }
  var maska = stan.maska[puste];
  var v;
  for (v = 0; v < stan.n; v++) {
    if ((maska & bitWartosci(v)) === 0) continue;
    var przed = stan.stos.length;
    if (wpisz(stan, puste, v)) szukajRozwiazan(stan, limit, budzet, licznik);
    cofnij(stan, przed);
    if (licznik.ile >= limit || licznik.budzet) break;
  }
  cofnij(stan, punkt);
}

// Ile jest rozwiązań. Przestaje liczyć po `limit`, żeby nie szukać w nieskończoność.
function liczRozwiazania(opis, pola, limit, budzet) {
  var stan = nowyStan(opis, pola);
  if (!stan.ok) return { ile: 0, budzet: false, rozwiazanie: null, wezly: 0 };
  var licznik = { ile: 0, budzet: false, rozwiazanie: null, wezly: 0 };
  szukajRozwiazan(stan, limit || 2, budzet || 100000, licznik);
  return { ile: licznik.ile, budzet: licznik.budzet, rozwiazanie: licznik.rozwiazanie, wezly: licznik.wezly };
}

function budzetDla(opis) {
  if (opis.n >= 16) return 40000;
  if (opis.n >= 12) return 60000;
  if (opis.n >= 9) return 120000;
  return 80000;
}

// Pusta plansza edytora, plansza z błędem, albo z jedną / wieloma odpowiedziami.
function ocenUklad(opis, dane, opcje) {
  opcje = opcje || {};
  var i;
  var ileDan = 0;
  for (i = 0; i < dane.length; i++) if (dane[i] >= 0) ileDan++;
  if (!czyPoprawna(opis, dane)) return { stan: "brak", ile: 0, rozwiazanie: null, budzet: false };
  if (ileDan === 0) return { stan: "wiele", ile: 2, rozwiazanie: null, budzet: false };
  var wynik = liczRozwiazania(opis, dane, opcje.limit || 2, opcje.budzet || budzetDla(opis));
  if (wynik.ile >= 2) return { stan: "wiele", ile: wynik.ile, rozwiazanie: null, budzet: wynik.budzet };
  if (wynik.budzet) return { stan: "niepewne", ile: wynik.ile, rozwiazanie: null, budzet: true };
  if (wynik.ile === 1) return { stan: "jedno", ile: 1, rozwiazanie: wynik.rozwiazanie, budzet: false };
  return { stan: "brak", ile: 0, rozwiazanie: null, budzet: false };
}

function widoczneLiczby(dane, wpisy) {
  var w = [];
  var i;
  for (i = 0; i < dane.length; i++) {
    if (dane[i] >= 0) w.push(dane[i]);
    else if (wpisy && wpisy[i] >= 0) w.push(wpisy[i]);
    else w.push(-1);
  }
  return w;
}

// Sprawdzenie na żądanie: złe cyfry (inne niż rozwiązanie) i powtórki.
function sprawdz(opis, rozwiazanie, dane, wpisy) {
  var widok = widoczneLiczby(dane, wpisy);
  var zle = [];
  var konfliktyMapa = {};
  var puste = 0;
  var i;
  for (i = 0; i < widok.length; i++) {
    if (widok[i] < 0) {
      puste++;
      continue;
    }
    if (dane[i] < 0 && rozwiazanie && widok[i] !== rozwiazanie[i]) zle.push(i);
  }
  var model = modelOpisu(opis);
  var u;
  for (u = 0; u < model.jednostki.length; u++) {
    var gdzie = {};
    var jed = model.jednostki[u];
    for (i = 0; i < jed.length; i++) {
      var v = widok[jed[i]];
      if (v < 0) continue;
      if (!gdzie[v]) gdzie[v] = [];
      gdzie[v].push(jed[i]);
    }
    var klucz;
    for (klucz in gdzie) {
      if (!Object.prototype.hasOwnProperty.call(gdzie, klucz)) continue;
      if (gdzie[klucz].length < 2) continue;
      var g;
      for (g = 0; g < gdzie[klucz].length; g++) konfliktyMapa[gdzie[klucz][g]] = true;
    }
  }
  var konflikty = [];
  for (i = 0; i < widok.length; i++) if (konfliktyMapa[i]) konflikty.push(i);
  var wszystkoDobrze = !!(rozwiazanie && puste === 0 && zle.length === 0 && konflikty.length === 0);
  return { zle: zle, konflikty: konflikty, puste: puste, wszystkoDobrze: wszystkoDobrze, widok: widok };
}

function polaLiniiStan(stan, indeks, kolumna) {
  var a = [];
  var i;
  for (i = 0; i < stan.n; i++) a.push(kolumna ? i * stan.n + indeks : indeks * stan.n + i);
  return a;
}

function polaPudlaStan(stan, br, bc) {
  var a = [];
  var dr;
  var dc;
  for (dr = 0; dr < stan.h; dr++) {
    for (dc = 0; dc < stan.w; dc++) a.push((br * stan.h + dr) * stan.n + (bc * stan.w + dc));
  }
  return a;
}

function polaWierszaOpis(opis, pole) {
  var a = [];
  var n = opis.n;
  var r = Math.floor(pole / n);
  var c;
  for (c = 0; c < n; c++) a.push(r * n + c);
  return a;
}

function polaKolumnyOpis(opis, pole) {
  var a = [];
  var n = opis.n;
  var c = pole % n;
  var r;
  for (r = 0; r < n; r++) a.push(r * n + c);
  return a;
}

function polaKwadratuOpis(opis, pole) {
  var n = opis.n;
  var r = Math.floor(pole / n);
  var c = pole % n;
  var br = Math.floor(r / opis.wys) * opis.wys;
  var bc = Math.floor(c / opis.szer) * opis.szer;
  var a = [];
  var dr;
  var dc;
  for (dr = 0; dr < opis.wys; dr++) {
    for (dc = 0; dc < opis.szer; dc++) a.push((br + dr) * n + (bc + dc));
  }
  return a;
}

function poPolsku(znaki) {
  if (!znaki || !znaki.length) return "";
  if (znaki.length === 1) return znaki[0];
  if (znaki.length === 2) return znaki[0] + " i " + znaki[1];
  return znaki.slice(0, znaki.length - 1).join(", ") + " i " + znaki[znaki.length - 1];
}

function znakiZWartosci(opis, wartosci) {
  var jest = {};
  var i;
  for (i = 0; i < wartosci.length; i++) jest[wartosci[i]] = true;
  var out = [];
  for (i = 0; i < opis.n; i++) if (jest[i]) out.push(opis.znaki.charAt(i));
  return out;
}

function znakiZMaski(opis, maska) {
  var a = [];
  var v;
  for (v = 0; v < opis.n; v++) if (maska & bitWartosci(v)) a.push(opis.znaki.charAt(v));
  return a;
}

function bezPola(lista, pole) {
  var a = [];
  var i;
  if (!lista) return a;
  for (i = 0; i < lista.length; i++) if (lista[i] !== pole) a.push(lista[i]);
  return a;
}

function unikalnePola(lista) {
  var widziane = {};
  var a = [];
  var i;
  for (i = 0; i < lista.length; i++) {
    if (widziane[lista[i]]) continue;
    widziane[lista[i]] = true;
    a.push(lista[i]);
  }
  return a;
}

function miejsceDomu(dom) {
  if (dom === "kolumna") return "kolumnie";
  if (dom === "kwadrat") return "kwadracie";
  return "wierszu";
}

function dopelniaczDomu(dom) {
  if (dom === "kolumna") return "tej kolumny";
  if (dom === "kwadrat") return "tego kwadratu";
  return "tego wiersza";
}

function wyjasnijNaga(opis, widok, pole, z) {
  var domy = [
    { nazwa: "wierszu", pola: polaWierszaOpis(opis, pole) },
    { nazwa: "kolumnie", pola: polaKolumnyOpis(opis, pole) },
    { nazwa: "kwadracie", pola: polaKwadratuOpis(opis, pole) }
  ];
  var uzyte = {};
  var czesci = [];
  var d;
  for (d = 0; d < domy.length; d++) {
    var vals = [];
    var i;
    for (i = 0; i < domy[d].pola.length; i++) {
      var v = widok[domy[d].pola[i]];
      if (v >= 0 && !uzyte[v]) {
        uzyte[v] = true;
        vals.push(v);
      }
    }
    var zn = znakiZWartosci(opis, vals);
    if (!zn.length) continue;
    if (!czesci.length) {
      czesci.push("w " + domy[d].nazwa + " " + (zn.length === 1 ? "jest już " : "są już ") + poPolsku(zn));
    } else {
      czesci.push("w " + domy[d].nazwa + " " + poPolsku(zn));
    }
  }
  var tekst = "W tej kratce pasuje tylko " + z;
  if (czesci.length) tekst += ": " + czesci.join(", ") + ".";
  else tekst += ".";
  var obszar = unikalnePola(domy[0].pola.concat(domy[1].pola).concat(domy[2].pola));
  var dowody = [];
  var j;
  for (j = 0; j < obszar.length; j++) {
    if (obszar[j] !== pole && widok[obszar[j]] >= 0) dowody.push(obszar[j]);
  }
  return {
    nazwa: "Naga pojedyncza",
    definicja: "W kratce zostaje tylko jedna cyfra, bo każda inna jest już w jej wierszu, kolumnie albo kwadracie.",
    tekst: tekst,
    obszar: bezPola(obszar, pole),
    dowody: dowody
  };
}

function blokadaCyfry(opis, widok, pole, wartosc, wJednostce) {
  var n = opis.n;
  var r = Math.floor(pole / n);
  var c = pole % n;
  var i;
  for (i = 0; i < n; i++) {
    var p = r * n + i;
    if (!wJednostce[p] && widok[p] === wartosc) return p;
  }
  for (i = 0; i < n; i++) {
    var p2 = i * n + c;
    if (!wJednostce[p2] && widok[p2] === wartosc) return p2;
  }
  var kw = polaKwadratuOpis(opis, pole);
  for (i = 0; i < kw.length; i++) {
    if (!wJednostce[kw[i]] && widok[kw[i]] === wartosc) return kw[i];
  }
  return -1;
}

function wyjasnijUkryta(opis, widok, pole, wartosc, z, slad) {
  var gdzie = slad && slad.gdzie ? slad.gdzie : "kwadrat";
  var jednostka = slad && slad.jednostka ? slad.jednostka : polaKwadratuOpis(opis, pole);
  if (gdzie === "wiersz" && !(slad && slad.jednostka)) jednostka = polaWierszaOpis(opis, pole);
  if (gdzie === "kolumna" && !(slad && slad.jednostka)) jednostka = polaKolumnyOpis(opis, pole);
  var wJednostce = {};
  var i;
  for (i = 0; i < jednostka.length; i++) wJednostce[jednostka[i]] = true;
  var dowody = [];
  var widziane = {};
  for (i = 0; i < jednostka.length; i++) {
    var p = jednostka[i];
    if (p === pole || widok[p] >= 0) continue;
    var blok = blokadaCyfry(opis, widok, p, wartosc, wJednostce);
    if (blok >= 0 && !widziane[blok]) {
      widziane[blok] = true;
      dowody.push(blok);
    }
  }
  var tekst = "W tym " + miejsceDomu(gdzie) + " " + z + " może stanąć tylko tutaj";
  if (dowody.length && gdzie === "wiersz") {
    tekst += ", bo w innych kratkach tego wiersza " + z + " jest już w ich kolumnie albo kwadracie.";
  } else if (dowody.length && gdzie === "kolumna") {
    tekst += ", bo w innych kratkach tej kolumny " + z + " jest już w ich wierszu albo kwadracie.";
  } else if (dowody.length) {
    tekst += ", bo w innych kratkach tego kwadratu " + z + " jest już w ich wierszu albo kolumnie.";
  } else {
    tekst += ".";
  }
  return {
    nazwa: "Ukryta pojedyncza",
    definicja: "W wierszu, kolumnie albo kwadracie jakaś cyfra ma już tylko jedno wolne miejsce.",
    tekst: tekst,
    obszar: bezPola(jednostka, pole),
    dowody: dowody
  };
}

function wyjasnijKasowanie(opis, pole, z, slad) {
  var technika = slad && slad.technika ? slad.technika : "";
  var dom = slad && slad.dom ? slad.dom : "wiersz";
  var obszar = slad && slad.jednostka ? slad.jednostka.slice() : [];
  var dowody = slad && slad.pola ? slad.pola.slice() : [];
  var nazwa = "Podpowiedź";
  var definicja = "Ten krok porządkuje kratki obok, i dlatego da się wpisać cyfrę.";
  var tekst = "Tutaj zostaje " + z + ".";
  if (technika === "para") {
    nazwa = "Naga para";
    definicja = "Dwie kratki w jednym miejscu mają tylko te same dwie cyfry, więc reszta tego miejsca ich nie bierze.";
    tekst = "W tym " + miejsceDomu(dom) + " dwie kratki mają tylko " + poPolsku(znakiZMaski(opis, slad.maska)) + ". Inne kratki " + dopelniaczDomu(dom) + " nie mogą ich mieć. Tutaj zostaje " + z + ".";
  } else if (technika === "wskazanie") {
    nazwa = "Wskazanie";
    definicja = "W kwadracie cyfra stoi tylko w jednym wierszu albo jednej kolumnie, więc poza kwadratem w tej linii jej nie ma.";
    var zz = opis.znaki.charAt(slad.wartosc);
    var linia = slad.dom === "kolumna" ? "kolumnie" : "wierszu";
    tekst = "W tym kwadracie " + zz + " jest tylko w jednej " + linia + ", więc poza kwadratem w tej linii jej nie ma. Tutaj zostaje " + z + ".";
    obszar = slad.linia ? slad.linia.slice() : obszar;
  } else if (technika === "linia") {
    nazwa = "Linia kwadratu";
    definicja = "W wierszu albo kolumnie cyfra mieści się w jednym kwadracie, więc w reszcie tego kwadratu jej nie ma.";
    var zl = opis.znaki.charAt(slad.wartosc);
    tekst = "W tym " + miejsceDomu(dom) + " " + zl + " mieści się tylko w jednym kwadracie, więc w reszcie tego kwadratu jej nie ma. Tutaj zostaje " + z + ".";
    obszar = slad.pudlo ? slad.pudlo.slice() : obszar;
  } else if (technika === "ukrytaPara") {
    nazwa = "Ukryta para";
    definicja = "Dwie cyfry mają w tym miejscu tylko dwie kratki, więc te kratki nie biorą innych cyfr.";
    var para = [];
    if (slad.wartosci) {
      var t;
      for (t = 0; t < slad.wartosci.length; t++) para.push(opis.znaki.charAt(slad.wartosci[t]));
    }
    tekst = "W tym " + miejsceDomu(dom) + " cyfry " + poPolsku(para) + " mają tylko dwie kratki. Te kratki nie biorą innych cyfr. Tutaj zostaje " + z + ".";
  } else if (technika === "trojka") {
    nazwa = "Naga trójka";
    definicja = "Trzy kratki dzielą tylko trzy cyfry, więc reszta tego miejsca ich nie bierze.";
    tekst = "W tym " + miejsceDomu(dom) + " trzy kratki dzielą tylko " + poPolsku(znakiZMaski(opis, slad.maska)) + ". Reszta " + dopelniaczDomu(dom) + " ich nie bierze. Tutaj zostaje " + z + ".";
  }
  return {
    nazwa: nazwa,
    definicja: definicja,
    tekst: tekst,
    obszar: bezPola(obszar, pole),
    dowody: bezPola(dowody, pole)
  };
}

// Nazwa sztuczki, jedno zdanie co to jest, i jak znaleźć właśnie ten krok.
function wyjasnijPodpowiedz(opis, widok, info) {
  var technika = info && info.technika ? info.technika : "odkrycie";
  var pole = info.pole;
  var wartosc = info.wartosc;
  var z = opis.znaki.charAt(wartosc);
  if (technika === "naga") return wyjasnijNaga(opis, widok, pole, z);
  if (technika === "ukryta") return wyjasnijUkryta(opis, widok, pole, wartosc, z, info.slad);
  if (technika === "odkrycie") {
    return {
      nazwa: "Bez prostego kroku",
      definicja: "Żaden prosty sposób nie pokazuje następnej cyfry.",
      tekst: "Nie ma tu prostego kroku, który wskaże następną cyfrę. Poprawna cyfra w tej kratce to " + z + ".",
      obszar: [],
      dowody: []
    };
  }
  return wyjasnijKasowanie(opis, pole, z, info.slad);
}

function odkrycie(opis, widok, rozwiazanie, wybrane) {
  var pole = -1;
  if (typeof wybrane === "number" && wybrane >= 0 && wybrane < widok.length && widok[wybrane] !== rozwiazanie[wybrane]) {
    pole = wybrane;
  }
  if (pole < 0) {
    var i;
    for (i = 0; i < widok.length; i++) {
      if (widok[i] !== rozwiazanie[i]) {
        pole = i;
        break;
      }
    }
  }
  if (pole < 0) return null;
  var v = rozwiazanie[pole];
  var w = wyjasnijPodpowiedz(opis, widok, { technika: "odkrycie", pole: pole, wartosc: v, slad: null });
  return {
    pole: pole,
    wartosc: v,
    technika: "odkrycie",
    poziom: 5,
    nazwa: w.nazwa,
    definicja: w.definicja,
    tekst: w.tekst,
    obszar: w.obszar,
    dowody: w.dowody
  };
}

// Podpowiedź: następna cyfra, którą da się wywnioskować. Jak się nie da — pokazuje poprawną.
function podpowiedz(opis, dane, wpisy, rozwiazanie, wybrane) {
  if (!rozwiazanie) return null;
  var widok = [];
  var i;
  for (i = 0; i < dane.length; i++) {
    if (dane[i] >= 0) widok.push(dane[i]);
    else if (wpisy && wpisy[i] === rozwiazanie[i]) widok.push(wpisy[i]);
    else widok.push(-1);
  }
  var stan = nowyStan(opis, widok);
  if (!stan.ok) return odkrycie(opis, widok, rozwiazanie, wybrane);
  var preferowane = -1;
  if (typeof wybrane === "number" && wybrane >= 0 && widok[wybrane] < 0) preferowane = wybrane;
  var technika = "";
  var poziom = 0;
  var slad = null;
  var guard = stan.N * 4 + 8;
  while (guard-- > 0 && !kompletne(stan)) {
    var krok = nastepnyKrok(stan, 4, technika ? -1 : preferowane);
    if (!krok) break;
    if (krok.poziom >= poziom) {
      poziom = krok.poziom;
      technika = krok.technika;
      slad = krok;
    }
    if (krok.typ === "wpis" && widok[krok.pole] < 0) {
      var w = wyjasnijPodpowiedz(opis, widok, {
        technika: technika,
        pole: krok.pole,
        wartosc: krok.wartosc,
        slad: slad
      });
      return {
        pole: krok.pole,
        wartosc: krok.wartosc,
        technika: technika,
        poziom: poziom,
        nazwa: w.nazwa,
        definicja: w.definicja,
        tekst: w.tekst,
        obszar: w.obszar,
        dowody: w.dowody
      };
    }
    if (!zastosuj(stan, krok)) return odkrycie(opis, widok, rozwiazanie, wybrane);
  }
  return odkrycie(opis, widok, rozwiazanie, wybrane);
}

// Ile cyfr zostaje na planszy i jak trudny krok wolno użyć.
// Małe plansze różnią się głównie liczbą cyfr. Duże, przy ekspercie, schodzą do samego dna.
var PASMA = {
  "4": {
    latwy: { azDo: 12, max: 13, min: 10, maxPoziom: 1, minPoziom: 1, doPodlogi: false },
    sredni: { azDo: 9, max: 10, min: 8, maxPoziom: 1, minPoziom: 1, doPodlogi: false },
    trudny: { azDo: 7, max: 8, min: 6, maxPoziom: 1, minPoziom: 1, doPodlogi: false },
    ekspert: { azDo: 4, max: 6, min: 4, maxPoziom: 1, minPoziom: 1, doPodlogi: true }
  },
  "6": {
    latwy: { azDo: 22, max: 24, min: 18, maxPoziom: 1, minPoziom: 1, doPodlogi: false },
    sredni: { azDo: 16, max: 18, min: 14, maxPoziom: 2, minPoziom: 1, doPodlogi: false },
    trudny: { azDo: 12, max: 14, min: 11, maxPoziom: 3, minPoziom: 1, doPodlogi: false },
    ekspert: { azDo: 8, max: 11, min: 8, maxPoziom: 4, minPoziom: 1, doPodlogi: true }
  },
  "9": {
    latwy: { azDo: 44, max: 50, min: 40, maxPoziom: 1, minPoziom: 1, doPodlogi: false },
    sredni: { azDo: 34, max: 38, min: 30, maxPoziom: 2, minPoziom: 1, doPodlogi: false },
    trudny: { azDo: 28, max: 33, min: 24, maxPoziom: 4, minPoziom: 2, doPodlogi: false },
    ekspert: { azDo: 22, max: 28, min: 20, maxPoziom: 4, minPoziom: 2, doPodlogi: true }
  },
  "12": {
    latwy: { azDo: 100, max: 110, min: 90, maxPoziom: 1, minPoziom: 1, doPodlogi: false },
    sredni: { azDo: 78, max: 88, min: 70, maxPoziom: 2, minPoziom: 1, doPodlogi: false },
    trudny: { azDo: 64, max: 72, min: 56, maxPoziom: 4, minPoziom: 2, doPodlogi: false },
    ekspert: { azDo: 48, max: 56, min: 40, maxPoziom: 4, minPoziom: 3, doPodlogi: true }
  },
  "16": {
    latwy: { azDo: 176, max: 190, min: 160, maxPoziom: 1, minPoziom: 1, doPodlogi: false },
    sredni: { azDo: 140, max: 155, min: 128, maxPoziom: 2, minPoziom: 1, doPodlogi: false },
    trudny: { azDo: 112, max: 125, min: 100, maxPoziom: 4, minPoziom: 2, doPodlogi: false },
    ekspert: { azDo: 92, max: 100, min: 80, maxPoziom: 4, minPoziom: 3, doPodlogi: true }
  }
};

function pasmoDla(opis, trudnosc) {
  return PASMA[String(opis.n)][trudnosc];
}

function polaObok(opis, pole) {
  return modelOpisu(opis).sasiedzi[pole].slice();
}

function ileDan(pola) {
  var n = 0;
  var i;
  for (i = 0; i < pola.length; i++) if (pola[i] >= 0) n++;
  return n;
}

function ileProb(opis, trudnosc) {
  if (opis.n >= 16) return trudnosc === "latwy" ? 2 : 3;
  if (opis.n >= 12) return 4;
  if (trudnosc === "trudny" || trudnosc === "ekspert") return 8;
  return 4;
}

// Losowanie idzie małymi krokami, żeby telefon nie zamarzł przy dużej planszy.
function noweLosowanie(opis, trudnosc, los) {
  return {
    opis: opis,
    trudnosc: trudnosc,
    los: los || Math.random,
    maxProb: ileProb(opis, trudnosc),
    pasmo: pasmoDla(opis, trudnosc),
    proba: 0,
    faza: "nowa",
    pola: null,
    pelne: null,
    kolejnosc: null,
    i: 0,
    wynik: null,
    koniec: false
  };
}

function spakujLosowanie(L, ocena) {
  return {
    rozmiar: L.opis.n,
    trudnosc: L.trudnosc,
    dane: L.pola.slice(),
    rozwiazanie: ocena.pola.slice(),
    poziom: ocena.poziom
  };
}

function zgodneZPelna(L, ocena) {
  if (!ocena || !ocena.pola) return false;
  var i;
  for (i = 0; i < L.pelne.length; i++) {
    if (L.pola[i] >= 0 && L.pola[i] !== L.pelne[i]) return false;
    if (ocena.pola[i] !== L.pelne[i]) return false;
  }
  return true;
}

function pasujeDoPasma(L, ocena, ile) {
  var pasmo = L.pasmo;
  if (!ocena.kompletne || ocena.sprzecznosc || !zgodneZPelna(L, ocena)) return false;
  if (ile < pasmo.min || ile > pasmo.max) return false;
  if (ocena.poziom < pasmo.minPoziom || ocena.poziom > pasmo.maxPoziom) return false;
  return true;
}

function krokLosowania(L) {
  if (L.koniec) return;
  if (L.faza === "nowa") {
    if (L.proba >= L.maxProb) {
      L.koniec = true;
      L.wynik = null;
      return;
    }
    L.proba++;
    L.pelne = wymieszaj(L.opis, L.los);
    L.pola = L.pelne.slice();
    L.kolejnosc = tasuj(zakres(L.opis.n * L.opis.n), L.los);
    L.i = 0;
    L.faza = "draz";
    return;
  }
  if (L.faza === "draz") {
    if (L.i >= L.kolejnosc.length) {
      L.faza = "ocena";
      return;
    }
    var ile = ileDan(L.pola);
    if (!L.pasmo.doPodlogi && ile <= L.pasmo.min) {
      L.faza = "ocena";
      return;
    }
    var pole = L.kolejnosc[L.i];
    L.i++;
    if (L.pola[pole] < 0) return;
    var bylo = L.pola[pole];
    L.pola[pole] = -1;
    var ocena = rozwiazLogicznie(L.opis, L.pola, L.pasmo.maxPoziom);
    if (!ocena.kompletne || ocena.sprzecznosc || !zgodneZPelna(L, ocena)) {
      L.pola[pole] = bylo;
      return;
    }
    var teraz = ile - 1;
    if (!L.pasmo.doPodlogi && teraz <= L.pasmo.azDo && pasujeDoPasma(L, ocena, teraz)) {
      L.wynik = spakujLosowanie(L, ocena);
      L.koniec = true;
    }
    return;
  }
  if (L.faza === "ocena") {
    var koncowa = rozwiazLogicznie(L.opis, L.pola, L.pasmo.maxPoziom);
    var ileKoniec = ileDan(L.pola);
    if (pasujeDoPasma(L, koncowa, ileKoniec)) {
      L.wynik = spakujLosowanie(L, koncowa);
      L.koniec = true;
      return;
    }
    L.faza = "nowa";
  }
}

function generuj(opis, trudnosc, opcje) {
  opcje = opcje || {};
  var L = noweLosowanie(opis, trudnosc, opcje.los || Math.random);
  if (opcje.proby) L.maxProb = opcje.proby;
  var guard = 1000000;
  while (!L.koniec && guard-- > 0) krokLosowania(L);
  return L.wynik;
}

// Krótki kod planszy, do wklejenia albo do linku ?p=
function koduj(rozmiar, trudnosc, dane) {
  var opis = ROZMIARY[String(rozmiar)];
  if (!opis || !dane) return "";
  var lit = TRUDNOSC_LITERA[trudnosc] || "W";
  var s = "S1." + opis.n + "." + lit + ".";
  var i;
  for (i = 0; i < dane.length; i++) s += dane[i] < 0 ? "." : opis.znaki.charAt(dane[i]);
  return s;
}

function dekoduj(tekst) {
  if (!tekst) return null;
  tekst = String(tekst).trim();
  var q = tekst.indexOf("p=");
  if (q >= 0) {
    tekst = tekst.slice(q + 2).split("&")[0].split("#")[0];
    try {
      tekst = decodeURIComponent(tekst);
    } catch (e) {
      return null;
    }
  }
  tekst = tekst.replace(/\s+/g, "");
  if (tekst.indexOf("S1.") !== 0) return null;
  var reszta = tekst.slice(3);
  var k1 = reszta.indexOf(".");
  if (k1 < 1) return null;
  var opis = ROZMIARY[reszta.slice(0, k1)];
  if (!opis) return null;
  var lit = reszta.charAt(k1 + 1);
  var trud = LITERA_TRUDNOSCI[lit];
  if (!trud || reszta.charAt(k1 + 2) !== ".") return null;
  var siatka = reszta.slice(k1 + 3);
  if (siatka.length !== opis.n * opis.n) return null;
  var dane = [];
  var i;
  for (i = 0; i < siatka.length; i++) {
    var ch = siatka.charAt(i);
    if (ch === "." || ch === "0") dane.push(-1);
    else {
      var v = opis.znaki.indexOf(ch.toUpperCase());
      if (v < 0) return null;
      dane.push(v);
    }
  }
  return { rozmiar: opis.n, trudnosc: trud, dane: dane };
}

// Małe okienko z cyframi (długie przytrzymanie na telefonie).
// Te funkcje tylko liczą: jaki tryb ma okienko, gdzie je postawić,
// kiedy palec się ruszył i jak duże mają być cyfry. Nie rysują.

// Długie przytrzymanie daje od razu drugi sposób pisania.
// Notatki na dole wyłączone -> okienko startuje w notatce.
// Notatki na dole włączone -> okienko startuje we wpisie.
function notatkaNaStarcieOkienka(notatkiNaDole) {
  return !notatkiNaDole;
}

// Klik „Wpis” albo „Notatka” w okienku. Przycisk Notatki na dole zostaje.
function wyborTrybuOkienka(notatkiNaDole, wyborNotatki) {
  return {
    notatkiNaDole: !!notatkiNaDole,
    notatkaWOkienku: !!wyborNotatki
  };
}

// W notatce okienko zostaje, żeby dopisać kolejne. We wpisie znika po jednej cyfrze.
function okienkoZostaje(notatka) {
  return !!notatka;
}

function przytnijDoEkranu(v, min, max, rozmiar) {
  var limit = max - rozmiar;
  if (limit < min) return min;
  if (v < min) return min;
  if (v > limit) return limit;
  return v;
}

// Widok to prostokąt ekranu: left, top, right, bottom.
// Najpierw z prawej komórki, potem z lewej, pod nią albo nad nią.
function polozenieSzybkiego(komorka, okienko, widok, odstep) {
  var m = typeof odstep === "number" ? odstep : 8;
  var minX = widok.left + m;
  var minY = widok.top + m;
  var maxX = widok.right - m;
  var maxY = widok.bottom - m;
  var ow = okienko.width;
  var oh = okienko.height;
  var kL = komorka.left;
  var kT = komorka.top;
  var kR = komorka.left + komorka.width;
  var kB = komorka.top + komorka.height;
  var miejscePrawo = maxX - (kR + m);
  var miejsceLewo = (kL - m) - minX;
  var miejsceDol = maxY - (kB + m);
  var miejsceGora = (kT - m) - minY;
  var strona = "";
  if (miejscePrawo >= ow) strona = "prawo";
  else if (miejsceLewo >= ow) strona = "lewo";
  else if (miejsceDol >= oh) strona = "dol";
  else if (miejsceGora >= oh) strona = "gora";
  else {
    strona = "prawo";
    var naj = miejscePrawo;
    if (miejsceLewo > naj) {
      strona = "lewo";
      naj = miejsceLewo;
    }
    if (miejsceDol > naj) {
      strona = "dol";
      naj = miejsceDol;
    }
    if (miejsceGora > naj) {
      strona = "gora";
    }
  }
  var x;
  var y;
  if (strona === "prawo") {
    x = kR + m;
    y = przytnijDoEkranu(kT + komorka.height / 2 - oh / 2, minY, maxY, oh);
  } else if (strona === "lewo") {
    x = kL - ow - m;
    y = przytnijDoEkranu(kT + komorka.height / 2 - oh / 2, minY, maxY, oh);
  } else if (strona === "dol") {
    x = przytnijDoEkranu(kL + komorka.width / 2 - ow / 2, minX, maxX, ow);
    y = kB + m;
  } else {
    x = przytnijDoEkranu(kL + komorka.width / 2 - ow / 2, minX, maxX, ow);
    y = kT - oh - m;
  }
  x = przytnijDoEkranu(x, minX, maxX, ow);
  y = przytnijDoEkranu(y, minY, maxY, oh);
  return { left: x, top: y, strona: strona };
}

// Palec drgnął trochę — to jeszcze przytrzymanie. Ruszył się dalej — odpuszczamy.
function ruchAnulujePrzytrzymanie(dx, dy, prog) {
  var p = typeof prog === "number" ? prog : 10;
  return dx * dx + dy * dy > p * p;
}

// Bok jednego klawisza z cyfrą. Na 16×16 i na wąskim telefonie nadal da się trafić.
// Liczby zgadzają się z odstępami w style.css (przełącznik, gumka, przerwy).
function rozmiarKlawiszaSzybkiego(kolumny, wiersze, szerokosc, wysokosc) {
  var margines = 16;
  var padding = 12;
  var odstep = 4;
  var chrome = 32 + 32 + 8;
  var maxBok = 46;
  var minBok = 28;
  var kol = kolumny > 0 ? kolumny : 1;
  var wier = wiersze > 0 ? wiersze : 1;
  var dostW = szerokosc - margines - padding - odstep * (kol - 1);
  var dostH = wysokosc - margines - padding - chrome - odstep * (wier - 1);
  var zSzer = Math.floor(dostW / kol);
  var zWys = Math.floor(dostH / wier);
  var z = zSzer < zWys ? zSzer : zWys;
  if (z > maxBok) z = maxBok;
  if (z < minBok) z = minBok;
  return z;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ROZMIARY: ROZMIARY,
    TRUDNOSCI: TRUDNOSCI,
    wzorzec: wzorzec,
    wymieszaj: wymieszaj,
    losujZSeed: losujZSeed,
    czyPoprawna: czyPoprawna,
    czyPelna: czyPelna,
    pustePola: pustePola,
    nowyStan: nowyStan,
    nastepnyKrok: nastepnyKrok,
    rozwiazLogicznie: rozwiazLogicznie,
    liczRozwiazania: liczRozwiazania,
    ocenUklad: ocenUklad,
    sprawdz: sprawdz,
    podpowiedz: podpowiedz,
    wyjasnijPodpowiedz: wyjasnijPodpowiedz,
    polaObok: polaObok,
    PASMA: PASMA,
    generuj: generuj,
    noweLosowanie: noweLosowanie,
    krokLosowania: krokLosowania,
    koduj: koduj,
    dekoduj: dekoduj,
    notatkaNaStarcieOkienka: notatkaNaStarcieOkienka,
    wyborTrybuOkienka: wyborTrybuOkienka,
    okienkoZostaje: okienkoZostaje,
    polozenieSzybkiego: polozenieSzybkiego,
    ruchAnulujePrzytrzymanie: ruchAnulujePrzytrzymanie,
    rozmiarKlawiszaSzybkiego: rozmiarKlawiszaSzybkiego
  };
}
