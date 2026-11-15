// ===== Kraina Wiśni: tu gra się zaczyna =====

var KAMERA_WYSOKO = 17;   // jak wysoko wisi kamera nad bohaterem
var KAMERA_Z_TYLU = 13;   // jak daleko za bohaterem (na południe)

// ----- Rysownik, scena, kamera, światło -----
var plansza = document.getElementById("plansza");
var renderer = new THREE.WebGLRenderer({ canvas: plansza, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

var scena = new THREE.Scene();
scena.background = new THREE.Color(KOLOR_NIEBA);
scena.fog = new THREE.Fog(kolorek(KOLOR_NIEBA), 40, 90);

var kamera = new THREE.PerspectiveCamera(32, 1, 0.5, 300);

scena.add(new THREE.HemisphereLight(kolorek("#e3f2ff"), kolorek("#7a9a5a"), 0.65));
var slonce = new THREE.DirectionalLight(kolorek("#fff1dc"), 0.9);
slonce.castShadow = true;
slonce.shadow.mapSize.set(1024, 1024);
slonce.shadow.camera.left = -22;
slonce.shadow.camera.right = 22;
slonce.shadow.camera.top = 22;
slonce.shadow.camera.bottom = -22;
slonce.shadow.camera.near = 1;
slonce.shadow.camera.far = 80;
slonce.shadow.bias = -0.0005;
scena.add(slonce);
scena.add(slonce.target);

// Gra zawsze wypełnia całe okno (też po obróceniu telefonu)
function dopasujEkran() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  kamera.aspect = window.innerWidth / window.innerHeight;
  kamera.updateProjectionMatrix();
}
window.addEventListener("resize", dopasujEkran);
dopasujEkran();

// Kamera wisi wysoko za bohaterem i patrzy na niego z góry
var celKamery = new THREE.Vector3();
function ustawKamere(odRazu) {
  var y = wysokoscZiemi(bohater.x, bohater.z);
  celKamery.set(bohater.x, y + KAMERA_WYSOKO, bohater.z + KAMERA_Z_TYLU);
  if (odRazu) kamera.position.copy(celKamery);
  else kamera.position.lerp(celKamery, 0.12);
  kamera.lookAt(kamera.position.x, kamera.position.y - KAMERA_WYSOKO + 0.8, kamera.position.z - KAMERA_Z_TYLU);
  // Słońce idzie za bohaterem, żeby cienie były zawsze przy nim
  slonce.position.set(bohater.x + 12, 25, bohater.z + 8);
  slonce.target.position.set(bohater.x, 0, bohater.z);
}

// W którą stronę od bohatera jest myszka (na ziemi)
var promien = new THREE.Raycaster();
var ziemia = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
var punktMyszy = new THREE.Vector3();
var miejsceMyszy = new THREE.Vector2();
function katDoMyszy() {
  miejsceMyszy.set(mysz.x / window.innerWidth * 2 - 1, -(mysz.y / window.innerHeight) * 2 + 1);
  promien.setFromCamera(miejsceMyszy, kamera);
  if (promien.ray.intersectPlane(ziemia, punktMyszy)) {
    return Math.atan2(punktMyszy.x - bohater.x, punktMyszy.z - bohater.z);
  }
  return bohater.kat;
}

// ----- Pauza -----
var pauza = false;
function przelaczPauze() {
  pauza = !pauza;
  document.getElementById("pauza").style.display = pauza ? "block" : "none";
}

// ----- Jeden krok gry (60 razy na sekundę) -----
var czasGry = 0;
function krokGry() {
  czasGry++;
  ruszBohatera();
  ruszInnych();
  if (czasGry % 4 === 0) wyslijStan();  // 15 razy na sekundę mówimy innym, gdzie jesteśmy
  ruszKukly();
  ruszPlatki();
  ustawKamere(false);
}

function rysuj() {
  renderer.render(scena, kamera);
  document.getElementById("punkty").textContent = "🎯 " + trafienia;
}

// ----- Pętla gry: działa w kółko -----
var DLUGOSC_KROKU = 1000 / 60;
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

// ----- Start -----
zbudujSwiat();
zrobKukly();
przygotujBohatera();
animujPostac(bohater);
przygotujSiec();
ustawKamere(true);
requestAnimationFrame(petlaGry);
