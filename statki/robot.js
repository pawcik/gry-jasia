// Robot do statków. Ustawia flotę losowo (to robi serwer) i strzela sam.
// Najpierw losuje pole, a gdy trafi — szuka obok, wzdłuż statku.
// Nie widzi ukrytych statków, więc da się go pokonać.

// Podgląd (nie zwykła gra w domu) włącza grę z robotem.
// STATKI_PODGLAD=1, albo port 8090, albo adres kończący się na :18443.
function podgladZRobotem(env, port, adres) {
  if (env && String(env.STATKI_PODGLAD) === "1") return true;
  if (String(port) === "8090") return true;
  adres = String(adres || "");
  var znacznik = ":18443";
  if (adres.length >= znacznik.length && adres.slice(-znacznik.length) === znacznik) return true;
  var gdzie = adres.lastIndexOf(znacznik);
  if (gdzie === -1) return false;
  var dalej = adres.charAt(gdzie + znacznik.length);
  return dalej === "/" || dalej === "?" || dalej === "#";
}

function wGranicach(w, k, rozmiar) {
  return w >= 0 && k >= 0 && w < rozmiar && k < rozmiar;
}

// Pola wody tuż obok trafionego, ale jeszcze nie zatopionego kawałka.
// Gdy trafienia stoją w linii, robot strzela tylko na jej końcach.
function polaPolowania(strzaly, rozmiar) {
  var trafione = [];
  for (var i = 0; i < strzaly.length; i++) {
    if (strzaly[i] === 2) trafione.push(i);
  }
  var poziomo = false;
  var pionowo = false;
  for (var a = 0; a < trafione.length; a++) {
    for (var b = a + 1; b < trafione.length; b++) {
      var wa = Math.floor(trafione[a] / rozmiar);
      var ka = trafione[a] % rozmiar;
      var wb = Math.floor(trafione[b] / rozmiar);
      var kb = trafione[b] % rozmiar;
      if (wa === wb) poziomo = true;
      if (ka === kb) pionowo = true;
    }
  }
  var tylkoPoziom = poziomo && !pionowo;
  var tylkoPion = pionowo && !poziomo;
  var cele = [];
  for (var t = 0; t < trafione.length; t++) {
    var w = Math.floor(trafione[t] / rozmiar);
    var k = trafione[t] % rozmiar;
    var skoki = [];
    if (!tylkoPion) {
      skoki.push([0, -1]);
      skoki.push([0, 1]);
    }
    if (!tylkoPoziom) {
      skoki.push([-1, 0]);
      skoki.push([1, 0]);
    }
    for (var s = 0; s < skoki.length; s++) {
      var nw = w + skoki[s][0];
      var nk = k + skoki[s][1];
      if (!wGranicach(nw, nk, rozmiar)) continue;
      var pole = nw * rozmiar + nk;
      if (strzaly[pole] !== 0) continue;
      if (cele.indexOf(pole) === -1) cele.push(pole);
    }
  }
  return cele;
}

function polaWolne(strzaly) {
  var wolne = [];
  for (var i = 0; i < strzaly.length; i++) {
    if (strzaly[i] === 0) wolne.push(i);
  }
  return wolne;
}

// Numer pola albo -1, gdy nie ma już gdzie strzelać.
function wybierzPoleRobota(strzaly, rozmiar) {
  var cele = polaPolowania(strzaly, rozmiar);
  if (!cele.length) cele = polaWolne(strzaly);
  if (!cele.length) return -1;
  return cele[Math.floor(Math.random() * cele.length)];
}

function czyPoluje(strzaly, rozmiar) {
  return polaPolowania(strzaly, rozmiar).length > 0;
}

if (typeof module !== "undefined") {
  module.exports = {
    podgladZRobotem: podgladZRobotem,
    polaPolowania: polaPolowania,
    wybierzPoleRobota: wybierzPoleRobota,
    czyPoluje: czyPoluje
  };
}
