// Wpisuje numer wersji do kopii plików, zanim polecą na serwer.
// Nie rusza plików w gicie: uruchamiaj to na katalogu z kopią.
//
//   node wstaw-wersje.js --wypisz
//   node wstaw-wersje.js <katalog-kopii> [wersja]
//
// Bez wersji bierze datę commita HEAD (strefa Asia/Bangkok) i krótki sha.
// Opis ręcznego wysłania (GNU tar) jest w CLAUDE.md.

var fs = require("fs");
var path = require("path");
var child = require("child_process");

var STREF = "Asia/Bangkok";
var POCZATEK_CACHE = 'var CACHE = "sudoku-';
var POCZATEK_WERSJI = 'var WERSJA_GRY = "';

function formatujCzas(unixSekundy) {
  var czesci = new Intl.DateTimeFormat("en-GB", {
    timeZone: STREF,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(unixSekundy * 1000));
  function bierz(typ) {
    var i;
    for (i = 0; i < czesci.length; i++) {
      if (czesci[i].type === typ) return czesci[i].value;
    }
    return "";
  }
  var rok = bierz("year");
  var miesiac = bierz("month");
  var dzien = bierz("day");
  var godzina = bierz("hour");
  var minuta = bierz("minute");
  if (godzina === "24") godzina = "00";
  if (!rok || !miesiac || !dzien || !godzina || !minuta) {
    throw new Error("Nie udało się złożyć daty wersji.");
  }
  return rok + "-" + miesiac + "-" + dzien + " " + godzina + ":" + minuta;
}

function wersjaZCommita(unixSekundy, krotkiSha) {
  return formatujCzas(unixSekundy) + " " + krotkiSha;
}

function wersjaDobra(wersja) {
  if (typeof wersja !== "string") return false;
  var m = /^([0-9]{4})-([0-9]{2})-([0-9]{2}) ([0-9]{2}):([0-9]{2})( [0-9a-f]{7,40})?$/.exec(wersja);
  if (!m) return false;
  var miesiac = Number(m[2]);
  var dzien = Number(m[3]);
  var godzina = Number(m[4]);
  var minuta = Number(m[5]);
  if (miesiac < 1 || miesiac > 12) return false;
  if (dzien < 1 || dzien > 31) return false;
  if (godzina > 23) return false;
  if (minuta > 59) return false;
  return true;
}

function wersjaZGita(katalog) {
  var opcje = { encoding: "utf8", cwd: katalog };
  var unix;
  var sha;
  try {
    unix = child.execFileSync("git", ["log", "-1", "--format=%ct"], opcje).trim();
    sha = child.execFileSync("git", ["rev-parse", "--short=7", "HEAD"], opcje).trim();
  } catch (e) {
    throw new Error("Nie udało się odczytać commita. Uruchom to w katalogu gry (tam, gdzie jest git).");
  }
  if (!/^[0-9]+$/.test(unix) || !/^[0-9a-f]{7,}$/.test(sha)) {
    throw new Error("Git oddał złą datę albo zły skrót commita.");
  }
  return wersjaZCommita(Number(unix), sha);
}

function podmienLinie(tresc, poczatek, wartosc) {
  var linie = tresc.split("\n");
  var i;
  var trafienia = 0;
  var nowa = poczatek + wartosc + '";';
  for (i = 0; i < linie.length; i++) {
    if (linie[i].indexOf(poczatek) !== 0) continue;
    linie[i] = nowa;
    trafienia = trafienia + 1;
  }
  if (trafienia !== 1) {
    throw new Error("Ma być jedna linia „" + poczatek + "”, a jest " + trafienia + ".");
  }
  return linie.join("\n");
}

function wstawWersje(katalog, wersja) {
  if (!wersjaDobra(wersja)) {
    throw new Error("Zła wersja. Ma wyglądać jak „2026-11-25 19:52” albo z krótkim sha.");
  }
  var swSciezka = path.join(katalog, "sw.js");
  var werSciezka = path.join(katalog, "wersja.js");
  var swNowa = podmienLinie(fs.readFileSync(swSciezka, "utf8"), POCZATEK_CACHE, wersja);
  var werNowa = podmienLinie(fs.readFileSync(werSciezka, "utf8"), POCZATEK_WERSJI, wersja);
  fs.writeFileSync(swSciezka, swNowa);
  fs.writeFileSync(werSciezka, werNowa);
}

function uruchom(argv) {
  if (argv[2] === "--wypisz") {
    process.stdout.write(wersjaZGita(process.cwd()) + "\n");
    return;
  }
  var katalog = argv[2];
  if (!katalog) {
    throw new Error("Użycie: node wstaw-wersje.js --wypisz   albo   node wstaw-wersje.js <katalog> [wersja]");
  }
  var wersja = argv[3];
  if (!wersja) wersja = wersjaZGita(process.cwd());
  wstawWersje(katalog, wersja);
  process.stdout.write("Wersja: " + wersja + "\n");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    STREF: STREF,
    formatujCzas: formatujCzas,
    wersjaZCommita: wersjaZCommita,
    wersjaZGita: wersjaZGita,
    wersjaDobra: wersjaDobra,
    wstawWersje: wstawWersje
  };
}

if (require.main === module) {
  try {
    uruchom(process.argv);
  } catch (e) {
    process.stderr.write(e.message + "\n");
    process.exit(1);
  }
}
