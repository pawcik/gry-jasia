// ===== Dźwięki: robimy je sami, bez plików =====
// Głośność strzałów. 1 to zwykła głośność, mniejsza liczba ścisza, 0 wyłącza.
var GLOSNOSC_ARMATA = 1;
var GLOSNOSC_PLUSK = 1;
var GLOSNOSC_TRAFIENIE = 1;
var GLOSNOSC_ZATOPIENIE = 1;

var dzwieki = null;

// Przeglądarka pozwala grać dźwięki dopiero po pierwszym dotknięciu albo kliknięciu
function wlaczDzwieki() {
  if (!dzwieki) {
    var Glosnik = window.AudioContext || window.webkitAudioContext;
    if (!Glosnik) return;
    dzwieki = new Glosnik();
  }
  // Gdy głośnik nie chce grać, obietnica się nie udaje. Kliknięcie i tak zostaje.
  if (dzwieki.state === "suspended") {
    var wznow = dzwieki.resume();
    if (wznow && wznow.catch) wznow.catch(function () {});
  }
}
document.addEventListener("pointerdown", wlaczDzwieki);
document.addEventListener("keydown", wlaczDzwieki);

function szum(dlugosc) {
  var bufor = dzwieki.createBuffer(1, Math.floor(dzwieki.sampleRate * dlugosc), dzwieki.sampleRate);
  var dane = bufor.getChannelData(0);
  for (var i = 0; i < dane.length; i++) dane[i] = Math.random() * 2 - 1;
  return bufor;
}

// Szum przepuszczony przez filtr: plusk wody albo miękki "puf"
function zagrajSzum(dlugosc, rodzajFiltra, czestotliwosc, glosnosc, opoznienie, atak, czestotliwoscKoniec, q) {
  if (!glosnosc || glosnosc <= 0) return;
  var t = dzwieki.currentTime + (opoznienie || 0);
  var a = atak || 0.008;
  if (a > dlugosc * 0.4) a = dlugosc * 0.4;
  var zrodlo = dzwieki.createBufferSource();
  zrodlo.buffer = szum(dlugosc);
  var filtr = dzwieki.createBiquadFilter();
  filtr.type = rodzajFiltra;
  filtr.frequency.setValueAtTime(czestotliwosc, t);
  if (czestotliwoscKoniec) filtr.frequency.exponentialRampToValueAtTime(czestotliwoscKoniec, t + dlugosc);
  if (q) filtr.Q.value = q;
  var wzmocnienie = dzwieki.createGain();
  wzmocnienie.gain.setValueAtTime(0.0001, t);
  wzmocnienie.gain.exponentialRampToValueAtTime(glosnosc, t + a);
  wzmocnienie.gain.exponentialRampToValueAtTime(0.0001, t + dlugosc);
  zrodlo.connect(filtr);
  filtr.connect(wzmocnienie);
  wzmocnienie.connect(dzwieki.destination);
  zrodlo.start(t);
}

// Jeden ton, który może zjeżdżać w dół albo w górę
function zagrajTon(rodzaj, od, doo, dlugosc, glosnosc, opoznienie) {
  var t = dzwieki.currentTime + (opoznienie || 0);
  var ton = dzwieki.createOscillator();
  ton.type = rodzaj;
  ton.frequency.setValueAtTime(od, t);
  ton.frequency.exponentialRampToValueAtTime(doo, t + dlugosc);
  var wzmocnienie = dzwieki.createGain();
  wzmocnienie.gain.setValueAtTime(glosnosc, t);
  wzmocnienie.gain.exponentialRampToValueAtTime(0.0001, t + dlugosc);
  ton.connect(wzmocnienie);
  wzmocnienie.connect(dzwieki.destination);
  ton.start(t);
  ton.stop(t + dlugosc + 0.05);
}

// Ton z miękkim początkiem. trzymanie zostawia dźwięk na chwilę, zanim ścichnie.
function zagrajTonMiekki(rodzaj, od, doo, dlugosc, glosnosc, opoznienie, atak, trzymanie) {
  if (!glosnosc || glosnosc <= 0) return;
  var t = dzwieki.currentTime + (opoznienie || 0);
  var a = atak || 0.01;
  var h = trzymanie || 0;
  if (a > dlugosc * 0.4) a = dlugosc * 0.4;
  if (a + h > dlugosc * 0.8) h = Math.max(0, dlugosc * 0.8 - a);
  var ton = dzwieki.createOscillator();
  ton.type = rodzaj;
  ton.frequency.setValueAtTime(od, t);
  if (od !== doo) ton.frequency.exponentialRampToValueAtTime(doo, t + dlugosc);
  var wzmocnienie = dzwieki.createGain();
  wzmocnienie.gain.setValueAtTime(0.0001, t);
  wzmocnienie.gain.exponentialRampToValueAtTime(glosnosc, t + a);
  if (h > 0.001) wzmocnienie.gain.setValueAtTime(glosnosc, t + a + h);
  wzmocnienie.gain.exponentialRampToValueAtTime(0.0001, t + dlugosc);
  ton.connect(wzmocnienie);
  wzmocnienie.connect(dzwieki.destination);
  ton.start(t);
  ton.stop(t + dlugosc + 0.05);
}

// Krótki wesoły dzwonek, który chwilę dźwięczy, a nie znika od razu
function zagrajDzwonek(czestotliwosc, dlugosc, glosnosc, opoznienie) {
  zagrajTonMiekki("sine", czestotliwosc, czestotliwosc, dlugosc, glosnosc, opoznienie, 0.008, 0.07);
}

// Ton spada, a na końcu lekko podskakuje — jak piłka, która odbija się od wody
function zagrajBoing(od, doo, podskok, dlugosc, glosnosc, opoznienie) {
  if (!glosnosc || glosnosc <= 0) return;
  var t = dzwieki.currentTime + (opoznienie || 0);
  var spadek = dlugosc * 0.6;
  var ton = dzwieki.createOscillator();
  ton.type = "sine";
  ton.frequency.setValueAtTime(od, t);
  ton.frequency.exponentialRampToValueAtTime(doo, t + spadek);
  ton.frequency.exponentialRampToValueAtTime(podskok, t + dlugosc);
  var wzmocnienie = dzwieki.createGain();
  wzmocnienie.gain.setValueAtTime(0.0001, t);
  wzmocnienie.gain.exponentialRampToValueAtTime(glosnosc, t + 0.006);
  wzmocnienie.gain.exponentialRampToValueAtTime(glosnosc * 0.55, t + spadek);
  wzmocnienie.gain.exponentialRampToValueAtTime(0.0001, t + dlugosc);
  ton.connect(wzmocnienie);
  wzmocnienie.connect(dzwieki.destination);
  ton.start(t);
  ton.stop(t + dlugosc + 0.05);
}

// Każdy strzał brzmi odrobinę inaczej, żeby nie był jak metronom
function nastroj() {
  return 0.94 + Math.random() * 0.12;
}

// Armata: krótkie wesołe "bum-pop". Słychać je też w telefonie (nie tylko gruby bas).
function dzwiekStrzalu() {
  if (!dzwieki) return;
  var g = GLOSNOSC_ARMATA;
  var n = nastroj();
  // Miękkie bum, które chwilę zostaje, żeby było "bum", a nie tyknięcie
  zagrajTonMiekki("sine", 300 * n, 130 * n, 0.22, 0.2 * g, 0, 0.006, 0.05);
  // Wyraźny pop, który podskakuje jak piłka
  zagrajBoing(620 * n, 230 * n, 330 * n, 0.14, 0.15 * g, 0);
  // Cichy świst lecącej piłki, w dół, bez ostrego pisku
  zagrajTonMiekki("sine", 820 * n, 460 * n, 0.1, 0.04 * g, 0.02, 0.012);
  // Powietrze: cichy "puf", filtr ścina ostry trzask
  zagrajSzum(0.08, "lowpass", 1100, 0.06 * g, 0, 0.006, 420);
}

// Bąbelek: krótki ton, który szybko idzie w górę ("blup")
function babelek(opoznienie, od, doo, dlugosc, glosnosc) {
  if (!glosnosc || glosnosc <= 0) return;
  var t = dzwieki.currentTime + opoznienie;
  var ton = dzwieki.createOscillator();
  ton.type = "sine";
  ton.frequency.setValueAtTime(od, t);
  ton.frequency.exponentialRampToValueAtTime(doo, t + dlugosc);
  var wzmocnienie = dzwieki.createGain();
  wzmocnienie.gain.setValueAtTime(0.0001, t);
  wzmocnienie.gain.exponentialRampToValueAtTime(glosnosc, t + 0.008);
  wzmocnienie.gain.exponentialRampToValueAtTime(0.0001, t + dlugosc);
  ton.connect(wzmocnienie);
  wzmocnienie.connect(dzwieki.destination);
  ton.start(t);
  ton.stop(t + dlugosc + 0.02);
}

// Pudło: bomba wpada do wody. Głuche "plum", wesołe "blooop", szum rozbryzgu i krople.
function dzwiekPlusk() {
  if (!dzwieki) return;
  var g = GLOSNOSC_PLUSK;
  var n = nastroj();

  // 1. Plum: coś wpada pod wodę
  zagrajTonMiekki("sine", 230 * n, 90 * n, 0.24, 0.16 * g, 0, 0.008, 0.03);
  // 2. Dwa bąbelki w górę, jak kreskówkowe "blooop"
  babelek(0.01, 300 * n, 820 * n, 0.1, 0.15 * g);
  babelek(0.1, 220 * n, 520 * n, 0.12, 0.09 * g);

  // 3. Rozbryzg: miękki szum, który cichnie i robi się coraz niższy
  zagrajSzum(0.6, "bandpass", 1800, 0.13 * g, 0, 0.018, 420, 0.7);

  // 4. Krople spadają z powrotem do wody: kilka cichych "kap"
  for (var i = 0; i < 4; i++) {
    var kiedy = 0.16 + Math.random() * 0.4;
    var wysokosc = 800 + Math.random() * 900;
    babelek(kiedy, wysokosc, wysokosc * 1.6, 0.045, (0.035 + Math.random() * 0.03) * g);
  }
}

// Trafienie: lekkie stuknięcie i wesoły dzwoneczek, nie huk.
function dzwiekWybuch() {
  if (!dzwieki) return;
  var g = GLOSNOSC_TRAFIENIE;
  zagrajTonMiekki("sine", 260, 140, 0.14, 0.12 * g, 0, 0.005, 0.03);
  zagrajSzum(0.06, "lowpass", 1200, 0.04 * g, 0, 0.004, 480);
  // "Ding!" i od razu wyższy "ding!" — jak małe brawo
  zagrajDzwonek(659, 0.2, 0.17 * g, 0.02);
  zagrajDzwonek(988, 0.26, 0.15 * g, 0.13);
}

// Zatopienie: trzy śmieszne "glu" i krótka wesoła fanfara do-mi-sol.
function dzwiekZatopienie() {
  if (!dzwieki) return;
  var g = GLOSNOSC_ZATOPIENIE;
  zagrajTonMiekki("sine", 460, 180, 0.14, 0.14 * g, 0, 0.008, 0.03);
  zagrajTonMiekki("sine", 380, 140, 0.14, 0.12 * g, 0.14, 0.008, 0.03);
  zagrajTonMiekki("sine", 300, 110, 0.16, 0.12 * g, 0.28, 0.008, 0.03);
  zagrajSzum(0.45, "lowpass", 800, 0.06 * g, 0.02, 0.02, 280);
  // Do, mi, sol — trochę głośniej niż jedno trafienie, bo cały statek zatonął
  zagrajDzwonek(523, 0.18, 0.2 * g, 0.44);
  zagrajDzwonek(659, 0.18, 0.2 * g, 0.56);
  zagrajDzwonek(784, 0.3, 0.22 * g, 0.68);
}

// Dzyń-dzyń: twoja kolej
function dzwiekKolej() {
  if (!dzwieki) return;
  zagrajTon("sine", 660, 660, 0.15, 0.3);
  zagrajTon("sine", 880, 880, 0.25, 0.3, 0.15);
}

function dzwiekKlik() {
  if (!dzwieki) return;
  zagrajTon("triangle", 500, 300, 0.08, 0.2);
}
