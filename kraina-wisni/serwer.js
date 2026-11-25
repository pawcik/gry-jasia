// ===== Serwer gry =====
// Pokazuje grę przeglądarkom (też telefonom w tym samym Wi-Fi), łączy graczy
// i odświeża grę u wszystkich po każdej zmianie w plikach.
// Uruchom: mise run serwer

var http = require("http");
var fs = require("fs");
var path = require("path");
var os = require("os");

var PORT = Number(process.env.PORT) || 8080;
var FOLDER = __dirname;
var MAX_OTWARTYCH = 100; // tyle przeglądarek naraz, żeby ktoś z internetu nie zalał małego komputera
var RODZAJE_PLIKOW = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav"
};

var gracze = Object.create(null);     // id gracza -> gdzie jest i co robi
var sluchacze = Object.create(null);  // id gracza -> otwarte połączenie, przez które wysyłamy mu wiadomości

// Kto może otworzyć grę: ten komputer i telefony w domowym Wi-Fi.
var DOZWOLONE_HOSTY = Object.create(null);
function dodajHost(nazwa) {
  if (!nazwa) return;
  DOZWOLONE_HOSTY[String(nazwa).toLowerCase()] = 1;
}
dodajHost("localhost");
dodajHost("127.0.0.1");
dodajHost("::1");
var sieci = os.networkInterfaces();
for (var nazwaSieci in sieci) {
  for (var h = 0; h < sieci[nazwaSieci].length; h++) dodajHost(sieci[nazwaSieci][h].address);
}
var KORZEN = fs.realpathSync(FOLDER);
var zmiana = false;  // czy ktoś się ruszył od ostatniej wiadomości

// Wiadomość do wszystkich przeglądarek naraz
function wyslijWszystkim(rodzaj, dane) {
  var wiadomosc = "event: " + rodzaj + "\ndata: " + JSON.stringify(dane) + "\n\n";
  for (var id in sluchacze) sluchacze[id].write(wiadomosc);
}

function listaGraczy() {
  var lista = [];
  for (var id in gracze) lista.push(gracze[id]);
  return lista;
}

function nazwaHosta(zadanie) {
  var host = String(zadanie.headers.host || "").toLowerCase();
  if (host.charAt(0) === "[") {
    var koniec = host.indexOf("]");
    return koniec === -1 ? "" : host.slice(1, koniec);
  }
  return host.replace(/:\d+$/, "");
}

function hostDozwolony(zadanie) {
  return !!DOZWOLONE_HOSTY[nazwaHosta(zadanie)];
}

function odmow(odpowiedz) {
  odpowiedz.writeHead(403, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  odpowiedz.end("Zły adres");
}

function ileOtwartych() {
  var ile = 0;
  for (var id in sluchacze) ile++;
  return ile;
}

function idDobre(id) {
  return typeof id === "string" && /^[a-z0-9]+$/i.test(id) && id.length <= 40;
}

var serwer = http.createServer(function (zadanie, odpowiedz) {
  if (!hostDozwolony(zadanie)) return odmow(odpowiedz);
  var adres = new URL(zadanie.url, "http://localhost");
  if (adres.pathname === "/wydarzenia") return polaczGracza(adres, zadanie, odpowiedz);
  if (adres.pathname === "/ruch" && zadanie.method === "POST") return odbierzRuch(zadanie, odpowiedz);
  wyslijPlik(adres.pathname, odpowiedz);
});

// Przeglądarka otwiera stałe połączenie i czeka na wiadomości od serwera
function polaczGracza(adres, zadanie, odpowiedz) {
  if (ileOtwartych() >= MAX_OTWARTYCH) {
    odpowiedz.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    return odpowiedz.end("Za dużo graczy. Spróbuj za chwilę.");
  }
  var id = String(adres.searchParams.get("id") || "");
  if (!idDobre(id)) {
    odpowiedz.writeHead(400);
    return odpowiedz.end();
  }
  odpowiedz.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", "Connection": "keep-alive" });
  odpowiedz.write("retry: 1000\n\n");
  odpowiedz.write("event: gracze\ndata: " + JSON.stringify(listaGraczy()) + "\n\n");
  sluchacze[id] = odpowiedz;
  zadanie.on("close", function () {
    delete sluchacze[id];
    if (gracze[id]) {
      console.log("👋 " + gracze[id].imie + " wyszedł z gry");
      delete gracze[id];
      zmiana = true;
    }
  });
}

// Gracz mówi, gdzie jest (kilkanaście razy na sekundę)
function odbierzRuch(zadanie, odpowiedz) {
  var tresc = "";
  zadanie.on("data", function (kawalek) {
    tresc += kawalek;
    if (tresc.length > 2000) zadanie.destroy();
  });
  zadanie.on("end", function () {
    try {
      var s = JSON.parse(tresc);
      if (idDobre(s.id) && sluchacze[s.id]) {
        if (!gracze[s.id]) console.log("🦊 " + s.imie + " dołączył do gry");
        gracze[s.id] = {
          id: s.id,
          imie: String(s.imie).slice(0, 12),
          kolor: String(s.kolor).slice(0, 9),
          x: Number(s.x) || 0,
          z: Number(s.z) || 0,
          kat: Number(s.kat) || 0,
          liczbaCiec: Number(s.liczbaCiec) || 0,
          katCiecia: Number(s.katCiecia) || 0
        };
        zmiana = true;
      }
    } catch (blad) {
      // zepsuta wiadomość: nic nie robimy
    }
    odpowiedz.writeHead(204);
    odpowiedz.end();
  });
}

// Plik gry albo null. Notatki, hasła i skróty poza folder zostają na dysku.
function sciezkaPliku(sciezka) {
  if (sciezka === "/") sciezka = "/index.html";
  try {
    sciezka = decodeURIComponent(sciezka);
  } catch (blad) {
    return null;
  }
  if (sciezka.indexOf("\0") !== -1) return null;
  var czesci = sciezka.split("/");
  for (var i = 0; i < czesci.length; i++) {
    var czesc = czesci[i];
    if (!czesc) continue;
    // ukryte pliki (np. .git) i wychodzenie z folderu gry są zabronione
    if (czesc.charAt(0) === ".") return null;
    if (czesc.toLowerCase().indexOf(".local") !== -1) return null;
  }
  if (!RODZAJE_PLIKOW[path.extname(sciezka).toLowerCase()]) return null;
  var plik = path.resolve(FOLDER, sciezka.replace(/^\/+/, ""));
  if (plik !== KORZEN && plik.indexOf(KORZEN + path.sep) !== 0 && plik.indexOf(FOLDER + path.sep) !== 0) return null;
  return plik;
}

function jestWFolderze(prawdziwy) {
  return prawdziwy === KORZEN || prawdziwy.indexOf(KORZEN + path.sep) === 0;
}

// Pliki gry: index.html, skrypty, obrazki. Nic innego.
function wyslijPlik(sciezka, odpowiedz) {
  var plik = sciezkaPliku(sciezka);
  if (!plik) return nieMa(odpowiedz);
  fs.realpath(plik, function (bladSciezki, prawdziwy) {
    if (bladSciezki || !jestWFolderze(prawdziwy)) return nieMa(odpowiedz);
    fs.readFile(prawdziwy, function (blad, dane) {
      if (blad) return nieMa(odpowiedz);
      var rodzaj = RODZAJE_PLIKOW[path.extname(prawdziwy).toLowerCase()];
      odpowiedz.writeHead(200, { "Content-Type": rodzaj, "Cache-Control": "no-store" });
      odpowiedz.end(dane);
    });
  });
}

function nieMa(odpowiedz) {
  odpowiedz.writeHead(404);
  odpowiedz.end("Nie ma takiego pliku");
}

// 20 razy na sekundę mówimy wszystkim, gdzie są gracze
setInterval(function () {
  if (!zmiana) return;
  zmiana = false;
  wyslijWszystkim("gracze", listaGraczy());
}, 50);

// Co jakiś czas pukamy, żeby połączenie nie zasnęło
setInterval(function () {
  for (var id in sluchacze) sluchacze[id].write(": puk\n\n");
}, 15000);

// Zmieniony plik: wszyscy odświeżają grę
var czekamNaKoniecZmian = null;
fs.watch(FOLDER, { recursive: true }, function (zdarzenie, nazwa) {
  if (!nazwa || nazwa.charAt(0) === ".") return;
  clearTimeout(czekamNaKoniecZmian);
  czekamNaKoniecZmian = setTimeout(function () {
    console.log("🔄 Zmiana w " + nazwa + ", odświeżam grę");
    wyslijWszystkim("odswiez", {});
  }, 150);
});

serwer.on("error", function (blad) {
  if (blad.code === "EADDRINUSE") console.log("❌ Port " + PORT + " jest zajęty. Zamknij inny serwer gry i spróbuj jeszcze raz.");
  else console.log("❌ " + blad.message);
  process.exit(1);
});

serwer.listen(PORT, "0.0.0.0", function () {
  console.log("🌸 Kraina Wiśni działa!");
  console.log("💻 Na tym komputerze: http://127.0.0.1:" + PORT);
  var sieci = os.networkInterfaces();
  for (var nazwa in sieci) {
    for (var i = 0; i < sieci[nazwa].length; i++) {
      var a = sieci[nazwa][i];
      if (a.family === "IPv4" && !a.internal) console.log("📱 Na telefonie (to samo Wi-Fi): http://" + a.address + ":" + PORT);
    }
  }
  if (process.argv.indexOf("--otworz") !== -1) require("child_process").exec("open http://127.0.0.1:" + PORT);
});
