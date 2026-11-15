// ===== Dźwięki: robimy je sami, bez plików =====
var dzwieki = null;

// Przeglądarka pozwala grać dźwięki dopiero po pierwszym dotknięciu albo kliknięciu
function wlaczDzwieki() {
  if (!dzwieki) {
    var Glosnik = window.AudioContext || window.webkitAudioContext;
    if (!Glosnik) return;
    dzwieki = new Glosnik();
  }
  if (dzwieki.state === "suspended") dzwieki.resume();
}
document.addEventListener("pointerdown", wlaczDzwieki);
document.addEventListener("keydown", wlaczDzwieki);

function szum(dlugosc) {
  var bufor = dzwieki.createBuffer(1, Math.floor(dzwieki.sampleRate * dlugosc), dzwieki.sampleRate);
  var dane = bufor.getChannelData(0);
  for (var i = 0; i < dane.length; i++) dane[i] = Math.random() * 2 - 1;
  return bufor;
}

// Szum przepuszczony przez filtr: plusk wody albo huk wybuchu
function zagrajSzum(dlugosc, rodzajFiltra, czestotliwosc, glosnosc) {
  var t = dzwieki.currentTime;
  var zrodlo = dzwieki.createBufferSource();
  zrodlo.buffer = szum(dlugosc);
  var filtr = dzwieki.createBiquadFilter();
  filtr.type = rodzajFiltra;
  filtr.frequency.value = czestotliwosc;
  var wzmocnienie = dzwieki.createGain();
  wzmocnienie.gain.setValueAtTime(glosnosc, t);
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

// Świst lecącego pocisku
function dzwiekStrzalu() {
  if (!dzwieki) return;
  zagrajTon("sine", 1200, 300, 0.3, 0.15);
}

// Bąbelek: krótki ton, który szybko idzie w górę ("blup")
function babelek(opoznienie, od, doo, dlugosc, glosnosc) {
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

// Pudło: bomba wpada do wody. Głuche "plum", szum rozbryzgu i kapiące krople.
function dzwiekPlusk() {
  if (!dzwieki) return;
  var t = dzwieki.currentTime;

  // 1. Plum: coś ciężkiego wpada pod wodę
  zagrajTon("sine", 180, 70, 0.25, 0.35);
  babelek(0, 250, 750, 0.09, 0.3);

  // 2. Rozbryzg: miękki szum, który cichnie i robi się coraz niższy
  var zrodlo = dzwieki.createBufferSource();
  zrodlo.buffer = szum(0.8);
  var filtr = dzwieki.createBiquadFilter();
  filtr.type = "bandpass";
  filtr.Q.value = 0.7;
  filtr.frequency.setValueAtTime(2200, t);
  filtr.frequency.exponentialRampToValueAtTime(500, t + 0.7);
  var wzmocnienie = dzwieki.createGain();
  wzmocnienie.gain.setValueAtTime(0.0001, t);
  wzmocnienie.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
  wzmocnienie.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
  zrodlo.connect(filtr);
  filtr.connect(wzmocnienie);
  wzmocnienie.connect(dzwieki.destination);
  zrodlo.start(t);

  // 3. Krople spadają z powrotem do wody: kilka cichych "kap"
  for (var i = 0; i < 6; i++) {
    var kiedy = 0.15 + Math.random() * 0.55;
    var wysokosc = 900 + Math.random() * 1400;
    babelek(kiedy, wysokosc, wysokosc * 1.8, 0.05, 0.06 + Math.random() * 0.06);
  }
}

function dzwiekWybuch() {
  if (!dzwieki) return;
  zagrajSzum(0.6, "lowpass", 500, 0.9);
  zagrajTon("sine", 120, 40, 0.5, 0.6);
}

function dzwiekZatopienie() {
  if (!dzwieki) return;
  zagrajSzum(1.2, "lowpass", 350, 1);
  zagrajTon("sine", 100, 30, 1.0, 0.7);
  zagrajTon("triangle", 400, 150, 0.8, 0.15, 0.3);
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
