// ===== Serwer gry w statki =====
// Pokazuje grę przeglądarkom (też telefonom w tym samym Wi-Fi), pilnuje zasad
// i mówi każdemu graczowi, co widzi na planszach.
// Uruchom: mise run serwer

var http = require("http");
var fs = require("fs");
var path = require("path");
var os = require("os");
var zasady = require("./zasady.js");

// Port i publiczny adres można podać z zewnątrz (tak gra działa w internecie)
var PORT = Number(process.env.PORT) || 8081;
var PUBLICZNY_ADRES = process.env.PUBLICZNY_ADRES || "";
var FOLDER = __dirname;
var SEKUNDY_DO_USUNIECIA = 10;  // po tylu sekundach bez połączenia można usunąć gracza
var RODZAJE_PLIKOW = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav"
};

// ----- Stan gry -----
// etap: "poczekalnia" -> "ustawianie" -> "bitwa" -> "koniec"
// oczekujacy: kto był w grze, ale po "od nowa" jeszcze nie nacisnął Gram!
var gra = { etap: "poczekalnia", tryb: "klasyczna", gracze: [], oczekujacy: [], tura: 0, zwyciezca: "", dziennik: [], ostatni: null, numerStrzalu: 0 };
var nastepnyNumer = 1;
var sluchacze = {};  // id gracza -> otwarte połączenie do jego przeglądarki

// Adresy, pod którymi inni w tym Wi-Fi znajdą grę
var ADRESY = PUBLICZNY_ADRES ? [PUBLICZNY_ADRES] : [];
var sieci = os.networkInterfaces();
for (var nazwaSieci in sieci) {
  for (var a = 0; a < sieci[nazwaSieci].length; a++) {
    var adres = sieci[nazwaSieci][a];
    if (!PUBLICZNY_ADRES && adres.family === "IPv4" && !adres.internal) ADRESY.push("http://" + adres.address + ":" + PORT);
  }
}

// Zasady wybranego rodzaju gry (rozmiar planszy i statki)
function tryb() {
  return zasady.TRYBY[gra.tryb];
}

function ilePol() {
  return tryb().rozmiar * tryb().rozmiar;
}

function pustaPlansza(wartosc) {
  var plansza = [];
  for (var i = 0; i < ilePol(); i++) plansza.push(wartosc);
  return plansza;
}

function wyczyscPlansze(g) {
  g.gotowy = false;
  g.odpadl = false;
  g.statki = [];
  g.naPolu = pustaPlansza(-1);   // który statek stoi na polu
  g.strzaly = pustaPlansza(0);   // 0 nikt nie strzelał, 1 pudło, 2 trafiony, 3 zatopiony
}

function znajdz(id) {
  for (var i = 0; i < gra.gracze.length; i++) {
    if (gra.gracze[i].id === id) return gra.gracze[i];
  }
  return null;
}

// Czy ta osoba jeszcze musi nacisnąć Gram!
function oczekuje(id) {
  for (var i = 0; i < gra.oczekujacy.length; i++) {
    if (gra.oczekujacy[i].id === id) return true;
  }
  return false;
}

function zabierzOczekujacego(id) {
  for (var i = 0; i < gra.oczekujacy.length; i++) {
    if (gra.oczekujacy[i].id === id) {
      gra.oczekujacy.splice(i, 1);
      return;
    }
  }
}

function gracz(nr) {
  for (var i = 0; i < gra.gracze.length; i++) {
    if (gra.gracze[i].nr === nr) return gra.gracze[i];
  }
  return null;
}

// Gracze, którzy jeszcze grają (nie oglądają i mają statki)
function wGrze() {
  var lista = [];
  for (var i = 0; i < gra.gracze.length; i++) {
    var g = gra.gracze[i];
    if (!g.widz && !g.odpadl) lista.push(g);
  }
  return lista;
}

function zostaloStatkow(g) {
  var ile = 0;
  for (var i = 0; i < g.statki.length; i++) {
    if (g.statki[i].trafione < g.statki[i].pola.length) ile++;
  }
  return ile;
}

function tylkoPolaczeni() {
  var lista = [];
  for (var i = 0; i < gra.gracze.length; i++) {
    if (gra.gracze[i].online) lista.push(gra.gracze[i]);
  }
  gra.gracze = lista;
}

function zapiszWDzienniku(tekst) {
  gra.dziennik.push(tekst);
  if (gra.dziennik.length > 30) gra.dziennik.shift();
  console.log(tekst);
}

// ----- Ruchy graczy -----
function wykonaj(id, akcja) {
  if (!id) return "Nie wiem, kim jesteś";
  if (akcja.typ === "dolacz") return dolacz(id, akcja.imie);
  if (akcja.typ === "odNowa") return odNowa(id);
  var ja = znajdz(id);
  if (!ja) return "Najpierw dołącz do gry";
  if (akcja.typ === "start") return start();
  if (akcja.typ === "tryb") return zmienTryb(String(akcja.tryb));
  if (akcja.typ === "ustaw") return ustaw(ja, akcja.statki);
  if (akcja.typ === "strzal") return strzal(ja, Number(akcja.cel), Number(akcja.pole));
  if (akcja.typ === "usun") return usun(ja, Number(akcja.nr));
  if (akcja.typ === "nowaGra") return nowaGra();
  return "Nie znam takiego ruchu";
}

function dolacz(id, imie) {
  imie = String(imie || "").trim().slice(0, 12);
  if (!imie) return "Wpisz imię";
  zabierzOczekujacego(id);
  var ja = znajdz(id);
  if (ja) {
    ja.imie = imie;
    return "";
  }
  ja = { id: id, nr: nastepnyNumer++, imie: imie, online: !!sluchacze[id], offlineOd: Date.now(), widz: gra.etap !== "poczekalnia" };
  wyczyscPlansze(ja);
  gra.gracze.push(ja);
  zapiszWDzienniku("👋 " + imie + (ja.widz ? " ogląda grę" : " dołącza do gry"));
  return "";
}

// W poczekalni każdy może wybrać, czy gramy klasycznie, czy szybko
function zmienTryb(nowy) {
  if (gra.etap !== "poczekalnia") return "Rodzaj gry wybiera się w poczekalni";
  if (!zasady.TRYBY.hasOwnProperty(nowy)) return "Nie ma takiego rodzaju gry";
  if (gra.tryb === nowy) return "";
  gra.tryb = nowy;
  for (var i = 0; i < gra.gracze.length; i++) wyczyscPlansze(gra.gracze[i]);
  zapiszWDzienniku("⚙️ Gramy w wersję: " + tryb().nazwa + " (" + tryb().opis + ")");
  return "";
}

function start() {
  if (gra.etap !== "poczekalnia") return "Gra już trwa";
  tylkoPolaczeni();
  if (gra.gracze.length < 2) return "Potrzeba co najmniej dwóch graczy";
  for (var i = 0; i < gra.gracze.length; i++) {
    gra.gracze[i].widz = false;
    wyczyscPlansze(gra.gracze[i]);
  }
  gra.etap = "ustawianie";
  gra.dziennik = [];
  gra.ostatni = null;
  gra.zwyciezca = "";
  zapiszWDzienniku("🚢 Ustawiamy statki!");
  return "";
}

function ustaw(ja, lista) {
  if (gra.etap !== "ustawianie" || ja.widz) return "Teraz nie można ustawiać statków";
  if (ja.gotowy) return "";
  var flota = zasady.zbudujFlote(lista, tryb(), true);
  if (!flota) return "Statki są źle ustawione";
  ja.statki = flota.statki;
  ja.naPolu = flota.naPolu;
  ja.gotowy = true;
  zapiszWDzienniku("✔ " + ja.imie + " ma gotowe statki");
  sprawdzCzyWszyscyGotowi();
  return "";
}

function sprawdzCzyWszyscyGotowi() {
  var grajacy = wGrze();
  if (grajacy.length < 2) {
    gra.etap = "poczekalnia";
    zapiszWDzienniku("😕 Za mało graczy, wracamy do poczekalni");
    return;
  }
  for (var i = 0; i < grajacy.length; i++) {
    if (!grajacy[i].gotowy) return;
  }
  gra.etap = "bitwa";
  var pierwszy = grajacy[Math.floor(Math.random() * grajacy.length)];
  gra.tura = pierwszy.nr;
  zapiszWDzienniku("⚓ Bitwa! Zaczyna " + pierwszy.imie);
}

function strzal(ja, celNr, pole) {
  if (gra.etap !== "bitwa") return "Bitwa jeszcze się nie zaczęła";
  if (gra.tura !== ja.nr) return "Poczekaj na swoją kolej";
  var cel = gracz(celNr);
  if (!cel || cel === ja || cel.widz || cel.odpadl) return "W tę planszę nie można strzelać";
  if (!Number.isInteger(pole) || pole < 0 || pole >= ilePol()) return "Nie ma takiego pola";
  if (cel.strzaly[pole] !== 0) return "Tu już ktoś strzelał";

  var numerStatku = cel.naPolu[pole];
  var wynik = "pudlo";
  if (numerStatku === -1) {
    cel.strzaly[pole] = 1;
  } else {
    var statek = cel.statki[numerStatku];
    statek.trafione++;
    cel.strzaly[pole] = 2;
    wynik = "trafiony";
    if (statek.trafione === statek.pola.length) {
      wynik = "zatopiony";
      // Zatopiony statek: całe zaznaczamy, a wodę dookoła oznaczamy jako pudła
      for (var i = 0; i < statek.pola.length; i++) {
        cel.strzaly[statek.pola[i]] = 3;
        var obok = zasady.sasiedzi(statek.pola[i], tryb().rozmiar);
        for (var j = 0; j < obok.length; j++) {
          if (cel.strzaly[obok[j]] === 0) cel.strzaly[obok[j]] = 1;
        }
      }
    }
  }

  var slowa = { pudlo: "pudło 💧", trafiony: "trafiony! 💥", zatopiony: "zatopiony! 🔥" };
  var tekst = ja.imie + " → " + cel.imie + ", " + zasady.nazwaPola(pole, tryb().rozmiar) + ": " + slowa[wynik];
  gra.numerStrzalu++;
  gra.ostatni = { numer: gra.numerStrzalu, kto: ja.nr, cel: cel.nr, pole: pole, wynik: wynik, tekst: tekst };
  zapiszWDzienniku(tekst);

  if (zostaloStatkow(cel) === 0) {
    cel.odpadl = true;
    zapiszWDzienniku("💀 " + cel.imie + " nie ma już statków");
  }
  if (sprawdzKoniec()) return "";
  if (wynik === "pudlo") nastepnaTura();  // trafienie = strzelasz jeszcze raz
  return "";
}

function sprawdzKoniec() {
  var zywi = wGrze();
  if (zywi.length > 1) return false;
  gra.etap = "koniec";
  gra.zwyciezca = zywi.length ? zywi[0].imie : "";
  zapiszWDzienniku("🏆 Wygrywa " + gra.zwyciezca + "!");
  return true;
}

// Kolej następnego gracza, który jeszcze ma statki
function nastepnaTura() {
  var ile = gra.gracze.length;
  var teraz = 0;
  for (var i = 0; i < ile; i++) {
    if (gra.gracze[i].nr === gra.tura) teraz = i;
  }
  for (var krok = 1; krok <= ile; krok++) {
    var g = gra.gracze[(teraz + krok) % ile];
    if (!g.widz && !g.odpadl) {
      gra.tura = g.nr;
      return;
    }
  }
}

// Usuwamy gracza, który od dawna nie ma połączenia (np. zgasł mu telefon)
function usun(ja, nr) {
  var g = gracz(nr);
  if (!g || g === ja) return "";
  if (g.online || Date.now() - g.offlineOd < SEKUNDY_DO_USUNIECIA * 1000) return "Ten gracz jest jeszcze połączony";
  zapiszWDzienniku("🚪 " + g.imie + " wypada z gry");
  if (gra.etap === "bitwa") {
    var bylaJegoKolej = gra.tura === g.nr;
    g.odpadl = true;
    if (!sprawdzKoniec() && bylaJegoKolej) nastepnaTura();
  } else {
    gra.gracze.splice(gra.gracze.indexOf(g), 1);
    if (gra.etap === "ustawianie") sprawdzCzyWszyscyGotowi();
  }
  return "";
}

function nowaGra() {
  if (gra.etap !== "koniec") return "Gra jeszcze trwa";
  tylkoPolaczeni();
  for (var i = 0; i < gra.gracze.length; i++) {
    gra.gracze[i].widz = false;
    wyczyscPlansze(gra.gracze[i]);
  }
  gra.etap = "poczekalnia";
  gra.ostatni = null;
  zapiszWDzienniku("🔄 Nowa gra! Czekamy na start");
  return "";
}

// Wszyscy wypadają z rundy i muszą sami nacisnąć Gram!. Kto nie naciśnie, nie gra.
function odNowa(id) {
  var ja = znajdz(id);
  if (!ja) {
    if (oczekuje(id)) return "";
    return "Najpierw dołącz do gry";
  }
  if (ja.widz) return "Teraz tylko gracze mogą zacząć od nowa";
  var imie = ja.imie;
  var lista = [];
  for (var i = 0; i < gra.gracze.length; i++) {
    lista.push({ id: gra.gracze[i].id, imie: gra.gracze[i].imie });
  }
  // Kto już wcześniej nie nacisnął Gram!, zostaje na liście (inaczej telefon sam by wrócił)
  for (var j = 0; j < gra.oczekujacy.length; j++) {
    var jest = false;
    for (var k = 0; k < lista.length; k++) {
      if (lista[k].id === gra.oczekujacy[j].id) jest = true;
    }
    if (!jest) lista.push({ id: gra.oczekujacy[j].id, imie: gra.oczekujacy[j].imie });
  }
  gra.oczekujacy = lista;
  gra.gracze = [];
  gra.etap = "poczekalnia";
  gra.tura = 0;
  gra.zwyciezca = "";
  gra.dziennik = [];
  gra.ostatni = null;
  zapiszWDzienniku("🔁 " + imie + " zaczyna od nowa. Kto gra, naciska Gram!");
  return "";
}

// Imiona osób, które jeszcze nie nacisnęły Gram! (bez tajnych numerów)
function widokOczekujacych(bezId) {
  var lista = [];
  for (var i = 0; i < gra.oczekujacy.length; i++) {
    var o = gra.oczekujacy[i];
    if (o.id === bezId) continue;
    lista.push({ imie: o.imie, online: !!sluchacze[o.id] });
  }
  return lista;
}

// ----- Co widzi gracz -----
// Plansza to 100 znaków: 0 woda, 1 pudło, 2 trafiony, 3 zatopiony, 4 cały statek (tylko swój albo na koniec gry)
function widokDla(id) {
  var ja = znajdz(id);
  var odkryj = gra.etap === "koniec";
  var teraz = Date.now();
  var gracze = [];
  for (var i = 0; i < gra.gracze.length; i++) {
    var g = gra.gracze[i];
    var pola = "";
    for (var p = 0; p < ilePol(); p++) {
      if (g.strzaly[p] === 0 && g.naPolu[p] !== -1 && (g === ja || odkryj)) pola += "4";
      else pola += g.strzaly[p];
    }
    gracze.push({
      nr: g.nr,
      imie: g.imie,
      online: g.online,
      offline: g.online ? 0 : Math.floor((teraz - g.offlineOd) / 1000),
      widz: g.widz,
      gotowy: g.gotowy,
      odpadl: g.odpadl,
      zostalo: zostaloStatkow(g),
      pola: pola
    });
  }
  return {
    etap: gra.etap,
    tryb: gra.tryb,
    trzebaPotwierdzic: oczekuje(id),
    oczekujacy: widokOczekujacych(id),
    ja: ja ? ja.nr : 0,
    tura: gra.tura,
    zwyciezca: gra.zwyciezca,
    dziennik: gra.dziennik.slice(-8),
    ostatni: gra.ostatni,
    adresy: ADRESY,
    sekundyDoUsuniecia: SEKUNDY_DO_USUNIECIA,
    gracze: gracze
  };
}

// Każdy dostaje swój widok
function rozeslij() {
  for (var id in sluchacze) {
    sluchacze[id].write("event: stan\ndata: " + JSON.stringify(widokDla(id)) + "\n\n");
  }
}

// ----- Serwer -----
var serwer = http.createServer(function (zadanie, odpowiedz) {
  var adresStrony = new URL(zadanie.url, "http://localhost");
  if (adresStrony.pathname === "/wydarzenia") return polaczGracza(adresStrony, zadanie, odpowiedz);
  if (adresStrony.pathname === "/akcja" && zadanie.method === "POST") return odbierzAkcje(zadanie, odpowiedz);
  wyslijPlik(adresStrony.pathname, odpowiedz);
});

// Przeglądarka otwiera stałe połączenie i czeka na wiadomości
function polaczGracza(adresStrony, zadanie, odpowiedz) {
  var id = adresStrony.searchParams.get("id");
  if (!id) {
    odpowiedz.writeHead(400);
    return odpowiedz.end();
  }
  odpowiedz.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", "Connection": "keep-alive" });
  odpowiedz.write("retry: 1000\n\n");
  sluchacze[id] = odpowiedz;
  var ja = znajdz(id);
  if (ja) ja.online = true;
  rozeslij();
  zadanie.on("close", function () {
    if (sluchacze[id] !== odpowiedz) return;  // ten gracz ma już nowsze połączenie
    delete sluchacze[id];
    var g = znajdz(id);
    if (g) {
      g.online = false;
      g.offlineOd = Date.now();
    }
    rozeslij();
  });
}

function odbierzAkcje(zadanie, odpowiedz) {
  var tresc = "";
  zadanie.on("data", function (kawalek) {
    tresc += kawalek;
    if (tresc.length > 5000) zadanie.destroy();
  });
  zadanie.on("end", function () {
    var blad = "";
    try {
      var akcja = JSON.parse(tresc);
      blad = wykonaj(String(akcja.id || ""), akcja);
    } catch (e) {
      blad = "Zepsuta wiadomość";
    }
    if (!blad) rozeslij();
    odpowiedz.writeHead(200, { "Content-Type": "application/json" });
    odpowiedz.end(JSON.stringify(blad ? { blad: blad } : { ok: true }));
  });
}

// Pliki gry: index.html, skrypty, style
function wyslijPlik(sciezka, odpowiedz) {
  if (sciezka === "/") sciezka = "/index.html";
  try {
    sciezka = decodeURIComponent(sciezka);
  } catch (e) {
    sciezka = "";
  }
  var czesci = sciezka.split("/");
  for (var i = 0; i < czesci.length; i++) {
    // ukryte pliki (np. .git) i wychodzenie z folderu gry są zabronione
    if (czesci[i].charAt(0) === ".") return nieMa(odpowiedz);
  }
  var plik = path.join(FOLDER, sciezka);
  if (plik.indexOf(FOLDER + path.sep) !== 0) return nieMa(odpowiedz);
  fs.readFile(plik, function (blad, dane) {
    if (blad) return nieMa(odpowiedz);
    var rodzaj = RODZAJE_PLIKOW[path.extname(plik).toLowerCase()] || "application/octet-stream";
    odpowiedz.writeHead(200, { "Content-Type": rodzaj, "Cache-Control": "no-store" });
    odpowiedz.end(dane);
  });
}

function nieMa(odpowiedz) {
  odpowiedz.writeHead(404);
  odpowiedz.end("Nie ma takiego pliku");
}

// Ktoś bez połączenia: co kilka sekund odświeżamy licznik, żeby pojawił się guzik "Usuń"
setInterval(function () {
  for (var i = 0; i < gra.gracze.length; i++) {
    if (!gra.gracze[i].online) return rozeslij();
  }
}, 5000);

// Co jakiś czas pukamy, żeby połączenie nie zasnęło
setInterval(function () {
  for (var id in sluchacze) sluchacze[id].write(": puk\n\n");
}, 15000);

// Zmieniony plik gry: wszyscy odświeżają stronę (gra na serwerze trwa dalej)
var czekamNaKoniecZmian = null;
fs.watch(FOLDER, { recursive: true }, function (zdarzenie, nazwa) {
  if (!nazwa || nazwa.charAt(0) === "." || nazwa === "serwer.js") return;
  clearTimeout(czekamNaKoniecZmian);
  czekamNaKoniecZmian = setTimeout(function () {
    console.log("🔄 Zmiana w " + nazwa + ", odświeżam");
    for (var id in sluchacze) sluchacze[id].write("event: odswiez\ndata: {}\n\n");
  }, 150);
});

serwer.on("error", function (blad) {
  if (blad.code === "EADDRINUSE") console.log("❌ Port " + PORT + " jest zajęty. Zamknij inny serwer gry i spróbuj jeszcze raz.");
  else console.log("❌ " + blad.message);
  process.exit(1);
});

serwer.listen(PORT, "0.0.0.0", function () {
  console.log("⚓ Statki działają!");
  console.log("💻 Na tym komputerze: http://127.0.0.1:" + PORT);
  for (var i = 0; i < ADRESY.length; i++) console.log((PUBLICZNY_ADRES ? "🌍 W internecie: " : "📱 Na telefonie (to samo Wi-Fi): ") + ADRESY[i]);
  if (process.argv.indexOf("--otworz") !== -1) require("child_process").exec("open http://127.0.0.1:" + PORT);
});
