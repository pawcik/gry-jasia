// ===== Sterowanie =====
// Telefon: lewy drążek = chodzenie, prawy drążek = celowanie mieczem (puść, żeby ciąć).
// Szybkie stuknięcie prawej strony = cięcie przed siebie.
// Komputer: W A S D albo strzałki, myszka celuje, spacja tnie przed siebie.

var PROMIEN_DRAZKA = 55;  // jak daleko można odsunąć gałkę (w pikselach)
var MARTWA_STREFA = 0.3;  // mniejszy ruch prawego drążka to tylko stuknięcie

var dotykowy = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
if (dotykowy) document.body.classList.add("dotykowy");

function zrobDrazek(id) {
  var podstawa = document.getElementById(id);
  return { podstawa: podstawa, galka: podstawa.querySelector(".galka"), dotyk: null, srodekX: 0, srodekY: 0, x: 0, y: 0, celowal: false };
}
var lewyDrazek = zrobDrazek("lewyDrazek");
var prawyDrazek = zrobDrazek("prawyDrazek");

var klawisze = {};
var mysz = { x: 0, y: 0, wcisnieta: false };

// W którą stronę bohater ma ciąć: null = nie tnie, "przod" = tam, gdzie patrzy,
// "mysz" = w stronę myszki, albo liczba = kąt
var chceCiac = null;

// ----- Drążki -----
function silaDrazka(d) {
  return Math.sqrt(d.x * d.x + d.y * d.y);
}

// Kąt drążka w świecie gry (gałka w górę = na północ, od kamery)
function katDrazka(d) {
  return Math.atan2(d.x, d.y);
}

function pokazGalke(d) {
  d.galka.style.transform = "translate(" + d.x * PROMIEN_DRAZKA + "px, " + d.y * PROMIEN_DRAZKA + "px)";
}

// Palec dotknął ekranu: drążek przeskakuje pod palec
function zlapDrazek(d, dotyk) {
  d.dotyk = dotyk.identifier;
  d.srodekX = dotyk.clientX;
  d.srodekY = dotyk.clientY;
  d.x = 0;
  d.y = 0;
  d.celowal = false;
  d.podstawa.style.left = dotyk.clientX + "px";
  d.podstawa.style.top = dotyk.clientY + "px";
  pokazGalke(d);
}

function przesunDrazek(d, dotyk) {
  var dx = dotyk.clientX - d.srodekX;
  var dy = dotyk.clientY - d.srodekY;
  var dlugosc = Math.sqrt(dx * dx + dy * dy);
  if (dlugosc > PROMIEN_DRAZKA) {
    dx = dx / dlugosc * PROMIEN_DRAZKA;
    dy = dy / dlugosc * PROMIEN_DRAZKA;
  }
  d.x = dx / PROMIEN_DRAZKA;
  d.y = dy / PROMIEN_DRAZKA;
  if (silaDrazka(d) > MARTWA_STREFA) d.celowal = true;
  pokazGalke(d);
}

// Palec puszczony: drążek wraca na swoje miejsce
function puscDrazek(d) {
  d.dotyk = null;
  d.x = 0;
  d.y = 0;
  d.podstawa.style.left = "";
  d.podstawa.style.top = "";
  pokazGalke(d);
}

function znajdzDotyk(lista, id) {
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].identifier === id) return lista[i];
  }
  return null;
}

// Dotyk albo klik w okienko z imieniem lub guzik: to nie jest sterowanie
function wOkienku(zdarzenie) {
  return zdarzenie.target.closest && zdarzenie.target.closest("#logowanie, #zmienImie, #calyEkran");
}

document.addEventListener("touchstart", function (zdarzenie) {
  if (wOkienku(zdarzenie)) return;
  zdarzenie.preventDefault();
  wlaczDzwieki();
  for (var i = 0; i < zdarzenie.changedTouches.length; i++) {
    var dotyk = zdarzenie.changedTouches[i];
    if (dotyk.clientX < window.innerWidth / 2) {
      if (lewyDrazek.dotyk === null) zlapDrazek(lewyDrazek, dotyk);
    } else if (prawyDrazek.dotyk === null) {
      zlapDrazek(prawyDrazek, dotyk);
    }
  }
}, { passive: false });

document.addEventListener("touchmove", function (zdarzenie) {
  if (wOkienku(zdarzenie)) return;
  zdarzenie.preventDefault();
  var lewy = znajdzDotyk(zdarzenie.changedTouches, lewyDrazek.dotyk);
  if (lewy) przesunDrazek(lewyDrazek, lewy);
  var prawy = znajdzDotyk(zdarzenie.changedTouches, prawyDrazek.dotyk);
  if (prawy) przesunDrazek(prawyDrazek, prawy);
}, { passive: false });

function koniecDotyku(zdarzenie) {
  if (wOkienku(zdarzenie)) return;
  zdarzenie.preventDefault();
  if (znajdzDotyk(zdarzenie.changedTouches, lewyDrazek.dotyk)) puscDrazek(lewyDrazek);
  if (znajdzDotyk(zdarzenie.changedTouches, prawyDrazek.dotyk)) {
    if (zdarzenie.type === "touchend") {
      if (!prawyDrazek.celowal) chceCiac = "przod";                     // szybkie stuknięcie
      else if (silaDrazka(prawyDrazek) > MARTWA_STREFA) chceCiac = katDrazka(prawyDrazek);
      // celował, ale wrócił gałką na środek = nie tnie
    }
    puscDrazek(prawyDrazek);
  }
  // Tylko pierwsze dotknięcie włącza cały ekran; potem robi to guzik ⛶
  if (!probowalemCalyEkran) {
    probowalemCalyEkran = true;
    wejdzNaCalyEkran();
  }
}
document.addEventListener("touchend", koniecDotyku, { passive: false });
document.addEventListener("touchcancel", koniecDotyku, { passive: false });

// Na telefonie gra przy pierwszym dotknięciu próbuje zająć cały ekran i zostać bokiem.
// Guzik ⛶ w rogu włącza i wyłącza cały ekran.
var probowalemCalyEkran = false;

function wejdzNaCalyEkran() {
  var strona = document.documentElement;
  if (document.fullscreenElement || !strona.requestFullscreen) return;
  strona.requestFullscreen().then(function () {
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(function () {});
  }).catch(function () {});
}

function przelaczCalyEkran() {
  if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
  else wejdzNaCalyEkran();
}

var guzikEkranu = document.getElementById("calyEkran");
if (document.documentElement.requestFullscreen) {
  guzikEkranu.style.display = "block";
  guzikEkranu.addEventListener("click", przelaczCalyEkran);
}
document.addEventListener("fullscreenchange", function () {
  guzikEkranu.textContent = document.fullscreenElement ? "✖ ⛶" : "⛶";
});

// ----- Klawiatura -----
window.addEventListener("keydown", function (zdarzenie) {
  if (zdarzenie.target.tagName === "INPUT") return;  // ktoś wpisuje imię
  klawisze[zdarzenie.code] = true;
  if (zdarzenie.code === "Space" || zdarzenie.code.indexOf("Arrow") === 0) zdarzenie.preventDefault();
  if (zdarzenie.repeat) return; // trzymany klawisz działa tylko raz
  wlaczDzwieki();
  if (zdarzenie.code === "KeyP") przelaczPauze();
  if (zdarzenie.code === "Space") chceCiac = "przod";
  if (zdarzenie.code === "KeyF") przelaczCalyEkran();
});

window.addEventListener("keyup", function (zdarzenie) {
  klawisze[zdarzenie.code] = false;
});

// ----- Myszka -----
window.addEventListener("mousemove", function (zdarzenie) {
  mysz.x = zdarzenie.clientX;
  mysz.y = zdarzenie.clientY;
});

window.addEventListener("mousedown", function (zdarzenie) {
  if (zdarzenie.button !== 0 || wOkienku(zdarzenie)) return;
  wlaczDzwieki();
  mysz.x = zdarzenie.clientX;
  mysz.y = zdarzenie.clientY;
  mysz.wcisnieta = true;
});

window.addEventListener("mouseup", function (zdarzenie) {
  if (zdarzenie.button !== 0 || !mysz.wcisnieta) return;
  mysz.wcisnieta = false;
  chceCiac = "mysz";
});

// ----- Co gracz teraz robi -----

// W którą stronę iść: { x, z }, długość od 0 do 1
function kierunekRuchu() {
  if (lewyDrazek.dotyk !== null) return { x: lewyDrazek.x, z: lewyDrazek.y };
  var x = 0;
  var z = 0;
  if (klawisze["ArrowLeft"] || klawisze["KeyA"]) x -= 1;
  if (klawisze["ArrowRight"] || klawisze["KeyD"]) x += 1;
  if (klawisze["ArrowUp"] || klawisze["KeyW"]) z -= 1;
  if (klawisze["ArrowDown"] || klawisze["KeyS"]) z += 1;
  var dlugosc = Math.sqrt(x * x + z * z);
  if (dlugosc > 0) {
    x = x / dlugosc;
    z = z / dlugosc;
  }
  return { x: x, z: z };
}

// Gdzie gracz celuje: kąt, "mysz" albo null (nie celuje)
function celowanie() {
  if (prawyDrazek.dotyk !== null && silaDrazka(prawyDrazek) > MARTWA_STREFA) return katDrazka(prawyDrazek);
  if (mysz.wcisnieta) return "mysz";
  return null;
}
