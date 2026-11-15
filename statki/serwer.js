// ===== Serwer gry w statki =====
// Pokazuje grę przeglądarkom (też telefonom w tym samym Wi-Fi), pilnuje zasad
// i mówi każdemu graczowi, co widzi na planszach.
// Na jednym serwerze może iść wiele gier naraz. Każda ma swój kod.
// Uruchom: mise run serwer

var http = require("http");
var fs = require("fs");
var path = require("path");
var os = require("os");
var zasady = require("./zasady.js");

// Port i publiczny adres można podać z zewnątrz (tak gra działa na serwerze czarny)
var PORT = Number(process.env.PORT) || 8081;
var PUBLICZNY_ADRES = process.env.PUBLICZNY_ADRES || "";
var FOLDER = __dirname;
var SEKUNDY_DO_USUNIECIA = 10;  // po tylu sekundach bez połączenia można usunąć gracza
// Pusta gra (nikt nie patrzy) znika, żeby mały komputer nie trzymał starych gier.
var SEKUNDY_PUSTEJ_GRY = Number(process.env.SEKUNDY_PUSTEGO_LOBBY);
if (!SEKUNDY_PUSTEJ_GRY || SEKUNDY_PUSTEJ_GRY < 1) SEKUNDY_PUSTEJ_GRY = 15 * 60;
var CZAS_PUSTEJ_GRY = SEKUNDY_PUSTEJ_GRY * 1000;
var CO_ILE_SPRZATAMY = Math.min(30000, Math.max(1000, Math.floor(CZAS_PUSTEJ_GRY / 2)));
var MAX_GIER = 40;
// Takie kody da się wylosować, ale lepiej ich nie czytać przy obiedzie.
var KODY_NIE = { KUPA: 1, PUPA: 1, DUPA: 1, KAKA: 1 };
var RODZAJE_PLIKOW = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff2": "font/woff2"
};

// Wszystkie gry. Klucz to kod (np. KUNA). Pusta mapa, żeby dziwny kod niczego nie zepsuł.
var lobby = Object.create(null);
// Przeglądarki na stronie startu (bez gry) — dostają tylko „odśwież stronę”.
var goscie = [];

// Adresy, pod którymi inni w tym Wi-Fi znajdą grę
var ADRESY = PUBLICZNY_ADRES ? [PUBLICZNY_ADRES] : [];
var sieci = os.networkInterfaces();
for (var nazwaSieci in sieci) {
  for (var a = 0; a < sieci[nazwaSieci].length; a++) {
    var adres = sieci[nazwaSieci][a];
    if (!PUBLICZNY_ADRES && adres.family === "IPv4" && !adres.internal) ADRESY.push("http://" + adres.address + ":" + PORT);
  }
}

// ----- Jedna gra -----
// Cały stan jednej rozgrywki siedzi w tym obiekcie. Druga gra to drugi obiekt.
// Nowe rzeczy (punkty, obrazek gracza, statystyki) dopisuj tutaj albo w funkcjach
// poniżej, które dostają `gra`. Nie trzymaj ich obok, na całym serwerze.
function pustaGra(kod) {
  return {
    kod: kod,
    etap: "poczekalnia",
    tryb: "klasyczna",
    gracze: [],
    oczekujacy: [],
    tura: 0,
    zwyciezca: "",
    dziennik: [],
    ostatni: null,
    numerStrzalu: 0,
    nastepnyNumer: 1,
    sluchacze: Object.create(null),
    ostatnio: Date.now()
  };
}

function idDobre(id) {
  return /^[a-z0-9]+$/i.test(id) && id.length <= 40;
}

// Zasady wybranego rodzaju gry (rozmiar planszy i statki)
function tryb(gra) {
  return zasady.TRYBY[gra.tryb];
}

function ilePol(gra) {
  return tryb(gra).rozmiar * tryb(gra).rozmiar;
}

function pustaPlansza(gra, wartosc) {
  var plansza = [];
  for (var i = 0; i < ilePol(gra); i++) plansza.push(wartosc);
  return plansza;
}

function wyczyscPlansze(gra, g) {
  g.gotowy = false;
  g.odpadl = false;
  g.statki = [];
  g.naPolu = pustaPlansza(gra, -1);   // który statek stoi na polu
  g.strzaly = pustaPlansza(gra, 0);   // 0 nikt nie strzelał, 1 pudło, 2 trafiony, 3 zatopiony
}

function znajdz(gra, id) {
  for (var i = 0; i < gra.gracze.length; i++) {
    if (gra.gracze[i].id === id) return gra.gracze[i];
  }
  return null;
}

// Czy ta osoba jeszcze musi nacisnąć Gram!
function oczekuje(gra, id) {
  for (var i = 0; i < gra.oczekujacy.length; i++) {
    if (gra.oczekujacy[i].id === id) return true;
  }
  return false;
}

function zabierzOczekujacego(gra, id) {
  for (var i = 0; i < gra.oczekujacy.length; i++) {
    if (gra.oczekujacy[i].id === id) {
      gra.oczekujacy.splice(i, 1);
      return;
    }
  }
}

function gracz(gra, nr) {
  for (var i = 0; i < gra.gracze.length; i++) {
    if (gra.gracze[i].nr === nr) return gra.gracze[i];
  }
  return null;
}

// Gracze, którzy jeszcze grają (nie oglądają i mają statki)
function wGrze(gra) {
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

function tylkoPolaczeni(gra) {
  var lista = [];
  for (var i = 0; i < gra.gracze.length; i++) {
    if (gra.gracze[i].online) lista.push(gra.gracze[i]);
  }
  gra.gracze = lista;
}

function zapiszWDzienniku(gra, tekst) {
  gra.dziennik.push(tekst);
  if (gra.dziennik.length > 30) gra.dziennik.shift();
  console.log("[" + gra.kod + "] " + tekst);
}

function ktoSlucha(gra) {
  var ile = 0;
  for (var id in gra.sluchacze) ile++;
  return ile;
}

// ----- Ruchy graczy (zawsze w jednej, wskazanej grze) -----
function wykonaj(gra, id, akcja) {
  if (!idDobre(id)) return "Nie wiem, kim jesteś";
  if (akcja.typ === "dolacz") return dolacz(gra, id, akcja.imie);
  if (akcja.typ === "odNowa") return odNowa(gra, id);
  if (akcja.typ === "wyjdz") return wyjdz(gra, id);
  var ja = znajdz(gra, id);
  if (!ja) return "Najpierw dołącz do gry";
  if (akcja.typ === "start") return start(gra);
  if (akcja.typ === "tryb") return zmienTryb(gra, String(akcja.tryb));
  if (akcja.typ === "ustaw") return ustaw(gra, ja, akcja.statki);
  if (akcja.typ === "strzal") return strzal(gra, ja, Number(akcja.cel), Number(akcja.pole));
  if (akcja.typ === "usun") return usun(gra, ja, Number(akcja.nr));
  if (akcja.typ === "nowaGra") return nowaGra(gra);
  return "Nie znam takiego ruchu";
}

function dolacz(gra, id, imie) {
  imie = String(imie || "").trim().slice(0, 12);
  if (!imie) return "Wpisz imię";
  zabierzOczekujacego(gra, id);
  var ja = znajdz(gra, id);
  if (ja) {
    ja.imie = imie;
    return "";
  }
  ja = {
    id: id,
    nr: gra.nastepnyNumer++,
    imie: imie,
    online: !!gra.sluchacze[id],
    offlineOd: Date.now(),
    widz: gra.etap !== "poczekalnia"
  };
  wyczyscPlansze(gra, ja);
  gra.gracze.push(ja);
  zapiszWDzienniku(gra, "👋 " + imie + (ja.widz ? " ogląda grę" : " dołącza do gry"));
  return "";
}

// W poczekalni każdy może wybrać, czy gramy klasycznie, czy szybko
function zmienTryb(gra, nowy) {
  if (gra.etap !== "poczekalnia") return "Rodzaj gry wybiera się w poczekalni";
  if (!zasady.TRYBY.hasOwnProperty(nowy)) return "Nie ma takiego rodzaju gry";
  if (gra.tryb === nowy) return "";
  gra.tryb = nowy;
  for (var i = 0; i < gra.gracze.length; i++) wyczyscPlansze(gra, gra.gracze[i]);
  zapiszWDzienniku(gra, "⚙️ Gramy w wersję: " + tryb(gra).nazwa + " (" + tryb(gra).opis + ")");
  return "";
}

function start(gra) {
  if (gra.etap !== "poczekalnia") return "Gra już trwa";
  tylkoPolaczeni(gra);
  if (gra.gracze.length < 2) return "Potrzeba co najmniej dwóch graczy";
  for (var i = 0; i < gra.gracze.length; i++) {
    gra.gracze[i].widz = false;
    wyczyscPlansze(gra, gra.gracze[i]);
  }
  gra.etap = "ustawianie";
  gra.dziennik = [];
  gra.ostatni = null;
  gra.zwyciezca = "";
  zapiszWDzienniku(gra, "🚢 Ustawiamy statki!");
  return "";
}

function ustaw(gra, ja, lista) {
  if (gra.etap !== "ustawianie" || ja.widz) return "Teraz nie można ustawiać statków";
  if (ja.gotowy) return "";
  var flota = zasady.zbudujFlote(lista, tryb(gra), true);
  if (!flota) return "Statki są źle ustawione";
  ja.statki = flota.statki;
  ja.naPolu = flota.naPolu;
  ja.gotowy = true;
  zapiszWDzienniku(gra, "✔ " + ja.imie + " ma gotowe statki");
  sprawdzCzyWszyscyGotowi(gra);
  return "";
}

function sprawdzCzyWszyscyGotowi(gra) {
  var grajacy = wGrze(gra);
  if (grajacy.length < 2) {
    gra.etap = "poczekalnia";
    zapiszWDzienniku(gra, "😕 Za mało graczy, wracamy do poczekalni");
    return;
  }
  for (var i = 0; i < grajacy.length; i++) {
    if (!grajacy[i].gotowy) return;
  }
  gra.etap = "bitwa";
  var pierwszy = grajacy[Math.floor(Math.random() * grajacy.length)];
  gra.tura = pierwszy.nr;
  zapiszWDzienniku(gra, "⚓ Bitwa! Zaczyna " + pierwszy.imie);
}

function strzal(gra, ja, celNr, pole) {
  if (gra.etap !== "bitwa") return "Bitwa jeszcze się nie zaczęła";
  if (gra.tura !== ja.nr) return "Poczekaj na swoją kolej";
  var cel = gracz(gra, celNr);
  if (!cel || cel === ja || cel.widz || cel.odpadl) return "W tę planszę nie można strzelać";
  if (!Number.isInteger(pole) || pole < 0 || pole >= ilePol(gra)) return "Nie ma takiego pola";
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
        var obok = zasady.sasiedzi(statek.pola[i], tryb(gra).rozmiar);
        for (var j = 0; j < obok.length; j++) {
          if (cel.strzaly[obok[j]] === 0) cel.strzaly[obok[j]] = 1;
        }
      }
    }
  }

  var slowa = { pudlo: "pudło 💧", trafiony: "trafiony! 💥", zatopiony: "zatopiony! 🔥" };
  var tekst = ja.imie + " → " + cel.imie + ", " + zasady.nazwaPola(pole, tryb(gra).rozmiar) + ": " + slowa[wynik];
  gra.numerStrzalu++;
  gra.ostatni = { numer: gra.numerStrzalu, kto: ja.nr, cel: cel.nr, pole: pole, wynik: wynik, tekst: tekst };
  zapiszWDzienniku(gra, tekst);

  if (zostaloStatkow(cel) === 0) {
    cel.odpadl = true;
    zapiszWDzienniku(gra, "💀 " + cel.imie + " nie ma już statków");
  }
  if (sprawdzKoniec(gra)) return "";
  if (wynik === "pudlo") nastepnaTura(gra);  // trafienie = strzelasz jeszcze raz
  return "";
}

function sprawdzKoniec(gra) {
  var zywi = wGrze(gra);
  if (zywi.length > 1) return false;
  gra.etap = "koniec";
  gra.zwyciezca = zywi.length ? zywi[0].imie : "";
  zapiszWDzienniku(gra, "🏆 Wygrywa " + gra.zwyciezca + "!");
  return true;
}

// Kolej następnego gracza, który jeszcze ma statki
function nastepnaTura(gra) {
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
function usun(gra, ja, nr) {
  var g = gracz(gra, nr);
  if (!g || g === ja) return "";
  if (g.online || Date.now() - g.offlineOd < SEKUNDY_DO_USUNIECIA * 1000) return "Ten gracz jest jeszcze połączony";
  zapiszWDzienniku(gra, "🚪 " + g.imie + " wypada z gry");
  if (gra.etap === "bitwa") {
    var bylaJegoKolej = gra.tura === g.nr;
    g.odpadl = true;
    if (!sprawdzKoniec(gra) && bylaJegoKolej) nastepnaTura(gra);
  } else {
    gra.gracze.splice(gra.gracze.indexOf(g), 1);
    if (gra.etap === "ustawianie") sprawdzCzyWszyscyGotowi(gra);
  }
  return "";
}

function nowaGra(gra) {
  if (gra.etap !== "koniec") return "Gra jeszcze trwa";
  tylkoPolaczeni(gra);
  for (var i = 0; i < gra.gracze.length; i++) {
    gra.gracze[i].widz = false;
    wyczyscPlansze(gra, gra.gracze[i]);
  }
  gra.etap = "poczekalnia";
  gra.ostatni = null;
  zapiszWDzienniku(gra, "🔄 Nowa gra! Czekamy na start");
  return "";
}

// Wszyscy wypadają z rundy i muszą sami nacisnąć Gram!. Kto nie naciśnie, nie gra.
function odNowa(gra, id) {
  var ja = znajdz(gra, id);
  if (!ja) {
    if (oczekuje(gra, id)) return "";
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
  zapiszWDzienniku(gra, "🔁 " + imie + " zaczyna od nowa. Kto gra, naciska Gram!");
  return "";
}

// Wracamy na stronę startu. W trakcie bitwy zostajemy — jest do tego „Zacznij od nowa”.
function wyjdz(gra, id) {
  if (!znajdz(gra, id)) {
    zabierzOczekujacego(gra, id);
    return "";
  }
  var ja = znajdz(gra, id);
  if (gra.etap === "bitwa" && !ja.widz) return "W trakcie bitwy stuknij „Zacznij od nowa”";
  gra.gracze.splice(gra.gracze.indexOf(ja), 1);
  zapiszWDzienniku(gra, "👋 " + ja.imie + " wychodzi");
  if (gra.etap === "ustawianie") sprawdzCzyWszyscyGotowi(gra);
  return "";
}

// Imiona osób, które jeszcze nie nacisnęły Gram! (bez tajnych numerów)
function widokOczekujacych(gra, bezId) {
  var lista = [];
  for (var i = 0; i < gra.oczekujacy.length; i++) {
    var o = gra.oczekujacy[i];
    if (o.id === bezId) continue;
    lista.push({ imie: o.imie, online: !!gra.sluchacze[o.id] });
  }
  return lista;
}

// ----- Co widzi gracz -----
// Plansza to ciąg znaków: 0 woda, 1 pudło, 2 trafiony, 3 zatopiony, 4 cały statek (tylko swój albo na koniec gry)
function widokDla(gra, id) {
  var ja = znajdz(gra, id);
  var odkryj = gra.etap === "koniec";
  var teraz = Date.now();
  var gracze = [];
  for (var i = 0; i < gra.gracze.length; i++) {
    var g = gra.gracze[i];
    var pola = "";
    for (var p = 0; p < ilePol(gra); p++) {
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
    kod: gra.kod,
    etap: gra.etap,
    tryb: gra.tryb,
    trzebaPotwierdzic: oczekuje(gra, id),
    oczekujacy: widokOczekujacych(gra, id),
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

// Każdy w TEJ grze dostaje swój widok. Inne gry milczą.
function rozeslij(gra) {
  for (var id in gra.sluchacze) {
    pisz(gra.sluchacze[id], "event: stan\ndata: " + JSON.stringify(widokDla(gra, id)) + "\n\n");
  }
}

// ----- Wiele gier: kod, dołączanie, sprzątanie -----
function losujKod() {
  var spol = zasady.KOD_SPOLGLASKI;
  var samo = zasady.KOD_SAMOGLOSKI;
  var kod = "";
  kod += spol.charAt(Math.floor(Math.random() * spol.length));
  kod += samo.charAt(Math.floor(Math.random() * samo.length));
  kod += spol.charAt(Math.floor(Math.random() * spol.length));
  kod += samo.charAt(Math.floor(Math.random() * samo.length));
  return kod;
}

function ileGier() {
  var ile = 0;
  for (var kod in lobby) ile++;
  return ile;
}

// Tekst, gdy kodu nie ma albo wygląda źle. Pusty napis = kod jest dobry i gra istnieje.
function komunikatKodu(surowy) {
  var kod = zasady.oczyscKod(surowy);
  if (!kod) return "Wpisz kod. To cztery litery, na przykład KUNA.";
  if (!zasady.kodWygladaDobrze(kod)) return "Ten kod wygląda inaczej. Poproś, żeby przeczytać go jeszcze raz.";
  if (!lobby[kod]) return "Nie ma gry o kodzie " + kod + ". Sprawdź litery albo załóż nową grę.";
  return "";
}

function sprawdzKod(surowy) {
  var kod = zasady.oczyscKod(surowy);
  var tekst = komunikatKodu(surowy);
  if (tekst) return { blad: tekst };
  return { ok: true, kod: kod };
}

function zalozLobby() {
  posprzataj();
  if (ileGier() >= MAX_GIER) return { blad: "Jest już dużo gier. Poczekaj chwilę i spróbuj jeszcze raz." };
  for (var proba = 0; proba < 50; proba++) {
    var kod = losujKod();
    if (KODY_NIE[kod] || lobby[kod]) continue;
    lobby[kod] = pustaGra(kod);
    console.log("🆕 Nowa gra " + kod);
    return { ok: true, kod: kod };
  }
  return { blad: "Nie udało się założyć gry. Spróbuj jeszcze raz." };
}

function posprzataj() {
  var teraz = Date.now();
  var doUsuniecia = [];
  for (var kod in lobby) {
    var gra = lobby[kod];
    if (ktoSlucha(gra) > 0) continue;
    if (teraz - gra.ostatnio >= CZAS_PUSTEJ_GRY) doUsuniecia.push(kod);
  }
  for (var i = 0; i < doUsuniecia.length; i++) {
    console.log("🧹 Gra " + doUsuniecia[i] + " była pusta, usuwam ją");
    delete lobby[doUsuniecia[i]];
  }
}

function obsluz(akcja) {
  var typ = String(akcja.typ || "");
  if (typ === "noweLobby") return zalozLobby();
  if (typ === "sprawdzKod") return sprawdzKod(akcja.kod);
  var kod = zasady.oczyscKod(akcja.kod);
  var gra = lobby[kod];
  if (!gra) return { blad: komunikatKodu(akcja.kod) };
  gra.ostatnio = Date.now();
  var blad = wykonaj(gra, String(akcja.id || ""), akcja);
  if (blad) return { blad: blad };
  if (lobby[kod] === gra) rozeslij(gra);
  return { ok: true, kod: kod };
}

// Jak telefon już śpi, zapis nie wywraca serwera.
function pisz(odpowiedz, tresc) {
  try {
    odpowiedz.write(tresc);
  } catch (e) {}
}

function piszDoPolaczen(tresc) {
  for (var kod in lobby) {
    var sl = lobby[kod].sluchacze;
    for (var id in sl) pisz(sl[id], tresc);
  }
  for (var i = 0; i < goscie.length; i++) pisz(goscie[i], tresc);
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
  var id = String(adresStrony.searchParams.get("id") || "");
  if (!idDobre(id)) {
    odpowiedz.writeHead(400);
    return odpowiedz.end();
  }
  var kod = zasady.oczyscKod(adresStrony.searchParams.get("kod") || "");
  odpowiedz.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    "Connection": "keep-alive"
  });
  odpowiedz.write("retry: 1000\n\n");

  var gra = kod ? lobby[kod] : null;
  if (!gra) {
    var wiadomosc = kod ? { brakGry: true, kod: kod, tekst: komunikatKodu(kod) } : { ekran: "start" };
    pisz(odpowiedz, "event: stan\ndata: " + JSON.stringify(wiadomosc) + "\n\n");
    goscie.push(odpowiedz);
    zadanie.on("close", function () {
      var gdzie = goscie.indexOf(odpowiedz);
      if (gdzie !== -1) goscie.splice(gdzie, 1);
    });
    return;
  }

  gra.sluchacze[id] = odpowiedz;
  var ja = znajdz(gra, id);
  if (ja) ja.online = true;
  gra.ostatnio = Date.now();
  rozeslij(gra);
  zadanie.on("close", function () {
    if (gra.sluchacze[id] !== odpowiedz) return;  // ten gracz ma już nowsze połączenie
    delete gra.sluchacze[id];
    var g = znajdz(gra, id);
    if (g) {
      g.online = false;
      g.offlineOd = Date.now();
    }
    gra.ostatnio = Date.now();
    if (lobby[gra.kod] === gra) rozeslij(gra);
  });
}

function odbierzAkcje(zadanie, odpowiedz) {
  var tresc = "";
  zadanie.on("data", function (kawalek) {
    tresc += kawalek;
    if (tresc.length > 5000) zadanie.destroy();
  });
  zadanie.on("end", function () {
    var wynik = { blad: "Zepsuta wiadomość" };
    try {
      wynik = obsluz(JSON.parse(tresc));
    } catch (e) {
      wynik = { blad: "Zepsuta wiadomość" };
    }
    odpowiedz.writeHead(200, { "Content-Type": "application/json" });
    odpowiedz.end(JSON.stringify(wynik));
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
  for (var kod in lobby) {
    var gra = lobby[kod];
    for (var i = 0; i < gra.gracze.length; i++) {
      if (!gra.gracze[i].online) {
        rozeslij(gra);
        break;
      }
    }
  }
}, 5000);

// Co jakiś czas pukamy, żeby połączenie nie zasnęło
setInterval(function () {
  piszDoPolaczen(": puk\n\n");
}, 15000);

// Puste gry znikają same
setInterval(posprzataj, CO_ILE_SPRZATAMY);

// Zmieniony plik gry: wszyscy odświeżają stronę (gry na serwerze trwają dalej)
var czekamNaKoniecZmian = null;
fs.watch(FOLDER, { recursive: true }, function (zdarzenie, nazwa) {
  if (!nazwa || nazwa.charAt(0) === "." || nazwa === "serwer.js") return;
  clearTimeout(czekamNaKoniecZmian);
  czekamNaKoniecZmian = setTimeout(function () {
    console.log("🔄 Zmiana w " + nazwa + ", odświeżam");
    piszDoPolaczen("event: odswiez\ndata: {}\n\n");
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
