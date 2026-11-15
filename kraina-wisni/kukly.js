// ===== Słomiane kukły do ćwiczenia cięcia mieczem =====

var MIEJSCA_KUKIEL = [[-5, 19], [-8, 24], [5, 19], [8, 24], [-5, 30], [5, 30]];
var DLUGOSC_CHWIANIA = 45;  // ile kroków kukła się chwieje po trafieniu

var kukly = [];
var trafienia = 0;

function zrobKukly() {
  for (var i = 0; i < MIEJSCA_KUKIEL.length; i++) {
    var x = MIEJSCA_KUKIEL[i][0];
    var z = MIEJSCA_KUKIEL[i][1];
    var kukla = new THREE.Group();
    kukla.position.set(x, 0, z);
    scena.add(kukla);
    // Każda kukła ma swoją słomę, żeby błyskała osobno
    var slomka = farba("#e2c46c").clone();
    klocek(new THREE.CylinderGeometry(0.32, 0.38, 0.18, 10), "#7d6a55", 0, 0.09, 0, kukla);
    klocek(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), "#6d4c35", 0, 0.6, 0, kukla);
    klocek(new THREE.CylinderGeometry(0.2, 0.24, 1.0, 10), slomka, 0, 1.4, 0, kukla);
    klocek(new THREE.CylinderGeometry(0.215, 0.215, 0.07, 10), "#5d4632", 0, 1.15, 0, kukla);
    klocek(new THREE.CylinderGeometry(0.215, 0.215, 0.07, 10), "#5d4632", 0, 1.65, 0, kukla);
    klocek(new THREE.ConeGeometry(0.2, 0.25, 10), slomka, 0, 2.02, 0, kukla);
    kola.push({ x: x, z: z, r: 0.4 });
    kukly.push({ x: x, z: z, model: kukla, slomka: slomka, chwianie: 0, kierunek: 0 });
  }
}

// Miecz postaci tnie w stronę "kat": trafia każdą kukłę w zasięgu łuku.
// liczyPunkty = true tylko dla naszego bohatera (cięcia innych graczy tylko chwieją kukłami)
function trafKukly(postac, kat, liczyPunkty) {
  var trafiona = false;
  for (var i = 0; i < kukly.length; i++) {
    var k = kukly[i];
    var dx = k.x - postac.x;
    var dz = k.z - postac.z;
    var odleglosc = Math.sqrt(dx * dx + dz * dz);
    if (odleglosc > ZASIEG_MIECZA + 0.4) continue;
    if (odleglosc > 0.8 && Math.abs(roznicaKatow(Math.atan2(dx, dz), kat)) > SZEROKOSC_CIECIA + 0.25) continue;
    k.chwianie = DLUGOSC_CHWIANIA;
    k.kierunek = Math.atan2(dx, dz);
    if (liczyPunkty) trafienia++;
    trafiona = true;
  }
  if (trafiona) dzwiekStukniecia();
}

// Trafiona kukła błyska i chwieje się w stronę od bohatera
function ruszKukly() {
  for (var i = 0; i < kukly.length; i++) {
    var k = kukly[i];
    if (k.chwianie <= 0) continue;
    k.chwianie--;
    var t = DLUGOSC_CHWIANIA - k.chwianie;
    var wychylenie = Math.sin(t * 0.45) * 0.45 * (k.chwianie / DLUGOSC_CHWIANIA);
    k.model.rotation.x = Math.cos(k.kierunek) * wychylenie;
    k.model.rotation.z = -Math.sin(k.kierunek) * wychylenie;
    k.slomka.emissive.setScalar(k.chwianie > DLUGOSC_CHWIANIA - 8 ? 0.5 : 0);
  }
}
