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
