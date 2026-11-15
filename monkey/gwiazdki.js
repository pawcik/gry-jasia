// ===== GWIAZDKI DO RZUCANIA =====
// Daleko od startu, na polanie w lewym dolnym rogu lasu, na kamiennym postumencie
// leżą stalowe gwiazdki do rzucania. Pilnują ich trzej wilczy wojownicy.
// Kiko rzuca je klawiszem E albo prawym przyciskiem myszki. Rzucona gwiazdka
// leci prosto, a potem spada na ziemię i można ją podnieść jeszcze raz.

const GWIAZDKI_NA_START = 13; // każda trafiona gwiazdka zabiera wilkowi 1 z 3 żyć
const PRZERWA_MIEDZY_RZUTAMI = 15; // kroki gry
let gwiazdkiNaZiemi = null;  // pęczek gwiazdek na postumencie
let maGwiazdki = false;
let liczbaGwiazdek = 0;
let doNastepnegoRzutu = 0;
const leceGwiazdki = [];     // gwiazdki w locie
const lezaceGwiazdki = [];   // rzucone gwiazdki leżące na ziemi

// Polana z gwiazdkami: postument (G) i trzech wilków (Z) dookoła, kilka drzew
const PLAN_POLANY = [
  ".........",
  ".T.....T.",
  "....Z....",
  "...Z.Z...",
  "....G....",
  ".........",
  ".T.....T.",
  ".........",
];

// błyszcząca stal (robiona przy pierwszej gwiazdce, bo potrzebuje rzeczy z game.js)
let farbaGwiazdki = null;

// Jedna gwiazdka: płaska stalowa gwiazda z czterema ostrymi ramionami i dziurką w środku.
// Leży płasko (w poziomie).
function zrobGwiazdke() {
  const zarys = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const kat = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? 0.16 : 0.05; // ostre ramię, potem wcięcie
    const x = Math.cos(kat) * r;
    const y = Math.sin(kat) * r;
    if (i === 0) zarys.moveTo(x, y);
    else zarys.lineTo(x, y);
  }
  zarys.closePath();
  const dziurka = new THREE.Path();
  dziurka.absarc(0, 0, 0.022, 0, Math.PI * 2, true);
  zarys.holes.push(dziurka);
  const ksztalt = new THREE.ExtrudeGeometry(zarys, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
  ksztalt.rotateX(-Math.PI / 2); // płasko
  if (!farbaGwiazdki) {
    farbaGwiazdki = new THREE.MeshStandardMaterial({ color: kolorek("#cfd8dc"), metalness: 0.9, roughness: 0.25, envMap: odbicieSwiata });
  }
  const gwiazdka = new THREE.Mesh(ksztalt, farbaGwiazdki);
  gwiazdka.castShadow = true;
  return gwiazdka;
}

// Postument z kamienia, a nad nim unosi się i kręci pęczek gwiazdek
function zrobGwiazdkiNaZiemi() {
  const grupa = new THREE.Group();
  grupa.add(klocek(new THREE.CylinderGeometry(0.45, 0.55, 0.6, 10), "#8a8a8a", 0, 0.3, 0));
  grupa.add(klocek(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 10), "#9e9e9e", 0, 0.64, 0));
  grupa.peczek = new THREE.Group();
  grupa.peczek.position.y = 1.05;
  grupa.add(grupa.peczek);
  for (let i = 0; i < 3; i++) {
    const gwiazdka = zrobGwiazdke();
    gwiazdka.scale.set(1.6, 1.6, 1.6);
    gwiazdka.position.y = i * 0.06;
    gwiazdka.rotation.y = i * 0.4;
    grupa.peczek.add(gwiazdka);
  }
  gwiazdkiNaZiemi = grupa;
  return grupa;
}

// Na początku każdego poziomu: wszystko od nowa
function przygotujGwiazdki() {
  gwiazdkiNaZiemi = null;
  maGwiazdki = false;
  liczbaGwiazdek = 0;
  doNastepnegoRzutu = 0;
  for (const g of leceGwiazdki) scena.remove(g);
  for (const g of lezaceGwiazdki) scena.remove(g);
  leceGwiazdki.length = 0;
  lezaceGwiazdki.length = 0;
}

// Rzut: gwiazdka wylatuje z lewej ręki prosto przed Kiko
function rzucGwiazdke() {
  if (!maGwiazdki || doNastepnegoRzutu > 0 || malpka.wDomku || pauza || mapaOtwarta) return;
  if (liczbaGwiazdek <= 0) {
    pokazKomunikat("Nie masz gwiazdek! Podnieś te, które rzuciłeś ⭐");
    return;
  }
  liczbaGwiazdek--;
  doNastepnegoRzutu = PRZERWA_MIEDZY_RZUTAMI;
  malpka.rzuca = 14;
  dzwiekRzutu();
  const gwiazdka = zrobGwiazdke();
  gwiazdka.kierunekX = Math.sin(malpka.kat);
  gwiazdka.kierunekZ = Math.cos(malpka.kat);
  gwiazdka.position.set(
    malpka.x + gwiazdka.kierunekX * 0.8 + gwiazdka.kierunekZ * 0.35,
    malpka.wysokosc + 0.9,
    malpka.z + gwiazdka.kierunekZ * 0.8 - gwiazdka.kierunekX * 0.35
  );
  gwiazdka.zostalo = 30; // metry lotu
  scena.add(gwiazdka);
  leceGwiazdki.push(gwiazdka);
}

// Gwiazdka spada na ziemię (albo do wody, wtedy przepada)
function upuscGwiazdke(gwiazdka) {
  if (kafelekW(gwiazdka.position.x, gwiazdka.position.z) === "W" || kafelekW(gwiazdka.position.x, gwiazdka.position.z) === "poza") {
    scena.remove(gwiazdka);
    return;
  }
  gwiazdka.position.y = wysokoscZiemi(gwiazdka.position.x, gwiazdka.position.z) + 0.03;
  if (kafelekW(gwiazdka.position.x, gwiazdka.position.z) === "T") gwiazdka.position.y = 0.03; // spada pod drzewo
  lezaceGwiazdki.push(gwiazdka);
}

// Każdy krok gry: podnoszenie, lot, trafienia i ruch ręki
function obslugaGwiazdek() {
  // pęczek na postumencie
  if (gwiazdkiNaZiemi && gwiazdkiNaZiemi.peczek.visible) {
    gwiazdkiNaZiemi.peczek.rotation.y += 0.04;
    gwiazdkiNaZiemi.peczek.position.y = 1.05 + Math.sin(czas * 0.05) * 0.08;
    if (Math.hypot(gwiazdkiNaZiemi.position.x - malpka.x, gwiazdkiNaZiemi.position.z - malpka.z) < 1.8) {
      gwiazdkiNaZiemi.peczek.visible = false;
      maGwiazdki = true;
      liczbaGwiazdek += GWIAZDKI_NA_START;
      dzwiekSkarbu();
      pokazKomunikat("⭐ " + IMIE_MALPKI + " ma gwiazdki! E albo prawy przycisk myszki = rzut");
    }
  }
  if (doNastepnegoRzutu > 0) doNastepnegoRzutu--;

  // gwiazdki w locie: szybko się kręcą i lecą prosto
  const KROK = 0.55;
  for (let i = leceGwiazdki.length - 1; i >= 0; i--) {
    const g = leceGwiazdki[i];
    g.position.x += g.kierunekX * KROK;
    g.position.z += g.kierunekZ * KROK;
    g.rotation.y += 0.7;
    g.zostalo -= KROK;
    let koniec = g.zostalo <= 0 || kafelekW(g.position.x, g.position.z) === "poza";
    if (zaslania(g.position.x, g.position.z, g.position.y)) {
      koniec = true;
      g.position.x -= g.kierunekX * 0.6; // odbija się od przeszkody
      g.position.z -= g.kierunekZ * 0.6;
    }
    for (const wojownik of wojownicy) {
      if (koniec) break;
      if (!wojownik.visible || wojownik.zycie <= 0) continue;
      const blisko = Math.hypot(wojownik.position.x - g.position.x, wojownik.position.z - g.position.z) < 0.6;
      if (blisko && Math.abs(g.position.y - (wojownik.position.y + 1.1)) < 1.0) {
        trafWojownika(wojownik, g.kierunekX, g.kierunekZ);
        koniec = true;
      }
    }
    for (const zwierze of zwierzeta) {
      if (koniec) break;
      if (!zwierze.gatunek.drapieznik) continue;
      if (Math.hypot(zwierze.position.x - g.position.x, zwierze.position.z - g.position.z) < 0.8) {
        przestraszZwierze(zwierze); // drapieżnika gwiazdka tylko straszy
        koniec = true;
      }
    }
    if (koniec) {
      leceGwiazdki.splice(i, 1);
      upuscGwiazdke(g);
    }
  }

  // leżące gwiazdki: Kiko je podnosi, kiedy przejdzie obok
  for (let i = lezaceGwiazdki.length - 1; i >= 0; i--) {
    const g = lezaceGwiazdki[i];
    if (Math.hypot(g.position.x - malpka.x, g.position.z - malpka.z) < 1.0) {
      scena.remove(g);
      lezaceGwiazdki.splice(i, 1);
      liczbaGwiazdek++;
      dzwiekChrup();
    }
  }

  // rzut: lewa ręka szybko leci z boku do przodu
  if (malpka.rzuca > 0) {
    malpka.rzuca--;
    const postep = 1 - malpka.rzuca / 14;
    malpka.model.lewaReka.rotation.x = -1.5;
    malpka.model.lewaReka.rotation.y = 1.2 - postep * 1.8;
  }
}

// Klawisz E: rzut gwiazdką
document.addEventListener("keydown", function (e) {
  if (e.key.toLowerCase() === "e" && !e.repeat) rzucGwiazdke();
});
// Prawy przycisk myszki: też rzut (i nie pokazuje menu przeglądarki)
document.getElementById("plansza").addEventListener("contextmenu", function (e) { e.preventDefault(); });
document.getElementById("plansza").addEventListener("mousedown", function (e) {
  if (e.button === 2 && document.pointerLockElement) rzucGwiazdke();
});
