// Sprawdzenie zasad i prawdziwej gry na serwerze.
// Uruchom: mise run test

var test = require("node:test");
var assert = require("node:assert/strict");
var http = require("http");
var child_process = require("child_process");
var zasady = require("./zasady.js");

var nastepnyPort = 23000 + (process.pid % 500) * 20;

test("punkty: trafienie 1, zatopienie 1 + maszty", function () {
  assert.equal(zasady.punktyZaStrzal("pudlo", 4), 0);
  assert.equal(zasady.punktyZaStrzal("trafiony", 4), 1);
  assert.equal(zasady.punktyZaStrzal("zatopiony", 1), 2);
  assert.equal(zasady.punktyZaStrzal("zatopiony", 4), 5);
});

test("ranking: najpierw punkty, potem celność, remis dzieli miejsce", function () {
  var miejsca = zasady.ranking([
    { nr: 1, imie: "Ala", punkty: 4, trafienia: 2, oddane: 4 },
    { nr: 2, imie: "Bolek", punkty: 4, trafienia: 2, oddane: 2 },
    { nr: 3, imie: "Czes", punkty: 9, trafienia: 1, oddane: 9 },
    { nr: 4, imie: "Dyzio", punkty: 4, trafienia: 2, oddane: 2 }
  ]);
  assert.deepEqual(miejsca.map(function (m) { return m.imie; }), ["Czes", "Bolek", "Dyzio", "Ala"]);
  assert.deepEqual(miejsca.map(function (m) { return m.miejsce; }), [1, 2, 2, 4]);

  var zero = zasady.ranking([
    { nr: 1, imie: "Ala", punkty: 0, trafienia: 0, oddane: 0 },
    { nr: 2, imie: "Bolek", punkty: 0, trafienia: 0, oddane: 3 }
  ]);
  assert.equal(zero[0].imie, "Bolek");
  assert.equal(zero[0].miejsce, 1);
  assert.equal(zero[1].miejsce, 2);
});

test("poczekalnia: wszyscy widzą sposób i rundy, zła liczba odpada", async function (t) {
  var gra = await nowaGra(t, ["Ala", "Bolek"]);
  assert.equal(gra.klienci[1].stan.sposob, "klasyczny");
  assert.equal(gra.klienci[1].stan.ileRund, 10);
  assert.equal(gra.klienci[1].stan.ranking.length, 0);

  await wyslij(gra, gra.klienci[0], "sposob", { sposob: "punkty" });
  await czekaj(gra.klienci[1], function (s) { return s.sposob === "punkty"; });
  await wyslij(gra, gra.klienci[0], "rundy", { ile: 15 });
  await czekaj(gra.klienci[1], function (s) { return s.ileRund === 15; });

  var zle = await wyslij(gra, gra.klienci[0], "rundy", { ile: 7 });
  assert.equal(zle.blad, "Wybierz 5, 10 albo 15 rund");
  assert.equal(gra.klienci[1].stan.ileRund, 15);

  await wystartuj(gra, "szybka");
  var wBitwie = await wyslij(gra, gra.klienci[0], "sposob", { sposob: "klasyczny" });
  assert.equal(wBitwie.blad, "Sposób gry wybiera się w poczekalni");
  assert.equal(gra.klienci[0].stan.sposob, "punkty");
});

test("klasycznie: ostatnia flota wygrywa, punkty się nie liczą", async function (t) {
  var gra = await nowaGra(t, ["Ala", "Bolek"]);
  await wystartuj(gra, "szybka");
  var stan = await grajDopoki(gra, function (kto, klienci) {
    var cel = przeciwnikZeStatkami(kto);
    var pole = poleZnaku(klienci, cel.nr, "4");
    return { cel: cel.nr, pole: pole };
  });
  assert.equal(stan.etap, "koniec");
  assert.equal(stan.sposob, "klasyczny");
  assert.equal(stan.ranking.length, 0);
  assert.equal(stan.ostatni.tekst.indexOf("+"), -1);
  var zywy = null;
  var odpadl = null;
  for (var i = 0; i < stan.gracze.length; i++) {
    assert.equal(stan.gracze[i].punkty, 0);
    assert.equal(stan.gracze[i].oddane, 0);
    if (stan.gracze[i].odpadl) odpadl = stan.gracze[i];
    else zywy = stan.gracze[i];
  }
  assert.ok(odpadl && odpadl.zostalo === 0);
  assert.ok(zywy && zywy.zostalo > 0);
  assert.equal(stan.zwyciezca, zywy.imie);
});

test("na punkty: zatopienie daje 1 + maszty, woda obok nie jest strzałem", async function (t) {
  var gra = await nowaGra(t, ["Ala", "Bolek", "Czes"]);
  await wyslij(gra, gra.klienci[0], "sposob", { sposob: "punkty" });
  await wystartuj(gra, "szybka");
  var jedynka = null;
  for (var i = 0; i < gra.klienci.length && !jedynka; i++) {
    var grupy = gra.grupy[gra.klienci[i].stan.ja];
    for (var j = 0; j < grupy.length; j++) {
      if (grupy[j].length === 1) jedynka = { nr: gra.klienci[i].stan.ja, pole: grupy[j][0] };
    }
  }
  assert.ok(jedynka);

  var strzelec = null;
  var przed = 0;
  for (var proba = 0; proba < 30 && !strzelec; proba++) {
    var kto = klientNaTurze(gra);
    przed = kto.stan.ostatni ? kto.stan.ostatni.numer : 0;
    if (kto.stan.ja === jedynka.nr) {
      await wyslij(gra, kto, "strzal", pudloW(kto, gra.klienci));
    } else {
      strzelec = kto;
      var odp = await wyslij(gra, kto, "strzal", { cel: jedynka.nr, pole: jedynka.pole });
      assert.equal(odp.blad, undefined);
    }
    await czekaj(kto, function (s) { return s.ostatni && s.ostatni.numer > przed; });
  }
  assert.ok(strzelec);
  var po = await czekaj(strzelec, function (s) { return s.ostatni && s.ostatni.numer > przed; });
  var ja = graczONr(po, strzelec.stan.ja);
  assert.equal(po.etap, "bitwa");
  assert.equal(po.tura, strzelec.stan.ja);
  assert.equal(po.ostatni.wynik, "zatopiony");
  assert.ok(po.ostatni.tekst.indexOf("+2") !== -1);
  assert.equal(ja.punkty, 2);
  assert.equal(ja.trafienia, 1);
  assert.equal(ja.oddane, 1);
  var obok = zasady.sasiedzi(jedynka.pole, zasady.TRYBY.szybka.rozmiar);
  var powtorka = await wyslij(gra, strzelec, "strzal", { cel: jedynka.nr, pole: obok[0] });
  assert.equal(powtorka.blad, "Tu już ktoś strzelał");
  assert.equal(graczONr(strzelec.stan, strzelec.stan.ja).oddane, 1);
});

test("na punkty: zatopiony dalej strzela i może wygrać, koniec przy jednej flocie", async function (t) {
  var gra = await nowaGra(t, ["Ala", "Bolek", "Czes"]);
  await wyslij(gra, gra.klienci[0], "sposob", { sposob: "punkty" });
  await wyslij(gra, gra.klienci[0], "rundy", { ile: 15 });
  await wystartuj(gra, "szybka");
  var nrA = gra.klienci[0].stan.ja;
  var nrB = gra.klienci[1].stan.ja;
  var nrC = gra.klienci[2].stan.ja;
  var faza = "topC";
  var strzelalPoZatopieniu = false;
  var stan = await grajDopoki(gra, function (kto, klienci) {
    var c = graczONr(kto.stan, nrC);
    if (kto.stan.ja === nrB && c.zostalo === 0 && kto.stan.etap === "bitwa") strzelalPoZatopieniu = true;
    if (kto.stan.ja === nrB && faza === "topC") {
      var poleC = poleZnaku(klienci, nrC, "4");
      if (poleC >= 0) return { cel: nrC, pole: poleC };
      faza = "uderzA";
    }
    if (kto.stan.ja === nrB && faza === "uderzA") {
      var poleA = poleZnaku(klienci, nrA, "4");
      if (poleA >= 0) {
        faza = "mijA";
        return { cel: nrA, pole: poleA };
      }
    }
    if (kto.stan.ja === nrB && faza === "mijA") {
      faza = "topB";
      return pudloW(kto, klienci);
    }
    if (kto.stan.ja === nrA && faza === "topB") {
      var poleB = poleZnaku(klienci, nrB, "4");
      if (poleB >= 0) return { cel: nrB, pole: poleB };
    }
    return pudloW(kto, klienci);
  });
  assert.equal(strzelalPoZatopieniu, true);
  assert.equal(stan.etap, "koniec");
  var a = graczONr(stan, nrA);
  var b = graczONr(stan, nrB);
  var c = graczONr(stan, nrC);
  assert.equal(b.odpadl, false);
  assert.equal(b.zostalo, 0);
  assert.ok(a.zostalo > 0);
  assert.equal(c.zostalo, 0);
  assert.ok(b.punkty > a.punkty);
  assert.equal(stan.ranking[0].nr, nrB);
  assert.equal(stan.ranking[0].miejsce, 1);
  assert.equal(stan.zwyciezca, "Bolek");
  assert.ok(stan.dziennik.join("\n").indexOf("została jedna flota") !== -1);
});

test("na punkty: po 5 rundach koniec i remis, gdy nikt nie trafił", async function (t) {
  var gra = await nowaGra(t, ["Ala", "Bolek", "Czes"]);
  await wyslij(gra, gra.klienci[0], "sposob", { sposob: "punkty" });
  await wyslij(gra, gra.klienci[0], "rundy", { ile: 5 });
  await czekaj(gra.klienci[2], function (s) { return s.ileRund === 5 && s.sposob === "punkty"; });
  await wystartuj(gra, "szybka");
  var stan = await grajDopoki(gra, function (kto, klienci) {
    return pudloW(kto, klienci);
  });
  assert.equal(stan.etap, "koniec");
  assert.equal(stan.runda, 5);
  assert.equal(stan.ranking.length, 3);
  for (var i = 0; i < stan.gracze.length; i++) {
    assert.equal(stan.gracze[i].oddane, 5);
    assert.equal(stan.gracze[i].punkty, 0);
    assert.equal(stan.gracze[i].trafienia, 0);
    assert.equal(stan.gracze[i].odpadl, false);
    assert.equal(stan.ranking[i].miejsce, 1);
  }
  assert.equal(stan.zwyciezca, "Ala i Bolek i Czes");
});

test("dwie gry: inny kod, inny sposób, domyślnie klasycznie", async function (t) {
  var klasyczna = await nowaGra(t, ["Ala", "Bolek"], "klas1");
  var punkty = await drugaGra(klasyczna, "punk1", ["Ewa", "Jan"]);
  assert.equal(klasyczna.klienci[0].stan.sposob, "klasyczny");
  assert.equal(klasyczna.klienci[0].stan.ileRund, 10);
  assert.equal(punkty.klienci[0].stan.sposob, "klasyczny");

  await wyslij(punkty, punkty.klienci[0], "sposob", { sposob: "punkty" });
  await wyslij(punkty, punkty.klienci[0], "rundy", { ile: 5 });
  await czekaj(punkty.klienci[1], function (s) { return s.sposob === "punkty" && s.ileRund === 5 && s.kod === "punk1"; });
  assert.equal(klasyczna.klienci[1].stan.sposob, "klasyczny");
  assert.equal(klasyczna.klienci[1].stan.ileRund, 10);
  assert.equal(klasyczna.klienci[1].stan.kod, "klas1");

  await wyslij(klasyczna, klasyczna.klienci[0], "tryb", { tryb: "szybka" });
  await czekaj(klasyczna.klienci[1], function (s) { return s.tryb === "szybka"; });
  assert.equal(punkty.klienci[1].stan.tryb, "klasyczna");
  assert.equal(punkty.klienci[1].stan.sposob, "punkty");
});

test("od nowa zostawia sposób i czeka na Gram!", async function (t) {
  var gra = await nowaGra(t, ["Ala", "Bolek"]);
  await wyslij(gra, gra.klienci[0], "sposob", { sposob: "punkty" });
  await wyslij(gra, gra.klienci[0], "rundy", { ile: 5 });
  await wystartuj(gra, "szybka");
  await wyslij(gra, gra.klienci[0], "odNowa", {});
  var stan = await czekaj(gra.klienci[1], function (s) { return s.trzebaPotwierdzic && s.etap === "poczekalnia"; });
  assert.equal(stan.sposob, "punkty");
  assert.equal(stan.ileRund, 5);
  assert.equal(stan.gracze.length, 0);
  assert.equal(gra.klienci[0].stan.trzebaPotwierdzic, true);
});

// ----- Pomocnicy: trzy okna to trzy połączenia -----

function nowaGra(t, imiona, kod) {
  var port = nastepnyPort++;
  var dziecko = child_process.spawn(process.execPath, ["serwer.js"], {
    cwd: __dirname,
    env: Object.assign({}, process.env, { PORT: String(port), PUBLICZNY_ADRES: "" }),
    stdio: ["ignore", "pipe", "pipe"]
  });
  var log = "";
  dziecko.stdout.on("data", function (d) { log += d; });
  dziecko.stderr.on("data", function (d) { log += d; });
  var polaczenia = [];
  t.after(function () {
    for (var i = 0; i < polaczenia.length; i++) polaczenia[i].req.destroy();
    dziecko.kill();
  });
  var gra = { port: port, kod: kod || "gra1", klienci: [], grupy: {}, polaczenia: polaczenia };
  return czekajNaTekst(dziecko, function () { return log.indexOf("Statki działają") !== -1; }, function () { return log; })
    .then(function () {
      return zalozIDolacz(gra, imiona);
    })
    .then(function () {
      return gra;
    });
}

function drugaGra(baza, kod, imiona) {
  var gra = { port: baza.port, kod: kod, klienci: [], grupy: {}, polaczenia: baza.polaczenia };
  return zalozIDolacz(gra, imiona).then(function () { return gra; });
}

function zalozIDolacz(gra, imiona) {
  return wyslij(gra, { id: "zakladacz" }, "noweLobby", { kod: gra.kod }).then(function (odp) {
    if (odp.blad) throw new Error(odp.blad);
    var obietnice = [];
    for (var i = 0; i < imiona.length; i++) {
      obietnice.push(podlacz(gra.port, "g" + gra.port + gra.kod + i, gra.kod));
    }
    return Promise.all(obietnice);
  }).then(function (lista) {
    gra.klienci = lista;
    for (var i = 0; i < lista.length; i++) gra.polaczenia.push(lista[i]);
    var dolaczenia = [];
    for (var j = 0; j < imiona.length; j++) {
      dolaczenia.push(wyslij(gra, gra.klienci[j], "dolacz", { imie: imiona[j] }));
    }
    return Promise.all(dolaczenia);
  }).then(function () {
    return czekaj(gra.klienci[gra.klienci.length - 1], function (s) {
      return s.kod === gra.kod && s.gracze && s.gracze.length === imiona.length && s.ja !== 0;
    });
  });
}

function wystartuj(gra, tryb) {
  return wyslij(gra, gra.klienci[0], "tryb", { tryb: tryb }).then(function () {
    return wyslij(gra, gra.klienci[0], "start", {});
  }).then(function (odp) {
    assert.equal(odp.ok, true);
    return czekaj(gra.klienci[0], function (s) { return s.etap === "ustawianie"; });
  }).then(function () {
    var ustawienia = [];
    for (var i = 0; i < gra.klienci.length; i++) {
      var lista = [];
      for (var proba = 0; proba < 30 && lista.length === 0; proba++) lista = zasady.losujFlote(zasady.TRYBY[tryb]);
      assert.ok(lista.length > 0);
      ustawienia.push(wyslij(gra, gra.klienci[i], "ustaw", { statki: lista }).then(zapamietajFlote(gra, gra.klienci[i], lista, zasady.TRYBY[tryb].rozmiar)));
    }
    return Promise.all(ustawienia);
  }).then(function () {
    return czekaj(gra.klienci[0], function (s) { return s.etap === "bitwa"; });
  });
}

function zapamietajFlote(gra, klient, lista, rozmiar) {
  return function () {
    var nr = klient.stan.ja;
    var grupy = [];
    for (var i = 0; i < lista.length; i++) {
      var s = lista[i];
      var pola = [];
      for (var j = 0; j < s.dlugosc; j++) {
        var w = s.poziomo === true ? s.w : s.w + j;
        var k = s.poziomo === true ? s.k + j : s.k;
        pola.push(w * rozmiar + k);
      }
      grupy.push(pola);
    }
    gra.grupy[nr] = grupy;
  };
}

function grajDopoki(gra, polityka) {
  var kroki = 0;
  function krok() {
    var stan = gra.klienci[0].stan;
    if (stan.etap !== "bitwa") return Promise.resolve(stan);
    if (kroki++ > 500) return Promise.reject(new Error("za dużo strzałów"));
    var kto = klientNaTurze(gra);
    var ruch = polityka(kto, gra.klienci);
    if (!ruch) return Promise.reject(new Error("brak ruchu przy turze " + stan.tura));
    var przed = stan.ostatni ? stan.ostatni.numer : 0;
    return wyslij(gra, kto, "strzal", ruch).then(function (odp) {
      if (odp.blad) return Promise.reject(new Error(odp.blad));
      return czekaj(kto, function (s) {
        return s.etap !== "bitwa" || (s.ostatni && s.ostatni.numer > przed);
      });
    }).then(krok);
  }
  return krok();
}

function klientNaTurze(gra) {
  var tura = gra.klienci[0].stan.tura;
  for (var i = 0; i < gra.klienci.length; i++) {
    if (gra.klienci[i].stan.ja === tura) return gra.klienci[i];
  }
  return null;
}

function graczONr(stan, nr) {
  for (var i = 0; i < stan.gracze.length; i++) {
    if (stan.gracze[i].nr === nr) return stan.gracze[i];
  }
  return null;
}

function poleZnaku(klienci, nr, znak) {
  for (var i = 0; i < klienci.length; i++) {
    if (klienci[i].stan.ja !== nr) continue;
    var g = graczONr(klienci[i].stan, nr);
    for (var p = 0; p < g.pola.length; p++) {
      if (g.pola.charAt(p) === znak) return p;
    }
  }
  return -1;
}

function przeciwnikZeStatkami(kto) {
  for (var i = 0; i < kto.stan.gracze.length; i++) {
    var g = kto.stan.gracze[i];
    if (g.nr !== kto.stan.ja && !g.widz && !g.odpadl && g.zostalo > 0) return g;
  }
  return null;
}

function pudloW(kto, klienci) {
  var cel = przeciwnikZeStatkami(kto);
  return { cel: cel.nr, pole: poleZnaku(klienci, cel.nr, "0") };
}

function podlacz(port, id, kod) {
  return new Promise(function (ok, zly) {
    var sciezka = "/wydarzenia?id=" + id + "&kod=" + encodeURIComponent(kod);
    var req = http.get({ hostname: "127.0.0.1", port: port, path: sciezka }, function (res) {
      var klient = { id: id, req: req, stan: null };
      var buf = "";
      res.on("data", function (d) {
        buf += d.toString();
        var kawalki = buf.split("\n\n");
        buf = kawalki.pop();
        for (var i = 0; i < kawalki.length; i++) {
          var linie = kawalki[i].split("\n");
          var event = "";
          var data = "";
          for (var j = 0; j < linie.length; j++) {
            if (linie[j].indexOf("event:") === 0) event = linie[j].slice(6).trim();
            if (linie[j].indexOf("data:") === 0) data += linie[j].slice(5).trim();
          }
          if (event === "stan" && data) klient.stan = JSON.parse(data);
        }
      });
      res.on("error", function () {});
      ok(klient);
    });
    req.on("error", zly);
  });
}

function wyslij(gra, klient, typ, dane) {
  dane = Object.assign({ id: klient.id, typ: typ, kod: gra.kod }, dane || {});
  var body = JSON.stringify(dane);
  return new Promise(function (ok, zly) {
    var req = http.request({
      hostname: "127.0.0.1",
      port: gra.port,
      path: "/akcja",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    }, function (res) {
      var buf = "";
      res.on("data", function (d) { buf += d; });
      res.on("end", function () { ok(JSON.parse(buf)); });
    });
    req.on("error", zly);
    req.end(body);
  });
}

function czekaj(klient, warunek) {
  var start = Date.now();
  return new Promise(function (ok, zly) {
    function sprawdz() {
      if (klient.stan && warunek(klient.stan)) return ok(klient.stan);
      if (Date.now() - start > 5000) {
        return zly(new Error("czas minął, etap=" + (klient.stan && klient.stan.etap)));
      }
      setTimeout(sprawdz, 10);
    }
    sprawdz();
  });
}

function czekajNaTekst(dziecko, gotowe, log) {
  return new Promise(function (ok, zly) {
    var start = Date.now();
    function sprawdz() {
      if (gotowe()) return ok();
      if (dziecko.exitCode !== null) return zly(new Error("serwer stanął: " + log()));
      if (Date.now() - start > 5000) return zly(new Error("serwer nie wstał: " + log()));
      setTimeout(sprawdz, 20);
    }
    sprawdz();
  });
}
