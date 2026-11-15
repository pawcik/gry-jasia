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

// Szum, jak wiatr albo szelest
function szum(dlugosc) {
  var bufor = dzwieki.createBuffer(1, Math.floor(dzwieki.sampleRate * dlugosc), dzwieki.sampleRate);
  var dane = bufor.getChannelData(0);
  for (var i = 0; i < dane.length; i++) dane[i] = Math.random() * 2 - 1;
  return bufor;
}

// Świst miecza
function dzwiekCiecia() {
  if (!dzwieki) return;
  var t = dzwieki.currentTime;
  var zrodlo = dzwieki.createBufferSource();
  zrodlo.buffer = szum(0.3);
  var filtr = dzwieki.createBiquadFilter();
  filtr.type = "bandpass";
  filtr.Q.value = 2;
  filtr.frequency.setValueAtTime(600, t);
  filtr.frequency.exponentialRampToValueAtTime(3500, t + 0.18);
  var glosnosc = dzwieki.createGain();
  glosnosc.gain.setValueAtTime(0.0001, t);
  glosnosc.gain.exponentialRampToValueAtTime(0.5, t + 0.05);
  glosnosc.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  zrodlo.connect(filtr);
  filtr.connect(glosnosc);
  glosnosc.connect(dzwieki.destination);
  zrodlo.start(t);
  zrodlo.stop(t + 0.3);
}

// Puk! Miecz trafia w słomianą kukłę
function dzwiekStukniecia() {
  if (!dzwieki) return;
  var t = dzwieki.currentTime;
  var ton = dzwieki.createOscillator();
  ton.type = "triangle";
  ton.frequency.setValueAtTime(190, t);
  ton.frequency.exponentialRampToValueAtTime(70, t + 0.15);
  var glosnosc = dzwieki.createGain();
  glosnosc.gain.setValueAtTime(0.6, t);
  glosnosc.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  ton.connect(glosnosc);
  glosnosc.connect(dzwieki.destination);
  ton.start(t);
  ton.stop(t + 0.2);

  // Szelest słomy
  var zrodlo = dzwieki.createBufferSource();
  zrodlo.buffer = szum(0.15);
  var filtr = dzwieki.createBiquadFilter();
  filtr.type = "highpass";
  filtr.frequency.value = 2000;
  var szelest = dzwieki.createGain();
  szelest.gain.setValueAtTime(0.25, t);
  szelest.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  zrodlo.connect(filtr);
  filtr.connect(szelest);
  szelest.connect(dzwieki.destination);
  zrodlo.start(t);
}
