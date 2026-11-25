// Sprawdzenie generatora, rozwiązywania i przycisku Sprawdź.
// Uruchom: mise run test

var test = require("node:test");
var assert = require("node:assert/strict");
var fs = require("fs");
var os = require("os");
var path = require("path");
var vm = require("vm");
var child = require("child_process");
var silnik = require("./silnik.js");
var wstaw = require("./wstaw-wersje.js");

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

test("okienko ma własny tryb, odwrotny do przycisku Notatki na dole", function () {
  assert.equal(silnik.notatkaNaStarcieOkienka(false), true);
  assert.equal(silnik.notatkaNaStarcieOkienka(true), false);

  var zWpisu = silnik.wyborTrybuOkienka(false, true);
  assert.equal(zWpisu.notatkiNaDole, false);
  assert.equal(zWpisu.notatkaWOkienku, true);

  var zNotatek = silnik.wyborTrybuOkienka(true, false);
  assert.equal(zNotatek.notatkiNaDole, true);
  assert.equal(zNotatek.notatkaWOkienku, false);

  var tenSam = silnik.wyborTrybuOkienka(true, true);
  assert.equal(tenSam.notatkiNaDole, true);
  assert.equal(tenSam.notatkaWOkienku, true);

  assert.equal(silnik.okienkoZostaje(true), true);
  assert.equal(silnik.okienkoZostaje(false), false);
});

test("drgnięcie palca nie kasuje przytrzymania, wyraźny ruch tak", function () {
  assert.equal(silnik.ruchAnulujePrzytrzymanie(0, 0, 10), false);
  assert.equal(silnik.ruchAnulujePrzytrzymanie(9, 0, 10), false);
  assert.equal(silnik.ruchAnulujePrzytrzymanie(10, 0, 10), false);
  assert.equal(silnik.ruchAnulujePrzytrzymanie(-7, 7, 10), false);
  assert.equal(silnik.ruchAnulujePrzytrzymanie(11, 0, 10), true);
  assert.equal(silnik.ruchAnulujePrzytrzymanie(8, 8, 10), true);
});

test("podpowiedź najpierw tylko podświetla kratkę, drugie stuknięcie pokazuje całość", function () {
  assert.equal(silnik.nastepneStukniecie(null), "kratka");
  assert.equal(silnik.etykietaPodpowiedzi(null), "Podpowiedź");
  assert.equal(silnik.tytulPodpowiedzi(null), "Pokaż, na którą kratkę spojrzeć");

  var stan = silnik.stanSpojzenia(6);
  assert.equal(stan.krok, "kratka");
  assert.equal(stan.pole, 6);
  assert.equal(silnik.nastepneStukniecie(stan), "pelna");
  assert.equal(silnik.etykietaPodpowiedzi(stan), "Pokaż więcej");
  assert.equal(silnik.tytulPodpowiedzi(stan), "Pokaż cyfrę i skąd ona wynika");
  assert.equal(silnik.podpowiedzPoWyborze(stan, 6), stan);
  assert.equal(silnik.podpowiedzPoWyborze(stan, 0), null);
  assert.equal(silnik.podpowiedzPoWyborze(null, 6), null);
  assert.equal(silnik.nastepneStukniecie(silnik.podpowiedzPoWyborze(stan, 2)), "kratka");

  var tekst = silnik.tekstSpojzenia(2, 3);
  assert.equal(tekst, "Spójrz na kratkę: wiersz 2, kolumna 3.");
  assert.equal(tekst.indexOf("Naga") < 0 && tekst.indexOf("cyfr") < 0, true);
  assert.equal(silnik.tekstSpojzenia(0, 3), "Spójrz na tę kratkę.");

  var opis4 = silnik.ROZMIARY["4"];
  var pelne = silnik.wymieszaj(opis4, silnik.losujZSeed(8));
  var dane = pelne.slice();
  dane[6] = -1;
  var h = silnik.podpowiedz(opis4, dane, silnik.pustePola(opis4), pelne, 6);
  var spojrzenie = silnik.stanSpojzenia(h.pole);
  spojrzenie.h = h;
  assert.equal(spojrzenie.h.pole, h.pole);
  assert.equal(silnik.nastepneStukniecie(spojrzenie), "pelna");
  assert.equal(tekst.indexOf(h.nazwa), -1);
  assert.notEqual(tekst, h.tekst);

  var gra = fs.readFileSync(path.join(__dirname, "game.js"), "utf8");
  var od = gra.indexOf("function pokazTylkoKratke");
  var dok = gra.indexOf("function poWyborzeKomorki");
  assert.ok(od >= 0 && dok > od);
  var cialo = gra.slice(od, dok);
  assert.equal(cialo.indexOf("gra.wpisy"), -1);
  assert.ok(cialo.indexOf("tylkoKratka") >= 0);
  assert.ok(gra.indexOf("nastepneStukniecie(podpowiedzKrok)") >= 0);
  assert.ok(gra.indexOf("dajPodpowiedz(podpowiedzKrok.h)") >= 0);
  assert.ok(gra.indexOf("podpowiedzPoWyborze(podpowiedzKrok, pole)") >= 0);
  var pelna = gra.slice(gra.indexOf("function dajPodpowiedz"), gra.indexOf("function pokazWyjasnienie"));
  assert.ok(pelna.indexOf("gra.wpisy[h.pole] = h.wartosc") >= 0);
  var css = fs.readFileSync(path.join(__dirname, "style.css"), "utf8");
  assert.ok(css.indexOf(".pole.podpowiedzSpojrzenie") >= 0);
  assert.equal(css.indexOf(".pole.podpowiedzSpojrzenie") > css.indexOf(".pole.podpowiedzCel"), true);
  var zmiany = fs.readFileSync(path.join(__dirname, "zmiany.html"), "utf8");
  assert.ok(zmiany.indexOf("Podpowiedź w dwóch krokach") >= 0);
  assert.ok(zmiany.indexOf("Pokaż więcej") >= 0);
  assert.match(fs.readFileSync(path.join(__dirname, "sw.js"), "utf8"), /var CACHE = "sudoku-dev";/);
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

function nowyPracownik() {
  var stan = { skip: 0, claim: 0, otwarte: [], skasowane: [] };
  var nasluch = {};
  var sandbox = {
    self: {
      skipWaiting: function () {
        stan.skip++;
        return Promise.resolve();
      },
      clients: {
        claim: function () {
          stan.claim++;
          return Promise.resolve();
        }
      },
      addEventListener: function (nazwa, fn) {
        nasluch[nazwa] = fn;
      },
      location: { origin: "https://przyklad.invalid" }
    },
    caches: {
      open: function (nazwa) {
        stan.otwarte.push(nazwa);
        return Promise.resolve({
          addAll: function () { return Promise.resolve(); },
          put: function () { return Promise.resolve(); }
        });
      },
      keys: function () {
        return Promise.resolve(["sudoku-v4", "sudoku-v5", "sudoku-dev", "inne"]);
      },
      delete: function (klucz) {
        stan.skasowane.push(klucz);
        return Promise.resolve(true);
      },
      match: function () { return Promise.resolve(undefined); }
    },
    fetch: function () { return Promise.reject(new Error("brak sieci")); },
    URL: URL,
    Promise: Promise
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "sw.js"), "utf8"), sandbox);
  return { stan: stan, nasluch: nasluch, CACHE: sandbox.CACHE };
}

function decyzjeAktualizacji() {
  var kod = fs.readFileSync(path.join(__dirname, "game.js"), "utf8");
  var start = kod.indexOf("function czyCzekaNowaWersja");
  var koniec = kod.indexOf("function zarejestrujPraceOffline");
  assert.ok(start >= 0 && koniec > start);
  var ctx = {};
  vm.createContext(ctx);
  vm.runInContext(kod.slice(start, koniec), ctx);
  return ctx;
}

test("nowa wersja czeka, aż ktoś naciśnie Odśwież", function () {
  var p = nowyPracownik();
  assert.equal(p.CACHE, "sudoku-dev");
  var gotowe;
  p.nasluch.install({
    waitUntil: function (obietnica) { gotowe = obietnica; }
  });
  return gotowe.then(function () {
    assert.equal(p.stan.skip, 0);
    assert.deepEqual(p.stan.otwarte, ["sudoku-dev"]);
  });
});

test("Odśwież budzi tylko czekającą wersję", function () {
  var p = nowyPracownik();
  p.nasluch.message({ data: { type: "SKIP_WAITING" } });
  assert.equal(p.stan.skip, 1);
  p.nasluch.message({ data: { type: "cos-innego" } });
  p.nasluch.message({ data: null });
  p.nasluch.message({});
  assert.equal(p.stan.skip, 1);
});

test("po włączeniu nowej wersji stara pamięć plików znika", function () {
  var p = nowyPracownik();
  var gotowe;
  p.nasluch.activate({
    waitUntil: function (obietnica) { gotowe = obietnica; }
  });
  return gotowe.then(function () {
    assert.equal(p.stan.claim, 1);
    assert.ok(p.stan.skasowane.indexOf("sudoku-v4") >= 0);
    assert.ok(p.stan.skasowane.indexOf("sudoku-v5") >= 0);
    assert.ok(p.stan.skasowane.indexOf("inne") >= 0);
    assert.equal(p.stan.skasowane.indexOf(p.CACHE), -1);
    assert.equal(p.CACHE, "sudoku-dev");
    assert.equal(p.stan.skip, 0);
  });
});

test("pierwsze otwarcie nie prosi o odświeżenie i nie ładuje strony w kółko", function () {
  var d = decyzjeAktualizacji();
  assert.equal(d.czyCzekaNowaWersja(false, true), false);
  assert.equal(d.czyCzekaNowaWersja(true, false), false);
  assert.equal(d.czyCzekaNowaWersja(null, { state: "installed" }), false);
  assert.equal(d.czyCzekaNowaWersja(true, true), true);
  assert.equal(d.czyCzekaNowaWersja({ state: "activated" }, { state: "installed" }), true);
  assert.equal(d.czyPrzeladowacStrone(false, false), false);
  assert.equal(d.czyPrzeladowacStrone(true, false), true);
  assert.equal(d.czyPrzeladowacStrone(true, true), false);
  assert.equal(d.czyPrzeladowacStrone(false, true), false);
});

test("pasek nowej wersji leży na stronie i nie zasłania planszy", function () {
  var html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  assert.match(html, /id="banerAktualizacji"[^>]*hidden/);
  assert.ok(html.indexOf("Jest nowa wersja") >= 0);
  assert.ok(html.indexOf(">Odśwież<") >= 0);
  assert.ok(html.indexOf("Nie teraz") >= 0);
  var css = fs.readFileSync(path.join(__dirname, "style.css"), "utf8");
  var start = css.indexOf(".banerAktualizacji {");
  assert.ok(start >= 0);
  var blok = css.slice(start, css.indexOf("}", start));
  assert.equal(blok.indexOf("position: fixed"), -1);
  assert.equal(blok.indexOf("position: absolute"), -1);
  var gra = fs.readFileSync(path.join(__dirname, "game.js"), "utf8");
  assert.ok(gra.indexOf('var KLUCZ = "sudoku"') >= 0);
  assert.equal(gra.indexOf("localStorage.clear"), -1);
  assert.equal(gra.indexOf("localStorage.removeItem"), -1);
  assert.ok(gra.indexOf('postMessage({ type: "SKIP_WAITING" })') >= 0);
  assert.ok(gra.indexOf("controllerchange") >= 0);
  assert.ok(gra.indexOf("visibilitychange") >= 0);
  assert.ok(gra.indexOf("updatefound") >= 0);
  assert.ok(gra.indexOf(".update()") >= 0);
});

test("numer wersji jest na dole strony i nie wchodzi do menu ani do zapisu", function () {
  var html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  var menuStart = html.indexOf('<section class="ekran" id="ekranMenu">');
  var menuEnd = html.indexOf("</section>", menuStart);
  var menu = html.slice(menuStart, menuEnd);
  assert.equal(menu.indexOf("stopkaWersji"), -1);
  assert.ok(html.lastIndexOf("</section>") < html.indexOf('id="stopkaWersji"'));
  assert.ok(html.indexOf('src="wersja.js"') < html.indexOf('src="game.js"'));
  assert.match(fs.readFileSync(path.join(__dirname, "wersja.js"), "utf8"), /var WERSJA_GRY = "dev";/);
  assert.match(fs.readFileSync(path.join(__dirname, "sw.js"), "utf8"), /var CACHE = "sudoku-dev";/);
  assert.ok(fs.readFileSync(path.join(__dirname, "sw.js"), "utf8").indexOf('"./wersja.js"') >= 0);
  assert.ok(fs.readFileSync(path.join(__dirname, "sw.js"), "utf8").indexOf('"./zmiany.html"') >= 0);
  assert.match(html, /id="stopkaWersji"[^>]*href="zmiany.html"/);
  var css = fs.readFileSync(path.join(__dirname, "style.css"), "utf8");
  var start = css.indexOf(".stopkaWersji {");
  assert.ok(start >= 0);
  var blok = css.slice(start, css.indexOf("}", start));
  assert.equal(blok.indexOf("position: fixed"), -1);
  assert.equal(blok.indexOf("position: absolute"), -1);
  assert.ok(blok.indexOf("font-size: 11px") >= 0);
  var gra = fs.readFileSync(path.join(__dirname, "game.js"), "utf8");
  var od = gra.indexOf("function pokazWersje");
  var doKonca = gra.indexOf("function zarejestrujPraceOffline");
  assert.ok(od >= 0 && doKonca > od);
  assert.equal(gra.slice(od, doKonca).indexOf("localStorage"), -1);
  assert.ok(gra.indexOf('var KLUCZ = "sudoku"') >= 0);
  assert.ok(gra.indexOf("wersja: 1") >= 0);
});

test("lista zmian jest po polsku, od najnowszej, i wraca do gry", function () {
  var html = fs.readFileSync(path.join(__dirname, "zmiany.html"), "utf8");
  assert.ok(html.indexOf('href="index.html"') >= 0);
  assert.ok(html.indexOf("Wróć do gry") >= 0);
  assert.ok(html.indexOf('class="zmiany"') >= 0);
  var czasy = [];
  var re = /datetime="([^"]+)"/g;
  var m;
  while ((m = re.exec(html))) czasy.push(m[1]);
  assert.deepEqual(czasy, [
    "2026-11-26T00:12+07:00",
    "2026-11-25T23:59+07:00",
    "2026-11-25T20:01+07:00",
    "2026-11-25T19:48+07:00",
    "2026-11-25T19:43+07:00",
    "2026-11-25T19:22+07:00",
    "2026-11-25T11:33+07:00"
  ]);
  assert.ok(html.indexOf("Pokaż czas") >= 0);
  assert.ok(html.indexOf("listę zmian") >= 0);
  assert.ok(html.indexOf("Jest nowa wersja") >= 0);
  assert.ok(html.indexOf("Notatki") >= 0);
  assert.ok(html.indexOf("skąd wzięła się cyfra") >= 0);
  assert.ok(html.indexOf("bez sieci") >= 0);
  assert.ok(html.indexOf("gumka") >= 0);
  var claude = fs.readFileSync(path.join(__dirname, "CLAUDE.md"), "utf8");
  assert.ok(claude.indexOf("zmiany.html") >= 0);
  assert.ok(claude.indexOf("Every future player-visible change must add an entry") >= 0);
});

test("data wersji jest w strefie Asia/Bangkok", function () {
  assert.equal(wstaw.STREF, "Asia/Bangkok");
  var poludnie = Date.UTC(2026, 10, 25, 12, 0, 0) / 1000;
  assert.equal(wstaw.formatujCzas(poludnie), "2026-11-25 19:00");
  var przedPolnoca = Date.UTC(2026, 10, 25, 16, 59, 0) / 1000;
  assert.equal(wstaw.formatujCzas(przedPolnoca), "2026-11-25 23:59");
  var poPolnocy = Date.UTC(2026, 10, 25, 17, 0, 0) / 1000;
  assert.equal(wstaw.formatujCzas(poPolnocy), "2026-11-26 00:00");
  assert.equal(wstaw.wersjaZCommita(poludnie, "a2b0af3"), "2026-11-25 19:00 a2b0af3");
});

test("wstawienie wersji zmienia sw.js i zostawia dev w źródle", function () {
  var katalog = fs.mkdtempSync(path.join(os.tmpdir(), "sudoku-wersja-"));
  var swPrzed = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
  var werPrzed = fs.readFileSync(path.join(__dirname, "wersja.js"), "utf8");
  try {
    fs.copyFileSync(path.join(__dirname, "sw.js"), path.join(katalog, "sw.js"));
    fs.copyFileSync(path.join(__dirname, "wersja.js"), path.join(katalog, "wersja.js"));
    assert.equal(wstaw.wersjaDobra("2026-11-25 19:52"), true);
    assert.equal(wstaw.wersjaDobra("2026-11-25 19:52 a2b0af3"), true);
    assert.equal(wstaw.wersjaDobra("dev"), false);
    assert.equal(wstaw.wersjaDobra('2026-11-25 19:52 "x'), false);
    assert.throws(function () {
      wstaw.wstawWersje(katalog, "nie-data");
    });
    assert.equal(fs.readFileSync(path.join(katalog, "sw.js"), "utf8"), swPrzed);
    wstaw.wstawWersje(katalog, "2026-11-25 19:52 a2b0af3");
    var swPo = fs.readFileSync(path.join(katalog, "sw.js"), "utf8");
    var werPo = fs.readFileSync(path.join(katalog, "wersja.js"), "utf8");
    assert.notEqual(swPo, swPrzed);
    assert.match(swPo, /var CACHE = "sudoku-2026-11-25 19:52 a2b0af3";/);
    assert.match(werPo, /var WERSJA_GRY = "2026-11-25 19:52 a2b0af3";/);
    assert.equal(fs.readFileSync(path.join(__dirname, "sw.js"), "utf8"), swPrzed);
    assert.equal(fs.readFileSync(path.join(__dirname, "wersja.js"), "utf8"), werPrzed);
    child.execFileSync(process.execPath, ["--check", path.join(katalog, "sw.js")]);
    child.execFileSync(process.execPath, ["--check", path.join(katalog, "wersja.js")]);
    wstaw.wstawWersje(katalog, "2026-11-25 19:53 bbbbbbb");
    assert.match(fs.readFileSync(path.join(katalog, "sw.js"), "utf8"), /var CACHE = "sudoku-2026-11-25 19:53 bbbbbbb";/);
    assert.match(fs.readFileSync(path.join(katalog, "wersja.js"), "utf8"), /var WERSJA_GRY = "2026-11-25 19:53 bbbbbbb";/);
    var sandbox = { self: { addEventListener: function () {}, location: { origin: "https://przyklad.invalid" } } };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(katalog, "sw.js"), "utf8"), sandbox);
    assert.equal(sandbox.CACHE, "sudoku-2026-11-25 19:53 bbbbbbb");
  } finally {
    fs.rmSync(katalog, { recursive: true, force: true });
  }
});

test("wypisana wersja to data commita w Bangkoku i krótki sha", function () {
  var wynik = child.execFileSync(process.execPath, ["wstaw-wersje.js", "--wypisz"], {
    cwd: __dirname,
    encoding: "utf8"
  }).trim();
  var unix = child.execFileSync("git", ["log", "-1", "--format=%ct"], {
    cwd: __dirname,
    encoding: "utf8"
  }).trim();
  var sha = child.execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
    cwd: __dirname,
    encoding: "utf8"
  }).trim();
  assert.equal(wynik, wstaw.wersjaZCommita(Number(unix), sha));
  assert.equal(wynik, wstaw.wersjaZGita(__dirname));
  assert.match(wynik, /^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2} [0-9a-f]{7,}$/);
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

test("czas planszy: minuty, godzina i pauza", function () {
  assert.equal(silnik.formatujCzas(0), "0:00");
  assert.equal(silnik.formatujCzas(999), "0:00");
  assert.equal(silnik.formatujCzas(1000), "0:01");
  assert.equal(silnik.formatujCzas(61 * 1000), "1:01");
  assert.equal(silnik.formatujCzas(59 * 60 * 1000 + 59 * 1000), "59:59");
  assert.equal(silnik.formatujCzas(60 * 60 * 1000), "1:00:00");
  assert.equal(silnik.formatujCzas(60 * 60 * 1000 + 61 * 1000), "1:01:01");
  assert.equal(silnik.formatujCzas(13 * 60 * 60 * 1000), "13:00:00");
  assert.equal(silnik.formatujCzas(-50), "0:00");
  assert.equal(silnik.formatujCzas(NaN), "0:00");

  assert.equal(silnik.uplynelo(4000, 0, 9000), 4000);
  assert.equal(silnik.uplynelo(4000, 1000, 3500), 6500);
  assert.equal(silnik.uplynelo(4000, 8000, 7000), 4000);
  assert.equal(silnik.uplynelo(-10, 0, 100), 0);
  var poPauzie = silnik.uplynelo(6500, 0, 20000);
  assert.equal(poPauzie, 6500);
  assert.equal(silnik.uplynelo(poPauzie, 20000, 22500), 9000);

  assert.equal(silnik.czyCzasIdzie(true, false), true);
  assert.equal(silnik.czyCzasIdzie(false, false), false);
  assert.equal(silnik.czyCzasIdzie(true, true), false);
  assert.equal(silnik.czyCzasIdzie(false, true), false);
});
