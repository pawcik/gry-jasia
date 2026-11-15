// ===== Bohater: lisi duszek z mieczem =====

// ----- Rzeczy, które możesz zmieniać -----
var SZYBKOSC = 0.09;              // ile metrów na jeden krok gry
var ZASIEG_MIECZA = 2.4;          // jak daleko sięga miecz (w metrach)
var SZEROKOSC_CIECIA = 1.1;       // jak szeroko tnie (połowa łuku)
var DLUGOSC_CIECIA = 16;          // ile kroków trwa jedno cięcie
var MOMENT_TRAFIENIA = 9;         // w którym kroku cięcia miecz trafia
var PRZERWA_MIEDZY_CIECIAMI = 22; // ile kroków odpoczynku po cięciu
var PROMIEN_BOHATERA = 0.4;       // jak gruby jest bohater

var KOLOR_FUTRA = "#f28c28";
var KOLOR_KIMONA = "#fbf7ef";
var KOLOR_HAKAMY = "#c62828";
var KOLOR_PASA = "#f9a825";
var KOLOR_SKORY = "#ffe0c4";
var KOLOR_OCZU = "#5b2a86";
var KOLOR_OSTRZA = "#e9f1f5";

// Stan bohatera: gdzie stoi, gdzie patrzy, co robi. Wygląd jest osobno w "model".
var bohater = {
  x: START_X,
  z: START_Z,
  kat: Math.PI,       // patrzy na północ (od kamery)
  predkosc: 0,
  krokChodu: 0,
  ciecie: 0,          // ile kroków cięcia jeszcze zostało
  katCiecia: 0,
  liczbaCiec: 0,      // ile razy już ciął (inni gracze widzą, że urosła)
  przerwa: 0,
  model: null,
  slad: null          // biały błysk cięcia
};

var wskaznik = null;  // półprzezroczysty łuk: tu trafi miecz

// ----- Postać: model, imię nad głową i błysk cięcia (bohater i inni gracze) -----
function zrobPostac(imie, kolor) {
  var postac = { x: 0, z: 0, kat: 0, predkosc: 0, krokChodu: 0, ciecie: 0, katCiecia: 0, liczbaCiec: 0, model: null };
  zmienWyglad(postac, imie, kolor);
  postac.slad = zrobLuk(0.35, ZASIEG_MIECZA + 0.2, "#e6f7ff", 0.85);
  return postac;
}

// Nowy kolor liska albo nowe imię: budujemy model od nowa
function zmienWyglad(postac, imie, kolor) {
  if (postac.model) scena.remove(postac.model);
  postac.imie = imie;
  postac.kolor = kolor;
  postac.model = zrobLiska(kolor);
  if (imie) postac.model.add(zrobEtykiete(imie));
  scena.add(postac.model);
}

function usunPostac(postac) {
  scena.remove(postac.model);
  scena.remove(postac.slad);
}

// Imię unoszące się nad głową (zawsze widać je przez drzewa)
function zrobEtykiete(tekst) {
  var plotno = document.createElement("canvas");
  plotno.width = 256;
  plotno.height = 64;
  var pedzel = plotno.getContext("2d");
  pedzel.font = "bold 36px 'Comic Sans MS', 'Trebuchet MS', sans-serif";
  pedzel.textAlign = "center";
  pedzel.textBaseline = "middle";
  pedzel.lineWidth = 8;
  pedzel.strokeStyle = "rgba(0, 0, 0, 0.7)";
  pedzel.strokeText(tekst, 128, 32);
  pedzel.fillStyle = "#ffffff";
  pedzel.fillText(tekst, 128, 32);
  var obrazek = new THREE.CanvasTexture(plotno);
  obrazek.encoding = THREE.sRGBEncoding;
  var etykieta = new THREE.Sprite(new THREE.SpriteMaterial({ map: obrazek, depthTest: false, transparent: true }));
  etykieta.scale.set(2.4, 0.6, 1);
  etykieta.position.y = 2.5;
  etykieta.renderOrder = 10;
  return etykieta;
}

// ----- Model -----
function zrobLiska(kolorFutra) {
  var futro = kolorFutra || KOLOR_FUTRA;
  var model = new THREE.Group();

  // Nogi w białych skarpetkach i drewnianych sandałach
  model.nogi = [];
  for (var s = -1; s <= 1; s += 2) {
    var noga = new THREE.Group();
    noga.position.set(s * 0.12, 0.42, 0);
    klocek(new THREE.CylinderGeometry(0.07, 0.07, 0.36, 8), "#ffffff", 0, -0.2, 0, noga);
    klocek(new THREE.BoxGeometry(0.16, 0.06, 0.28), "#6d4c2f", 0, -0.39, 0.03, noga);
    model.add(noga);
    model.nogi.push(noga);
  }

  // Czerwone spodnie hakama, białe kimono i złoty pas
  klocek(new THREE.CylinderGeometry(0.25, 0.36, 0.45, 12), KOLOR_HAKAMY, 0, 0.55, 0, model);
  klocek(new THREE.CylinderGeometry(0.21, 0.26, 0.44, 12), KOLOR_KIMONA, 0, 0.96, 0, model);
  klocek(new THREE.CylinderGeometry(0.265, 0.265, 0.1, 12), KOLOR_PASA, 0, 0.8, 0, model);
  for (var k = -1; k <= 1; k += 2) {
    var kolnierz = klocek(new THREE.BoxGeometry(0.05, 0.3, 0.02), KOLOR_HAKAMY, k * 0.06, 1.05, 0.225, model);
    kolnierz.rotation.z = -k * 0.45;
  }

  // Głowa
  var glowa = new THREE.Group();
  glowa.position.set(0, 1.48, 0);
  model.add(glowa);
  model.glowa = glowa;
  klocek(new THREE.SphereGeometry(0.33, 20, 16), KOLOR_SKORY, 0, 0, 0, glowa);
  klocek(new THREE.SphereGeometry(0.022, 6, 4), KOLOR_SKORY, 0, -0.1, 0.33, glowa);

  // Duże błyszczące oczy i różowe policzki
  for (var o = -1; o <= 1; o += 2) {
    var oko = klocek(new THREE.SphereGeometry(0.085, 12, 10), swiecaca(KOLOR_OCZU), o * 0.125, -0.03, 0.285, glowa);
    oko.scale.set(0.8, 1.25, 0.45);
    klocek(new THREE.SphereGeometry(0.028, 8, 6), swiecaca("#ffffff"), o * 0.125 + 0.025, 0.02, 0.322, glowa);
    var policzek = klocek(new THREE.SphereGeometry(0.05, 8, 6), swiecaca("#ffaaaa"), o * 0.2, -0.12, 0.25, glowa);
    policzek.scale.set(1, 0.5, 0.4);
  }

  // Rude włosy z grzywką
  var wlosy = klocek(new THREE.SphereGeometry(0.35, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), futro, 0, 0, -0.02, glowa);
  wlosy.rotation.x = -0.35;
  for (var g = -2; g <= 2; g++) {
    var kosmyk = klocek(new THREE.ConeGeometry(0.075, 0.24, 6), futro, g * 0.085, 0.14, 0.27, glowa);
    kosmyk.rotation.x = Math.PI - 0.4;
  }
  for (var t = -1; t <= 1; t++) {
    var tyl = klocek(new THREE.ConeGeometry(0.09, 0.3, 6), futro, t * 0.15, -0.05, -0.27, glowa);
    tyl.rotation.x = Math.PI + 0.5;
  }
  for (var b = -1; b <= 1; b += 2) {
    var bok = klocek(new THREE.ConeGeometry(0.06, 0.28, 6), futro, b * 0.3, -0.1, 0.05, glowa);
    bok.rotation.x = Math.PI;
  }

  // Lisie uszy: rude, w środku jasne, z ciemnymi czubkami
  model.uszy = [];
  for (var u = -1; u <= 1; u += 2) {
    var ucho = new THREE.Group();
    ucho.position.set(u * 0.19, 0.26, -0.04);
    ucho.rotation.z = -u * 0.35;
    glowa.add(ucho);
    klocek(new THREE.ConeGeometry(0.12, 0.32, 8), futro, 0, 0.14, 0, ucho);
    var srodek = klocek(new THREE.ConeGeometry(0.07, 0.22, 8), "#fff3e6", 0, 0.12, 0.045, ucho);
    srodek.scale.z = 0.5;
    klocek(new THREE.ConeGeometry(0.04, 0.1, 8), "#4a2c1d", 0, 0.26, 0, ucho);
    model.uszy.push(ucho);
  }

  // Wielki puszysty ogon z białym końcem
  var ogon = new THREE.Group();
  ogon.position.set(0, 0.7, -0.28);
  model.add(ogon);
  model.ogon = ogon;
  var kule = [[0, 0, 0, 0.12], [0, 0.08, -0.16, 0.17], [0, 0.22, -0.3, 0.21], [0, 0.4, -0.38, 0.22], [0, 0.58, -0.4, 0.17]];
  for (var i = 0; i < kule.length; i++) {
    var kolor = i === kule.length - 1 ? "#ffffff" : futro;
    klocek(new THREE.SphereGeometry(kule[i][3], 12, 10), kolor, kule[i][0], kule[i][1], kule[i][2], ogon);
  }

  // Prawa ręka z mieczem (bohater patrzy w stronę +z, więc prawa ręka jest po stronie -x)
  var ramie = new THREE.Group();
  ramie.position.set(-0.27, 1.12, 0);
  model.add(ramie);
  model.ramie = ramie;
  var reka = new THREE.Group();
  ramie.add(reka);
  model.reka = reka;
  zrobRekaw(reka);
  var miecz = zrobMiecz();
  miecz.position.set(0, -0.43, 0);
  reka.add(miecz);
  model.miecz = miecz;

  // Lewa ręka
  var lewaReka = new THREE.Group();
  lewaReka.position.set(0.27, 1.12, 0);
  model.add(lewaReka);
  model.lewaReka = lewaReka;
  zrobRekaw(lewaReka);

  // Niebieski duszek-ognik, który lata dookoła
  var ognik = new THREE.Group();
  ognik.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), swiecaca("#e0f7ff")));
  ognik.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshBasicMaterial({ color: kolorek("#5ec8ff"), transparent: true, opacity: 0.4, depthWrite: false })));
  model.add(ognik);
  model.ognik = ognik;

  return model;
}

function zrobRekaw(reka) {
  klocek(new THREE.CylinderGeometry(0.075, 0.12, 0.38, 8), KOLOR_KIMONA, 0, -0.19, 0, reka);
  klocek(new THREE.SphereGeometry(0.065, 8, 6), KOLOR_SKORY, 0, -0.42, 0, reka);
}

// Miecz: rękojeść, okrągła osłona i długie ostrze
function zrobMiecz() {
  var miecz = new THREE.Group();
  var rekojesc = klocek(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6), "#2b2d42", 0, 0, 0.02, miecz);
  rekojesc.rotation.x = Math.PI / 2;
  var oslona = klocek(new THREE.CylinderGeometry(0.065, 0.065, 0.025, 10), "#d4a72c", 0, 0, 0.14, miecz);
  oslona.rotation.x = Math.PI / 2;
  klocek(new THREE.BoxGeometry(0.018, 0.05, 0.85), KOLOR_OSTRZA, 0, 0, 0.58, miecz);
  return miecz;
}

// Płaski łuk na ziemi przed bohaterem (wskaźnik celowania i ślad cięcia)
function zrobLuk(odSrodka, doKonca, kolor, przezroczystosc) {
  var ksztalt = new THREE.RingGeometry(odSrodka, doKonca, 24, 1, -Math.PI / 2 - SZEROKOSC_CIECIA, SZEROKOSC_CIECIA * 2);
  var luk = new THREE.Mesh(ksztalt, new THREE.MeshBasicMaterial({ color: kolorek(kolor), transparent: true, opacity: przezroczystosc, side: THREE.DoubleSide, depthWrite: false }));
  luk.rotation.x = -Math.PI / 2;
  var grupa = new THREE.Group();
  grupa.add(luk);
  grupa.visible = false;
  grupa.farba = luk.material;
  scena.add(grupa);
  return grupa;
}

function przygotujBohatera() {
  zmienWyglad(bohater, "", KOLOR_FUTRA);
  wskaznik = zrobLuk(0.5, ZASIEG_MIECZA, "#ffffff", 0.35);
  bohater.slad = zrobLuk(0.35, ZASIEG_MIECZA + 0.2, "#e6f7ff", 0.85);
}

// ----- Ruch (60 razy na sekundę) -----
function ruszBohatera() {
  var ruch = kierunekRuchu();
  var sila = Math.min(1, Math.sqrt(ruch.x * ruch.x + ruch.z * ruch.z));
  bohater.predkosc = 0;
  if (sila > 0.15) {
    var dx = ruch.x * SZYBKOSC;
    var dz = ruch.z * SZYBKOSC;
    var x = bohater.x;
    var z = bohater.z;
    // Jak coś stoi na drodze, bohater ślizga się wzdłuż przeszkody
    if (moznaStanac(x + dx, z + dz)) {
      x += dx;
      z += dz;
    } else if (moznaStanac(x + dx, z)) {
      x += dx;
    } else if (moznaStanac(x, z + dz)) {
      z += dz;
    }
    bohater.predkosc = Math.sqrt((x - bohater.x) * (x - bohater.x) + (z - bohater.z) * (z - bohater.z)) / SZYBKOSC;
    bohater.x = x;
    bohater.z = z;
    if (bohater.ciecie === 0) bohater.kat += roznicaKatow(Math.atan2(ruch.x, ruch.z), bohater.kat) * 0.3;
  }

  // Cięcie mieczem
  if (bohater.przerwa > 0) bohater.przerwa--;
  if (chceCiac !== null) {
    if (bohater.przerwa === 0) zacznijCiecie(chceCiac);
    chceCiac = null;
  }
  if (bohater.ciecie > 0) {
    bohater.ciecie--;
    if (bohater.ciecie === MOMENT_TRAFIENIA) trafKukly(bohater, bohater.katCiecia, true);
  }

  var y = wysokoscZiemi(bohater.x, bohater.z) + 0.07;

  // Wskaźnik: pokazuje, gdzie trafi miecz
  var cel = celowanie();
  wskaznik.visible = cel !== null;
  if (cel !== null) {
    wskaznik.position.set(bohater.x, y, bohater.z);
    wskaznik.rotation.y = cel === "mysz" ? katDoMyszy() : cel;
    wskaznik.farba.opacity = bohater.przerwa > 0 ? 0.15 : 0.35;
  }

  pokazSlad(bohater);
  animujPostac(bohater);
}

// Błysk cięcia powoli znika
function pokazSlad(postac) {
  var slad = postac.slad;
  slad.visible = postac.ciecie > 0;
  if (slad.visible) {
    slad.position.set(postac.x, wysokoscZiemi(postac.x, postac.z) + 0.09, postac.z);
    slad.rotation.y = postac.katCiecia;
    slad.farba.opacity = 0.85 * postac.ciecie / DLUGOSC_CIECIA;
  }
}

function zacznijCiecie(cel) {
  var kat = bohater.kat;
  if (cel === "mysz") kat = katDoMyszy();
  else if (cel !== "przod") kat = cel;
  bohater.katCiecia = kat;
  bohater.kat = kat;
  bohater.ciecie = DLUGOSC_CIECIA;
  bohater.przerwa = PRZERWA_MIEDZY_CIECIAMI;
  bohater.liczbaCiec++;
  dzwiekCiecia();
}

// Machanie nogami, rękami i ogonem (bohater i inni gracze)
function animujPostac(postac) {
  var m = postac.model;
  m.position.set(postac.x, wysokoscZiemi(postac.x, postac.z), postac.z);
  m.rotation.y = postac.kat;

  postac.krokChodu += postac.predkosc * 0.28;
  var mach = Math.sin(postac.krokChodu) * 0.75 * postac.predkosc;
  m.nogi[0].rotation.x = mach;
  m.nogi[1].rotation.x = -mach;
  m.lewaReka.rotation.x = mach * 0.8;

  m.glowa.rotation.z = Math.sin(czasGry * 0.05) * 0.04;
  m.uszy[0].rotation.x = Math.sin(czasGry * 0.13) > 0.97 ? -0.3 : 0;  // czasem strzyże uchem
  m.ogon.rotation.y = Math.sin(czasGry * 0.07) * 0.35;
  m.ogon.rotation.x = -postac.predkosc * 0.5;

  if (postac.ciecie > 0) {
    // Zamach: ręka z mieczem leci z prawej na lewą
    var postep = 1 - postac.ciecie / DLUGOSC_CIECIA;
    var zamach = Math.min(1, postep * 1.6);
    m.ramie.rotation.y = -1.6 + 2.9 * zamach;
    m.reka.rotation.x = -1.5;
    m.miecz.rotation.x = 1.5;
    m.rotation.y = postac.kat + 0.3 - 0.6 * zamach;
  } else {
    m.ramie.rotation.y = 0;
    m.reka.rotation.x = -mach * 0.8;
    m.miecz.rotation.x = -0.5;
  }

  var t = czasGry * 0.03;
  m.ognik.position.set(Math.cos(t) * 0.65, 1.55 + Math.sin(t * 2) * 0.08, Math.sin(t) * 0.65);
}
