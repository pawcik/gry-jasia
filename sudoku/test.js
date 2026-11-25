// Sprawdzenie generatora, rozwiązywania i przycisku Sprawdź.
// Uruchom: mise run test

var test = require("node:test");
var assert = require("node:assert/strict");
var fs = require("fs");
var path = require("path");
var silnik = require("./silnik.js");

var ROZMIARY = ["4", "6", "9", "12", "16"];
var TRUDNOSCI = ["latwy", "sredni", "trudny", "ekspert"];

function ileDan(pola) {
  var n = 0;
  var i;
  for (i = 0; i < pola.length; i++) if (pola[i] >= 0) n++;
  return n;
}

function taSama(a, b) {
  if (a.length !== b.length) return false;
  var i;
  for (i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

test("wzorzec i mieszanie dają pełną, poprawną planszę", function () {
  var r;
  for (r = 0; r < ROZMIARY.length; r++) {
    var opis = silnik.ROZMIARY[ROZMIARY[r]];
    var wzor = silnik.wzorzec(opis);
    assert.equal(silnik.czyPelna(opis, wzor), true, ROZMIARY[r]);
    var a = silnik.wymieszaj(opis, silnik.losujZSeed(3));
    var b = silnik.wymieszaj(opis, silnik.losujZSeed(9));
    assert.equal(silnik.czyPelna(opis, a), true);
    assert.equal(silnik.czyPelna(opis, b), true);
    assert.equal(taSama(a, b), false);
  }
});

test("generator: jedno rozwiązanie, cyfry z zadania pasują, pasmo trudności", function () {
  var r;
  var t;
  for (r = 0; r < ROZMIARY.length; r++) {
    for (t = 0; t < TRUDNOSCI.length; t++) {
      var klucz = ROZMIARY[r];
      var trud = TRUDNOSCI[t];
      if (klucz === "16" && trud !== "latwy" && trud !== "ekspert") continue;
      if (klucz === "12" && trud === "trudny") continue;
      var opis = silnik.ROZMIARY[klucz];
      var gra = silnik.generuj(opis, trud, { los: silnik.losujZSeed(11 + r * 5 + t) });
      assert.ok(gra, klucz + " " + trud);
      assert.equal(gra.dane.length, opis.n * opis.n);
      assert.equal(gra.rozwiazanie.length, opis.n * opis.n);
      assert.equal(silnik.czyPelna(opis, gra.rozwiazanie), true);
      var i;
      for (i = 0; i < gra.dane.length; i++) {
        if (gra.dane[i] >= 0) assert.equal(gra.dane[i], gra.rozwiazanie[i]);
      }
      var pasmo = silnik.PASMA[klucz][trud];
      var dane = ileDan(gra.dane);
      assert.ok(dane >= pasmo.min && dane <= pasmo.max, klucz + " " + trud + " dane " + dane);
      assert.ok(gra.poziom >= pasmo.minPoziom && gra.poziom <= pasmo.maxPoziom);
      var ile = silnik.liczRozwiazania(opis, gra.dane, 2, klucz === "16" ? 80000 : 150000);
      assert.equal(ile.budzet, false, klucz + " " + trud);
      assert.equal(ile.ile, 1, klucz + " " + trud);
      assert.ok(taSama(ile.rozwiazanie, gra.rozwiazanie));
    }
  }
});

test("łatwa plansza ma więcej cyfr niż ekspercka", function () {
  var opis = silnik.ROZMIARY["9"];
  var los = silnik.losujZSeed(21);
  var latwy = silnik.generuj(opis, "latwy", { los: los });
  var ekspert = silnik.generuj(opis, "ekspert", { los: silnik.losujZSeed(22) });
  assert.ok(ileDan(latwy.dane) > ileDan(ekspert.dane));
  assert.ok(latwy.poziom <= ekspert.poziom);
});

test("pusta plansza 4×4 ma wiele rozwiązań, sprzeczna nie ma żadnego", function () {
  var opis = silnik.ROZMIARY["4"];
  var pusta = silnik.ocenUklad(opis, silnik.pustePola(opis));
  assert.equal(pusta.stan, "wiele");

  var zle = silnik.pustePola(opis);
  zle[0] = 0;
  zle[1] = 0;
  var brak = silnik.ocenUklad(opis, zle);
  assert.equal(brak.stan, "brak");
  assert.equal(silnik.liczRozwiazania(opis, zle, 2, 1000).ile, 0);
});

test("ukończona plansza ma jedno rozwiązanie", function () {
  var opis = silnik.ROZMIARY["6"];
  var pelne = silnik.wymieszaj(opis, silnik.losujZSeed(4));
  var ocena = silnik.ocenUklad(opis, pelne);
  assert.equal(ocena.stan, "jedno");
  assert.ok(taSama(ocena.rozwiazanie, pelne));
});

test("sprawdzanie: zła cyfra, powtórka i dobra plansza", function () {
  var opis = silnik.ROZMIARY["9"];
  var gra = silnik.generuj(opis, "latwy", { los: silnik.losujZSeed(5) });
  var wpisy = silnik.pustePola(opis);
  var puste = -1;
  var i;
  for (i = 0; i < gra.dane.length; i++) {
    if (gra.dane[i] < 0) {
      puste = i;
      break;
    }
  }
  assert.ok(puste >= 0);
  wpisy[puste] = (gra.rozwiazanie[puste] + 1) % opis.n;
  var poZlej = silnik.sprawdz(opis, gra.rozwiazanie, gra.dane, wpisy);
  assert.deepEqual(poZlej.zle, [puste]);
  assert.equal(poZlej.wszystkoDobrze, false);

  var wpisy2 = silnik.pustePola(opis);
  var obok = silnik.polaObok(opis, puste);
  var drugi = obok[0];
  if (gra.dane[drugi] >= 0) {
    wpisy2[puste] = gra.dane[drugi];
  } else {
    gra.dane[drugi] = 0;
    while (gra.dane[drugi] === gra.rozwiazanie[puste]) gra.dane[drugi] = (gra.dane[drugi] + 1) % opis.n;
    wpisy2[puste] = gra.dane[drugi];
  }
  var poPowtorce = silnik.sprawdz(opis, gra.rozwiazanie, gra.dane, wpisy2);
  assert.ok(poPowtorce.konflikty.indexOf(puste) >= 0);
  assert.ok(poPowtorce.konflikty.indexOf(drugi) >= 0);

  var dobre = silnik.pustePola(opis);
  for (i = 0; i < gra.rozwiazanie.length; i++) {
    if (gra.dane[i] < 0) dobre[i] = gra.rozwiazanie[i];
  }
  var poDobrym = silnik.sprawdz(opis, gra.rozwiazanie, gra.dane, dobre);
  assert.equal(poDobrym.zle.length, 0);
  assert.equal(poDobrym.konflikty.length, 0);
  assert.equal(poDobrym.puste, 0);
  assert.equal(poDobrym.wszystkoDobrze, true);

  var nic = silnik.sprawdz(opis, gra.rozwiazanie, gra.dane, silnik.pustePola(opis));
  assert.equal(nic.zle.length, 0);
  assert.ok(nic.puste > 0);
});

test("podpowiedź trafia w rozwiązanie, a puste pole pełnej planszy to naga jedynka", function () {
  var opis = silnik.ROZMIARY["4"];
  var pelne = silnik.wymieszaj(opis, silnik.losujZSeed(8));
  var dane = pelne.slice();
  dane[6] = -1;
  var h = silnik.podpowiedz(opis, dane, silnik.pustePola(opis), pelne, 6);
  assert.equal(h.pole, 6);
  assert.equal(h.wartosc, pelne[6]);
  assert.equal(h.technika, "naga");
  assert.ok(h.tekst.indexOf(opis.znaki.charAt(pelne[6])) >= 0);

  var trud = silnik.generuj(silnik.ROZMIARY["9"], "trudny", { los: silnik.losujZSeed(15) });
  var opis9 = silnik.ROZMIARY["9"];
  var pod = silnik.podpowiedz(opis9, trud.dane, silnik.pustePola(opis9), trud.rozwiazanie, 0);
  assert.ok(pod);
  assert.equal(pod.wartosc, trud.rozwiazanie[pod.pole]);
  assert.ok(trud.dane[pod.pole] < 0);
  assert.ok(pod.tekst.length > 0);
});

test("kod planszy przeżywa wklejenie i link", function () {
  var opis = silnik.ROZMIARY["16"];
  var gra = silnik.generuj(opis, "latwy", { los: silnik.losujZSeed(6) });
  var kod = silnik.koduj(16, "latwy", gra.dane);
  assert.equal(kod.indexOf("S1.16.L."), 0);
  assert.ok(kod.indexOf("A") >= 0 || kod.indexOf("B") >= 0 || ileDan(gra.dane) > 0);
  var zKodu = silnik.dekoduj(kod);
  assert.equal(zKodu.rozmiar, 16);
  assert.equal(zKodu.trudnosc, "latwy");
  assert.ok(taSama(zKodu.dane, gra.dane));

  var link = "https://przyklad.invalid:9/?p=" + encodeURIComponent(kod);
  var zLinku = silnik.dekoduj(link);
  assert.ok(taSama(zLinku.dane, gra.dane));

  assert.equal(silnik.dekoduj("S1.9.L.krotki"), null);
  assert.equal(silnik.dekoduj(""), null);
  assert.equal(silnik.dekoduj("S1.9.Q." + new Array(82).join(".")), null);
});

test("gotowy zestaw z pliku ma poprawne plansze", function () {
  var surowe = fs.readFileSync(path.join(__dirname, "paczki", "zestaw-1.json"), "utf8");
  var paczka = JSON.parse(surowe);
  assert.ok(paczka.plansze.length >= 3);
  var i;
  for (i = 0; i < paczka.plansze.length; i++) {
    var p = paczka.plansze[i];
    var z = silnik.dekoduj(p.kod);
    assert.ok(z, p.tytul);
    assert.equal(z.rozmiar, p.rozmiar);
    var opis = silnik.ROZMIARY[String(p.rozmiar)];
    assert.equal(p.rozwiazanie.length, opis.n * opis.n);
    var j;
    for (j = 0; j < z.dane.length; j++) {
      var oczekiwane = opis.znaki.indexOf(p.rozwiazanie.charAt(j));
      assert.equal(oczekiwane >= 0, true);
      if (z.dane[j] >= 0) assert.equal(z.dane[j], oczekiwane);
    }
    var ile = silnik.liczRozwiazania(opis, z.dane, 2, 40000);
    assert.equal(ile.ile, 1, p.tytul);
  }
});

function widok(w, h) {
  return { left: 0, top: 0, right: w, bottom: h };
}

test("okienko szybkiego wpisu zostaje na ekranie i przewraca się obok komórki", function () {
  var obok = silnik.polozenieSzybkiego(
    { left: 20, top: 100, width: 40, height: 40 },
    { width: 120, height: 160 },
    widok(400, 800),
    8
  );
  assert.equal(obok.strona, "prawo");
  assert.equal(obok.left, 68);
  assert.equal(obok.top, 40);

  var wLewo = silnik.polozenieSzybkiego(
    { left: 300, top: 100, width: 40, height: 40 },
    { width: 120, height: 160 },
    widok(400, 800),
    8
  );
  assert.equal(wLewo.strona, "lewo");
  assert.equal(wLewo.left, 172);
  assert.equal(wLewo.top, 40);

  var pod = silnik.polozenieSzybkiego(
    { left: 100, top: 40, width: 40, height: 40 },
    { width: 200, height: 100 },
    widok(320, 600),
    8
  );
  assert.equal(pod.strona, "dol");
  assert.equal(pod.left, 20);
  assert.equal(pod.top, 88);

  var nad = silnik.polozenieSzybkiego(
    { left: 100, top: 480, width: 40, height: 40 },
    { width: 200, height: 140 },
    widok(320, 600),
    8
  );
  assert.equal(nad.strona, "gora");
  assert.equal(nad.left, 20);
  assert.equal(nad.top, 332);

  var zaDuze = silnik.polozenieSzybkiego(
    { left: 10, top: 10, width: 20, height: 20 },
    { width: 300, height: 500 },
    widok(200, 400),
    8
  );
  assert.equal(zaDuze.left, 8);
  assert.equal(zaDuze.top, 8);

  var dolEkranu = silnik.polozenieSzybkiego(
    { left: 10, top: 760, width: 30, height: 30 },
    { width: 100, height: 220 },
    widok(390, 844),
    8
  );
  assert.equal(dolEkranu.strona, "prawo");
  assert.equal(dolEkranu.left, 48);
  assert.equal(dolEkranu.top, 616);
  assert.ok(dolEkranu.top + 220 <= 844 - 8);

  var zWcieciem = silnik.polozenieSzybkiego(
    { left: 0, top: 0, width: 40, height: 40 },
    { width: 80, height: 80 },
    { left: 20, top: 40, right: 300, bottom: 700 },
    8
  );
  assert.equal(zWcieciem.strona, "prawo");
  assert.equal(zWcieciem.left, 48);
  assert.equal(zWcieciem.top, 48);
});

test("drgnięcie palca nie kasuje przytrzymania, wyraźny ruch tak", function () {
  assert.equal(silnik.ruchAnulujePrzytrzymanie(0, 0, 10), false);
  assert.equal(silnik.ruchAnulujePrzytrzymanie(9, 0, 10), false);
  assert.equal(silnik.ruchAnulujePrzytrzymanie(10, 0, 10), false);
  assert.equal(silnik.ruchAnulujePrzytrzymanie(-7, 7, 10), false);
  assert.equal(silnik.ruchAnulujePrzytrzymanie(11, 0, 10), true);
  assert.equal(silnik.ruchAnulujePrzytrzymanie(8, 8, 10), true);
});

test("wyjaśnienie podpowiedzi mówi, skąd wzięła się cyfra", function () {
  var opis4 = silnik.ROZMIARY["4"];
  var pelne = silnik.wymieszaj(opis4, silnik.losujZSeed(8));
  var dane = pelne.slice();
  dane[6] = -1;
  var naga = silnik.podpowiedz(opis4, dane, silnik.pustePola(opis4), pelne, 6);
  assert.equal(naga.technika, "naga");
  assert.equal(naga.nazwa, "Naga pojedyncza");
  assert.equal(naga.tekst, "W tej kratce pasuje tylko 3: w wierszu są już 1, 2 i 4.");
  assert.ok(naga.definicja.indexOf("jedna cyfra") >= 0);
  assert.ok(naga.obszar.indexOf(naga.pole) < 0);
  assert.ok(naga.dowody.length > 0);
  assert.ok(naga.dowody.indexOf(naga.pole) < 0);

  var ukryte = pelne.slice();
  var wyjmij = [0, 1, 2, 4, 5, 6, 8, 9];
  var u;
  for (u = 0; u < wyjmij.length; u++) ukryte[wyjmij[u]] = -1;
  var ukryta = silnik.podpowiedz(opis4, ukryte, silnik.pustePola(opis4), pelne, -1);
  assert.equal(ukryta.technika, "ukryta");
  assert.equal(ukryta.nazwa, "Ukryta pojedyncza");
  assert.equal(
    ukryta.tekst,
    "W tym wierszu 2 może stanąć tylko tutaj, bo w innych kratkach tego wiersza 2 jest już w ich kolumnie albo kwadracie."
  );
  assert.ok(ukryta.dowody.length > 0);

  var puste = silnik.pustePola(opis4);
  var brak = silnik.podpowiedz(opis4, puste, puste, pelne, 0);
  assert.equal(brak.technika, "odkrycie");
  assert.equal(brak.nazwa, "Bez prostego kroku");
  assert.ok(brak.tekst.indexOf("Nie ma tu prostego kroku") === 0);
  assert.ok(brak.tekst.indexOf(opis4.znaki.charAt(brak.wartosc)) >= 0);
  assert.equal(brak.obszar.length, 0);
  assert.equal(brak.dowody.length, 0);

  var opis9 = silnik.ROZMIARY["9"];
  var widok = silnik.pustePola(opis9);
  var przypadki = [
    {
      technika: "para",
      wartosc: 3,
      slad: { technika: "para", dom: "wiersz", maska: (1 << 0) | (1 << 3), pola: [1, 2], jednostka: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
      nazwa: "Naga para",
      kawalek: "dwie kratki mają tylko 1 i 4"
    },
    {
      technika: "wskazanie",
      wartosc: 6,
      slad: { technika: "wskazanie", dom: "kolumna", wartosc: 8, pola: [10, 19], linia: [9, 10, 11, 12, 13, 14, 15, 16, 17] },
      nazwa: "Wskazanie",
      kawalek: "jest tylko w jednej kolumnie"
    },
    {
      technika: "linia",
      wartosc: 5,
      slad: { technika: "linia", dom: "wiersz", wartosc: 5, pola: [1, 2], pudlo: [0, 1, 2, 9, 10, 11, 18, 19, 20] },
      nazwa: "Linia kwadratu",
      kawalek: "mieści się tylko w jednym kwadracie"
    },
    {
      technika: "ukrytaPara",
      wartosc: 8,
      slad: { technika: "ukrytaPara", dom: "kwadrat", wartosci: [1, 6], pola: [0, 1], jednostka: [0, 1, 2, 9, 10, 11, 18, 19, 20] },
      nazwa: "Ukryta para",
      kawalek: "cyfry 2 i 7 mają tylko dwie kratki"
    },
    {
      technika: "trojka",
      wartosc: 6,
      slad: { technika: "trojka", dom: "wiersz", maska: (1 << 0) | (1 << 3) | (1 << 7), pola: [1, 2, 3], jednostka: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
      nazwa: "Naga trójka",
      kawalek: "trzy kratki dzielą tylko 1, 4 i 8"
    }
  ];
  var p;
  for (p = 0; p < przypadki.length; p++) {
    var c = przypadki[p];
    var w = silnik.wyjasnijPodpowiedz(opis9, widok, {
      technika: c.technika,
      pole: 0,
      wartosc: c.wartosc,
      slad: c.slad
    });
    assert.equal(w.nazwa, c.nazwa, c.technika);
    assert.ok(w.definicja.length > 20, c.technika);
    assert.ok(w.tekst.indexOf(c.kawalek) >= 0, w.tekst);
    assert.ok(w.tekst.indexOf("Tutaj zostaje " + opis9.znaki.charAt(c.wartosc)) >= 0, w.tekst);
    assert.ok(w.obszar.indexOf(0) < 0, c.technika);
    assert.ok(w.dowody.indexOf(0) < 0, c.technika);
  }

  var trudna = silnik.generuj(opis9, "trudny", { los: silnik.losujZSeed(25) });
  var wpisy = silnik.pustePola(opis9);
  var para = null;
  var guard = 0;
  while (guard++ < 40) {
    var h = silnik.podpowiedz(opis9, trudna.dane, wpisy, trudna.rozwiazanie, -1);
    if (!h) break;
    if (h.technika === "para") {
      para = h;
      break;
    }
    wpisy[h.pole] = h.wartosc;
  }
  assert.ok(para);
  assert.equal(para.nazwa, "Naga para");
  assert.ok(para.tekst.indexOf("dwie kratki mają tylko") >= 0);
  assert.ok(para.dowody.length === 2);
  assert.equal(para.wartosc, trudna.rozwiazanie[para.pole]);
});

test("cyfry w okienku da się stuknąć na telefonie, także przy 16×16", function () {
  var i;
  for (i = 0; i < ROZMIARY.length; i++) {
    var opis = silnik.ROZMIARY[ROZMIARY[i]];
    assert.equal(opis.szer * opis.wys, opis.n);
    assert.equal(opis.znaki.length, opis.n);
    var maly = silnik.rozmiarKlawiszaSzybkiego(opis.szer, opis.wys, 320, 568);
    var duzy = silnik.rozmiarKlawiszaSzybkiego(opis.szer, opis.wys, 390, 844);
    assert.ok(maly >= 32, opis.nazwa);
    assert.ok(duzy >= 36, opis.nazwa);
    assert.ok(maly <= 46 && duzy <= 46);
  }
  var wPoziomie = silnik.rozmiarKlawiszaSzybkiego(4, 4, 568, 280);
  assert.ok(wPoziomie >= 28);
  assert.ok(wPoziomie <= 46);
});
