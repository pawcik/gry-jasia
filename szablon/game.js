// ===== Rzeczy, które możesz zmieniać =====
var SZYBKOSC = 4;               // ile kroków bohater robi na raz
var KOLOR_TLA = "#2e7d32";      // kolor ziemi
var KOLOR_BOHATERA = "#ffca28"; // kolor bohatera

// ===== Plansza =====
var plansza = document.getElementById("plansza");
var pedzel = plansza.getContext("2d");

// Plansza jest zawsze tak duża jak okno
function dopasujPlansze() {
  plansza.width = window.innerWidth;
  plansza.height = window.innerHeight;
}
window.addEventListener("resize", dopasujPlansze);
dopasujPlansze();

// ===== Bohater =====
var bohater = {
  x: plansza.width / 2,
  y: plansza.height / 2,
  rozmiar: 40
};

var punkty = 0;
var pauza = false;

// ===== Klawisze =====
// Tu pamiętamy, które klawisze są teraz wciśnięte
var klawisze = {};

window.addEventListener("keydown", function (zdarzenie) {
  klawisze[zdarzenie.code] = true;
  if (zdarzenie.repeat) return; // trzymany klawisz nie przełącza pauzy w kółko
  if (zdarzenie.code === "KeyP") {
    przelaczPauze();
  }
});

window.addEventListener("keyup", function (zdarzenie) {
  klawisze[zdarzenie.code] = false;
});

function przelaczPauze() {
  pauza = !pauza;
  document.getElementById("pauza").style.display = pauza ? "block" : "none";
}

// ===== Jeden krok gry (60 razy na sekundę) =====
function krokGry() {
  if (klawisze["ArrowLeft"] || klawisze["KeyA"]) bohater.x -= SZYBKOSC;
  if (klawisze["ArrowRight"] || klawisze["KeyD"]) bohater.x += SZYBKOSC;
  if (klawisze["ArrowUp"] || klawisze["KeyW"]) bohater.y -= SZYBKOSC;
  if (klawisze["ArrowDown"] || klawisze["KeyS"]) bohater.y += SZYBKOSC;

  // Bohater nie może wyjść poza planszę
  var pol = bohater.rozmiar / 2;
  bohater.x = Math.max(pol, Math.min(plansza.width - pol, bohater.x));
  bohater.y = Math.max(pol, Math.min(plansza.height - pol, bohater.y));
}

// ===== Rysowanie =====
function rysuj() {
  // Tło
  pedzel.fillStyle = KOLOR_TLA;
  pedzel.fillRect(0, 0, plansza.width, plansza.height);

  // Bohater
  var pol = bohater.rozmiar / 2;
  pedzel.fillStyle = KOLOR_BOHATERA;
  pedzel.fillRect(bohater.x - pol, bohater.y - pol, bohater.rozmiar, bohater.rozmiar);

  document.getElementById("punkty").textContent = "⭐ " + punkty;
}

// ===== Pętla gry: działa w kółko =====
var DLUGOSC_KROKU = 1000 / 60; // jeden krok trwa tyle milisekund
var ostatniCzas = performance.now();
var zalegaCzasu = 0;

function petlaGry(teraz) {
  zalegaCzasu += teraz - ostatniCzas;
  ostatniCzas = teraz;

  // Najwyżej 5 kroków na raz, żeby gra nie skakała po przerwie
  var kroki = 0;
  while (zalegaCzasu >= DLUGOSC_KROKU && kroki < 5) {
    if (!pauza) krokGry();
    zalegaCzasu -= DLUGOSC_KROKU;
    kroki++;
  }
  if (kroki === 5) zalegaCzasu = 0;

  rysuj();
  requestAnimationFrame(petlaGry);
}

requestAnimationFrame(petlaGry);
