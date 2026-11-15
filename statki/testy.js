// Sprawdza, czy dwie gry na jednym serwerze się nie mieszają.
// Uruchom: node testy.js   (albo: mise run testy)

var http = require("http");
var child_process = require("child_process");
var zasady = require("./zasady.js");

var PORT = 18000 + Math.floor(Math.random() * 2000);
var log = "";
var dziecko = null;
var polaczenia = [];

function spij(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function sprawdz(warunek, opis) {
  if (!warunek) {
    var ogon = log.slice(-4000);
    throw new Error(opis + (ogon ? "\n--- log serwera ---\n" + ogon : ""));
  }
}

function post(dane) {
  var body = JSON.stringify(dane);
  return new Promise(function (resolve, reject) {
    var req = http.request({
      host: "127.0.0.1",
      port: PORT,
      path: "/akcja",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    }, function (res) {
      var tresc = "";
      res.on("data", function (kawalek) { tresc += kawalek; });
      res.on("end", function () {
        try {
          resolve(JSON.parse(tresc));
        } catch (e) {
          reject(new Error("zła odpowiedź: " + tresc));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function sluchaj(id, kod) {
  return new Promise(function (resolve, reject) {
    var sciezka = "/wydarzenia?id=" + encodeURIComponent(id);
    if (kod) sciezka += "&kod=" + encodeURIComponent(kod);
    var req = http.get({ host: "127.0.0.1", port: PORT, path: sciezka }, function (res) {
      var buf = "";
      var stany = [];
      res.on("data", function (kawalek) {
        buf += kawalek.toString();
        var czesci = buf.split("\n\n");
        buf = czesci.pop();
        for (var i = 0; i < czesci.length; i++) {
          var event = "";
          var data = "";
          var linie = czesci[i].split("\n");
          for (var j = 0; j < linie.length; j++) {
            if (linie[j].indexOf("event: ") === 0) event = linie[j].slice(7).trim();
            if (linie[j].indexOf("data: ") === 0) data = linie[j].slice(6);
          }
          if (event === "stan" && data) stany.push(JSON.parse(data));
        }
      });
      var uchwyt = {
        id: id,
        kod: kod,
        stany: stany,
        ostatni: function () { return stany[stany.length - 1] || null; },
        zamknij: function () { req.destroy(); }
      };
      polaczenia.push(uchwyt);
      resolve(uchwyt);
    });
    req.on("error", reject);
  });
}

function czekajAz(sl, test, opis) {
  var start = Date.now();
  return new Promise(function (resolve, reject) {
    (function petla() {
      var stan = sl.ostatni();
      if (stan && test(stan)) return resolve(stan);
      if (Date.now() - start > 5000) {
        return reject(new Error("timeout: " + opis + "\n" + JSON.stringify(stan)));
      }
      setTimeout(petla, 20);
    })();
  });
}

function odcisk(stan) {
  return JSON.stringify({
    etap: stan.etap,
    tryb: stan.tryb,
    tura: stan.tura,
    zwyciezca: stan.zwyciezca,
    dziennik: stan.dziennik,
    ostatni: stan.ostatni,
    gracze: stan.gracze,
    oczekujacy: stan.oczekujacy,
    trzebaPotwierdzic: stan.trzebaPotwierdzic
  });
}

function imiona(stan) {
  var lista = [];
  for (var i = 0; i < stan.gracze.length; i++) lista.push(stan.gracze[i].imie);
  return lista;
}

function ludziki(stan) {
  var lista = [];
  for (var i = 0; i < stan.gracze.length; i++) lista.push(stan.gracze[i].awatar);
  return lista;
}

function pobierz(sciezka) {
  return new Promise(function (resolve, reject) {
    http.get({ host: "127.0.0.1", port: PORT, path: sciezka }, function (res) {
      res.resume();
      resolve({ kod: res.statusCode, typ: res.headers["content-type"] });
    }).on("error", reject);
  });
}

async function dolacz(sl, imie, awatar) {
  var dane = { id: sl.id, kod: sl.kod, typ: "dolacz", imie: imie };
  if (awatar) dane.awatar = awatar;
  var wynik = await post(dane);
  sprawdz(!wynik.blad, "dolacz " + imie + ": " + wynik.blad);
  await czekajAz(sl, function (s) { return s.ja !== 0 && s.kod === sl.kod; }, "widok po dołączeniu " + imie);
}

async function ustawFlote(sl) {
  var flota = [];
  for (var proba = 0; proba < 5 && !flota.length; proba++) flota = zasady.losujFlote(zasady.TRYBY[sl.ostatni().tryb]);
  sprawdz(flota.length > 0, "nie udało się wylosować statków");
  var wynik = await post({ id: sl.id, kod: sl.kod, typ: "ustaw", statki: flota });
  sprawdz(!wynik.blad, "ustaw: " + wynik.blad);
}

async function strzel(kod, sluchacze) {
  var stan = sluchacze[0].ostatni();
  var strzelec = null;
  for (var i = 0; i < sluchacze.length; i++) {
    if (sluchacze[i].ostatni().ja === stan.tura) strzelec = sluchacze[i];
  }
  sprawdz(strzelec, "nikt nie ma tury w " + kod);
  var cel = 0;
  for (var j = 0; j < stan.gracze.length; j++) {
    if (stan.gracze[j].nr !== strzelec.ostatni().ja) cel = stan.gracze[j].nr;
  }
  var wynik = await post({ id: strzelec.id, kod: kod, typ: "strzal", cel: cel, pole: 0 });
  sprawdz(!wynik.blad, "strzal w " + kod + ": " + wynik.blad);
  for (var n = 0; n < sluchacze.length; n++) {
    await czekajAz(sluchacze[n], function (s) { return s.ostatni && s.ostatni.pole === 0; }, "wynik strzału " + kod);
  }
}

function uruchom() {
  dziecko = child_process.spawn(process.execPath, ["serwer.js"], {
    cwd: __dirname,
    env: Object.assign({}, process.env, { PORT: String(PORT), SEKUNDY_PUSTEGO_LOBBY: "3" }),
    stdio: ["ignore", "pipe", "pipe"]
  });
  dziecko.stdout.on("data", function (buf) {
    log += buf.toString();
    if (log.length > 200000) log = log.slice(-100000);
  });
  dziecko.stderr.on("data", function (buf) {
    log += buf.toString();
  });
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error("serwer nie wstał\n" + log)); }, 8000);
    var petla = setInterval(function () {
      if (log.indexOf("Statki działają") !== -1) {
        clearInterval(petla);
        clearTimeout(timer);
        resolve();
      }
      if (log.indexOf("jest zajęty") !== -1) {
        clearInterval(petla);
        clearTimeout(timer);
        reject(new Error(log));
      }
    }, 30);
  });
}

function zatrzymaj() {
  for (var i = 0; i < polaczenia.length; i++) {
    try { polaczenia[i].zamknij(); } catch (e) {}
  }
  if (dziecko) {
    dziecko.kill("SIGTERM");
    dziecko = null;
  }
}

async function main() {
  await uruchom();

  var ikonaSvg = await pobierz("/ikona.svg");
  var ikonaPng = await pobierz("/ikona-32.png");
  var ikonaDuza = await pobierz("/ikona-180.png");
  var ikonaIco = await pobierz("/favicon.ico");
  sprawdz(ikonaSvg.kod === 200 && ikonaSvg.typ === "image/svg+xml", "ikonka svg: " + ikonaSvg.typ);
  sprawdz(ikonaPng.kod === 200 && ikonaPng.typ === "image/png", "ikonka png: " + ikonaPng.typ);
  sprawdz(ikonaDuza.kod === 200 && ikonaDuza.typ === "image/png", "ikonka 180: " + ikonaDuza.typ);
  sprawdz(ikonaIco.kod === 200 && ikonaIco.typ === "image/x-icon", "ikonka ico: " + ikonaIco.typ);

  function kodZeSlowa(kod) {
    if (!/^[a-z]{3,6}[1-9]$/.test(kod)) return false;
    return zasady.SLOWA_KODOW.indexOf(kod.slice(0, -1)) !== -1;
  }

  var wlasny = await post({ typ: "noweLobby", kod: "Jaś1" });
  sprawdz(wlasny.ok && wlasny.kod === "jas1", "własny kod: " + JSON.stringify(wlasny));
  var zajety = await post({ typ: "noweLobby", kod: "JAS1" });
  sprawdz(zajety.blad && zajety.blad.indexOf("już ktoś ma") !== -1, "zajęty kod: " + JSON.stringify(zajety));
  var zaKrotki = await post({ typ: "noweLobby", kod: "ab" });
  sprawdz(zaKrotki.blad && zaKrotki.blad.indexOf("3 do 8") !== -1, "za krótki kod: " + JSON.stringify(zaKrotki));
  var brzydki = await post({ typ: "noweLobby", kod: "kupa" });
  sprawdz(brzydki.blad && brzydki.blad.indexOf("inny kod") !== -1, "brzydki kod: " + JSON.stringify(brzydki));
  var polski = await post({ typ: "sprawdzKod", kod: "Żółw" });
  sprawdz(polski.blad && polski.blad.indexOf("zolw") !== -1, "polskie znaki: " + JSON.stringify(polski));

  var nowaA = await post({ typ: "noweLobby", id: "tworca" });
  var nowaB = await post({ typ: "noweLobby", id: "tworca" });
  sprawdz(nowaA.ok && kodZeSlowa(nowaA.kod), "zły kod A: " + JSON.stringify(nowaA));
  sprawdz(nowaB.ok && kodZeSlowa(nowaB.kod), "zły kod B: " + JSON.stringify(nowaB));
  sprawdz(nowaA.kod !== nowaB.kod, "dwie gry dostały ten sam kod");
  var kodA = nowaA.kod;
  var kodB = nowaB.kod;

  var male = await post({ typ: "sprawdzKod", kod: "  " + kodA.toLowerCase().split("").join(" ") + " " });
  sprawdz(male.kod === kodA, "kod z małymi literami i spacjami: " + JSON.stringify(male));

  var a1 = await sluchaj("okno1", kodA);
  var a2 = await sluchaj("okno2", kodA);
  var b1 = await sluchaj("okno1", kodB);
  var b3 = await sluchaj("okno3", kodB);
  await czekajAz(a1, function (s) { return s.etap === "poczekalnia" && s.kod === kodA; }, "początek A");
  await czekajAz(b1, function (s) { return s.etap === "poczekalnia" && s.kod === kodB; }, "początek B");

  await dolacz(a1, "Ala", "spioch");
  await dolacz(a2, "Ola", "lasuch");
  await dolacz(b1, "Ela", "kapitan");
  await dolacz(b3, "Jan", "malarz");
  await czekajAz(a1, function (s) { return imiona(s).join(",") === "Ala,Ola"; }, "skład A u Ali");
  await czekajAz(b1, function (s) { return imiona(s).join(",") === "Ela,Jan"; }, "skład B u Eli");

  sprawdz(imiona(a1.ostatni()).indexOf("Jan") === -1, "Jan widać w grze A");
  sprawdz(imiona(b1.ostatni()).indexOf("Ala") === -1, "Ala widać w grze B");
  sprawdz(imiona(a1.ostatni()).join(",") === "Ala,Ola", "skład A: " + imiona(a1.ostatni()));
  sprawdz(imiona(b3.ostatni()).join(",") === "Ela,Jan", "skład B: " + imiona(b3.ostatni()));
  sprawdz(a1.ostatni().ja !== b1.ostatni().ja || a1.ostatni().kod !== b1.ostatni().kod, "to samo okno ma być w dwóch grach");
  sprawdz(b1.ostatni().gracze[0].imie === "Ela", "to samo id ma inne imię w drugiej grze");
  sprawdz(ludziki(a1.ostatni()).join(",") === "spioch,lasuch", "ludziki A: " + ludziki(a1.ostatni()));
  sprawdz(ludziki(b1.ostatni()).join(",") === "kapitan,malarz", "ludziki B: " + ludziki(b1.ostatni()));
  sprawdz(ludziki(a2.ostatni()).indexOf("kapitan") === -1, "ludzik z gry B widać w grze A");

  var szybka = await post({ id: "okno1", kod: kodB, typ: "tryb", tryb: "szybka" });
  sprawdz(!szybka.blad, "tryb B: " + szybka.blad);
  await czekajAz(b1, function (s) { return s.tryb === "szybka" && s.gracze[0].pola.length === 49; }, "plansza 7×7");
  await czekajAz(b3, function (s) { return s.tryb === "szybka" && s.gracze[0].pola.length === 49; }, "Jan widzi planszę 7×7");
  sprawdz(a1.ostatni().tryb === "klasyczna" && a1.ostatni().gracze[0].pola.length === 100, "gra A zmieniła planszę razem z B");

  var startA = await post({ id: "okno1", kod: kodA, typ: "start" });
  var startB = await post({ id: "okno3", kod: kodB, typ: "start" });
  sprawdz(!startA.blad, "start A: " + startA.blad);
  sprawdz(!startB.blad, "start B: " + startB.blad);
  await czekajAz(a1, function (s) { return s.etap === "ustawianie"; }, "ustawianie A");
  await czekajAz(b3, function (s) { return s.etap === "ustawianie"; }, "ustawianie B");

  await ustawFlote(a1);
  await ustawFlote(a2);
  await ustawFlote(b1);
  await ustawFlote(b3);
  await czekajAz(a1, function (s) { return s.etap === "bitwa"; }, "bitwa A u Ali");
  await czekajAz(a2, function (s) { return s.etap === "bitwa"; }, "bitwa A u Oli");
  await czekajAz(b1, function (s) { return s.etap === "bitwa"; }, "bitwa B u Eli");
  await czekajAz(b3, function (s) { return s.etap === "bitwa"; }, "bitwa B u Jana");

  var przedA = odcisk(a1.ostatni());
  var przedB = odcisk(b1.ostatni());
  await strzel(kodA, [a1, a2]);
  await spij(150);
  sprawdz(odcisk(b1.ostatni()) === przedB, "strzał w A zmienił grę B");
  sprawdz(odcisk(a1.ostatni()) !== przedA, "strzał w A nie zapisał się w A");
  sprawdz(a1.ostatni().dziennik.join(" ").indexOf("Ala") !== -1 || a1.ostatni().dziennik.join(" ").indexOf("Ola") !== -1, "dziennik A milczy");
  sprawdz(b1.ostatni().dziennik.join(" ").indexOf("→") === -1, "dziennik B ma strzał z A");

  var poA = odcisk(a1.ostatni());
  await strzel(kodB, [b1, b3]);
  await spij(150);
  sprawdz(odcisk(a1.ostatni()) === poA, "strzał w B zmienił grę A");
  sprawdz(b1.ostatni().ostatni && b1.ostatni().ostatni.pole === 0, "gra B nie ma swojego strzału");
  sprawdz(a1.ostatni().ostatni.tekst !== b1.ostatni().ostatni.tekst, "obie gry mają ten sam tekst strzału");

  var wBitwie = await post({ id: "okno1", kod: kodA, typ: "wyjdz" });
  sprawdz(wBitwie.blad && wBitwie.blad.indexOf("Zacznij od nowa") !== -1, "wyjście w bitwie: " + JSON.stringify(wBitwie));
  sprawdz(imiona(a2.ostatni()).join(",") === "Ala,Ola", "Ala zniknęła z bitwy");

  var odNowa = await post({ id: "okno1", kod: kodA, typ: "odNowa" });
  sprawdz(!odNowa.blad, "od nowa: " + odNowa.blad);
  await czekajAz(a1, function (s) {
    return s.trzebaPotwierdzic && s.gracze.length === 0 && s.etap === "poczekalnia";
  }, "Gram! po od nowa");
  await czekajAz(a2, function (s) { return s.trzebaPotwierdzic && s.gracze.length === 0; }, "Ola też czeka na Gram!");
  sprawdz(b1.ostatni().etap === "bitwa" && imiona(b1.ostatni()).join(",") === "Ela,Jan", "od nowa w A ruszyło grę B");
  sprawdz(a2.ostatni().oczekujacy.length === 1 && a2.ostatni().oczekujacy[0].awatar === "spioch", "na liście Gram! nie ma ludzika Ali");
  sprawdz(b1.ostatni().gracze[0].awatar === "kapitan", "od nowa w A zmieniło ludzika w B");

  var gram = await post({ id: "okno1", kod: kodA, typ: "dolacz", imie: "Ala", awatar: "spioch" });
  sprawdz(!gram.blad, "Gram!: " + gram.blad);
  await czekajAz(a1, function (s) { return s.ja !== 0 && !s.trzebaPotwierdzic && imiona(s).join(",") === "Ala"; }, "Ala wróciła");
  sprawdz(a1.ostatni().gracze[0].awatar === "spioch", "Ala wróciła bez ludzika");
  sprawdz(b1.ostatni().etap === "bitwa", "powrót Ali przerwał grę B");

  var puste = ["", "ab", "!!", "a", "abcdefghi"];
  var kawalki = ["Wpisz kod", "3 do 8", "Wpisz kod", "3 do 8", "3 do 8"];
  for (var i = 0; i < puste.length; i++) {
    var zly = await post({ typ: "sprawdzKod", kod: puste[i] });
    sprawdz(zly.blad && zly.blad.indexOf(kawalki[i]) !== -1, "kod „" + puste[i] + "”: " + JSON.stringify(zly));
  }
  var wolny = "";
  for (var n = 0; n < 20 && !wolny; n++) {
    var kandydat = "xyz" + n;
    if (kandydat === kodA || kandydat === kodB) continue;
    var jest = await post({ typ: "sprawdzKod", kod: kandydat });
    if (jest.blad && jest.blad.indexOf("Nie ma gry") !== -1) wolny = kandydat;
  }
  sprawdz(wolny, "nie znalazłem wolnego kodu do testu");
  var zlyDolacz = await post({ id: "okno9", kod: wolny, typ: "dolacz", imie: "Zen" });
  sprawdz(zlyDolacz.blad && zlyDolacz.blad.indexOf("Nie ma gry") !== -1, "dolacz do złego kodu: " + JSON.stringify(zlyDolacz));
  sprawdz(imiona(a1.ostatni()).join(",") === "Ala", "złe dołączenie dopisało gracza");

  var gosc = await sluchaj("gosc", "ab");
  var stanGoscia = await czekajAz(gosc, function (s) { return s.brakGry; }, "zły kod na łączu");
  sprawdz(stanGoscia.tekst.indexOf("3 do 8") !== -1, "komunikat łącza: " + stanGoscia.tekst);
  var brak = await sluchaj("gosc2", wolny);
  var stanBrak = await czekajAz(brak, function (s) { return s.brakGry; }, "brak gry");
  sprawdz(stanBrak.tekst.indexOf("Nie ma gry o kodzie " + wolny) !== -1, "komunikat braku: " + stanBrak.tekst);

  var startowy = await sluchaj("gosc3", "");
  await czekajAz(startowy, function (s) { return s.ekran === "start"; }, "ekran startu");

  var ilePustych = 0;
  for (var k = 0; k < 50; k++) {
    var extra = await post({ typ: "noweLobby" });
    if (extra.blad) {
      sprawdz(extra.blad.indexOf("dużo gier") !== -1, "limit gier: " + extra.blad);
      break;
    }
    ilePustych++;
  }
  sprawdz(ilePustych > 0 && ilePustych < 50, "limit gier nie zadziałał");

  await spij(3600);
  var poSprzataniu = await post({ typ: "noweLobby" });
  sprawdz(poSprzataniu.ok, "puste gry nie zniknęły: " + JSON.stringify(poSprzataniu));
  sprawdz(a1.ostatni().kod === kodA && imiona(a1.ostatni()).join(",") === "Ala", "sprzątanie skasowało żywą grę A");
  sprawdz(b1.ostatni().etap === "bitwa" && imiona(b1.ostatni()).join(",") === "Ela,Jan", "sprzątanie skasowało żywą grę B");

  console.log("OK — dwie gry (" + kodA + " i " + kodB + ") się nie mieszają");
}

main().then(function () {
  zatrzymaj();
  process.exit(0);
}).catch(function (blad) {
  console.error("NIE OK: " + blad.message);
  zatrzymaj();
  process.exit(1);
});
