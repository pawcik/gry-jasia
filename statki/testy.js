// Sprawdza, czy dwie gry na jednym serwerze się nie mieszają
// i czy statystyki końca zostają w swojej poczekalni.
// Uruchom: node testy.js   (albo: mise run testy)

var http = require("http");
var fs = require("fs");
var path = require("path");
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

function pobierzHost(sciezka, host) {
  return new Promise(function (resolve, reject) {
    var opcje = { host: "127.0.0.1", port: PORT, path: sciezka };
    if (host) opcje.headers = { Host: host };
    http.get(opcje, function (res) {
      var tresc = "";
      res.on("data", function (kawalek) { tresc += kawalek; });
      res.on("end", function () {
        resolve({ kod: res.statusCode, typ: res.headers["content-type"] || "", tresc: tresc });
      });
    }).on("error", reject);
  });
}

function pobierz(sciezka) {
  return pobierzHost(sciezka);
}

var PULAPKI = ["link-testowy.html", "test.local.html"];

function usunPulapki() {
  for (var i = 0; i < PULAPKI.length; i++) {
    try { fs.unlinkSync(path.join(__dirname, PULAPKI[i])); } catch (e) {}
  }
}

async function sprawdzPliki() {
  usunPulapki();
  var ikonaSvg = await pobierz("/ikona.svg");
  var ikonaPng = await pobierz("/ikona-32.png");
  var ikonaDuza = await pobierz("/ikona-180.png");
  var ikonaIco = await pobierz("/favicon.ico");
  sprawdz(ikonaSvg.kod === 200 && ikonaSvg.typ === "image/svg+xml", "ikonka svg: " + ikonaSvg.typ);
  sprawdz(ikonaPng.kod === 200 && ikonaPng.typ === "image/png", "ikonka png: " + ikonaPng.typ);
  sprawdz(ikonaDuza.kod === 200 && ikonaDuza.typ === "image/png", "ikonka 180: " + ikonaDuza.typ);
  sprawdz(ikonaIco.kod === 200 && ikonaIco.typ === "image/x-icon", "ikonka ico: " + ikonaIco.typ);

  var tajne = await pobierz("/CLAUDE.local.md");
  sprawdz(tajne.kod === 404, "tajna notatka: " + tajne.kod);
  var toml = await pobierz("/mise.toml");
  sprawdz(toml.kod === 404, "mise.toml: " + toml.kod);
  var ukryty = await pobierz("/.git/config");
  sprawdz(ukryty.kod === 404, "ukryty plik: " + ukryty.kod);
  fs.writeFileSync(path.join(__dirname, "test.local.html"), "sekret-lokalny");
  var lokalny = await pobierz("/test.local.html");
  sprawdz(lokalny.kod === 404 && lokalny.tresc.indexOf("sekret-lokalny") === -1, "plik local: " + lokalny.kod);
  fs.symlinkSync("/etc/passwd", path.join(__dirname, "link-testowy.html"));
  var link = await pobierz("/link-testowy.html");
  sprawdz(link.kod === 404 && link.tresc.indexOf("root:") === -1, "skrót na zewnątrz: " + link.kod + " " + link.tresc.slice(0, 40));
  var obcy = await pobierzHost("/index.html", "zla-strona.example");
  sprawdz(obcy.kod === 403, "obcy adres: " + obcy.kod);
  var swoj = await pobierz("/index.html");
  sprawdz(swoj.kod === 200 && swoj.typ.indexOf("text/html") === 0, "swoja strona: " + swoj.kod);
  usunPulapki();
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

function statekTest(w, k, dlugosc, poziomo, nr) {
  return { w: w, k: k, dlugosc: dlugosc, poziomo: poziomo, nr: nr };
}

// Dwie różne floty szybkiej gry (7×7). Każda poczekalnia dostaje obie.
var FLOTY_TESTU = [
  [
    statekTest(0, 0, 3, true, 0),
    statekTest(0, 4, 2, true, 1),
    statekTest(2, 0, 2, true, 2),
    statekTest(2, 3, 1, true, 3),
    statekTest(2, 5, 1, true, 4)
  ],
  [
    statekTest(4, 0, 3, true, 0),
    statekTest(4, 4, 2, true, 1),
    statekTest(6, 0, 2, true, 2),
    statekTest(6, 3, 1, true, 3),
    statekTest(6, 5, 1, true, 4)
  ]
];

function znajdzPoleTest(stan, flota, celNr, chcePudlo) {
  var widok = "";
  for (var i = 0; i < stan.gracze.length; i++) {
    if (stan.gracze[i].nr === celNr) widok = stan.gracze[i].pola;
  }
  var rozmiar = zasady.TRYBY.szybka.rozmiar;
  for (var p = 0; p < rozmiar * rozmiar; p++) {
    if (widok.charAt(p) !== "0") continue;
    var woda = flota.naPolu[p] === -1;
    if (chcePudlo === woda) return p;
  }
  return -1;
}

function nastepnyStrzalTest(stan, nr, floty, licznik) {
  var zywi = [];
  for (var i = 0; i < stan.gracze.length; i++) {
    var g = stan.gracze[i];
    if (!g.widz && !g.odpadl && g.nr !== nr && g.zostalo > 0) zywi.push(g);
  }
  if (!zywi.length) return null;
  var start = licznik % zywi.length;
  var kolejnosc = zywi.slice(start).concat(zywi.slice(0, start));
  var proby = [licznik % 4 === 3, licznik % 4 !== 3];
  for (var a = 0; a < proby.length; a++) {
    for (var b = 0; b < kolejnosc.length; b++) {
      var pole = znajdzPoleTest(stan, floty[kolejnosc[b].nr], kolejnosc[b].nr, proby[a]);
      if (pole !== -1) return { cel: kolejnosc[b].nr, pole: pole };
    }
  }
  return null;
}

function ocenStrzalTest(trafienia, floty, cel, pole) {
  var flota = floty[cel];
  var idx = flota.naPolu[pole];
  if (idx === -1) return { wynik: "pudlo", dlugosc: 0 };
  var key = cel + ":" + idx;
  trafienia[key] = (trafienia[key] || 0) + 1;
  var dl = flota.statki[idx].pola.length;
  if (trafienia[key] === dl) return { wynik: "zatopiony", dlugosc: dl };
  return { wynik: "trafiony", dlugosc: 0 };
}

function oczekiwaneStaty(strzaly) {
  var mapa = {};
  function wez(nr) {
    if (!mapa[nr]) mapa[nr] = { strzaly: 0, trafienia: 0, pudla: 0, seriaTeraz: 0, seria: 0, zatopione: 0 };
    return mapa[nr];
  }
  for (var i = 0; i < strzaly.length; i++) {
    var s = strzaly[i];
    var g = wez(s.kto);
    g.strzaly++;
    if (s.wynik === "pudlo") {
      g.pudla++;
      g.seriaTeraz = 0;
    } else {
      g.trafienia++;
      g.seriaTeraz++;
      if (g.seriaTeraz > g.seria) g.seria = g.seriaTeraz;
      if (s.wynik === "zatopiony") g.zatopione++;
    }
  }
  return mapa;
}

async function zalozGreDoStatystyk(kod, osoby, naPunkty) {
  var utworzona = await post({ typ: "noweLobby", kod: kod });
  sprawdz(utworzona.ok && utworzona.kod === kod, "nowa gra " + kod + ": " + JSON.stringify(utworzona));
  var sluchacze = [];
  for (var i = 0; i < osoby.length; i++) {
    var sl = await sluchaj(osoby[i].id, kod);
    await czekajAz(sl, function (s) { return s.etap === "poczekalnia" && s.kod === kod; }, "start " + kod);
    await dolacz(sl, osoby[i].imie, osoby[i].awatar);
    sluchacze.push(sl);
  }
  var tryb = await post({ id: osoby[0].id, kod: kod, typ: "tryb", tryb: "szybka" });
  sprawdz(!tryb.blad, "tryb " + kod + ": " + tryb.blad);
  if (naPunkty) {
    var sposob = await post({ id: osoby[0].id, kod: kod, typ: "sposob", sposob: "punkty" });
    sprawdz(!sposob.blad, "sposób " + kod + ": " + (sposob.blad || ""));
    var rundy = await post({ id: osoby[0].id, kod: kod, typ: "rundy", ile: 5 });
    sprawdz(!rundy.blad, "rundy " + kod + ": " + (rundy.blad || ""));
  }
  var start = await post({ id: osoby[0].id, kod: kod, typ: "start" });
  sprawdz(!start.blad, "start " + kod + ": " + start.blad);
  await czekajAz(sluchacze[0], function (s) { return s.etap === "ustawianie"; }, "ustawianie " + kod);
  var floty = {};
  var imiePoNr = {};
  var awatarPoNr = {};
  for (var u = 0; u < sluchacze.length; u++) {
    var zbudowana = zasady.zbudujFlote(osoby[u].flota, zasady.TRYBY.szybka, true);
    sprawdz(zbudowana, "zła flota " + osoby[u].imie);
    var ustaw = await post({ id: osoby[u].id, kod: kod, typ: "ustaw", statki: osoby[u].flota });
    sprawdz(!ustaw.blad, "ustaw " + osoby[u].imie + ": " + ustaw.blad);
    await czekajAz(sluchacze[u], function (s) {
      var ja = null;
      for (var n = 0; n < s.gracze.length; n++) if (s.gracze[n].nr === s.ja) ja = s.gracze[n];
      return ja && ja.gotowy;
    }, "gotowy " + osoby[u].imie);
    imiePoNr[sluchacze[u].ostatni().ja] = osoby[u].imie;
    awatarPoNr[sluchacze[u].ostatni().ja] = osoby[u].awatar;
    floty[sluchacze[u].ostatni().ja] = zbudowana;
  }
  await czekajAz(sluchacze[0], function (s) {
    return s.etap === "bitwa" && s.statystyki === null && (naPunkty ? s.sposob === "punkty" && s.ileRund === 5 : s.sposob !== "punkty");
  }, "bitwa bez statystyk " + kod);
  return { kod: kod, sluchacze: sluchacze, floty: floty, imiePoNr: imiePoNr, awatarPoNr: awatarPoNr, strzaly: [], licznik: {}, trafienia: {} };
}

async function jedenStrzalTest(gra) {
  var stan = gra.sluchacze[0].ostatni();
  if (stan.etap === "koniec") return false;
  sprawdz(stan.etap === "bitwa", gra.kod + " nie jest w bitwie: " + stan.etap);
  sprawdz(stan.statystyki === null, gra.kod + " pokazuje statystyki przed końcem");
  var nr = stan.tura;
  var kto = null;
  for (var i = 0; i < gra.sluchacze.length; i++) {
    if (gra.sluchacze[i].ostatni().ja === nr) kto = gra.sluchacze[i];
  }
  sprawdz(kto, "brak strzelca w " + gra.kod);
  var wybor = nastepnyStrzalTest(stan, nr, gra.floty, gra.licznik[nr] || 0);
  sprawdz(wybor, "brak pola w " + gra.kod);
  var numer = stan.ostatni ? stan.ostatni.numer : 0;
  var odp = await post({ id: kto.id, kod: gra.kod, typ: "strzal", cel: wybor.cel, pole: wybor.pole });
  sprawdz(!odp.blad, gra.kod + " strzał: " + (odp.blad || ""));
  for (var n = 0; n < gra.sluchacze.length; n++) {
    await czekajAz(gra.sluchacze[n], function (s) { return s.ostatni && s.ostatni.numer > numer; }, "wynik " + gra.kod);
  }
  var ostatni = kto.ostatni().ostatni;
  var oczek = ocenStrzalTest(gra.trafienia, gra.floty, wybor.cel, wybor.pole);
  sprawdz(ostatni.wynik === oczek.wynik, gra.kod + " wynik " + ostatni.wynik + " zamiast " + oczek.wynik);
  gra.strzaly.push({ kto: nr, cel: wybor.cel, wynik: oczek.wynik, dlugosc: oczek.dlugosc });
  gra.licznik[nr] = (gra.licznik[nr] || 0) + 1;
  return true;
}

function sprawdzKoncoweStatystyki(gra) {
  var stan = gra.sluchacze[0].ostatni();
  sprawdz(stan.etap === "koniec" && stan.statystyki, gra.kod + " nie ma statystyk na końcu");
  var mapa = oczekiwaneStaty(gra.strzaly);
  var suma = 0;
  var imionaGry = [];
  for (var nr in gra.imiePoNr) imionaGry.push(gra.imiePoNr[nr]);
  for (var i = 0; i < stan.statystyki.gracze.length; i++) {
    var g = stan.statystyki.gracze[i];
    sprawdz(imionaGry.indexOf(g.imie) !== -1, gra.kod + " ma obcego gracza " + g.imie);
    sprawdz(g.awatar === gra.awatarPoNr[g.nr], gra.kod + " " + g.imie + " ma cudzy ludzik " + g.awatar);
    var o = mapa[g.nr] || { strzaly: 0, trafienia: 0, pudla: 0, seria: 0, zatopione: 0 };
    suma += g.strzaly;
    sprawdz(g.strzaly === o.strzaly && g.trafienia === o.trafienia && g.pudla === o.pudla, gra.kod + " " + g.imie + " ma złe liczby");
    sprawdz(g.strzaly === g.trafienia + g.pudla, gra.kod + " " + g.imie + " strzały się nie sumują");
    sprawdz(g.seria === o.seria, gra.kod + " " + g.imie + " seria");
    sprawdz(g.zatopionych === o.zatopione, gra.kod + " " + g.imie + " zatopione");
    var linie = 0;
    for (var w = 0; w < g.wKogo.length; w++) {
      sprawdz(imionaGry.indexOf(g.wKogo[w].imie) !== -1, gra.kod + " strzela do obcego " + g.wKogo[w].imie);
      linie += g.wKogo[w].strzaly;
    }
    sprawdz(linie === g.strzaly, gra.kod + " kto-do-kogo nie sumuje się");
  }
  sprawdz(suma === gra.strzaly.length, gra.kod + " suma strzałów " + suma + " != " + gra.strzaly.length);
  var pudla = 0;
  var zatopione = 0;
  for (var s = 0; s < gra.strzaly.length; s++) {
    if (gra.strzaly[s].wynik === "pudlo") pudla++;
    if (gra.strzaly[s].wynik === "zatopiony") zatopione++;
  }
  var pudlaStat = 0;
  var zatopioneStat = 0;
  for (var p = 0; p < stan.statystyki.gracze.length; p++) {
    pudlaStat += stan.statystyki.gracze[p].pudla;
    zatopioneStat += stan.statystyki.gracze[p].zatopionych;
  }
  sprawdz(pudlaStat === pudla, gra.kod + " liczy wodę dookoła statku jako pudło");
  sprawdz(zatopioneStat === zatopione, gra.kod + " liczba zatopionych");
  var naPunkty = stan.sposob === "punkty";
  var pkt = {};
  for (var q = 0; q < gra.strzaly.length; q++) {
    var sh = gra.strzaly[q];
    if (!pkt[sh.kto]) pkt[sh.kto] = 0;
    if (naPunkty) pkt[sh.kto] += zasady.punktyZaStrzal(sh.wynik, sh.dlugosc);
  }
  var ktosMaPunkty = false;
  for (var u = 0; u < stan.statystyki.gracze.length; u++) {
    var gs = stan.statystyki.gracze[u];
    var oczekPkt = naPunkty ? (pkt[gs.nr] || 0) : 0;
    var zPlanszy = -1;
    for (var h = 0; h < stan.gracze.length; h++) {
      if (stan.gracze[h].nr === gs.nr) zPlanszy = stan.gracze[h].punkty;
    }
    sprawdz(gs.punkty === oczekPkt && zPlanszy === oczekPkt, gra.kod + " punkty " + gs.imie + ": " + gs.punkty + " != " + oczekPkt);
    if (gs.punkty > 0) ktosMaPunkty = true;
  }
  if (naPunkty) sprawdz(ktosMaPunkty, gra.kod + " nikt nie dostał punktu");
}

async function sprawdzGreNaPunkty() {
  var gra = await zalozGreDoStatystyk("pkt1", [
    { id: "pia", imie: "Pia", flota: FLOTY_TESTU[0], awatar: "pirat" },
    { id: "kaj", imie: "Kaj", flota: FLOTY_TESTU[1], awatar: "kucharz" }
  ], true);
  var guard = 0;
  while (guard++ < 800 && await jedenStrzalTest(gra)) {}
  await czekajAz(gra.sluchacze[0], function (s) { return s.etap === "koniec" && s.sposob === "punkty"; }, "koniec na punkty");
  await czekajAz(gra.sluchacze[1], function (s) {
    return s.etap === "koniec" && JSON.stringify(s.statystyki) === JSON.stringify(gra.sluchacze[0].ostatni().statystyki);
  }, "Pia i Kaj widzą to samo");
  sprawdzKoncoweStatystyki(gra);
  sprawdz(JSON.stringify(gra.sluchacze[0].ostatni().statystyki).indexOf("spioch") === -1, "gra na punkty ma ludzika z innej gry");
}

async function sprawdzDwieGryDoKonca() {
  var gra1 = await zalozGreDoStatystyk("qxw1", [
    { id: "iga", imie: "Iga", flota: FLOTY_TESTU[0], awatar: "spioch" },
    { id: "ewa", imie: "Ewa", flota: FLOTY_TESTU[1], awatar: "lasuch" }
  ]);
  var gra2 = await zalozGreDoStatystyk("qxw2", [
    { id: "leo", imie: "Leo", flota: FLOTY_TESTU[1], awatar: "kapitan" },
    { id: "ula", imie: "Ula", flota: FLOTY_TESTU[0], awatar: "malarz" }
  ]);
  var guard = 0;
  var trwa = true;
  while (trwa && guard++ < 800) {
    var ruch1 = await jedenStrzalTest(gra1);
    var zamroz = gra2.sluchacze[0].ostatni().etap === "koniec" ? JSON.stringify(gra2.sluchacze[0].ostatni().statystyki) : "";
    var ruch2 = await jedenStrzalTest(gra2);
    if (zamroz) sprawdz(JSON.stringify(gra2.sluchacze[0].ostatni().statystyki) === zamroz, "strzał w qxw1 zmienił statystyki qxw2");
    trwa = ruch1 || ruch2;
  }
  await czekajAz(gra1.sluchacze[0], function (s) { return s.etap === "koniec"; }, "koniec qxw1");
  await czekajAz(gra1.sluchacze[1], function (s) { return s.etap === "koniec" && JSON.stringify(s.statystyki) === JSON.stringify(gra1.sluchacze[0].ostatni().statystyki); }, "Iga i Ewa widzą to samo");
  await czekajAz(gra2.sluchacze[0], function (s) { return s.etap === "koniec"; }, "koniec qxw2");
  sprawdzKoncoweStatystyki(gra1);
  sprawdzKoncoweStatystyki(gra2);
  sprawdz(JSON.stringify(gra1.sluchacze[0].ostatni().statystyki).indexOf("Leo") === -1, "qxw1 zna Leo");
  sprawdz(JSON.stringify(gra1.sluchacze[0].ostatni().statystyki).indexOf("kapitan") === -1, "qxw1 ma ludzika z qxw2");
  sprawdz(JSON.stringify(gra2.sluchacze[0].ostatni().statystyki).indexOf("Iga") === -1, "qxw2 zna Igę");
  sprawdz(JSON.stringify(gra2.sluchacze[0].ostatni().statystyki).indexOf("spioch") === -1, "qxw2 ma ludzika z qxw1");
  var zostawione = JSON.stringify(gra2.sluchacze[0].ostatni().statystyki);
  var nowa = await post({ id: "iga", kod: "qxw1", typ: "nowaGra" });
  sprawdz(!nowa.blad, "nowa gra qxw1: " + (nowa.blad || ""));
  await czekajAz(gra1.sluchacze[0], function (s) { return s.etap === "poczekalnia" && s.statystyki === null; }, "qxw1 wyzerowane");
  sprawdz(JSON.stringify(gra2.sluchacze[0].ostatni().statystyki) === zostawione, "nowa gra w qxw1 skasowała qxw2");
  var odNowa = await post({ id: "leo", kod: "qxw2", typ: "odNowa" });
  sprawdz(!odNowa.blad, "od nowa qxw2: " + (odNowa.blad || ""));
  await czekajAz(gra2.sluchacze[0], function (s) { return s.trzebaPotwierdzic && s.statystyki === null && s.gracze.length === 0; }, "qxw2 po od nowa");
  sprawdz(gra1.sluchacze[0].ostatni().etap === "poczekalnia" && gra1.sluchacze[0].ostatni().statystyki === null, "od nowa w qxw2 ruszyło qxw1");
}

function uruchom() {
  dziecko = child_process.spawn(process.execPath, ["serwer.js"], {
    cwd: __dirname,
    env: Object.assign({}, process.env, {
      PORT: String(PORT),
      SEKUNDY_PUSTEGO_LOBBY: "3",
      LIMIT_PROB_KODU: "1000",
      PUBLICZNY_ADRES: "https://gra.example:443"
    }),
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
  usunPulapki();
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
  await sprawdzPliki();

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
  sprawdz(JSON.stringify(a1.ostatni().adresy) === JSON.stringify(["https://gra.example:443"]), "adres w internecie: " + JSON.stringify(a1.ostatni().adresy));

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

  await sprawdzDwieGryDoKonca();
  await sprawdzGreNaPunkty();

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
