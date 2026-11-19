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

// Armata na statku: niskie bum, krótki trzask na początku, pomruk i ciche echo nad wodą.
// Całość krótsza niż sekunda i nie za głośna. Pudło i trafienie grają osobno.
function dzwiekStrzalu() {
  if (!dzwieki) return;
  var g = GLOSNOSC_ARMATA;
  var n = nastroj();
  // Grube bum, słychać też w telefonie (zaczyna wyżej niż sam bas)
  zagrajTonMiekki("sine", 130 * n, 42 * n, 0.48, 0.2 * g, 0, 0.004, 0.03);
  zagrajTonMiekki("sine", 70 * n, 36 * n, 0.55, 0.12 * g, 0, 0.006, 0.04);
  // Ostry początek: bardzo krótki szum, filtr ścina pisk
  zagrajSzum(0.045, "bandpass", 1600, 0.09 * g, 0, 0.003, 700, 0.8);
  // Krótki pomruk po wystrzale
  zagrajSzum(0.55, "lowpass", 380, 0.1 * g, 0.02, 0.01, 90);
  // Echo nad wodą: to samo bum, ciszej i trochę później
  zagrajTonMiekki("sine", 110 * n, 48 * n, 0.32, 0.07 * g, 0.18, 0.008, 0.02);
  zagrajSzum(0.28, "lowpass", 500, 0.04 * g, 0.2, 0.012, 160);
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

// Pudło: prawdziwy plusk. Szum wody schodzi w dół („sploosh”) i kapie kilka kropel.
function dzwiekPlusk() {
  if (!dzwieki) return;
  var g = GLOSNOSC_PLUSK;
  var n = nastroj();
  // Coś wpada: krótki, niski ton w dół
  zagrajTonMiekki("sine", 200 * n, 70 * n, 0.22, 0.16 * g, 0, 0.006, 0.02);
  // Rozbryzg: szum, który z wysokiego robi się niski
  zagrajSzum(0.42, "bandpass", 2400, 0.16 * g, 0, 0.012, 380, 0.65);
  zagrajSzum(0.28, "lowpass", 900, 0.1 * g, 0.02, 0.01, 220);
  // Kilka kropel
  for (var i = 0; i < 3; i++) {
    var kiedy = 0.12 + Math.random() * 0.28;
    var wysokosc = 700 + Math.random() * 700;
    babelek(kiedy, wysokosc, wysokosc * 1.5, 0.04, (0.03 + Math.random() * 0.025) * g);
  }
}

// Trafienie: głębokie bum i krótkie stuknięcie w drewno albo metal. Bez ognia.
function dzwiekWybuch() {
  if (!dzwieki) return;
  var g = GLOSNOSC_TRAFIENIE;
  var n = nastroj();
  zagrajTonMiekki("sine", 150 * n, 55 * n, 0.26, 0.18 * g, 0, 0.005, 0.04);
  zagrajSzum(0.16, "lowpass", 500, 0.1 * g, 0, 0.004, 140);
  // Stuk w deskę
  zagrajTonMiekki("triangle", 220 * n, 90 * n, 0.09, 0.1 * g, 0, 0.003, 0.012);
  // Krótki brzęk metalu, cichy
  zagrajTonMiekki("sine", 880 * n, 420 * n, 0.12, 0.07 * g, 0.01, 0.004, 0.02);
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
