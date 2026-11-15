// ===== DŹWIĘKI =====
// Dźwięki robimy sami z "szumu" i "piszczenia", więc nie potrzeba plików z dźwiękami.

let glosnik = null; // to, co gra dźwięki. Włącza się przy pierwszym dźwięku.

function wlaczGlosnik() {
  if (!glosnik) glosnik = new (window.AudioContext || window.webkitAudioContext)();
  if (glosnik.state === "suspended") glosnik.resume();
  return glosnik;
}

// Krótki szum, jak "szszsz". od = kiedy zacząć (w sekundach od teraz).
function szum(od, ileTrwa, wysokosc, glosnosc, wysokoscNaKoniec) {
  const g = wlaczGlosnik();
  const start = g.currentTime + od;

  // kawałek losowego szumu
  const probki = g.createBuffer(1, Math.floor(g.sampleRate * ileTrwa), g.sampleRate);
  const dane = probki.getChannelData(0);
  for (let i = 0; i < dane.length; i++) dane[i] = Math.random() * 2 - 1;
  const zrodlo = g.createBufferSource();
  zrodlo.buffer = probki;

  // filtr zostawia tylko jedną wysokość szumu
  const filtr = g.createBiquadFilter();
  filtr.type = "bandpass";
  filtr.frequency.setValueAtTime(wysokosc, start);
  if (wysokoscNaKoniec) filtr.frequency.linearRampToValueAtTime(wysokoscNaKoniec, start + ileTrwa);

  // dźwięk szybko się pojawia i cichnie
  const sciszanie = g.createGain();
  sciszanie.gain.setValueAtTime(0.001, start);
  sciszanie.gain.linearRampToValueAtTime(glosnosc, start + ileTrwa * 0.2);
  sciszanie.gain.exponentialRampToValueAtTime(0.001, start + ileTrwa);

  zrodlo.connect(filtr);
  filtr.connect(sciszanie);
  sciszanie.connect(g.destination);
  zrodlo.start(start);
}

// Niski "bum"
function bum(wysokosc, ileTrwa, glosnosc) {
  const g = wlaczGlosnik();
  const start = g.currentTime;
  const ton = g.createOscillator();
  ton.frequency.setValueAtTime(wysokosc, start);
  ton.frequency.exponentialRampToValueAtTime(wysokosc / 2, start + ileTrwa);
  const sciszanie = g.createGain();
  sciszanie.gain.setValueAtTime(glosnosc, start);
  sciszanie.gain.exponentialRampToValueAtTime(0.001, start + ileTrwa);
  ton.connect(sciszanie);
  sciszanie.connect(g.destination);
  ton.start(start);
  ton.stop(start + ileTrwa);
}

// "Chrup chrup" przy zjadaniu banana
function dzwiekChrup() {
  szum(0, 0.05, 2200, 0.6);
  szum(0.07, 0.05, 1800, 0.5);
  szum(0.14, 0.06, 2000, 0.4);
}

// "Fiuuu!" kiedy kij przecina powietrze
function dzwiekSwist() {
  szum(0, 0.35, 400, 0.6, 2200);
}

// "Bum" kiedy kij trafi wojownika
function dzwiekTrafienie() {
  bum(160, 0.2, 0.6);
  szum(0, 0.08, 900, 0.4);
}

// "Au" kiedy wojownik złapie małpkę
function dzwiekAu() {
  bum(400, 0.35, 0.3);
}

// "Auuuu!" wycie wilczego wojownika, kiedy zobaczy Kiko
function dzwiekWycie(glosnosc) {
  const g = wlaczGlosnik();
  const start = g.currentTime;
  const ileTrwa = 1.1 + Math.random() * 0.4;
  const wysokosc = 380 + Math.random() * 120; // każdy wyje trochę inaczej

  // czysty ton, który rośnie, a potem długo opada: "auuuuu"
  const ton = g.createOscillator();
  ton.type = "triangle";
  ton.frequency.setValueAtTime(wysokosc * 0.7, start);
  ton.frequency.linearRampToValueAtTime(wysokosc, start + 0.25);
  ton.frequency.linearRampToValueAtTime(wysokosc * 0.8, start + ileTrwa);

  // drżenie głosu
  const drzenie = g.createOscillator();
  drzenie.frequency.value = 5;
  const silaDrzenia = g.createGain();
  silaDrzenia.gain.value = 6;
  drzenie.connect(silaDrzenia);
  silaDrzenia.connect(ton.frequency);

  const sciszanie = g.createGain();
  sciszanie.gain.setValueAtTime(0.001, start);
  sciszanie.gain.linearRampToValueAtTime(glosnosc * 0.8, start + 0.2);
  sciszanie.gain.exponentialRampToValueAtTime(0.001, start + ileTrwa);

  ton.connect(sciszanie);
  sciszanie.connect(g.destination);
  ton.start(start);
  drzenie.start(start);
  ton.stop(start + ileTrwa);
  drzenie.stop(start + ileTrwa);
}

// "Chlup!" kiedy małpka wskoczy do wody
function dzwiekChlup() {
  szum(0, 0.4, 500, 0.7, 150);
  szum(0.05, 0.25, 1500, 0.3, 600);
}

// "Skrzyp" drzwi do domku
function dzwiekDrzwi() {
  const g = wlaczGlosnik();
  const start = g.currentTime;
  const ton = g.createOscillator();
  ton.type = "sawtooth";
  ton.frequency.setValueAtTime(220, start);
  ton.frequency.linearRampToValueAtTime(380, start + 0.15);
  ton.frequency.linearRampToValueAtTime(260, start + 0.35);
  const filtr = g.createBiquadFilter();
  filtr.type = "bandpass";
  filtr.frequency.value = 900;
  const sciszanie = g.createGain();
  sciszanie.gain.setValueAtTime(0.001, start);
  sciszanie.gain.linearRampToValueAtTime(0.15, start + 0.05);
  sciszanie.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
  ton.connect(filtr);
  filtr.connect(sciszanie);
  sciszanie.connect(g.destination);
  ton.start(start);
  ton.stop(start + 0.4);
}

// "Grrraaa!" ryk drapieżnika. wysokosc: im niższa, tym groźniej brzmi.
function dzwiekRyk(wysokosc) {
  const g = wlaczGlosnik();
  const start = g.currentTime;
  const ton = g.createOscillator();
  ton.type = "sawtooth";
  ton.frequency.setValueAtTime(wysokosc, start);
  ton.frequency.linearRampToValueAtTime(wysokosc * 1.4, start + 0.25);
  ton.frequency.linearRampToValueAtTime(wysokosc * 0.8, start + 0.8);
  const drzenie = g.createOscillator();
  drzenie.frequency.value = 25;
  const silaDrzenia = g.createGain();
  silaDrzenia.gain.value = 15;
  drzenie.connect(silaDrzenia);
  silaDrzenia.connect(ton.frequency);
  const filtr = g.createBiquadFilter();
  filtr.type = "lowpass";
  filtr.frequency.value = 900;
  const sciszanie = g.createGain();
  sciszanie.gain.setValueAtTime(0.001, start);
  sciszanie.gain.linearRampToValueAtTime(0.35, start + 0.1);
  sciszanie.gain.exponentialRampToValueAtTime(0.001, start + 0.9);
  ton.connect(filtr);
  filtr.connect(sciszanie);
  sciszanie.connect(g.destination);
  ton.start(start);
  drzenie.start(start);
  ton.stop(start + 0.9);
  drzenie.stop(start + 0.9);
  szum(0, 0.6, 400, 0.2, 200);
}


// "Dzyń dzyń dzyń!" złote monety w skarbie
function dzwiekSkarbu() {
  const g = wlaczGlosnik();
  const nuty = [523, 659, 784, 1047, 1319];
  nuty.forEach(function (wysokosc, i) {
    const start = g.currentTime + i * 0.09;
    const ton = g.createOscillator();
    ton.type = "triangle";
    ton.frequency.value = wysokosc;
    const sciszanie = g.createGain();
    sciszanie.gain.setValueAtTime(0.25, start);
    sciszanie.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
    ton.connect(sciszanie);
    sciszanie.connect(g.destination);
    ton.start(start);
    ton.stop(start + 0.4);
  });
}

// "Szszuu!" gwiazdka przecina powietrze
function dzwiekRzutu() {
  szum(0, 0.18, 2500, 0.35, 5000);
}
