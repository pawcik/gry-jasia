// ===== Sudoku na ekranie =====
// Plansza jest z przycisków, jak kartka. Silnik w silnik.js układa i sprawdza.

var KLUCZ = "sudoku";
var KOLEJNOSC_ROZMIAROW = ["4", "6", "9", "12", "16"];
var KOLEJNOSC_TRUDNOSCI = ["latwy", "sredni", "trudny", "ekspert"];

var rozmiar = "9";
var trudnosc = "sredni";
var ekran = "menu";
var gra = null;
var edytor = null;
var wybrany = 0;
var trybNotatek = false;
var czyscNotatki = true;
var cofanie = [];
var ponawianie = [];
var znaczniki = null;
var wlasne = [];
var gotowe = [];
var numerLosowania = 0;
var graPrzedLosowaniem = null;
var zbudowanyDla = "";
var polaPrzyciski = [];
var timerZapisu = 0;
var dzwiekCtx = null;

var komunikatEl = document.getElementById("komunikat");

function opisRozmiaru(klucz) {
  return ROZMIARY[String(klucz)];
}

function aktualnyOpis() {
  if (ekran === "edytor" && edytor) return opisRozmiaru(edytor.rozmiar);
  if (gra && gra.rozmiar) return opisRozmiaru(gra.rozmiar);
  return opisRozmiaru(rozmiar);
}

function nazwaTrudnosci(klucz) {
  if (klucz === "wlasna") return "Własna";
  if (TRUDNOSCI[klucz]) return TRUDNOSCI[klucz].nazwa;
  return "";
}

function pusteNotatki(opis) {
  var a = [];
  var i;
  for (i = 0; i < opis.n * opis.n; i++) a.push(0);
  return a;
}

function bit(v) {
  return (1 << v) >>> 0;
}

function ustawKomunikat(tekst) {
  komunikatEl.textContent = tekst || "";
}

function pokazEkran() {
  var menu = document.getElementById("ekranMenu");
  var graEl = document.getElementById("ekranGra");
  var edytorEl = document.getElementById("ekranEdytor");
  menu.className = "ekran" + (ekran === "menu" ? " widoczne" : "");
  graEl.className = "ekran" + (ekran === "gra" ? " widoczne" : "");
  edytorEl.className = "ekran" + (ekran === "edytor" ? " widoczne" : "");
  document.getElementById("doMenu").hidden = ekran === "menu";
  document.getElementById("wrocDoPlanszy").hidden = !(gra && gra.rozwiazanie);
  odswiezChipy();
  if (ekran === "gra" || ekran === "edytor") upewnijPlansze();
  if (ekran === "gra") odswiezOpisGry();
  if (ekran === "edytor") odswiezEdytorPrzyciski();
  rysujListy();
}

function odswiezChipy() {
  var i;
  var rozmiary = document.querySelectorAll("[data-rozmiar]");
  for (i = 0; i < rozmiary.length; i++) {
    var klucz = rozmiary[i].getAttribute("data-rozmiar");
    var aktywny = ekran === "edytor" && edytor ? edytor.rozmiar === klucz : rozmiar === klucz;
    rozmiary[i].className = aktywny ? "wcisniety" : "";
  }
  var trudnosci = document.querySelectorAll("[data-trudnosc]");
  for (i = 0; i < trudnosci.length; i++) {
    trudnosci[i].className = trudnosci[i].getAttribute("data-trudnosc") === trudnosc ? "wcisniety" : "";
  }
  var notatki = document.getElementById("trybNotatek");
  notatki.className = trybNotatek ? "wcisniety" : "";
  notatki.setAttribute("aria-pressed", trybNotatek ? "true" : "false");
  document.getElementById("czyscNotatki").checked = czyscNotatki;
}

function zrobChip(tekst, atrybut, wartosc, klik) {
  var b = document.createElement("button");
  b.type = "button";
  b.textContent = tekst;
  b.setAttribute(atrybut, wartosc);
  b.addEventListener("click", klik);
  return b;
}

function zbudujMenu() {
  var roz = document.getElementById("wyborRozmiaru");
  var tru = document.getElementById("wyborTrudnosci");
  var red = document.getElementById("wyborRozmiaruEdytora");
  var i;
  for (i = 0; i < KOLEJNOSC_ROZMIAROW.length; i++) {
    var klucz = KOLEJNOSC_ROZMIAROW[i];
    var opis = ROZMIARY[klucz];
    roz.appendChild(zrobChip(opis.nazwa, "data-rozmiar", klucz, function () {
      rozmiar = this.getAttribute("data-rozmiar");
      odswiezChipy();
      zapisz();
    }));
    red.appendChild(zrobChip(opis.nazwa, "data-rozmiar", klucz, function () {
      zmienRozmiarEdytora(this.getAttribute("data-rozmiar"));
    }));
  }
  for (i = 0; i < KOLEJNOSC_TRUDNOSCI.length; i++) {
    var t = KOLEJNOSC_TRUDNOSCI[i];
    tru.appendChild(zrobChip(TRUDNOSCI[t].nazwa, "data-trudnosc", t, function () {
      trudnosc = this.getAttribute("data-trudnosc");
      odswiezChipy();
      zapisz();
    }));
  }
}

function odswiezOpisGry() {
  var el = document.getElementById("opisGry");
  if (!gra) {
    el.textContent = "";
    return;
  }
  var opis = opisRozmiaru(gra.rozmiar);
  el.textContent = opis.nazwa + " · " + nazwaTrudnosci(gra.trudnosc);
}

function siatkaEl() {
  if (ekran === "edytor") return document.getElementById("planszaEdytora");
  return document.getElementById("plansza");
}

function padEl() {
  if (ekran === "edytor") return document.getElementById("padEdytora");
  return document.getElementById("pad");
}

function dopasujCzcionke() {
  var siatka = siatkaEl();
  if (!siatka || ekran === "menu") return;
  var opis = aktualnyOpis();
  if (!opis || !siatka.clientWidth) return;
  siatka.style.setProperty("--bok", (siatka.clientWidth / opis.n) + "px");
}

function ograniczWybor(opis) {
  var max = opis.n * opis.n - 1;
  if (wybrany < 0 || wybrany > max || isNaN(wybrany)) wybrany = 0;
}

function zbudujPlansze() {
  var opis = aktualnyOpis();
  var siatka = siatkaEl();
  var pad = padEl();
  siatka.innerHTML = "";
  pad.innerHTML = "";
  siatka.style.setProperty("--n", String(opis.n));
  siatka.style.setProperty("--kol-not", String(opis.szer));
  siatka.style.setProperty("--wier-not", String(opis.wys));
  siatka.className = "siatka";
  polaPrzyciski = [];
  var i;
  for (i = 0; i < opis.n * opis.n; i++) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pole";
    btn.dataset.i = String(i);
    var r = Math.floor(i / opis.n);
    var c = i % opis.n;
    if ((c + 1) % opis.szer === 0) btn.dataset.gp = "1";
    if ((r + 1) % opis.wys === 0) btn.dataset.gd = "1";
    var cyfra = document.createElement("span");
    cyfra.className = "cyfra";
    var notatki = document.createElement("span");
    notatki.className = "notatki";
    btn.appendChild(cyfra);
    btn.appendChild(notatki);
    btn.addEventListener("click", function () {
      wybrany = Number(this.dataset.i);
      odswiezKlasy();
      odswiezPad();
      zapisz();
    });
    siatka.appendChild(btn);
    polaPrzyciski.push(btn);
  }
  for (i = 0; i < opis.n; i++) {
    var klawisz = document.createElement("button");
    klawisz.type = "button";
    klawisz.textContent = opis.znaki.charAt(i);
    klawisz.dataset.v = String(i);
    klawisz.addEventListener("click", function () {
      wpiszCyfre(Number(this.dataset.v));
    });
    pad.appendChild(klawisz);
  }
  var czysc = document.createElement("button");
  czysc.type = "button";
  czysc.className = "gumka";
  czysc.setAttribute("aria-label", "Wyczyść");
  czysc.title = "Wyczyść";
  // Mała gumka, tej samej wielkości co cyfra. Słowo „czyść” wylewało się z ramki na telefonie.
  czysc.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15.2 3.8l5 5-9.7 9.7H5.2l-1.4-1.4 9.3-9.3 2.1-4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.6 13.4l5.2 5.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 21.2h17" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  czysc.addEventListener("click", wyczyscWybrane);
  pad.appendChild(czysc);
  zbudowanyDla = ekran + ":" + opis.n;
  ograniczWybor(opis);
  odswiezWszystkiePola();
  odswiezKlasy();
  odswiezPad();
  requestAnimationFrame(dopasujCzcionke);
}

function upewnijPlansze() {
  var opis = aktualnyOpis();
  if (!opis) return;
  var klucz = ekran + ":" + opis.n;
  if (zbudowanyDla === klucz && polaPrzyciski.length === opis.n * opis.n) {
    odswiezWszystkiePola();
    odswiezKlasy();
    odswiezPad();
    requestAnimationFrame(dopasujCzcionke);
    return;
  }
  zbudujPlansze();
}

function wartoscWidoczna(i) {
  if (ekran === "edytor") return edytor.dane[i];
  if (!gra) return -1;
  if (gra.dane[i] >= 0) return gra.dane[i];
  return gra.wpisy[i];
}

function czyWydrukowana(i) {
  if (ekran === "edytor") return false;
  return !!(gra && gra.dane[i] >= 0);
}

function odswiezPole(i) {
  var btn = polaPrzyciski[i];
  if (!btn) return;
  var opis = aktualnyOpis();
  var v = wartoscWidoczna(i);
  var cyfra = btn.querySelector(".cyfra");
  var notatki = btn.querySelector(".notatki");
  if (v >= 0) {
    cyfra.textContent = opis.znaki.charAt(v);
    notatki.innerHTML = "";
  } else if (ekran === "gra" && gra && gra.notatki[i]) {
    cyfra.textContent = "";
    var html = "";
    var k;
    for (k = 0; k < opis.n; k++) {
      var jest = (gra.notatki[i] & bit(k)) !== 0;
      html += "<i>" + (jest ? opis.znaki.charAt(k) : "") + "</i>";
    }
    notatki.innerHTML = html;
  } else {
    cyfra.textContent = "";
    notatki.innerHTML = "";
  }
  var r = Math.floor(i / opis.n) + 1;
  var c = (i % opis.n) + 1;
  btn.setAttribute("aria-label", "wiersz " + r + " kolumna " + c + (v >= 0 ? " " + opis.znaki.charAt(v) : " puste"));
}

function odswiezWszystkiePola() {
  var i;
  for (i = 0; i < polaPrzyciski.length; i++) odswiezPole(i);
}

function tenSamObszar(opis, a, b) {
  if (a === b) return false;
  var n = opis.n;
  var ra = Math.floor(a / n);
  var ca = a % n;
  var rb = Math.floor(b / n);
  var cb = b % n;
  if (ra === rb || ca === cb) return true;
  return Math.floor(ra / opis.wys) === Math.floor(rb / opis.wys) && Math.floor(ca / opis.szer) === Math.floor(cb / opis.szer);
}

function odswiezKlasy() {
  var opis = aktualnyOpis();
  if (!opis) return;
  var wybranaWartosc = wartoscWidoczna(wybrany);
  var i;
  for (i = 0; i < polaPrzyciski.length; i++) {
    var btn = polaPrzyciski[i];
    var klasy = ["pole"];
    if (btn.dataset.gp) klasy.push("gruboPrawo");
    if (btn.dataset.gd) klasy.push("gruboDol");
    if (i === wybrany) klasy.push("wybrane");
    else if (tenSamObszar(opis, i, wybrany)) klasy.push("obok");
    var v = wartoscWidoczna(i);
    if (v >= 0 && wybranaWartosc >= 0 && v === wybranaWartosc && i !== wybrany) klasy.push("obok");
    if (ekran === "edytor") {
      if (v >= 0) klasy.push("dana");
    } else if (czyWydrukowana(i)) klasy.push("dana");
    else if (v >= 0) klasy.push("wpis");
    if (ekran === "gra" && v < 0 && gra && gra.notatki[i]) klasy.push("zNotatkami");
    if (znaczniki && ekran === "gra") {
      if (znaczniki.zle[i]) klasy.push("zle");
      if (znaczniki.konflikt[i]) klasy.push("konflikt");
    }
    btn.className = klasy.join(" ");
  }
}

function odswiezPad() {
  var pad = padEl();
  if (!pad) return;
  var opis = aktualnyOpis();
  var v = wartoscWidoczna(wybrany);
  var maska = 0;
  if (ekran === "gra" && gra && trybNotatek) maska = gra.notatki[wybrany] || 0;
  var przyciski = pad.querySelectorAll("button[data-v]");
  var i;
  for (i = 0; i < przyciski.length; i++) {
    var wart = Number(przyciski[i].dataset.v);
    var wlaczony = false;
    if (ekran === "gra" && trybNotatek) wlaczony = (maska & bit(wart)) !== 0;
    else wlaczony = v === wart;
    przyciski[i].className = wlaczony ? "wcisniety" : "";
    if (wart >= opis.n) przyciski[i].hidden = true;
  }
}

function zrzut() {
  if (ekran === "edytor" && edytor) {
    return {
      rodzaj: "edytor",
      dane: edytor.dane.slice(),
      rozwiazanie: edytor.rozwiazanie ? edytor.rozwiazanie.slice() : null,
      stan: edytor.stan,
      wybrany: wybrany
    };
  }
  if (!gra) return null;
  return {
    rodzaj: "gra",
    wpisy: gra.wpisy.slice(),
    notatki: gra.notatki.slice(),
    wybrany: wybrany
  };
}

function przywroc(snap) {
  if (!snap) return;
  wybrany = snap.wybrany;
  if (snap.rodzaj === "edytor" && edytor) {
    edytor.dane = snap.dane.slice();
    edytor.rozwiazanie = snap.rozwiazanie ? snap.rozwiazanie.slice() : null;
    edytor.stan = snap.stan || "";
    odswiezEdytorPrzyciski();
  } else if (snap.rodzaj === "gra" && gra) {
    gra.wpisy = snap.wpisy.slice();
    gra.notatki = snap.notatki.slice();
    znaczniki = null;
  }
  ograniczWybor(aktualnyOpis());
  odswiezWszystkiePola();
  odswiezKlasy();
  odswiezPad();
}

function zapamietaj() {
  var snap = zrzut();
  if (!snap) return;
  cofanie.push(snap);
  if (cofanie.length > 80) cofanie.shift();
  ponawianie = [];
}

function cofnijRuch() {
  if (!cofanie.length) return;
  var teraz = zrzut();
  if (teraz) ponawianie.push(teraz);
  przywroc(cofanie.pop());
  ustawKomunikat("");
  zapisz();
}

function ponowRuch() {
  if (!ponawianie.length) return;
  var teraz = zrzut();
  if (teraz) cofanie.push(teraz);
  przywroc(ponawianie.pop());
  ustawKomunikat("");
  zapisz();
}

function wymazNotatkiObok(pole, v) {
  if (!gra || !czyscNotatki) return;
  var opis = opisRozmiaru(gra.rozmiar);
  var obok = polaObok(opis, pole);
  var maska = ~bit(v);
  var i;
  for (i = 0; i < obok.length; i++) gra.notatki[obok[i]] = (gra.notatki[obok[i]] & maska) >>> 0;
}

function planszaPelnaIDobra() {
  if (!gra || !gra.rozwiazanie) return false;
  var i;
  for (i = 0; i < gra.rozwiazanie.length; i++) {
    var w = gra.dane[i] >= 0 ? gra.dane[i] : gra.wpisy[i];
    if (w !== gra.rozwiazanie[i]) return false;
  }
  return true;
}

function wpiszCyfre(v) {
  if (ekran === "edytor") {
    wpiszWEdytorze(v);
    return;
  }
  if (!gra || gra.uklada || !gra.rozwiazanie) return;
  if (v < 0 || v >= opisRozmiaru(gra.rozmiar).n) return;
  if (gra.dane[wybrany] >= 0) {
    ustawKomunikat("Ta cyfra jest wydrukowana.");
    return;
  }
  if (trybNotatek) {
    var nowa = (gra.notatki[wybrany] ^ bit(v)) >>> 0;
    if (gra.wpisy[wybrany] < 0 && nowa === gra.notatki[wybrany]) return;
    zapamietaj();
    gra.wpisy[wybrany] = -1;
    gra.notatki[wybrany] = nowa;
  } else {
    if (gra.wpisy[wybrany] === v && !gra.notatki[wybrany]) return;
    zapamietaj();
    gra.wpisy[wybrany] = v;
    gra.notatki[wybrany] = 0;
    wymazNotatkiObok(wybrany, v);
  }
  znaczniki = null;
  odswiezWszystkiePola();
  odswiezKlasy();
  odswiezPad();
  if (planszaPelnaIDobra()) {
    ustawKomunikat("Gotowe.");
    dzwiek("koniec");
  } else {
    ustawKomunikat("");
    dzwiek("klik");
  }
  zapisz();
}

function wyczyscWybrane() {
  if (ekran === "edytor") {
    if (!edytor || edytor.dane[wybrany] < 0) return;
    zapamietaj();
    edytor.dane[wybrany] = -1;
    edytor.rozwiazanie = null;
    edytor.stan = "";
    odswiezPole(wybrany);
    odswiezKlasy();
    odswiezPad();
    odswiezEdytorPrzyciski();
    zapisz();
    return;
  }
  if (!gra || gra.uklada) return;
  if (gra.dane[wybrany] >= 0) {
    ustawKomunikat("Ta cyfra jest wydrukowana.");
    return;
  }
  if (gra.wpisy[wybrany] < 0 && !gra.notatki[wybrany]) return;
  zapamietaj();
  gra.wpisy[wybrany] = -1;
  gra.notatki[wybrany] = 0;
  znaczniki = null;
  odswiezPole(wybrany);
  odswiezKlasy();
  odswiezPad();
  ustawKomunikat("");
  zapisz();
}

function wpiszWEdytorze(v) {
  if (!edytor) return;
  var opis = opisRozmiaru(edytor.rozmiar);
  if (v < 0 || v >= opis.n) return;
  if (edytor.dane[wybrany] === v) return;
  zapamietaj();
  edytor.dane[wybrany] = v;
  edytor.rozwiazanie = null;
  edytor.stan = "";
  odswiezPole(wybrany);
  odswiezKlasy();
  odswiezPad();
  odswiezEdytorPrzyciski();
  ustawKomunikat("");
  zapisz();
}

function dajPodpowiedz() {
  if (ekran !== "gra" || !gra || !gra.rozwiazanie || gra.uklada) return;
  var opis = opisRozmiaru(gra.rozmiar);
  var h = podpowiedz(opis, gra.dane, gra.wpisy, gra.rozwiazanie, wybrany);
  if (!h) {
    ustawKomunikat("Plansza jest już ułożona.");
    return;
  }
  zapamietaj();
  gra.wpisy[h.pole] = h.wartosc;
  gra.notatki[h.pole] = 0;
  wymazNotatkiObok(h.pole, h.wartosc);
  wybrany = h.pole;
  znaczniki = null;
  odswiezWszystkiePola();
  odswiezKlasy();
  odswiezPad();
  ustawKomunikat(h.tekst);
  if (planszaPelnaIDobra()) dzwiek("koniec");
  zapisz();
}

function sprawdzGre() {
  if (!gra || !gra.rozwiazanie || gra.uklada) return;
  var opis = opisRozmiaru(gra.rozmiar);
  var sp = sprawdz(opis, gra.rozwiazanie, gra.dane, gra.wpisy);
  znaczniki = { zle: {}, konflikt: {} };
  var i;
  for (i = 0; i < sp.zle.length; i++) znaczniki.zle[sp.zle[i]] = true;
  for (i = 0; i < sp.konflikty.length; i++) znaczniki.konflikt[sp.konflikty[i]] = true;
  odswiezKlasy();
  if (sp.wszystkoDobrze) ustawKomunikat("Wszystko się zgadza.");
  else if (!sp.zle.length && !sp.konflikty.length) {
    ustawKomunikat(sp.puste ? "Na razie nie widać błędu. Zostały puste pola." : "Na razie nie widać błędu.");
  } else {
    var czesci = [];
    if (sp.zle.length) czesci.push("Złe cyfry są zaznaczone.");
    if (sp.konflikty.length) czesci.push("Powtórki w wierszu, kolumnie albo kwadracie też.");
    ustawKomunikat(czesci.join(" "));
  }
}

function przesun(dr, dc) {
  var opis = aktualnyOpis();
  if (!opis) return;
  var n = opis.n;
  var r = Math.floor(wybrany / n) + dr;
  var c = (wybrany % n) + dc;
  if (r < 0) r = 0;
  if (c < 0) c = 0;
  if (r >= n) r = n - 1;
  if (c >= n) c = n - 1;
  wybrany = r * n + c;
  odswiezKlasy();
  odswiezPad();
}

function wartoscZKlawisza(key) {
  if (!key || key.length !== 1) return -1;
  var opis = aktualnyOpis();
  if (!opis) return -1;
  return opis.znaki.indexOf(key.toUpperCase());
}

function naKlawisz(e) {
  var tag = e.target && e.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (ekran !== "gra" && ekran !== "edytor") return;
  if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
    e.preventDefault();
    if (e.shiftKey) ponowRuch();
    else cofnijRuch();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) {
    e.preventDefault();
    ponowRuch();
    return;
  }
  if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    if (e.key === "ArrowLeft") przesun(0, -1);
    if (e.key === "ArrowRight") przesun(0, 1);
    if (e.key === "ArrowUp") przesun(-1, 0);
    if (e.key === "ArrowDown") przesun(1, 0);
    return;
  }
  if (e.key === "Backspace" || e.key === "Delete") {
    e.preventDefault();
    wyczyscWybrane();
    return;
  }
  if ((e.key === "n" || e.key === "N") && wartoscZKlawisza(e.key) < 0 && ekran === "gra") {
    e.preventDefault();
    przelaczNotatki();
    return;
  }
  var v = wartoscZKlawisza(e.key);
  if (v >= 0) {
    e.preventDefault();
    wpiszCyfre(v);
  }
}

function przelaczNotatki() {
  trybNotatek = !trybNotatek;
  odswiezChipy();
  odswiezPad();
  zapisz();
}

function dzwiek(rodzaj) {
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!dzwiekCtx) dzwiekCtx = new AC();
    if (dzwiekCtx.state === "suspended") dzwiekCtx.resume();
    var t = dzwiekCtx.currentTime;
    var o = dzwiekCtx.createOscillator();
    var g = dzwiekCtx.createGain();
    o.connect(g);
    g.connect(dzwiekCtx.destination);
    o.type = "triangle";
    if (rodzaj === "koniec") {
      o.frequency.setValueAtTime(523, t);
      o.frequency.setValueAtTime(659, t + 0.12);
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.start(t);
      o.stop(t + 0.36);
    } else {
      o.frequency.setValueAtTime(740, t);
      g.gain.setValueAtTime(0.025, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      o.start(t);
      o.stop(t + 0.05);
    }
  } catch (e) {}
}

function anulujLosowanie() {
  numerLosowania++;
}

function rozpocznijZDanymi(kluczRozmiaru, kluczTrudnosci, dane, rozwiazanie, poziom) {
  anulujLosowanie();
  var opis = opisRozmiaru(kluczRozmiaru);
  rozmiar = String(kluczRozmiaru);
  trudnosc = kluczTrudnosci === "wlasna" ? trudnosc : (kluczTrudnosci || trudnosc);
  gra = {
    rozmiar: String(kluczRozmiaru),
    trudnosc: kluczTrudnosci || "wlasna",
    dane: dane.slice(),
    rozwiazanie: rozwiazanie.slice(),
    wpisy: pustePola(opis),
    notatki: pusteNotatki(opis),
    poziom: poziom || 0,
    uklada: false
  };
  wybrany = 0;
  var i;
  for (i = 0; i < dane.length; i++) {
    if (dane[i] < 0) {
      wybrany = i;
      break;
    }
  }
  trybNotatek = false;
  cofanie = [];
  ponawianie = [];
  znaczniki = null;
  zbudowanyDla = "";
  ekran = "gra";
  pokazEkran();
  ustawKomunikat("");
  zapisz();
}

function losujNowa() {
  if (!(gra && gra.uklada)) graPrzedLosowaniem = gra && gra.rozwiazanie ? gra : null;
  var moj = ++numerLosowania;
  var opis = opisRozmiaru(rozmiar);
  var L = noweLosowanie(opis, trudnosc, Math.random);
  gra = {
    rozmiar: rozmiar,
    trudnosc: trudnosc,
    dane: pustePola(opis),
    rozwiazanie: null,
    wpisy: pustePola(opis),
    notatki: pusteNotatki(opis),
    poziom: 0,
    uklada: true
  };
  wybrany = 0;
  trybNotatek = false;
  cofanie = [];
  ponawianie = [];
  znaczniki = null;
  zbudowanyDla = "";
  ekran = "gra";
  pokazEkran();
  ustawKomunikat("Układam planszę…");
  function tick() {
    if (moj !== numerLosowania) return;
    var start = Date.now();
    while (!L.koniec && Date.now() - start < 16) krokLosowania(L);
    if (!L.koniec) {
      ustawKomunikat("Układam planszę…");
      setTimeout(tick, 0);
      return;
    }
    if (!L.wynik) {
      if (graPrzedLosowaniem) {
        gra = graPrzedLosowaniem;
        graPrzedLosowaniem = null;
        zbudowanyDla = "";
        ekran = "gra";
        pokazEkran();
      } else if (gra) gra.uklada = false;
      ustawKomunikat("Nie udało się ułożyć planszy. Spróbuj jeszcze raz.");
      return;
    }
    graPrzedLosowaniem = null;
    rozpocznijZDanymi(String(L.wynik.rozmiar), L.wynik.trudnosc, L.wynik.dane, L.wynik.rozwiazanie, L.wynik.poziom);
  }
  setTimeout(tick, 0);
}

function otworzEdytor(dane) {
  anulujLosowanie();
  var opis = opisRozmiaru(rozmiar);
  edytor = {
    rozmiar: rozmiar,
    dane: dane ? dane.slice() : pustePola(opis),
    rozwiazanie: null,
    stan: ""
  };
  if (edytor.dane.length !== opis.n * opis.n) edytor.dane = pustePola(opis);
  wybrany = 0;
  cofanie = [];
  ponawianie = [];
  znaczniki = null;
  zbudowanyDla = "";
  ekran = "edytor";
  pokazEkran();
  ustawKomunikat("");
  uzupelnijKod();
  zapisz();
}

function zmienRozmiarEdytora(klucz) {
  if (!edytor || edytor.rozmiar === klucz) return;
  var i;
  var cosJest = false;
  for (i = 0; i < edytor.dane.length; i++) if (edytor.dane[i] >= 0) cosJest = true;
  if (cosJest && !window.confirm("Wyczyścić planszę i zmienić rozmiar?")) return;
  rozmiar = klucz;
  edytor = { rozmiar: klucz, dane: pustePola(opisRozmiaru(klucz)), rozwiazanie: null, stan: "" };
  wybrany = 0;
  cofanie = [];
  ponawianie = [];
  zbudowanyDla = "";
  pokazEkran();
  uzupelnijKod();
  zapisz();
}

function odswiezEdytorPrzyciski() {
  var graj = document.getElementById("edytorGraj");
  graj.disabled = !(edytor && edytor.stan === "jedno" && edytor.rozwiazanie);
}

function sprawdzEdytor() {
  if (!edytor) return;
  ustawKomunikat("Sprawdzam…");
  var moj = edytor;
  setTimeout(function () {
    if (edytor !== moj) return;
    var ocena = ocenUklad(opisRozmiaru(edytor.rozmiar), edytor.dane);
    edytor.stan = ocena.stan;
    edytor.rozwiazanie = ocena.rozwiazanie;
    if (ocena.stan === "jedno") ustawKomunikat("Jest dokładnie jedno rozwiązanie. Możesz grać.");
    else if (ocena.stan === "brak") ustawKomunikat("Ta plansza nie ma rozwiązania.");
    else if (ocena.stan === "wiele") ustawKomunikat("Ta plansza ma więcej niż jedno rozwiązanie.");
    else ustawKomunikat("Nie zdążyłem sprawdzić do końca. Zmień kilka cyfr i spróbuj znów.");
    odswiezEdytorPrzyciski();
    uzupelnijKod();
    zapisz();
  }, 30);
}

function grajEdytor() {
  if (!edytor || edytor.stan !== "jedno" || !edytor.rozwiazanie) {
    ustawKomunikat("Najpierw sprawdź, czy jest jedno rozwiązanie.");
    return;
  }
  rozpocznijZDanymi(edytor.rozmiar, "wlasna", edytor.dane, edytor.rozwiazanie, 0);
}

function zapiszEdytorUSiebie() {
  if (!edytor || edytor.stan !== "jedno" || !edytor.rozwiazanie) {
    ustawKomunikat("Najpierw sprawdź, czy jest jedno rozwiązanie.");
    return;
  }
  wlasne.push({
    id: String(Date.now()),
    nazwa: "Własna " + (wlasne.length + 1),
    rozmiar: edytor.rozmiar,
    dane: edytor.dane.slice(),
    rozwiazanie: edytor.rozwiazanie.slice()
  });
  ustawKomunikat("Zapisane na tym urządzeniu.");
  zapisz();
  rysujListy();
}

function wyczyscEdytor() {
  if (!edytor) return;
  var i;
  var cosJest = false;
  for (i = 0; i < edytor.dane.length; i++) if (edytor.dane[i] >= 0) cosJest = true;
  if (cosJest && !window.confirm("Wyczyścić całą planszę?")) return;
  zapamietaj();
  edytor.dane = pustePola(opisRozmiaru(edytor.rozmiar));
  edytor.rozwiazanie = null;
  edytor.stan = "";
  odswiezWszystkiePola();
  odswiezKlasy();
  odswiezPad();
  odswiezEdytorPrzyciski();
  uzupelnijKod();
  ustawKomunikat("");
  zapisz();
}

function uzupelnijKod() {
  if (!edytor) return;
  var kod = koduj(edytor.rozmiar, "wlasna", edytor.dane);
  var tekst = kod;
  if (location.protocol === "http:" || location.protocol === "https:") {
    tekst += "\n" + location.origin + location.pathname + "?p=" + encodeURIComponent(kod);
  }
  document.getElementById("poleKodu").value = tekst;
}

function kopiujKod() {
  var pole = document.getElementById("poleKodu");
  var tekst = pole.value;
  if (!tekst) {
    uzupelnijKod();
    tekst = pole.value;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(tekst).then(function () {
      ustawKomunikat("Skopiowane.");
    }, function () {
      pole.focus();
      pole.select();
      ustawKomunikat("Zaznaczyłem kod. Skopiuj go ręcznie.");
    });
    return;
  }
  pole.focus();
  pole.select();
  ustawKomunikat("Zaznaczyłem kod. Skopiuj go ręcznie.");
}

function wczytajKodZPola() {
  var tekst = document.getElementById("poleKodu").value;
  var z = dekoduj(tekst);
  if (!z) {
    ustawKomunikat("Ten kod jest zły.");
    return;
  }
  ustawKomunikat("Sprawdzam kod…");
  setTimeout(function () {
    var opis = opisRozmiaru(z.rozmiar);
    var ocena = ocenUklad(opis, z.dane);
    rozmiar = String(z.rozmiar);
    edytor = {
      rozmiar: String(z.rozmiar),
      dane: z.dane.slice(),
      rozwiazanie: ocena.rozwiazanie,
      stan: ocena.stan
    };
    wybrany = 0;
    cofanie = [];
    ponawianie = [];
    zbudowanyDla = "";
    ekran = "edytor";
    pokazEkran();
    if (ocena.stan === "jedno") ustawKomunikat("Jest dokładnie jedno rozwiązanie. Możesz grać.");
    else if (ocena.stan === "brak") ustawKomunikat("Ta plansza nie ma rozwiązania.");
    else if (ocena.stan === "wiele") ustawKomunikat("Ta plansza ma więcej niż jedno rozwiązanie.");
    else ustawKomunikat("Nie zdążyłem sprawdzić do końca. Zmień kilka cyfr i spróbuj znów.");
    uzupelnijKod();
    zapisz();
  }, 30);
}

function rysujListe(kontener, tytul, lista, graj, usun) {
  kontener.innerHTML = "";
  if (!lista.length) return;
  var h = document.createElement("p");
  h.className = "naglowekListy";
  h.textContent = tytul;
  kontener.appendChild(h);
  var box = document.createElement("div");
  box.className = "lista";
  var i;
  for (i = 0; i < lista.length; i++) {
    (function (pozycja) {
      var wiersz = document.createElement("div");
      wiersz.className = "wierszListy";
      var nazwa = document.createElement("span");
      var opis = opisRozmiaru(pozycja.rozmiar);
      nazwa.textContent = pozycja.nazwa + (opis ? " · " + opis.nazwa : "");
      var bGraj = document.createElement("button");
      bGraj.type = "button";
      bGraj.textContent = "Graj";
      bGraj.addEventListener("click", function () { graj(pozycja); });
      wiersz.appendChild(nazwa);
      wiersz.appendChild(bGraj);
      if (usun) {
        var bUsun = document.createElement("button");
        bUsun.type = "button";
        bUsun.textContent = "Usuń";
        bUsun.addEventListener("click", function () { usun(pozycja); });
        wiersz.appendChild(bUsun);
      }
      box.appendChild(wiersz);
    })(lista[i]);
  }
  kontener.appendChild(box);
}

function rysujListy() {
  rysujListe(document.getElementById("listaWlasnych"), "Moje plansze", wlasne, function (p) {
    rozpocznijZDanymi(p.rozmiar, "wlasna", p.dane, p.rozwiazanie, 0);
  }, function (p) {
    if (!window.confirm("Usunąć „" + p.nazwa + "”?")) return;
    var i;
    var nowe = [];
    for (i = 0; i < wlasne.length; i++) if (wlasne[i].id !== p.id) nowe.push(wlasne[i]);
    wlasne = nowe;
    zapisz();
    rysujListy();
  });
  rysujListe(document.getElementById("listaGotowych"), "Gotowe plansze", gotowe, function (p) {
    var z = dekoduj(p.kod);
    if (!z) {
      ustawKomunikat("Ten zapis planszy jest zły.");
      return;
    }
    var opis = opisRozmiaru(z.rozmiar);
    var rozw = [];
    var i;
    for (i = 0; i < p.rozwiazanie.length; i++) rozw.push(opis.znaki.indexOf(p.rozwiazanie.charAt(i)));
    rozpocznijZDanymi(String(z.rozmiar), p.trudnosc || z.trudnosc, z.dane, rozw, 0);
  }, null);
}

function pobierzPaczke() {
  ustawKomunikat("Pobieram gotowe plansze…");
  fetch("paczki/zestaw-1.json").then(function (odp) {
    if (!odp.ok) throw new Error("brak");
    return odp.json();
  }).then(function (paczka) {
    if (!paczka || !paczka.plansze || !paczka.plansze.length) throw new Error("pusto");
    gotowe = [];
    var i;
    for (i = 0; i < paczka.plansze.length; i++) {
      var p = paczka.plansze[i];
      if (!p || !p.kod || !p.rozwiazanie) continue;
      gotowe.push({
        nazwa: p.tytul || ("Plansza " + (i + 1)),
        rozmiar: p.rozmiar,
        trudnosc: p.trudnosc,
        kod: p.kod,
        rozwiazanie: p.rozwiazanie
      });
    }
    ustawKomunikat(gotowe.length ? "Gotowe plansze są na tym urządzeniu." : "Zestaw jest pusty.");
    rysujListy();
    zapisz();
  }).catch(function () {
    ustawKomunikat("Bez sieci nie pobiorę gotowych plansz. Losowanie działa offline.");
  });
}

function graDoZapisu(zrodlo) {
  if (!zrodlo || !zrodlo.rozwiazanie) return null;
  return {
    rozmiar: zrodlo.rozmiar,
    trudnosc: zrodlo.trudnosc,
    dane: zrodlo.dane,
    rozwiazanie: zrodlo.rozwiazanie,
    wpisy: zrodlo.wpisy,
    notatki: zrodlo.notatki,
    poziom: zrodlo.poziom
  };
}

function zbierzStan() {
  var zrodlo = gra && gra.rozwiazanie && !gra.uklada ? gra : null;
  if (!zrodlo && gra && gra.uklada) zrodlo = graPrzedLosowaniem;
  var ekranZapisu = ekran;
  if (gra && gra.uklada) ekranZapisu = zrodlo ? "gra" : "menu";
  return {
    wersja: 1,
    rozmiar: rozmiar,
    trudnosc: trudnosc,
    czyscNotatki: czyscNotatki,
    trybNotatek: trybNotatek,
    ekran: ekranZapisu,
    wybrany: wybrany,
    gra: graDoZapisu(zrodlo),
    edytor: edytor,
    cofanie: cofanie,
    ponawianie: ponawianie,
    wlasne: wlasne,
    gotowe: gotowe
  };
}

function zapiszTeraz() {
  clearTimeout(timerZapisu);
  var dane = zbierzStan();
  try {
    localStorage.setItem(KLUCZ, JSON.stringify(dane));
  } catch (e) {
    dane.cofanie = [];
    dane.ponawianie = [];
    try {
      localStorage.setItem(KLUCZ, JSON.stringify(dane));
    } catch (e2) {}
  }
}

function zapisz() {
  clearTimeout(timerZapisu);
  timerZapisu = setTimeout(zapiszTeraz, 60);
}

function graWygladaDobrze(g) {
  if (!g || !g.dane || !g.rozwiazanie || !g.wpisy || !g.notatki) return false;
  var opis = opisRozmiaru(g.rozmiar);
  if (!opis) return false;
  var n = opis.n * opis.n;
  return g.dane.length === n && g.rozwiazanie.length === n && g.wpisy.length === n && g.notatki.length === n;
}

function wczytajZapis() {
  try {
    var surowe = localStorage.getItem(KLUCZ);
    if (!surowe) return;
    var z = JSON.parse(surowe);
    if (!z || z.wersja !== 1) return;
    if (ROZMIARY[String(z.rozmiar)]) rozmiar = String(z.rozmiar);
    if (TRUDNOSCI[z.trudnosc]) trudnosc = z.trudnosc;
    if (typeof z.czyscNotatki === "boolean") czyscNotatki = z.czyscNotatki;
    if (typeof z.trybNotatek === "boolean") trybNotatek = z.trybNotatek;
    if (typeof z.wybrany === "number") wybrany = z.wybrany;
    if (graWygladaDobrze(z.gra)) gra = z.gra;
    if (z.edytor && z.edytor.dane && opisRozmiaru(z.edytor.rozmiar)) edytor = z.edytor;
    if (z.cofanie && z.cofanie.length) cofanie = z.cofanie;
    if (z.ponawianie && z.ponawianie.length) ponawianie = z.ponawianie;
    if (z.wlasne && z.wlasne.length) wlasne = z.wlasne;
    if (z.gotowe && z.gotowe.length) gotowe = z.gotowe;
    if (z.ekran === "gra" && gra) ekran = "gra";
    else if (z.ekran === "edytor" && edytor) ekran = "edytor";
    else ekran = "menu";
  } catch (e) {}
}

function wczytajZLinku() {
  var param = "";
  try {
    param = new URLSearchParams(location.search).get("p") || "";
  } catch (e) {
    return;
  }
  if (!param) return;
  var z = dekoduj(param);
  if (!z) {
    ustawKomunikat("Ten link z planszą jest zły.");
    return;
  }
  ustawKomunikat("Sprawdzam planszę z linku…");
  setTimeout(function () {
    var opis = opisRozmiaru(z.rozmiar);
    var ocena = ocenUklad(opis, z.dane);
    if (ocena.stan !== "jedno") {
      rozmiar = String(z.rozmiar);
      edytor = { rozmiar: rozmiar, dane: z.dane.slice(), rozwiazanie: ocena.rozwiazanie, stan: ocena.stan };
      ekran = "edytor";
      zbudowanyDla = "";
      pokazEkran();
      ustawKomunikat(ocena.stan === "wiele" ? "Ta plansza ma więcej niż jedno rozwiązanie." : "Ta plansza nie ma jednego rozwiązania.");
      uzupelnijKod();
      return;
    }
    rozpocznijZDanymi(String(z.rozmiar), z.trudnosc, z.dane, ocena.rozwiazanie, 0);
  }, 30);
}

function zarejestrujPraceOffline() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol === "file:") return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  });
}

document.getElementById("doMenu").addEventListener("click", function () {
  if (gra && gra.uklada) {
    anulujLosowanie();
    if (graPrzedLosowaniem) gra = graPrzedLosowaniem;
    graPrzedLosowaniem = null;
  }
  ekran = "menu";
  pokazEkran();
  ustawKomunikat("");
  zapisz();
});
document.getElementById("nowaPlansza").addEventListener("click", losujNowa);
document.getElementById("nowaZGry").addEventListener("click", losujNowa);
document.getElementById("wrocDoPlanszy").addEventListener("click", function () {
  if (!gra || !gra.rozwiazanie) return;
  ekran = "gra";
  pokazEkran();
  zapisz();
});
document.getElementById("doEdytora").addEventListener("click", function () {
  otworzEdytor(null);
});
document.getElementById("pobierzPaczke").addEventListener("click", pobierzPaczke);
document.getElementById("trybNotatek").addEventListener("click", przelaczNotatki);
document.getElementById("cofnij").addEventListener("click", cofnijRuch);
document.getElementById("ponow").addEventListener("click", ponowRuch);
document.getElementById("podpowiedz").addEventListener("click", dajPodpowiedz);
document.getElementById("sprawdz").addEventListener("click", sprawdzGre);
document.getElementById("czyscNotatki").addEventListener("change", function () {
  czyscNotatki = this.checked;
  zapisz();
});
document.getElementById("edytorSprawdz").addEventListener("click", sprawdzEdytor);
document.getElementById("edytorGraj").addEventListener("click", grajEdytor);
document.getElementById("edytorZapisz").addEventListener("click", zapiszEdytorUSiebie);
document.getElementById("edytorCzysc").addEventListener("click", wyczyscEdytor);
document.getElementById("kopiujKod").addEventListener("click", kopiujKod);
document.getElementById("wczytajKod").addEventListener("click", wczytajKodZPola);
document.addEventListener("keydown", naKlawisz);
window.addEventListener("resize", dopasujCzcionke);
window.addEventListener("pagehide", zapiszTeraz);

zbudujMenu();
wczytajZapis();
pokazEkran();
wczytajZLinku();
zarejestrujPraceOffline();
