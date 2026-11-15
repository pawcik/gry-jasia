// ===== MONKEY WORLD (gra Jasia, 3D) =====
// Małpka zwiedza wielki świat 3D i zbiera banany.
// Mapa świata jest w pliku mapa.js
// Do rysowania 3D używamy biblioteki Three.js (słowo THREE).

const plansza = document.getElementById("plansza");
const napisPunkty = document.getElementById("punkty");
const napisZycia = document.getElementById("zycia");
const napisPoziom = document.getElementById("poziom");
const napisKomunikat = document.getElementById("komunikat");
const napisPowietrze = document.getElementById("powietrze");

const KAFELEK = 2; // jeden kawałek mapy ma 2 metry
const IMIE_MALPKI = "Kiko";

let swiat = []; // mapa poziomu, na którym teraz jesteśmy

// Zamienia kolor tak, żeby na ekranie wyglądał tak samo jak w kodzie
// (bo renderer liczy światło jak w prawdziwym świecie)
function kolorek(kolor) {
  return new THREE.Color(kolor).convertSRGBToLinear();
}

// ----- Scena: to jest cały świat 3D -----
const scena = new THREE.Scene();
const KOLOR_HORYZONTU = "#b4d6f0";
scena.background = kolorek(KOLOR_HORYZONTU);
scena.fog = new THREE.Fog(kolorek(KOLOR_HORYZONTU), 40, 150); // daleko wszystko robi się mgliste, jak w prawdziwym powietrzu

// Niebo: wielka kula wokół kamery, na dole jasna, u góry ciemnoniebieska
const niebo = (function () {
  const ksztalt = new THREE.SphereGeometry(150, 32, 16);
  const kolory = [];
  const dol = kolorek(KOLOR_HORYZONTU);
  const gora = kolorek("#3d7cc9");
  const punkty = ksztalt.attributes.position;
  for (let i = 0; i < punkty.count; i++) {
    const wysoko = Math.max(0, punkty.getY(i) / 150);         // 0 przy horyzoncie, 1 na samej górze
    const kolor = dol.clone().lerp(gora, Math.pow(wysoko, 0.6));
    kolory.push(kolor.r, kolor.g, kolor.b);
  }
  ksztalt.setAttribute("color", new THREE.Float32BufferAttribute(kolory, 3));
  const kula = new THREE.Mesh(ksztalt, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  kula.renderOrder = -1;
  return kula;
})();
scena.add(niebo);

// Słońce na niebie: jasna kula z blaskiem dookoła. Jest tam, skąd świeci światło.
const KIERUNEK_SLONCA = new THREE.Vector3(8, 20, 6).normalize();
(function () {
  const tarcza = new THREE.Mesh(
    new THREE.SphereGeometry(6, 24, 16),
    new THREE.MeshBasicMaterial({ color: kolorek("#fff8e1"), fog: false, depthWrite: false })
  );
  const blask = new THREE.Mesh(
    new THREE.SphereGeometry(14, 24, 16),
    new THREE.MeshBasicMaterial({ color: kolorek("#fff3c4"), transparent: true, opacity: 0.25, fog: false, depthWrite: false })
  );
  for (const kula of [blask, tarcza]) {
    kula.position.copy(KIERUNEK_SLONCA).multiplyScalar(130);
    kula.renderOrder = -1;
    niebo.add(kula);
  }
})();

// ----- Kamera: nasze oko, które patrzy na świat -----
const kamera = new THREE.PerspectiveCamera(50, plansza.width / plansza.height, 0.1, 500);

// ----- Renderer: maluje to, co widzi kamera -----
const renderer = new THREE.WebGLRenderer({ canvas: plansza, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // cienie z miękkimi brzegami
renderer.outputEncoding = THREE.sRGBEncoding;           // kolory jak w prawdziwym świecie
renderer.toneMapping = THREE.ACESFilmicToneMapping;     // światło jak w kamerze filmowej
renderer.toneMappingExposure = 0.9;

// Gra na cały ekran: jak zmienisz rozmiar okna, gra też się dopasuje
function dopasujDoEkranu() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  kamera.aspect = window.innerWidth / window.innerHeight;
  kamera.updateProjectionMatrix();
}
dopasujDoEkranu();
window.addEventListener("resize", dopasujDoEkranu);

// ----- Światło -----
scena.add(new THREE.HemisphereLight("#cfe6ff", "#4a5a2a", 0.45)); // światło z nieba i odbite od trawy
const slonce = new THREE.DirectionalLight("#fff1d6", 1.3);        // mocne, ciepłe słońce
slonce.castShadow = true;
slonce.shadow.mapSize.set(4096, 4096);
slonce.shadow.bias = -0.0005;     // bez tego na drzewach widać brzydkie paski
slonce.shadow.normalBias = 0.03;
slonce.shadow.camera.left = -25;
slonce.shadow.camera.right = 25;
slonce.shadow.camera.top = 25;
slonce.shadow.camera.bottom = -25;
scena.add(slonce);
scena.add(slonce.target);

// ----- Pomocnicy do budowania -----
const farby = {};
function farba(kolor) {
  // matowa farba, jak drewno, futro, liście czy kamień
  if (!farby[kolor]) farby[kolor] = new THREE.MeshStandardMaterial({ color: kolorek(kolor), roughness: 0.9, metalness: 0 });
  return farby[kolor];
}

// Owal: kula, którą można rozciągnąć albo spłaszczyć (sx, sy, sz)
function owal(promien, kolor, x, y, z, sx, sy, sz) {
  const kawalek = klocek(new THREE.SphereGeometry(promien, 14, 12), kolor, x, y, z);
  kawalek.scale.set(sx, sy, sz);
  return kawalek;
}

// Faktura ziemi: obrazek z drobnych jaśniejszych i ciemniejszych plamek,
// rysowany przez sam program. Dzięki niemu trawa i piasek nie są gładkie jak plastik.
const fakturaZiemi = (function () {
  const plotno = document.createElement("canvas");
  plotno.width = 128;
  plotno.height = 128;
  const pedzel = plotno.getContext("2d");
  pedzel.fillStyle = "rgb(225,225,225)";
  pedzel.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 3000; i++) {
    const jasnosc = 170 + Math.floor(Math.random() * 85);
    pedzel.fillStyle = "rgb(" + jasnosc + "," + jasnosc + "," + jasnosc + ")";
    pedzel.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 3);
  }
  const faktura = new THREE.CanvasTexture(plotno);
  faktura.encoding = THREE.sRGBEncoding;
  return faktura;
})();

// Pomocnik: rysuje fakturę na małym obrazku 128 x 128
function zrobFakture(rysuj) {
  const plotno = document.createElement("canvas");
  plotno.width = 128;
  plotno.height = 128;
  const pedzel = plotno.getContext("2d");
  rysuj(pedzel);
  const faktura = new THREE.CanvasTexture(plotno);
  faktura.encoding = THREE.sRGBEncoding;
  faktura.wrapS = THREE.RepeatWrapping;
  faktura.wrapT = THREE.RepeatWrapping;
  return faktura;
}
function szary(pedzel, jasnosc, przezroczystosc) {
  pedzel.fillStyle = "rgba(" + jasnosc + "," + jasnosc + "," + jasnosc + "," + przezroczystosc + ")";
  pedzel.strokeStyle = pedzel.fillStyle;
}

// Futro: tysiące krótkich włosków, jaśniejszych i ciemniejszych
const fakturaFutra = zrobFakture(function (pedzel) {
  szary(pedzel, 200, 1);
  pedzel.fillRect(0, 0, 128, 128);
  pedzel.lineWidth = 1;
  for (let i = 0; i < 2500; i++) {
    szary(pedzel, 130 + Math.floor(Math.random() * 125), 0.8);
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    pedzel.beginPath();
    pedzel.moveTo(x, y);
    pedzel.lineTo(x + Math.random() * 2 - 1, y + 3 + Math.random() * 5); // włosek w dół
    pedzel.stroke();
  }
});

// Skóra: delikatne plamki
const fakturaSkory = zrobFakture(function (pedzel) {
  szary(pedzel, 235, 1);
  pedzel.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 600; i++) {
    szary(pedzel, 195 + Math.floor(Math.random() * 50), 0.5);
    pedzel.beginPath();
    pedzel.arc(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 0, Math.PI * 2);
    pedzel.fill();
  }
});

// Materiał: splot nitek i brudne plamy
const fakturaMaterialu = zrobFakture(function (pedzel) {
  szary(pedzel, 225, 1);
  pedzel.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 2) {
    szary(pedzel, 200, 0.6);
    pedzel.fillRect(i, 0, 1, 128); // nitki pionowe
    szary(pedzel, 245, 0.4);
    pedzel.fillRect(0, i, 128, 1); // nitki poziome
  }
  for (let i = 0; i < 14; i++) {
    szary(pedzel, 110 + Math.floor(Math.random() * 60), 0.4);
    pedzel.beginPath();
    pedzel.arc(Math.random() * 128, Math.random() * 128, 3 + Math.random() * 10, 0, Math.PI * 2);
    pedzel.fill(); // brudna plama
  }
});

// Czyste płótno (na kimono): tylko splot nitek, bez brudnych plam
const fakturaPlotna = zrobFakture(function (pedzel) {
  szary(pedzel, 235, 1);
  pedzel.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 2) {
    szary(pedzel, 215, 0.6);
    pedzel.fillRect(i, 0, 1, 128);
    szary(pedzel, 250, 0.4);
    pedzel.fillRect(0, i, 128, 1);
  }
});

// Tworzy farbę z fakturą. polysk: 0 = błyszczy jak szkło, 1 = całkiem matowa
const farbyZFaktura = {};
function farbaZFaktura(kolor, faktura, polysk, metal) {
  const klucz = kolor + faktura.uuid + polysk + (metal || 0);
  if (!farbyZFaktura[klucz]) {
    farbyZFaktura[klucz] = new THREE.MeshStandardMaterial({ color: kolorek(kolor), map: faktura, roughness: polysk, metalness: metal || 0 });
  }
  return farbyZFaktura[klucz];
}

// Błyszcząca farba bez faktury: oczy, metal
const farbyLsniace = {};
function farbaLsniaca(kolor, polysk, metal) {
  const klucz = kolor + polysk + metal;
  if (!farbyLsniace[klucz]) {
    farbyLsniace[klucz] = new THREE.MeshStandardMaterial({ color: kolorek(kolor), roughness: polysk, metalness: metal });
  }
  return farbyLsniace[klucz];
}

// Podmienia zwykłe farby w modelu na prawdziwsze (futro, skóra, materiał...)
function podmienFarby(model, zamiany) {
  model.traverse(function (czesc) {
    if (!czesc.material) return;
    for (const [kolor, nowa] of zamiany) {
      if (czesc.material === farba(kolor)) czesc.material = nowa;
    }
  });
}

// Tworzy kształt w danym miejscu. Rzuca cień i dostaje cień.
function klocek(ksztalt, kolor, x, y, z) {
  const kawalek = new THREE.Mesh(ksztalt, farba(kolor));
  kawalek.position.set(x, y, z);
  kawalek.castShadow = true;
  kawalek.receiveShadow = true;
  return kawalek;
}

// ----- Rzeczy, które stoją na mapie -----
// Kwitnące drzewo: krzywy pień i różowe chmurki kwiatków
const KOLORY_KWIATOW_DRZEWA = ["#f8bbd0", "#f48fb1", "#f06292"];
const WYSOKOSC_DRZEWA = 5.4; // na tej wysokości małpka chodzi po czubkach drzew

function zrobKwitnaceDrzewo() {
  const drzewo = new THREE.Group();
  const pien = klocek(new THREE.CylinderGeometry(0.15, 0.25, 1.4), "#5d4037", 0, 0.7, 0);
  pien.rotation.z = 0.15; // lekko krzywy
  drzewo.add(pien);
  // korona przyczepiona na górze pnia, żeby mogła bujać się na wietrze
  drzewo.korona = new THREE.Group();
  drzewo.korona.userData.kolysze = true; // korona buja się na wietrze
  drzewo.korona.position.y = 1.3;
  drzewo.add(drzewo.korona);
  const kepki = [[0, 1.8, 0, 0.75], [0.5, 1.55, 0.2, 0.55], [-0.45, 1.6, -0.2, 0.55], [0.1, 1.5, -0.5, 0.5], [-0.1, 2.25, 0.1, 0.45]];
  for (const [kx, ky, kz, r] of kepki) {
    const kolor = KOLORY_KWIATOW_DRZEWA[Math.floor(Math.random() * KOLORY_KWIATOW_DRZEWA.length)];
    drzewo.korona.add(klocek(new THREE.SphereGeometry(r, 10, 10), kolor, kx, ky - 1.3, kz));
  }
  drzewo.kolorLiscia = "#f48fb1"; // z tego drzewa spadają różowe płatki
  drzewo.scale.set(2, 2, 2); // duże drzewo, czubek na wysokości WYSOKOSC_DRZEWA
  drzewo.rotation.y = Math.random() * Math.PI * 2;
  return drzewo;
}

// Bambus: kilka wysokich zielonych tyczek z kolankami i listkami na górze
function zrobBambus() {
  const bambus = new THREE.Group();
  const ile = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < ile; i++) {
    const wysokosc = 1.4 + Math.random() * 1.0;
    const bx = Math.random() * 0.6 - 0.3;
    const bz = Math.random() * 0.6 - 0.3;
    bambus.add(klocek(new THREE.CylinderGeometry(0.05, 0.05, wysokosc), "#7cb342", bx, wysokosc / 2, bz)); // tyczka
    for (let y = 0.4; y < wysokosc; y += 0.4) {
      bambus.add(klocek(new THREE.CylinderGeometry(0.065, 0.065, 0.04), "#558b2f", bx, y, bz));           // kolanko
    }
    // kilka zaokrąglonych listków przy czubku, rozchylonych na boki
    for (let i = 0; i < 4; i++) {
      const galazka = new THREE.Group();
      galazka.position.set(bx, wysokosc - 0.12 - (i % 2) * 0.25, bz);
      galazka.rotation.y = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
      const listek = owal(0.13, "#689f38", 0, 0, 0.13, 0.55, 0.05, 1); // płaski, zaokrąglony listek
      listek.rotation.x = 0.35; // lekko opada
      galazka.add(listek);
      bambus.add(galazka);
    }
  }
  return bambus;
}

// Kawałek chińskiego mostka: drewniana kładka i czerwone poręcze ze złotymi kulkami.
// h1 to wysokość na jednym końcu, h2 na drugim, więc kładka może iść pod górkę.
function zrobMostek(h1, h2) {
  const mostek = new THREE.Group();
  const dlugosc = Math.hypot(KAFELEK, h2 - h1);
  const pochylenie = Math.atan2(h2 - h1, KAFELEK);
  const srodek = (h1 + h2) / 2;

  const kladka = klocek(new THREE.BoxGeometry(dlugosc, 0.12, 1.5), "#8d6e63", 0, srodek, 0);
  kladka.rotation.z = pochylenie;
  mostek.add(kladka);
  for (const strona of [-0.7, 0.7]) {
    const porecz = klocek(new THREE.BoxGeometry(dlugosc, 0.08, 0.08), "#c62828", 0, srodek + 0.6, strona);
    porecz.rotation.z = pochylenie;
    mostek.add(porecz);
    for (const px of [-0.9, 0, 0.9]) {
      const h = h1 + (h2 - h1) * (px + 1) / 2; // wysokość kładki w miejscu słupka
      mostek.add(klocek(new THREE.CylinderGeometry(0.05, 0.05, 0.6), "#c62828", px, h + 0.3, strona)); // słupek
      mostek.add(klocek(new THREE.SphereGeometry(0.07, 8, 8), "#ffc107", px, h + 0.66, strona));      // złota kulka
    }
  }
  // pod wysokim mostkiem dwie czerwone nogi do wody
  if (srodek > 0.3) {
    for (const strona of [-0.7, 0.7]) {
      mostek.add(klocek(new THREE.CylinderGeometry(0.07, 0.07, srodek + 0.3), "#8e2424", 0, (srodek - 0.3) / 2, strona));
    }
  }
  return mostek;
}

// Łuk mostka: gdzie się zaczyna, ile ma kawałków i czy idzie w bok, czy w górę mapy.
// Mostek idzie tam, gdzie po bokach nie ma wody.
function lukMostu(w, k) {
  const poziomo = !(swiat[w][k - 1] === "W" && swiat[w][k + 1] === "W");
  let poczatek = poziomo ? k : w;
  let koniec = poczatek;
  if (poziomo) {
    while (swiat[w][poczatek - 1] === "=") poczatek--;
    while (swiat[w][koniec + 1] === "=") koniec++;
  } else {
    while (swiat[poczatek - 1] && swiat[poczatek - 1][k] === "=") poczatek--;
    while (swiat[koniec + 1] && swiat[koniec + 1][k] === "=") koniec++;
  }
  const kawalki = koniec - poczatek + 1;
  return {
    poziomo: poziomo,
    od: (poczatek - 0.5) * KAFELEK,          // gdzie zaczyna się łuk
    dlugosc: kawalki * KAFELEK,              // jak długi jest łuk
    wysokosc: Math.min(1.5, 0.4 * kawalki),  // im dłuższy mostek, tym wyżej się wygina
  };
}

// Jak wysoko jest mostek w danym miejscu łuku: na końcach nisko, na środku wysoko
function wysokoscNaLuku(luk, miejsce) {
  const t = Math.min(1, Math.max(0, (miejsce - luk.od) / luk.dlugosc));
  return Math.sin(t * Math.PI) * luk.wysokosc;
}

// Jak wysoko jest ziemia pod postacią: na mostku wyżej, wszędzie indziej 0
function wysokoscZiemi(x, z) {
  if (kafelekW(x, z) === "T") return WYSOKOSC_DRZEWA; // na czubku drzewa
  if (kafelekW(x, z) !== "=") return 0;
  const k = Math.round(x / KAFELEK);
  const w = Math.round(z / KAFELEK);
  const luk = lukMostu(w, k);
  return wysokoscNaLuku(luk, luk.poziomo ? x : z);
}

// Lilia wodna: zielony listek na wodzie, czasem z różowym kwiatkiem
function zrobLilie() {
  const lilia = new THREE.Group();
  lilia.add(klocek(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12), "#43a047", 0, 0, 0));
  if (Math.random() < 0.5) {
    const kwiat = klocek(new THREE.ConeGeometry(0.12, 0.18, 6), "#f48fb1", 0.05, 0.1, 0);
    lilia.add(kwiat);
  }
  lilia.traverse(function (czesc) { czesc.castShadow = false; });
  return lilia;
}

function zrobDrzewo() {
  if (Math.random() < 0.3) return zrobKwitnaceDrzewo(); // co trzecie drzewo kwitnie na różowo
  const drzewo = new THREE.Group();
  drzewo.add(klocek(new THREE.CylinderGeometry(0.18, 0.25, 1), "#6d4c41", 0, 0.5, 0)); // pień
  // korona przyczepiona na górze pnia, żeby mogła bujać się na wietrze
  drzewo.korona = new THREE.Group();
  drzewo.korona.userData.kolysze = true; // korona buja się na wietrze
  drzewo.korona.position.y = 0.9;
  drzewo.add(drzewo.korona);
  drzewo.korona.add(klocek(new THREE.ConeGeometry(0.95, 1.2, 8), "#2e7d32", 0, 0.4, 0));  // dolne igły
  drzewo.korona.add(klocek(new THREE.ConeGeometry(0.75, 1.0, 8), "#388e3c", 0, 1.0, 0));  // środkowe igły
  drzewo.korona.add(klocek(new THREE.ConeGeometry(0.5, 0.8, 8), "#43a047", 0, 1.55, 0));  // czubek
  drzewo.kolorLiscia = "#558b2f"; // z tego drzewa spadają zielone igły
  // duże drzewo, czubek na wysokości WYSOKOSC_DRZEWA; każde jest trochę obrócone
  drzewo.scale.set(1.9, 1.9, 1.9);
  drzewo.rotation.y = Math.random() * Math.PI;
  return drzewo;
}

// Ozdoby na trawie: kwiatek albo kępka trawy. Nie blokują drogi.
const KOLORY_KWIATKOW = ["#ffeb3b", "#ffffff", "#e91e63", "#ab47bc", "#ff7043"];
function zrobOzdobe() {
  const ozdoba = new THREE.Group();
  if (Math.random() < 0.5) {
    const kolor = KOLORY_KWIATKOW[Math.floor(Math.random() * KOLORY_KWIATKOW.length)];
    ozdoba.add(klocek(new THREE.CylinderGeometry(0.02, 0.02, 0.3), "#33691e", 0, 0.15, 0)); // łodyżka
    ozdoba.add(klocek(new THREE.SphereGeometry(0.08, 8, 8), kolor, 0, 0.32, 0));           // płatki
  } else {
    for (let i = 0; i < 3; i++) {
      const zdzblo = klocek(new THREE.ConeGeometry(0.04, 0.3, 4), "#558b2f", (i - 1) * 0.06, 0.15, 0);
      zdzblo.rotation.z = (i - 1) * 0.3; // źdźbła rozchylone na boki
      ozdoba.add(zdzblo);
    }
  }
  ozdoba.traverse(function (czesc) { czesc.castShadow = false; });
  return ozdoba;
}

// Chmurka: kilka białych kul sklejonych razem
function zrobChmure() {
  const chmura = new THREE.Group();
  const ile = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < ile; i++) {
    const kula = klocek(new THREE.SphereGeometry(1 + Math.random() * 0.8, 10, 10), "#ffffff",
      i * 1.3 - ile * 0.6, Math.random() * 0.5, Math.random() * 1.2 - 0.6);
    kula.castShadow = false;
    kula.receiveShadow = false;
    chmura.add(kula);
  }
  chmura.scale.y = 0.6; // spłaszczona, jak prawdziwa chmura
  return chmura;
}

function zrobKamien() {
  const kamien = klocek(new THREE.DodecahedronGeometry(0.75), "#9e9e9e", 0, 0.5, 0);
  kamien.rotation.set(Math.random(), Math.random(), 0);
  return kamien;
}

// Domek jak ze starych Chin: czerwone słupy, dwa zielone dachy
// z podwiniętymi złotymi rogami i czerwone lampiony
const farbaLampionu = new THREE.MeshStandardMaterial({ color: kolorek("#e53935"), emissive: kolorek("#ff3d00"), emissiveIntensity: 0.8, roughness: 0.6 });

function zrobDach(szerokosc, wysokosc, y) {
  const dach = new THREE.Group();
  const spad = klocek(new THREE.ConeGeometry(szerokosc, wysokosc, 4), "#00796b", 0, y, 0); // zielone dachówki
  spad.rotation.y = Math.PI / 4;
  dach.add(spad);
  // złote rogi dachu podwinięte do góry
  const rog = szerokosc * 0.7;
  const rogi = [[rog, rog], [-rog, rog], [rog, -rog], [-rog, -rog]];
  for (const [rx, rz] of rogi) {
    dach.add(klocek(new THREE.ConeGeometry(0.07, 0.35, 6), "#ffc107", rx, y - wysokosc / 2 + 0.12, rz));
  }
  return dach;
}

function zrobLampion(x, y, z) {
  const lampion = new THREE.Group();
  const kula = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), farbaLampionu);
  kula.scale.y = 0.8;
  lampion.add(kula);
  lampion.add(klocek(new THREE.CylinderGeometry(0.06, 0.06, 0.05), "#ffc107", 0, 0.12, 0));  // złota czapeczka
  lampion.add(klocek(new THREE.CylinderGeometry(0.01, 0.01, 0.2), "#ffc107", 0, -0.18, 0)); // frędzelek
  lampion.position.set(x, y, z);
  return lampion;
}

function zrobDomek() {
  const domek = new THREE.Group();
  domek.add(klocek(new THREE.BoxGeometry(1.9, 0.2, 1.9), "#9e9e9e", 0, 0.1, 0));       // kamienny podest
  domek.add(klocek(new THREE.BoxGeometry(1.5, 1.3, 1.5), "#fff3e0", 0, 0.85, 0));      // jasne ściany sięgają pod dach
  // cztery czerwone słupy w rogach
  for (const [sx, sz] of [[0.8, 0.8], [-0.8, 0.8], [0.8, -0.8], [-0.8, -0.8]]) {
    domek.add(klocek(new THREE.CylinderGeometry(0.08, 0.08, 1.3), "#c62828", sx, 0.85, sz));
  }
  domek.add(klocek(new THREE.BoxGeometry(0.48, 0.78, 0.02), "#1a1310", 0, 0.6, 0.755)); // ciemne wnętrze za drzwiami
  // drzwi na zawiasie z lewej strony, żeby mogły się otwierać
  domek.drzwi = new THREE.Group();
  domek.drzwi.position.set(-0.25, 0.6, 0.77);
  domek.drzwi.add(klocek(new THREE.BoxGeometry(0.5, 0.8, 0.05), "#c62828", 0.25, 0, 0));   // czerwone drzwi
  domek.drzwi.add(klocek(new THREE.SphereGeometry(0.04, 6, 6), "#ffc107", 0.4, 0, 0.03));  // złota klamka
  domek.drzwi.userData.ruchome = true; // drzwi się otwierają, więc ich nie sklejamy
  domek.add(domek.drzwi);
  domek.add(klocek(new THREE.BoxGeometry(1.75, 0.14, 1.75), "#c62828", 0, 1.43, 0));  // czerwona belka pod dachem
  domek.add(zrobDach(1.7, 0.6, 1.65));                                                 // duży dach
  domek.add(klocek(new THREE.BoxGeometry(0.8, 0.85, 0.8), "#fff3e0", 0, 1.9, 0));      // górne piętro, stoi na dachu
  domek.add(klocek(new THREE.BoxGeometry(0.9, 0.1, 0.9), "#c62828", 0, 2.3, 0));       // czerwona belka pod małym dachem
  domek.add(zrobDach(1.0, 0.5, 2.55));                                                 // mały dach
  domek.add(klocek(new THREE.SphereGeometry(0.1, 8, 8), "#ffc107", 0, 2.85, 0));       // złota kulka na czubku
  domek.add(zrobLampion(0.65, 1.1, 1.0));                                              // lampiony przy wejściu
  domek.add(zrobLampion(-0.65, 1.1, 1.0));
  return domek;
}

// Skórka banana: żółta, z delikatnymi podłużnymi smugami i kilkoma brązowymi kropkami
let farbaSkorkiBanana = null;
function skorkaBanana() {
  if (!farbaSkorkiBanana) {
    const faktura = zrobFakture(function (pedzel) {
      pedzel.fillStyle = "#ffffff";
      pedzel.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 40; i++) {
        pedzel.fillStyle = "rgba(220, 200, 120, 0.25)";
        pedzel.fillRect(0, Math.random() * 128, 128, 1 + Math.random() * 2); // smugi wzdłuż banana
      }
      for (let i = 0; i < 25; i++) {
        pedzel.fillStyle = "rgba(110, 70, 30, " + (0.4 + Math.random() * 0.4) + ")";
        pedzel.beginPath();
        pedzel.arc(Math.random() * 128, Math.random() * 128, 0.6 + Math.random() * 1.4, 0, Math.PI * 2);
        pedzel.fill(); // brązowe kropki dojrzałego banana
      }
    });
    farbaSkorkiBanana = new THREE.MeshStandardMaterial({ color: kolorek("#f7d335"), map: faktura, roughness: 0.45 });
  }
  return farbaSkorkiBanana;
}

// Jeden banan: wygięty, gruby w środku, cieńszy na końcach, z brązowym czubkiem
function zrobJednegoBanana() {
  const banan = new THREE.Group();
  const punkty = [];
  for (let i = 0; i <= 12; i++) {
    const kat = -0.9 + (i / 12) * 1.8;
    // łuk zaczyna się w zerze, przy szypułce, więc banany w kiści wyrastają z jednego miejsca
    punkty.push(new THREE.Vector3(Math.sin(kat) * 0.38 + 0.298, -Math.cos(kat) * 0.38 + 0.38 - 0.144, 0));
  }
  const sciezka = new THREE.CatmullRomCurve3(punkty);
  const ksztalt = new THREE.TubeGeometry(sciezka, 24, 0.085, 7, false);
  // banan jest najgrubszy w środku, a na końcach się zwęża
  const pozycje = ksztalt.attributes.position;
  const srodek = new THREE.Vector3();
  const punkt = new THREE.Vector3();
  for (let ring = 0; ring <= 24; ring++) {
    const t = ring / 24;
    sciezka.getPointAt(t, srodek);
    const grubosc = 0.25 + 0.75 * Math.pow(Math.sin(t * Math.PI), 0.6);
    for (let r = 0; r <= 7; r++) {
      const i = ring * 8 + r;
      punkt.fromBufferAttribute(pozycje, i).sub(srodek).multiplyScalar(grubosc).add(srodek);
      pozycje.setXYZ(i, punkt.x, punkt.y, punkt.z);
    }
  }
  ksztalt.computeVertexNormals();
  const skorka = new THREE.Mesh(ksztalt, skorkaBanana());
  skorka.castShadow = true;
  banan.add(skorka);

  // brązowy czubek na końcu banana
  const koniec = sciezka.getPointAt(1);
  banan.add(owal(0.022, "#3e2a14", koniec.x + 0.005, koniec.y + 0.003, 0, 1, 1, 1));
  return banan;
}

// Banan do zebrania: kiść z trzech bananów, które wyrastają z jednej zielonej szypułki
function zrobBanana() {
  const kisc = new THREE.Group();
  const wnetrze = new THREE.Group();
  wnetrze.position.set(-0.3, -0.05, 0); // środek kiści w środku grupy
  kisc.add(wnetrze);
  for (let i = 0; i < 3; i++) {
    const banan = zrobJednegoBanana();
    banan.rotation.y = (i - 1) * 0.5;    // rozchylone jak wachlarz
    banan.rotation.z = -0.15 + Math.abs(i - 1) * 0.1;
    wnetrze.add(banan);
  }
  // wspólna szypułka: gruby zielono-brązowy ogonek, z którego rosną banany
  const szypulka = klocek(new THREE.CylinderGeometry(0.03, 0.045, 0.2, 8), "#6d7f2a", -0.07, 0.07, 0);
  szypulka.rotation.z = 1.0;
  wnetrze.add(szypulka);
  wnetrze.add(owal(0.05, "#5b6b22", 0, 0, 0, 1, 0.8, 1.2)); // zgrubienie, gdzie banany się łączą
  kisc.position.y = 0.9;
  return kisc;
}

// Wilczy wojownik: wilk chodzący na dwóch wilczych nogach (zgiętych jak u prawdziwego
// wilka), z futrem w różnych kolorach, plemiennymi malunkami na pysku i ramionach,
// naszyjnikiem z kłów i skórzanymi karwaszami. Szczęka się otwiera, ogon się kołysze.
// Czasem trafia się wódz stada (alfa): większy, z kościaną koroną i czerwonymi malunkami.
const SKORA_WOJOWNIKA = "#3b2a20";   // skórzany pas, rzemień i karwasze
const PAZUR = "#efe6d2";
const UMASZCZENIA_WILKOW = [
  { futro: "#7d7d7d", jasne: "#c9c9c9", ciemne: "#4f4f4f" }, // szary wilk
  { futro: "#3a3a3a", jasne: "#7a7a7a", ciemne: "#1f1f1f" }, // czarny wilk
  { futro: "#7a5a3c", jasne: "#c9a27a", ciemne: "#4a3424" }, // brązowy wilk
  { futro: "#d6d6d6", jasne: "#f4f4f4", ciemne: "#9e9e9e" }, // biały wilk z północy
];
const KOLORY_MALUNKOW = ["#1e88e5", "#c62828", "#fbc02d", "#43a047"];

// Łapa z pazurami: puszysta dłoń albo stopa i kilka ostrych, jasnych pazurów
function zrobLape(kolor, dlugoscPazurow) {
  const lapa = new THREE.Group();
  lapa.add(owal(0.075, kolor, 0, 0, 0.02, 1, 0.8, 1.2));
  for (const px of [-0.045, -0.015, 0.015, 0.045]) {
    const pazur = klocek(new THREE.ConeGeometry(0.016, dlugoscPazurow, 6), PAZUR, px, -0.03, 0.09);
    pazur.rotation.x = Math.PI / 2 + 0.5; // pazur do przodu i lekko w dół
    lapa.add(pazur);
  }
  return lapa;
}

// Kawałek walca ustawiony między dwoma punktami (y, z) w płaszczyźnie nogi
function kosc(kolor, r1, r2, y1, z1, y2, z2) {
  const dlugosc = Math.hypot(y2 - y1, z2 - z1);
  const czesc = klocek(new THREE.CylinderGeometry(r1, r2, dlugosc, 10), kolor, 0, (y1 + y2) / 2, (z1 + z2) / 2);
  czesc.rotation.x = Math.atan2(-(z2 - z1), -(y2 - y1)); // pochylenie od punktu 1 do punktu 2
  return czesc;
}

// Wilcza noga: udo do przodu, łydka do tyłu, długa śródstopie i łapa (jak u prawdziwego wilka)
function zrobNogeWojownika(x, kolory) {
  const noga = new THREE.Group();
  noga.position.set(x, 0.9, 0); // biodro
  noga.add(owal(0.13, kolory.futro, 0, -0.15, 0.05, 1, 1.6, 1.1));               // umięśnione udo
  noga.add(kosc(kolory.futro, 0.09, 0.07, -0.3, 0.12, -0.62, -0.1));              // łydka do tyłu
  noga.add(owal(0.06, kolory.futro, 0, -0.62, -0.1, 1, 1, 1));                     // staw skokowy
  noga.add(kosc(kolory.futro, 0.055, 0.05, -0.62, -0.1, -0.84, -0.02));           // śródstopie
  const stopa = zrobLape(kolory.ciemne, 0.06);
  stopa.position.set(0, -0.86, 0.04);
  noga.add(stopa);
  return noga;
}

function zrobRekeWojownika(x, kolory, malunek) {
  const reka = new THREE.Group();
  reka.position.set(x, 1.5, 0); // ramię
  reka.add(owal(0.12, kolory.futro, 0, 0, 0, 1.2, 1, 1.2));                                       // bark
  for (let i = 0; i < 3; i++) {
    const kepka = klocek(new THREE.ConeGeometry(0.035, 0.12, 5), kolory.futro, (i - 1) * 0.05 * Math.sign(x), 0.1, (i - 1) * 0.04);
    kepka.rotation.z = -Math.sign(x) * 0.6;                                                       // nastroszone futro na barku
    reka.add(kepka);
  }
  reka.add(klocek(new THREE.CylinderGeometry(0.085, 0.07, 0.3, 10), kolory.futro, 0, -0.15, 0));  // ramię
  reka.add(klocek(new THREE.CylinderGeometry(0.087, 0.085, 0.03, 10), malunek, 0, -0.12, 0));     // malunek: pasek na ramieniu
  reka.add(klocek(new THREE.CylinderGeometry(0.083, 0.08, 0.03, 10), malunek, 0, -0.18, 0));
  reka.lokiec = new THREE.Group();
  reka.lokiec.position.y = -0.3;
  reka.add(reka.lokiec);
  reka.lokiec.add(owal(0.065, kolory.futro, 0, 0, 0, 1, 1, 1));                                     // łokieć
  reka.lokiec.add(klocek(new THREE.CylinderGeometry(0.065, 0.055, 0.26, 8), kolory.futro, 0, -0.14, 0));
  reka.lokiec.add(klocek(new THREE.CylinderGeometry(0.07, 0.065, 0.14, 8), SKORA_WOJOWNIKA, 0, -0.17, 0)); // skórzany karwasz
  const dlon = zrobLape(kolory.ciemne, 0.14);
  dlon.position.set(0, -0.32, 0);
  dlon.rotation.x = -Math.PI / 2; // pazury patrzą w dół, wzdłuż ręki
  reka.lokiec.add(dlon);
  return reka;
}

function zrobWojownika() {
  const wojownik = new THREE.Group();
  const kolory = wylosuj(UMASZCZENIA_WILKOW);
  const alfa = Math.random() < 0.15; // wódz stada
  const malunek = alfa ? "#c62828" : wylosuj(KOLORY_MALUNKOW);
  wojownik.alfa = alfa;

  // nogi
  wojownik.nogi = [zrobNogeWojownika(-0.14, kolory), zrobNogeWojownika(0.14, kolory)];
  wojownik.add(wojownik.nogi[0]);
  wojownik.add(wojownik.nogi[1]);

  // futrzane ciało pochylone do przodu, jaśniejsza pierś i brzuch
  const tulow = klocek(new THREE.CylinderGeometry(0.29, 0.2, 0.62, 12), kolory.futro, 0, 1.25, 0);
  tulow.scale.z = 0.68;
  tulow.rotation.x = 0.12;
  wojownik.add(tulow);
  wojownik.add(owal(0.2, kolory.jasne, 0, 1.2, 0.11, 1, 1.4, 0.5));                                // jasna pierś
  wojownik.add(owal(0.31, kolory.futro, 0, 1.45, -0.02, 1.15, 0.55, 0.8));                         // szerokie ramiona
  wojownik.add(owal(0.26, kolory.ciemne, 0, 1.38, -0.12, 1.1, 0.8, 0.6));                          // ciemniejszy grzbiet
  for (let i = 0; i < 5; i++) {
    const kepka = klocek(new THREE.ConeGeometry(0.04, 0.16, 5), kolory.ciemne, (i - 2) * 0.07, 1.52, -0.2);
    kepka.rotation.x = -0.9;                                                                       // nastroszona sierść na karku
    wojownik.add(kepka);
  }
  const pas = klocek(new THREE.CylinderGeometry(0.22, 0.22, 0.07, 12), SKORA_WOJOWNIKA, 0, 0.96, 0);
  pas.scale.z = 0.7;
  wojownik.add(pas);
  const rzemien = klocek(new THREE.BoxGeometry(0.06, 0.7, 0.02), SKORA_WOJOWNIKA, 0, 1.25, 0.18);
  rzemien.rotation.z = 0.6; // rzemień na ukos przez pierś
  wojownik.add(rzemien);
  wojownik.add(owal(0.17, kolory.jasne, 0, 1.56, 0.04, 1.3, 0.7, 1.1));                            // gęsta grzywa na szyi

  // naszyjnik z kłów
  const rzemyk = klocek(new THREE.TorusGeometry(0.17, 0.008, 6, 20), SKORA_WOJOWNIKA, 0, 1.5, 0.03);
  rzemyk.rotation.x = Math.PI / 2 - 0.5;
  wojownik.add(rzemyk);
  for (const kx of [-0.08, 0, 0.08]) {
    const kiel = klocek(new THREE.ConeGeometry(0.014, 0.06, 6), PAZUR, kx, 1.42, 0.18 - Math.abs(kx) * 0.3);
    kiel.rotation.x = Math.PI; // kieł wisi w dół
    wojownik.add(kiel);
  }

  // puszysty wilczy ogon na zawiasie, żeby się kołysał
  wojownik.ogon = new THREE.Group();
  wojownik.ogon.position.set(0, 0.95, -0.18);
  wojownik.add(wojownik.ogon);
  const punkty = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    punkty.push(new THREE.Vector3(0, -t * 0.5 + t * t * 0.2, -t * 0.55));
  }
  const ogon = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punkty), 16, 0.075, 8, false), farba(kolory.futro));
  ogon.castShadow = true;
  wojownik.ogon.add(ogon);
  wojownik.ogon.add(owal(0.085, kolory.jasne, 0, -0.33, -0.56, 1, 1, 1.3));                        // jasny koniuszek

  // wilcza głowa
  const glowa = new THREE.Group();
  glowa.position.set(0, 1.62, 0.06);
  glowa.rotation.x = 0.15; // głowa trochę pochylona, jak u skradającego się wilka
  wojownik.add(glowa);
  wojownik.glowa = glowa;
  glowa.add(owal(0.2, kolory.futro, 0, 0.2, 0, 1, 0.95, 1.05));            // czaszka
  glowa.add(owal(0.13, kolory.jasne, 0, 0.12, 0.12, 1.25, 0.85, 1));      // jaśniejsze policzki
  for (const ox of [-1, 1]) {
    glowa.add(owal(0.07, kolory.jasne, ox * 0.15, 0.07, 0.05, 0.7, 1, 0.9)); // puszyste futro na policzkach
  }
  glowa.add(owal(0.085, kolory.futro, 0, 0.19, 0.27, 0.85, 0.65, 1.55));  // długi pysk (górna szczęka)
  glowa.add(owal(0.05, kolory.futro, 0, 0.26, 0.2, 0.9, 0.5, 1.4));       // grzbiet nosa
  glowa.add(owal(0.032, "#111111", 0, 0.22, 0.41, 1.25, 0.9, 1));         // czarny nos
  for (const ox of [-0.035, 0.035]) {
    const kiel = klocek(new THREE.ConeGeometry(0.012, 0.05, 6), PAZUR, ox, 0.13, 0.36);
    kiel.rotation.x = Math.PI; // górny kieł
    glowa.add(kiel);
  }
  // dolna szczęka na zawiasie: otwiera się, kiedy wilk wyje albo kłapie zębami
  wojownik.szczeka = new THREE.Group();
  wojownik.szczeka.position.set(0, 0.13, 0.15);
  glowa.add(wojownik.szczeka);
  wojownik.szczeka.add(owal(0.065, kolory.jasne, 0, -0.02, 0.12, 0.8, 0.4, 1.5));
  wojownik.szczeka.add(owal(0.04, "#d97a8a", 0, 0.0, 0.12, 0.7, 0.25, 1.3)); // różowy język

  for (const ox of [-0.075, 0.075]) {
    const oko = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), new THREE.MeshBasicMaterial({ color: kolorek("#ffca28") }));
    oko.position.set(ox, 0.25, 0.18);                                         // świecące żółte oko
    glowa.add(oko);
    glowa.add(owal(0.01, "#111111", ox, 0.25, 0.203, 0.6, 1.6, 0.5));         // wąska źrenica
    glowa.add(owal(0.04, kolory.ciemne, ox, 0.29, 0.17, 1.3, 0.35, 0.6));    // groźna brew
    // plemienne malunki: dwa paski na policzku
    for (const py of [0.17, 0.13]) {
      const pasek = klocek(new THREE.BoxGeometry(0.07, 0.012, 0.01), malunek, ox * 1.55, py, 0.155);
      pasek.rotation.y = ox * 8;
      glowa.add(pasek);
    }
    const ucho = klocek(new THREE.ConeGeometry(0.065, 0.18, 6), kolory.futro, ox * 1.6, 0.43, -0.02);
    ucho.rotation.z = -ox * 3;                                                 // spiczaste wilcze ucho
    glowa.add(ucho);
    const srodekUcha = klocek(new THREE.ConeGeometry(0.035, 0.11, 6), "#b98a8a", ox * 1.6, 0.42, 0.01);
    srodekUcha.rotation.z = -ox * 3;
    glowa.add(srodekUcha);
  }
  if (alfa) {
    // wódz stada: kościana korona z zagiętymi rogami
    for (const ox of [-1, 1]) {
      const rog = klocek(new THREE.ConeGeometry(0.03, 0.22, 6), PAZUR, ox * 0.1, 0.42, 0.04);
      rog.rotation.z = -ox * 0.5;
      rog.rotation.x = -0.4;
      glowa.add(rog);
    }
    const opaska = klocek(new THREE.TorusGeometry(0.18, 0.015, 6, 20), PAZUR, 0, 0.3, 0);
    opaska.rotation.x = Math.PI / 2 + 0.2;
    glowa.add(opaska);
  }

  // ręce z pazurami
  wojownik.rece = [zrobRekeWojownika(-0.36, kolory, malunek), zrobRekeWojownika(0.36, kolory, malunek)];
  wojownik.add(wojownik.rece[0]);
  wojownik.add(wojownik.rece[1]);

  // prawdziwe futro, skóra, błyszczące pazury i kły
  podmienFarby(wojownik, [
    [kolory.futro, farbaZFaktura(kolory.futro, fakturaFutra, 1)],
    [kolory.jasne, farbaZFaktura(kolory.jasne, fakturaFutra, 1)],
    [kolory.ciemne, farbaZFaktura(kolory.ciemne, fakturaFutra, 1)],
    [SKORA_WOJOWNIKA, farbaZFaktura(SKORA_WOJOWNIKA, fakturaSkory, 0.55)],
    [PAZUR, farbaLsniaca(PAZUR, 0.25, 0)],
    ["#111111", farbaLsniaca("#111111", 0.2, 0)],
    ["#d97a8a", farbaLsniaca("#d97a8a", 0.35, 0)],
    [malunek, farbaLsniaca(malunek, 0.8, 0)],
  ]);

  // wódz jest większy, zwiadowcy trochę mniejsi
  const wielkosc = alfa ? 1.15 : 0.92 + Math.random() * 0.12;
  wojownik.scale.set(wielkosc, wielkosc, wielkosc);
  return wojownik;
}

// Wilk się rusza: ogon kołysze się w biegu, szczęka kłapie, a kiedy zauważy Kiko,
// zatrzymuje się, unosi głowę i wyje do nieba
function animujWilka(wojownik, biegnie) {
  wojownik.ogon.rotation.y = Math.sin(czas * (biegnie ? 0.25 : 0.06) + wojownik.startX) * (biegnie ? 0.45 : 0.15);
  wojownik.ogon.rotation.x = biegnie ? -0.4 : 0; // w biegu ogon idzie do góry
  let celGlowy = 0.15;
  let celSzczeki = 0.03;
  if (wojownik.wyje > 0) {
    celGlowy = -0.7; // pysk do nieba
    celSzczeki = 0.55;
  } else if (biegnie) {
    celSzczeki = 0.15 + Math.max(0, Math.sin(czas * 0.3 + wojownik.startZ)) * 0.3; // kłapie zębami
  }
  wojownik.glowa.rotation.x += (celGlowy - wojownik.glowa.rotation.x) * 0.15;
  wojownik.szczeka.rotation.x += (celSzczeki - wojownik.szczeka.rotation.x) * 0.3;
}

// Odbicie świata w metalu: małe obrazki nieba (u góry), horyzontu i trawy (na dole).
// Dzięki nim stal i złoto błyszczą, jakby odbijały prawdziwe niebo.
const odbicieSwiata = (function () {
  function bok(gora, srodek, dol) {
    const plotno = document.createElement("canvas");
    plotno.width = 64;
    plotno.height = 64;
    const pedzel = plotno.getContext("2d");
    const przejscie = pedzel.createLinearGradient(0, 0, 0, 64);
    przejscie.addColorStop(0, gora);
    przejscie.addColorStop(0.5, srodek);
    przejscie.addColorStop(1, dol);
    pedzel.fillStyle = przejscie;
    pedzel.fillRect(0, 0, 64, 64);
    return plotno;
  }
  const scianka = bok("#6fa8dc", "#e3f0fa", "#5a7a3a");
  const sufit = bok("#6fa8dc", "#6fa8dc", "#6fa8dc");
  const podloga = bok("#4e6b32", "#4e6b32", "#4e6b32");
  const odbicie = new THREE.CubeTexture([scianka, scianka, sufit, podloga, scianka, scianka]);
  odbicie.encoding = THREE.sRGBEncoding;
  odbicie.needsUpdate = true;
  return odbicie;
})();

const farbaMetalu = new THREE.MeshStandardMaterial({ color: kolorek("#3a3f44"), metalness: 0.9, roughness: 0.35, envMap: odbicieSwiata });
const farbaCiemnegoMetalu = new THREE.MeshStandardMaterial({ color: kolorek("#1c1f22"), metalness: 0.9, roughness: 0.5, envMap: odbicieSwiata });
const farbaBlysku = new THREE.MeshBasicMaterial({ color: kolorek("#ffe082"), transparent: true, opacity: 0.9 });

// Kij bojowy mistrza z bambusa: długa jasnobrązowa tyczka z kolankami co kawałek
// i czerwonymi owijkami z materiału w miejscach chwytu.
// Kij leży wzdłuż osi z. Dłoń trzyma go w zerze, więc kij wystaje
// trochę do tyłu (-0.25) i dużo do przodu (aż do 1.75).
function zrobPatyk() {
  const patyk = new THREE.Group();
  const bambus = farbaZFaktura("#c9a26b", fakturaFutra, 0.45);    // jasnobrązowy, suszony bambus
  const kolanko = farbaZFaktura("#8a6a42", fakturaFutra, 0.6);    // ciemniejsze zgrubienia
  const owijka = farbaZFaktura("#b71c1c", fakturaMaterialu, 1);
  const kawalek = function (ksztalt, material, z) {
    const czesc = new THREE.Mesh(ksztalt, material);
    czesc.rotation.x = Math.PI / 2; // walec leży wzdłuż kija
    czesc.position.z = z;
    czesc.castShadow = true;
    patyk.add(czesc);
    return czesc;
  };
  kawalek(new THREE.CylinderGeometry(0.034, 0.036, 2.0, 12), bambus, 0.75);          // bambusowa tyczka
  for (let z = -0.2; z <= 1.71; z += 0.32) {
    kawalek(new THREE.CylinderGeometry(0.041, 0.041, 0.03, 12), kolanko, z);          // kolanko bambusa
  }
  kawalek(new THREE.CylinderGeometry(0.036, 0.036, 0.01, 12), kolanko, -0.25);       // przycięty koniec na dole
  kawalek(new THREE.CylinderGeometry(0.034, 0.034, 0.01, 12), kolanko, 1.75);        // przycięty koniec na górze
  kawalek(new THREE.CylinderGeometry(0.039, 0.039, 0.18, 12), owijka, 0.0);          // owijka w miejscu chwytu
  kawalek(new THREE.CylinderGeometry(0.039, 0.039, 0.18, 12), owijka, 0.75);         // owijka na środku
  return patyk;
}

// Kij leżący w świecie: wbity pionowo w ziemię, powoli się kręci
function zrobPatykNaZiemi() {
  const grupa = new THREE.Group();
  const patyk = zrobPatyk();
  patyk.rotation.x = -Math.PI / 2; // pionowo, do góry
  patyk.position.y = 0.2;
  grupa.add(patyk);
  return grupa;
}

const BUDOWNICZY = {
  drzewo: zrobDrzewo,
  kamien: zrobKamien,
  domek: zrobDomek,
  banan: zrobBanana,
  wojownik: zrobWojownika,
  patyk: zrobPatykNaZiemi,
  gwiazdki: zrobGwiazdkiNaZiemi,
  studnia: zrobStudnie,
};

// ----- Małpka (zrobiona z kulek) -----
function zrobMalpke() {
  const m = new THREE.Group();
  const brazowy = "#6d4c41"; // futro
  const jasny = "#e0b896";   // skóra na buzi, dłoniach i stopach
  const ciemny = "#4e342e";

  // tułów: trochę wydłużony, z jaśniejszym brzuchem
  m.add(owal(0.36, brazowy, 0, 0.52, -0.02, 0.95, 1.15, 0.8));
  m.add(owal(0.27, "#a1887f", 0, 0.47, 0.12, 0.85, 1.0, 0.6));

  // białe kimono z czarnym pasem
  const KIMONO = "#f4f2ea";
  const KLAPA = "#e2ded2";
  m.add(owal(0.375, KIMONO, 0, 0.52, -0.02, 0.95, 1.1, 0.82));          // kurtka kimona
  for (const strona of [-1, 1]) {
    const klapa = klocek(new THREE.BoxGeometry(0.09, 0.42, 0.02), KLAPA, strona * 0.07, 0.68, 0.27);
    klapa.rotation.z = strona * 0.45;                                   // klapy krzyżują się na piersi
    klapa.rotation.x = -0.35;
    m.add(klapa);
  }
  const pas = new THREE.Group();
  pas.position.set(0, 0.42, -0.02);
  pas.scale.set(1, 1, 0.84);
  m.add(pas);
  const obwod = klocek(new THREE.TorusGeometry(0.345, 0.038, 8, 28), "#151515", 0, 0, 0);
  obwod.rotation.x = Math.PI / 2;
  pas.add(obwod);                                                        // czarny pas dookoła
  m.add(klocek(new THREE.BoxGeometry(0.09, 0.07, 0.05), "#151515", 0, 0.42, 0.3)); // węzeł
  for (const strona of [-1, 1]) {
    const koniec = klocek(new THREE.BoxGeometry(0.05, 0.2, 0.015), "#151515", strona * 0.05, 0.32, 0.31);
    koniec.rotation.z = strona * 0.3;                                   // dwa końce pasa zwisają z węzła
    m.add(koniec);
  }

  // głowa
  m.add(owal(0.28, brazowy, 0, 1.1, 0, 1, 0.95, 0.95));
  for (let i = -1; i <= 1; i++) {
    const wlos = klocek(new THREE.ConeGeometry(0.05, 0.14, 6), brazowy, i * 0.06, 1.37, -0.02);
    wlos.rotation.z = -i * 0.4; // czupryna na czubku głowy
    m.add(wlos);
  }
  // duży słomkowy kapelusz, taki jak noszą ludzie w wiosce
  m.kapelusz = new THREE.Group();
  m.kapelusz.position.set(0, 1.3, -0.02);
  m.kapelusz.rotation.x = -0.12; // trochę zsunięty do tyłu
  m.add(m.kapelusz);
  m.kapelusz.add(klocek(new THREE.ConeGeometry(0.55, 0.3, 24), "#d9b56b", 0, 0.15, 0));          // spiczasty kapelusz
  const rondo = klocek(new THREE.TorusGeometry(0.54, 0.02, 6, 32), "#c9a55b", 0, 0.005, 0);
  rondo.rotation.x = Math.PI / 2;
  m.kapelusz.add(rondo);                                                                         // brzeg ronda
  const wstazka = klocek(new THREE.CylinderGeometry(0.32, 0.43, 0.06, 24, 1, true), "#c62828", 0, 0.1, 0);
  m.kapelusz.add(wstazka);                                                                       // czerwona wstążka
  m.kapelusz.add(klocek(new THREE.SphereGeometry(0.035, 8, 8), "#c9a55b", 0, 0.3, 0));           // czubek
  for (const strona of [-1, 1]) {
    const sznurek = klocek(new THREE.CylinderGeometry(0.006, 0.006, 0.42, 4), "#6d4c41", strona * 0.22, -0.2, 0.06);
    sznurek.rotation.z = strona * 0.25; // sznurek pod brodę
    m.kapelusz.add(sznurek);
  }

  m.add(owal(0.2, jasny, 0, 1.08, 0.17, 1.05, 1.0, 0.55));   // buzia
  m.add(owal(0.13, jasny, 0, 0.99, 0.26, 1.25, 0.8, 0.9));   // pyszczek
  // czarna maska ninja: zakrywa nos i usta, wiązana z tyłu głowy
  m.add(owal(0.16, "#151515", 0, 0.98, 0.235, 1.18, 0.66, 0.98));      // maska na buzi
  const opaska = new THREE.Group();
  opaska.position.set(0, 1.0, 0);
  opaska.scale.set(1, 1, 0.95);
  m.add(opaska);
  const obwodMaski = klocek(new THREE.TorusGeometry(0.265, 0.03, 6, 24), "#151515", 0, 0, 0);
  obwodMaski.rotation.x = Math.PI / 2;
  opaska.add(obwodMaski);                                              // opaska dookoła głowy
  m.add(owal(0.04, "#151515", 0, 1.0, -0.27, 1, 1, 1));                // węzeł z tyłu
  for (const strona of [-1, 1]) {
    const koniecMaski = klocek(new THREE.BoxGeometry(0.04, 0.22, 0.012), "#151515", strona * 0.04, 0.9, -0.29);
    koniecMaski.rotation.z = strona * 0.35;                            // dwa końce powiewają z tyłu
    m.add(koniecMaski);
  }
  m.add(owal(0.022, ciemny, -0.035, 1.02, 0.37, 1, 1, 1));   // dziurka w nosie
  m.add(owal(0.022, ciemny, 0.035, 1.02, 0.37, 1, 1, 1));    // dziurka w nosie
  m.add(klocek(new THREE.BoxGeometry(0.12, 0.015, 0.02), "#5d4037", 0, 0.94, 0.35)); // usta
  for (const ox of [-0.085, 0.085]) {
    m.add(owal(0.05, "#ffffff", ox, 1.13, 0.27, 1, 1, 0.7));        // białko oka
    m.add(owal(0.028, "#3e2723", ox, 1.13, 0.31, 1, 1, 0.7));       // źrenica
    m.add(owal(0.01, "#ffffff", ox - 0.01, 1.14, 0.33, 1, 1, 1));   // błysk w oku
    m.add(owal(0.06, ciemny, ox, 1.19, 0.27, 1.6, 0.5, 0.8));       // brew
    m.add(owal(0.1, jasny, ox * 3.4, 1.1, 0, 0.5, 1, 1));           // ucho
    m.add(owal(0.06, "#c49a7a", ox * 3.65, 1.1, 0.01, 0.4, 1, 1));  // środek ucha
  }

  // lewa ręka: bujała się przy chodzeniu
  m.lewaReka = zrobReke(0.38, brazowy, jasny);
  dodajRekaw(m.lewaReka);
  m.add(m.lewaReka);

  // ogon: zakręcony łuk z tyłu, który merda
  m.ogon = new THREE.Group();
  m.ogon.position.set(0, 0.3, -0.25);
  const punktyOgona = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 1.3;  // ogon idzie do tyłu, w górę i zawija się na końcu
    const r = 0.32 - i * 0.012;
    punktyOgona.push(new THREE.Vector3(0, r * (1 - Math.cos(a)), -r * Math.sin(a) - i * 0.015));
  }
  const ogon = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punktyOgona), 24, 0.04, 8, false),
    farba(brazowy)
  );
  ogon.castShadow = true;
  m.ogon.add(ogon);
  m.add(m.ogon);

  // prawa ręka: przyczepiona w ramieniu, żeby mogła trzymać kij
  m.reka = zrobReke(-0.38, brazowy, jasny);
  dodajRekaw(m.reka);
  m.add(m.reka);

  // nogi: przyczepione w biodrze, żeby mogły się bujać przy chodzeniu
  m.nogi = [zrobNoge(-0.16, brazowy, jasny), zrobNoge(0.16, brazowy, jasny)];
  for (const noga of m.nogi) {
    noga.add(klocek(new THREE.CylinderGeometry(0.12, 0.11, 0.22, 10), "#f4f2ea", 0, -0.08, 0)); // nogawka kimona
  }
  m.add(m.nogi[0]);
  m.add(m.nogi[1]);

  // kij w prawej dłoni, schowany, dopóki małpka go nie znajdzie
  m.patyk = zrobPatyk();
  m.patyk.position.set(0, -0.58, 0.02);
  m.patyk.visible = false;
  m.reka.add(m.patyk);

  // biały krąg w powietrzu, kiedy Kiko kręci się z kijem
  m.slad = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 2.4, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  );
  m.slad.rotation.x = Math.PI / 2; // leży płasko przed małpką
  m.slad.position.y = 0.8;
  m.slad.visible = false;
  m.add(m.slad);

  // prawdziwe futro, skóra i błyszczące oczy
  podmienFarby(m, [
    [brazowy, farbaZFaktura(brazowy, fakturaFutra, 1)],
    [ciemny, farbaZFaktura(ciemny, fakturaFutra, 1)],
    ["#a1887f", farbaZFaktura("#a1887f", fakturaFutra, 1)],
    [jasny, farbaZFaktura(jasny, fakturaSkory, 0.65)],
    ["#c49a7a", farbaZFaktura("#c49a7a", fakturaSkory, 0.65)],
    ["#d9b56b", farbaZFaktura("#d9b56b", fakturaMaterialu, 1)], // plecionka ze słomy
    ["#c9a55b", farbaZFaktura("#c9a55b", fakturaMaterialu, 1)],
    ["#f4f2ea", farbaZFaktura("#f4f2ea", fakturaPlotna, 1)],  // czyste płótno kimona
    ["#e2ded2", farbaZFaktura("#e2ded2", fakturaPlotna, 1)],
    ["#151515", farbaZFaktura("#151515", fakturaMaterialu, 0.8)], // czarny pas
    ["#c62828", farbaZFaktura("#c62828", fakturaMaterialu, 0.8)],
    ["#ffffff", farbaLsniaca("#ffffff", 0.1, 0)],
    ["#3e2723", farbaLsniaca("#3e2723", 0.05, 0)],
  ]);
  return m;
}

// Szeroki biały rękaw kimona na ramieniu
// Naszywka z chińskim znakiem: czerwone kółko ze złotym brzegiem i czarny znak w środku
function naszywka(znak) {
  const plotno = document.createElement("canvas");
  plotno.width = 128;
  plotno.height = 128;
  const pedzel = plotno.getContext("2d");
  pedzel.fillStyle = "#d4a017";
  pedzel.beginPath();
  pedzel.arc(64, 64, 62, 0, Math.PI * 2);
  pedzel.fill();                       // złoty brzeg
  pedzel.fillStyle = "#b71c1c";
  pedzel.beginPath();
  pedzel.arc(64, 64, 54, 0, Math.PI * 2);
  pedzel.fill();                       // czerwone kółko
  pedzel.fillStyle = "#111111";
  pedzel.font = "bold 72px 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif";
  pedzel.textAlign = "center";
  pedzel.textBaseline = "middle";
  pedzel.fillText(znak, 64, 68);       // chiński znak
  const faktura = new THREE.CanvasTexture(plotno);
  faktura.encoding = THREE.sRGBEncoding;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.15),
    new THREE.MeshStandardMaterial({ map: faktura, transparent: true, alphaTest: 0.5, roughness: 0.8 })
  );
}

function dodajRekaw(reka) {
  // na zewnętrznej stronie rękawa naszywka z chińskim znakiem:
  // 猴 (małpa) na prawym ramieniu, 武 (wojownik) na lewym
  const strona = reka.position.x > 0 ? 1 : -1;
  const znak = naszywka(strona > 0 ? "武" : "猴");
  znak.position.set(strona * 0.137, -0.13, 0);
  znak.rotation.y = strona * Math.PI / 2;
  reka.add(znak);

  // długi rękaw zakrywa całą rękę aż do dłoni, a na dole jest szerszy
  reka.add(klocek(new THREE.CylinderGeometry(0.12, 0.15, 0.52, 10), "#f4f2ea", 0, -0.25, 0));
  reka.add(owal(0.14, "#f4f2ea", 0, 0, 0, 1, 1, 1)); // kimono zakrywa też bark
}

// Jedna ręka: ramię, kawałek ręki, łokieć, przedramię i dłoń.
// Obraca się w ramieniu (na górze ręki).
function zrobReke(x, brazowy, jasny) {
  const reka = new THREE.Group();
  reka.position.set(x, 0.78, 0);  // tu jest ramię
  reka.rotation.order = "YXZ";     // najpierw podnosi rękę, potem obraca w bok
  // małpy mają długie ręce, prawie do ziemi
  reka.add(owal(0.12, brazowy, 0, 0, 0, 1, 1, 1));                                             // ramię
  reka.add(klocek(new THREE.CylinderGeometry(0.08, 0.07, 0.26), brazowy, 0, -0.13, 0));        // górna część
  reka.add(owal(0.07, brazowy, 0, -0.27, 0, 1, 1, 1));                                         // łokieć
  reka.add(klocek(new THREE.CylinderGeometry(0.07, 0.06, 0.26), brazowy, 0, -0.4, 0));         // przedramię
  reka.add(owal(0.08, jasny, 0, -0.56, 0.02, 0.9, 1.2, 0.7));                                  // dłoń
  reka.add(owal(0.03, jasny, x > 0 ? -0.06 : 0.06, -0.53, 0.05, 1, 1.6, 1));                  // kciuk
  return reka;
}

// Jedna noga: patyczek i stopa. Obraca się w biodrze (na górze nogi).
function zrobNoge(x, brazowy, jasny) {
  const noga = new THREE.Group();
  noga.position.set(x, 0.3, 0); // tu jest biodro
  noga.add(owal(0.1, brazowy, 0, -0.06, 0, 1, 1.3, 1));                                   // udo
  noga.add(klocek(new THREE.CylinderGeometry(0.07, 0.06, 0.16), brazowy, 0, -0.18, 0));  // łydka
  noga.add(owal(0.09, jasny, 0, -0.26, 0.08, 1, 0.5, 1.9));                              // długa małpia stopa
  return noga;
}

const malpka = {
  x: 0,
  z: 0,
  wysokosc: 0,     // jak wysoko skoczyła
  predkoscSkoku: 0,
  szybkosc: 0.09,
  kat: Math.PI,    // w którą stronę patrzy (na początku do przodu, w głąb świata)
  szybkoscObrotu: 0.05,
  krokiNog: 0,     // licznik kroków, do bujania nogami
  zamachChodu: 0,  // jak mocno bujają się ręce i nogi
  plywa: false,    // czy małpka jest w wodzie
  wspina: false,   // czy małpka wspina się na drzewo
  nietykalna: 0,   // ile jeszcze kroków nic nie może zranić Kiko
  doObrotu: 0,     // ile jeszcze ma się obrócić po naciśnięciu Q
  wDomku: null,    // domek, w którym małpka się chowa
  patrz: 0,        // jak bardzo patrzymy w górę (myszką)
  ziemia: 0,       // jak wysoko jest ziemia pod małpką (na mostku wyżej)
  powietrze: 300,  // ile jeszcze może pływać (60 to jedna sekunda)
  maPatyk: false,
  zamach: 0,       // ile jeszcze kroków trwa obrót z kijem
  model: zrobMalpke(),
};
scena.add(malpka.model);

// ----- Budujemy świat z mapy -----
const banany = [];
let zebraneBanany = 0;
const wojownicy = [];
let patykNaZiemi = null;
const wody = [];
const drzewa = [];
const domki = [];       // duże domki, do których można wejść
const zwierzeta = [];   // leśne zwierzęta
const chmury = [];
// woda: gładka i błyszcząca, trochę przezroczysta
const farbaWody = new THREE.MeshStandardMaterial({ color: kolorek("#2a8fc4"), roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.85 });
let kawalkiSwiata = new THREE.Group(); // wszystko, co stoi w świecie tego poziomu
const ziemia = new THREE.BoxGeometry(KAFELEK, 0.2, KAFELEK);

// Buduje świat z mapy poziomu, na którym jesteśmy
function zbudujPoziom() {
  przygotujGwiazdki();
  // Stary świat znika (i zwalniamy pamięć po sklejonych kształtach)
  kawalkiSwiata.traverse(function (obiekt) {
    if (obiekt.userData.sklejony) obiekt.geometry.dispose();
  });
  scena.remove(kawalkiSwiata);
  kawalkiSwiata = new THREE.Group();
  scena.add(kawalkiSwiata);
  banany.length = 0;
  wojownicy.length = 0;
  wody.length = 0;
  drzewa.length = 0;
  domki.length = 0;
  zwierzeta.length = 0;
  malpka.wDomku = null;
  chmury.length = 0;
  zebraneBanany = 0;
  patykNaZiemi = null;
  podpowiedzBananow = false;
  malpka.maPatyk = false;
  malpka.model.patyk.visible = false;

  // mapa z mapa.js plus nowy teren dookoła (teren.js)
  const duzaMapa = powiekszMape(MAPY[poziom - 1]);
  wioska = duzaMapa.wioska;
  swiat = duzaMapa.map((wiersz) => wiersz.split(""));
  const kawalkiZiemi = []; // gdzie leży ziemia i jakiego jest koloru
  const zajete = {}; // kawałki mapy, na których już stoi domek
  statyczne.length = 0;

  for (let w = 0; w < swiat.length; w++) {
    for (let k = 0; k < swiat[w].length; k++) {
      const litera = swiat[w][k];
      const kafelek = KAFELKI[litera] || KAFELKI["."];
      const x = k * KAFELEK;
      const z = w * KAFELEK;

      // Ziemia. Woda jest trochę niżej i błyszczy.
      if (kafelek.rzecz === "woda" || kafelek.rzecz === "mostek") {
        const woda = klocek(ziemia, kafelek.kolor, x, -0.3, z);
        woda.material = farbaWody;
        if (Math.random() < 0.25) {
          const lilia = zrobLilie();
          lilia.position.set(Math.random() - 0.5, 0.12, Math.random() - 0.5); // leży na wodzie
          woda.add(lilia);
        }
        kawalkiSwiata.add(woda);
        wody.push(woda);
      } else {
        // każdy kawałek ziemi ma trochę inny odcień, żeby nie wyglądało jak szachownica
        const odcien = new THREE.Color(kafelek.kolor).offsetHSL(0, 0, (Math.floor(Math.random() * 3) - 1) * 0.025);
        kawalkiZiemi.push({ x: x, z: z, kolor: "#" + odcien.getHexString() });
      }

      // Na trawie i piasku rosną rośliny: kwiatki, krzaki, paprocie, wysoka trawa,
      // bambusy i palmy (teren.js, wybierzRosline)
      const roslina = wybierzRosline(litera, w, k);
      if (roslina) {
        roslina.position.set(x + Math.random() * 1.2 - 0.6, 0, z + Math.random() * 1.2 - 0.6);
        kawalkiSwiata.add(roslina);
        statyczne.push(roslina);
      }

      // Rzecz stojąca na ziemi
      const budowniczy = BUDOWNICZY[kafelek.rzecz];
      if (kafelek.rzecz === "domek") {
        postawDomek(w, k, zajete);
      } else if (kafelek.rzecz === "mostek") {
        // Ten kawałek mostka jest wyżej albo niżej, zależnie od tego, gdzie leży na łuku
        const luk = lukMostu(w, k);
        let mostek;
        if (luk.poziomo) {
          mostek = zrobMostek(wysokoscNaLuku(luk, x - KAFELEK / 2), wysokoscNaLuku(luk, x + KAFELEK / 2));
        } else {
          mostek = zrobMostek(wysokoscNaLuku(luk, z + KAFELEK / 2), wysokoscNaLuku(luk, z - KAFELEK / 2));
          mostek.rotation.y = Math.PI / 2; // mostek prowadzi z góry na dół mapy
        }
        mostek.position.set(x, 0, z);
        kawalkiSwiata.add(mostek);
        statyczne.push(mostek);
      } else if (budowniczy) {
        const rzecz = budowniczy();
        rzecz.position.x = x;
        rzecz.position.z = z;
        kawalkiSwiata.add(rzecz);
        if (kafelek.rzecz === "drzewo" || kafelek.rzecz === "kamien" || kafelek.rzecz === "studnia") statyczne.push(rzecz);
        if (kafelek.rzecz === "banan") banany.push(rzecz);
        if (kafelek.rzecz === "drzewo") {
          rzecz.faza = Math.random() * 10; // każde drzewo buja się trochę inaczej
          drzewa.push(rzecz);
        }
        if (kafelek.rzecz === "wojownik") przygotujWojownika(rzecz, x, z);
        if (kafelek.rzecz === "patyk") patykNaZiemi = rzecz;
      }

      if (litera === "S") {
        malpka.startX = x;
        malpka.startZ = z;
      }
    }
  }

  // cała ziemia naraz, płot dookoła i widok za płotem
  kawalkiSwiata.add(zrobZiemie(kawalkiZiemi));
  kawalkiSwiata.add(zrobGestaTrawe()); // tysiące kępek trawy na łąkach
  kawalkiSwiata.add(zrobPlot());
  const widok = zrobWidok(duzaMapa.pustynia);
  kawalkiSwiata.add(widok);
  statyczne.push(widok);

  // Na każdym poziomie jest o jednego wojownika więcej: poziom 1 ma 6, poziom 7 ma 12.
  // Do tego 8 wojowników chodzi po nowym terenie dookoła.
  dodajWojownikow(5 + poziom - wojownicy.length);
  dodajWojownikow(8, true);

  // Leśne zwierzęta i ludzie w wiosce
  dodajZwierzeta();
  dodajLudzi();
  dodajMapeISkarb(); // mapa w wiosce i ukryty skarb (skarby.js)

  // wszystko, co się nie rusza, sklejamy w duże kawałki, żeby gra działała szybko
  scalStatyczne(kawalkiSwiata);

  // Chmury płyną wysoko nad światem
  const szerokosc = swiat[0].length * KAFELEK;
  const dlugosc = swiat.length * KAFELEK;
  for (let i = 0; i < 50; i++) {
    const chmura = zrobChmure();
    chmura.position.set(Math.random() * (szerokosc + 80) - 40, 16 + Math.random() * 10, Math.random() * (dlugosc + 80) - 40);
    kawalkiSwiata.add(chmura);
    chmury.push(chmura);
  }
}

// Wojownik dostaje swoje rzeczy: miejsce startu, 3 życia i własne farby
function przygotujWojownika(wojownik, x, z) {
  wojownik.position.x = x;
  wojownik.position.z = z;
  wojownik.startX = x; // zapamiętujemy, skąd wojownik wyszedł
  wojownik.startZ = z;
  wojownik.zycie = 3;  // dwa uderzenia kijem (każde zabiera 2 życia)
  wojownik.rotation.order = "YXZ"; // żeby przewracał się do tyłu, a nie w bok
  wojownik.traverse(function (czesc) {
    if (czesc.material) czesc.material = czesc.material.clone(); // własne farby, żeby mrugał sam
  });
  wojownicy.push(wojownik);
}

// Dodaje wojowników w losowych miejscach na trawie: daleko od startu małpki
// i tylko tam, gdzie małpka może dojść.
function dodajWojownikow(ile, tylkoNaNowymTerenie) {
  if (ile <= 0) return;
  let wolne = wolneMiejsca(14);
  wolne = wolne.filter(([w, k]) => !wWiosce(w, k)); // wojownicy nie pojawiają się w wiosce
  if (tylkoNaNowymTerenie) wolne = wolne.filter(([w, k]) => naNowymTerenie(w, k));
  for (let i = 0; i < ile && wolne.length > 0; i++) {
    const [w, k] = wolne.splice(Math.floor(Math.random() * wolne.length), 1)[0];
    const wojownik = zrobWojownika();
    przygotujWojownika(wojownik, k * KAFELEK, w * KAFELEK);
    kawalkiSwiata.add(wojownik);
  }
}

// Szuka miejsc na trawie albo piasku, do których małpka może dojść ze startu
// i które są dalej od startu niż "odStartu" metrów.
function wolneMiejsca(odStartu) {
  const startW = Math.round(malpka.startZ / KAFELEK);
  const startK = Math.round(malpka.startX / KAFELEK);
  const odwiedzone = {};
  const kolejka = [[startW, startK]];
  odwiedzone[startW + "," + startK] = true;
  const wolne = [];
  while (kolejka.length > 0) {
    const [w, k] = kolejka.shift();
    const daleko = Math.hypot(w - startW, k - startK) * KAFELEK > odStartu;
    if ((swiat[w][k] === "." || swiat[w][k] === "P") && daleko) wolne.push([w, k]); // trawa albo piasek
    for (const [dw, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nw = w + dw;
      const nk = k + dk;
      const litera = swiat[nw] && swiat[nw][nk];
      const kafelek = KAFELKI[litera];
      if (!kafelek || kafelek.sciana || odwiedzone[nw + "," + nk]) continue;
      odwiedzone[nw + "," + nk] = true;
      kolejka.push([nw, nk]);
    }
  }
  return wolne;
}

// Domek z 4 liter D ułożonych w kwadrat (DD nad DD) jest duży jak prawdziwy dom.
// Pojedyncze D to mały domek.
function postawDomek(w, k, zajete) {
  if (zajete[w + "," + k]) return; // tu już stoi kawałek innego domku
  const wolneD = function (ww, kk) {
    return swiat[ww] && swiat[ww][kk] === "D" && !zajete[ww + "," + kk];
  };
  const domek = zrobDomek();
  if (wolneD(w, k + 1) && wolneD(w + 1, k) && wolneD(w + 1, k + 1)) {
    // duży domek na 4 kawałkach mapy
    zajete[w + "," + (k + 1)] = true;
    zajete[(w + 1) + "," + k] = true;
    zajete[(w + 1) + "," + (k + 1)] = true;
    domek.scale.set(2.1, 2.1, 2.1);
    domek.position.set((k + 0.5) * KAFELEK, 0, (w + 0.5) * KAFELEK); // stoi na środku kwadratu
    // drzwi są z przodu domku (od dołu mapy). Tu małpka może wejść do środka.
    domek.drzwiX = domek.position.x;
    domek.drzwiZ = domek.position.z + 0.77 * 2.1;
    domki.push(domek);
  } else {
    domek.position.set(k * KAFELEK, 0, w * KAFELEK);
  }
  zajete[w + "," + k] = true;
  kawalkiSwiata.add(domek);
  statyczne.push(domek);
}

// Chlup! Kropelki wody pryskają na boki, kiedy małpka wskoczy do wody
const kropelki = [];
const farbaKropelki = new THREE.MeshBasicMaterial({ color: kolorek("#e1f5fe") });
function chlup(x, z) {
  dzwiekChlup();
  for (let i = 0; i < 14; i++) {
    const kropla = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.05, 6, 6), farbaKropelki);
    const kierunek = Math.random() * Math.PI * 2;
    const sila = 0.03 + Math.random() * 0.05;
    kropla.position.set(x, 0, z);
    kropla.predkosc = new THREE.Vector3(Math.sin(kierunek) * sila, 0.12 + Math.random() * 0.1, Math.cos(kierunek) * sila);
    scena.add(kropla);
    kropelki.push(kropla);
  }
}

// Trafiony wojownik chwieje się na nogach
function trafionyWojownik(wojownik) {
  wojownik.chwieje = 60; // przez sekundę mocno się chwieje
}

// Jak bardzo wojownik przechyla się na boki: po trafieniu mocno,
// a z jednym życiem cały czas, bo jest już słaby
function chwianie(wojownik) {
  let przechyl = 0;
  if (wojownik.chwieje > 0) {
    wojownik.chwieje--;
    przechyl += Math.sin(wojownik.chwieje * 0.3) * 0.3 * (wojownik.chwieje / 60);
  }
  if (wojownik.zycie === 1) przechyl += Math.sin(czas * 0.07 + wojownik.startX) * 0.2;
  return przechyl;
}

// Wiatr: raz wieje mocniej, raz słabiej
function silaWiatru() {
  return 0.6 + Math.sin(czas * 0.004) * 0.4;
}

// Spadające liście: lecą powoli w dół, wiatr niesie je w bok, a one się obracają
const liscie = [];
function nowyLisc() {
  // liść spada z jakiegoś drzewa blisko małpki
  const blisko = [];
  for (const drzewo of drzewa) {
    if (Math.hypot(drzewo.position.x - malpka.x, drzewo.position.z - malpka.z) < 16) blisko.push(drzewo);
  }
  if (blisko.length === 0) return;
  const drzewo = blisko[Math.floor(Math.random() * blisko.length)];
  const lisc = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.14),
    new THREE.MeshStandardMaterial({ color: kolorek(drzewo.kolorLiscia), side: THREE.DoubleSide, roughness: 0.8, transparent: true })
  );
  lisc.position.set(
    drzewo.position.x + Math.random() * 2.4 - 1.2,
    3 + Math.random() * 2,
    drzewo.position.z + Math.random() * 2.4 - 1.2
  );
  lisc.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  lisc.faza = Math.random() * 10;
  lisc.lezy = 0; // ile już leży na ziemi
  scena.add(lisc);
  liscie.push(lisc);
}

function ruszLiscie() {
  if (czas % 12 === 0 && liscie.length < 40) nowyLisc();
  const wiatr = silaWiatru();
  for (let i = liscie.length - 1; i >= 0; i--) {
    const lisc = liscie[i];
    if (lisc.position.y > 0.02) {
      lisc.position.y -= 0.012;
      lisc.position.x += wiatr * 0.015 + Math.sin(czas * 0.05 + lisc.faza) * 0.01; // kołysze się w powietrzu
      lisc.position.z += Math.cos(czas * 0.04 + lisc.faza) * 0.01;
      lisc.rotation.x += 0.03;
      lisc.rotation.y += 0.02;
    } else {
      // leży na ziemi i powoli znika
      lisc.rotation.x = -Math.PI / 2;
      lisc.lezy++;
      lisc.material.opacity = 1 - lisc.lezy / 120;
      if (lisc.lezy > 120) {
        scena.remove(lisc);
        lisc.geometry.dispose();
        lisc.material.dispose();
        liscie.splice(i, 1);
      }
    }
  }
}

// Świat się rusza: woda faluje, chmury płyną, drzewa bujają się na wietrze
function animujSwiat() {
  const wiatr = silaWiatru();
  // korony drzew bujają się w karcie graficznej (teren.js, farbaNaWietrze)
  wiatrDlaDrzew.czas.value = czas / 60;
  wiatrDlaDrzew.sila.value = wiatr;
  ruszLiscie();

  // kropelki lecą w górę, a potem spadają i znikają w wodzie
  for (let i = kropelki.length - 1; i >= 0; i--) {
    const kropla = kropelki[i];
    kropla.position.add(kropla.predkosc);
    kropla.predkosc.y -= 0.012;
    if (kropla.position.y < -0.3) {
      scena.remove(kropla);
      kropelki.splice(i, 1);
    }
  }

  for (const woda of wody) {
    woda.position.y = -0.3 + Math.sin(czas * 0.04 + woda.position.x * 0.5 + woda.position.z * 0.3) * 0.05;
  }
  const szerokosc = swiat[0].length * KAFELEK;
  for (const chmura of chmury) {
    chmura.position.x += 0.01;
    if (chmura.position.x > szerokosc + 50) chmura.position.x = -50; // wraca z drugiej strony
  }
}

// ----- Klawisze -----
const klawisze = {};
document.addEventListener("keydown", (e) => {
  klawisze[e.key.toLowerCase()] = true;
  if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault(); // strona się nie przewija
});
document.addEventListener("keyup", (e) => { klawisze[e.key.toLowerCase()] = false; });

// Klawisz F4: kamera przechodzi na przód i patrzy Kiko w twarz. Drugi raz F4: z powrotem za plecy.
let kameraZPrzodu = false;
document.addEventListener("keydown", function (e) {
  if (e.key !== "F4" || e.repeat) return;
  e.preventDefault();
  kameraZPrzodu = !kameraZPrzodu;
});

// Klawisz P: pauza. Gra stoi w miejscu, aż naciśniesz P jeszcze raz.
let pauza = false;
const napisPauza = document.getElementById("pauza");
document.addEventListener("keydown", function (e) {
  if (e.key.toLowerCase() !== "p" || e.repeat) return;
  pauza = !pauza;
  napisPauza.style.display = pauza ? "block" : "none";
  if (pauza) zapiszGre(); // przy pauzie też zapisujemy
});

// Klawisz Q: małpka szybko odwraca się tyłem do przodu
document.addEventListener("keydown", function (e) {
  if (e.key.toLowerCase() === "q" && !e.repeat && malpka.doObrotu === 0 && !pauza) malpka.doObrotu = Math.PI;
});

// Klawisz F: gra na cały ekran, bez paska przeglądarki (Esc wraca)
document.addEventListener("keydown", function (e) {
  if (e.key.toLowerCase() !== "f") return;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
});

// Myszka: kliknij w grę, a potem ruszaj myszką, żeby małpka się obracała
// Kiedy myszka jest już w grze, kliknięcie to obrót z kijem.
// Jak trzymasz przycisk, Kiko macha raz za razem.
let trzymaPrzycisk = false;
plansza.addEventListener("mousedown", function (e) {
  if (e.button !== 0) return;
  if (document.pointerLockElement === plansza) {
    trzymaPrzycisk = true;
  } else {
    plansza.requestPointerLock(); // strzałka myszki chowa się w grze (Esc ją oddaje)
  }
});
document.addEventListener("mouseup", function () { trzymaPrzycisk = false; });
document.addEventListener("pointerlockchange", function () {
  if (document.pointerLockElement !== plansza) trzymaPrzycisk = false;
});
document.addEventListener("mousemove", function (e) {
  if (document.pointerLockElement !== plansza || pauza) return;
  malpka.kat -= e.movementX * 0.003; // myszka w prawo = obrót w prawo
  // myszka w górę = patrzymy w górę, na niebo, słońce i chmury
  malpka.patrz = Math.max(-0.35, Math.min(1.25, malpka.patrz - e.movementY * 0.003));
});

// Jaka litera leży w tym miejscu świata?
function kafelekW(x, z) {
  const k = Math.round(x / KAFELEK);
  const w = Math.round(z / KAFELEK);
  if (w < 0 || w >= swiat.length || k < 0 || k >= swiat[0].length) return "poza"; // koniec świata
  return swiat[w][k];
}

// Czy postać może tu stanąć? Sprawdzamy 4 punkty wokół niej.
// mozePlywac = true: do wody też można wejść (tylko małpka, wojownicy nie umieją pływać).
// naDrzewach = true: małpka jest na górze i może chodzić po czubkach drzew.
function moznaStanac(x, z, mozePlywac, naDrzewach) {
  const r = 0.4; // jak gruba jest postać (do zderzeń)
  if (x < POKOJ.x + 100) {
    // w środku domku: pokój ma własne ściany i meble (domy.js)
    return wolneWPokoju(x - r, z - r) && wolneWPokoju(x + r, z - r) && wolneWPokoju(x - r, z + r) && wolneWPokoju(x + r, z + r);
  }
  const punkty = [[x - r, z - r], [x + r, z - r], [x - r, z + r], [x + r, z + r]];
  for (const [px, pz] of punkty) {
    const litera = kafelekW(px, pz);
    if (litera === "poza") return false;
    if (litera === "W" && mozePlywac) continue;
    if (litera === "T" && naDrzewach) continue;
    const kafelek = KAFELKI[litera];
    if (kafelek && kafelek.sciana) return false;
  }
  return true;
}

// ----- Ruch i zasady gry -----
// Drzwi same się otwierają, kiedy małpka jest blisko albo w środku
function otwierajDrzwi() {
  for (const domek of domki) {
    const blisko = malpka.wDomku === domek
      || Math.hypot(malpka.x - domek.drzwiX, malpka.z - domek.drzwiZ) < 2.5;
    const cel = blisko ? -1.6 : 0;
    domek.drzwi.rotation.y += (cel - domek.drzwi.rotation.y) * 0.15;
  }
}

function ruszaj() {
  otwierajDrzwi();

  // Strzałki w lewo i w prawo obracają małpkę
  if (klawisze["arrowleft"]  || klawisze["a"]) malpka.kat += malpka.szybkoscObrotu;
  if (klawisze["arrowright"] || klawisze["d"]) malpka.kat -= malpka.szybkoscObrotu;
  // Szybki obrót po Q: kilka klatek, żeby było widać, jak się odwraca
  if (malpka.doObrotu > 0) {
    const kawalek = Math.min(malpka.doObrotu, 0.35);
    malpka.kat += kawalek;
    malpka.doObrotu -= kawalek;
  }
  malpka.model.rotation.y = malpka.kat;

  // Strzałka w górę: idzie do przodu, w dół: cofa się
  let krok = 0;
  if (klawisze["arrowup"]   || klawisze["w"]) krok += 1;
  if (klawisze["arrowdown"] || klawisze["s"]) krok -= 1;

  if (krok !== 0) {
    const dx = Math.sin(malpka.kat) * krok * malpka.szybkosc;
    const dz = Math.cos(malpka.kat) * krok * malpka.szybkosc;
    // Do wody wchodzi się z Shiftem. Kto już pływa, może pływać dalej.
    // W skoku (spacja) też można wskoczyć do wody, na przykład z mostka.
    const wPowietrzu = malpka.wysokosc - malpka.ziemia > 0.1;
    const mozePlywac = klawisze["shift"] || malpka.plywa || wPowietrzu;
    const naDrzewach = malpka.wysokosc >= WYSOKOSC_DRZEWA - 0.2;
    if (moznaStanac(malpka.x + dx, malpka.z, mozePlywac, naDrzewach)) malpka.x += dx;
    if (moznaStanac(malpka.x, malpka.z + dz, mozePlywac, naDrzewach)) malpka.z += dz;
  }

  // Wspinanie: kiedy małpka idzie prosto na drzewo, wspina się po pniu do góry.
  // Na górze może chodzić po czubkach drzew. Jak puści strzałkę, spada.
  const przedNosemX = malpka.x + Math.sin(malpka.kat) * 0.7;
  const przedNosemZ = malpka.z + Math.cos(malpka.kat) * 0.7;
  malpka.wspina = krok > 0 && !malpka.plywa
    && kafelekW(przedNosemX, przedNosemZ) === "T"
    && kafelekW(malpka.x, malpka.z) !== "T";

  // Wejście do domku: małpka idzie prosto w otwarte drzwi i trafia do pokoju (domy.js).
  // W pokoju: wychodzi, kiedy idzie przez drzwi.
  if (malpka.wDomku) {
    sprawdzWyjscie(krok);
  } else if (krok > 0 && malpka.wysokosc - malpka.ziemia < 0.3) {
    for (const domek of domki) {
      const przyDrzwiach = Math.hypot(malpka.x - domek.drzwiX, malpka.z - domek.drzwiZ) < 1.3;
      const patrzyNaDrzwi = Math.cos(malpka.kat) < -0.6; // patrzy w górę mapy, na domek
      if (przyDrzwiach && patrzyNaDrzwi) {
        wejdzDoDomku(domek);
        return;
      }
    }
  }

  // Pływanie: małpka ma 5 sekund, potem traci serduszko
  const byla = malpka.plywa;
  malpka.plywa = kafelekW(malpka.x, malpka.z) === "W";
  if (malpka.plywa && !byla) chlup(malpka.x, malpka.z); // wskoczyła do wody!
  if (malpka.plywa) {
    malpka.powietrze--;
    if (malpka.powietrze <= 0) {
      malpka.powietrze = POWIETRZE;
      stracZycie();
    }
    napisPowietrze.textContent = "🌊 " + Math.ceil(malpka.powietrze / 60) + " s";
  } else {
    malpka.powietrze = POWIETRZE; // na lądzie powietrze wraca
    napisPowietrze.textContent = "";
  }

  // Ręce i nogi: jak małpka idzie, bujają się na zmianę, jak stoi, wracają prosto
  if (krok !== 0) {
    malpka.krokiNog += 0.25;
    malpka.zamachChodu = Math.sin(malpka.krokiNog) * 0.7;
  } else {
    malpka.zamachChodu *= 0.8;
  }
  malpka.model.nogi[0].rotation.x = malpka.zamachChodu;
  malpka.model.nogi[1].rotation.x = -malpka.zamachChodu;
  if (malpka.wspina) {
    malpka.model.lewaReka.rotation.x = -2.6 - Math.sin(czas * 0.3) * 0.4; // ręce łapią pień wysoko
  } else {
    malpka.model.lewaReka.rotation.x = malpka.zamachChodu * 0.8; // ręka idzie w drugą stronę niż noga
  }

  // Ogon merda cały czas, przy chodzeniu szybciej
  malpka.model.ogon.rotation.y = Math.sin(czas * (krok !== 0 ? 0.3 : 0.1)) * 0.5;

  // Ziemia pod małpką: na mostku idzie pod górkę i z górki
  malpka.ziemia = wysokoscZiemi(malpka.x, malpka.z);
  const naZiemi = !malpka.wspina && malpka.predkoscSkoku <= 0 && malpka.wysokosc - malpka.ziemia < 0.15;
  if (naZiemi) {
    malpka.wysokosc = malpka.ziemia; // stoi na ziemi albo na mostku
    malpka.predkoscSkoku = 0;
  }

  if (malpka.wspina) {
    // po pniu w górę, aż na czubek drzewa
    malpka.wysokosc = Math.min(WYSOKOSC_DRZEWA, malpka.wysokosc + 0.06);
    malpka.predkoscSkoku = 0;
  } else {
    // Skok spacją (w wodzie się nie da)
    if (klawisze[" "] && naZiemi && !malpka.plywa) malpka.predkoscSkoku = 0.18;
    malpka.wysokosc += malpka.predkoscSkoku;
    malpka.predkoscSkoku -= 0.01; // grawitacja ciągnie w dół
  }
  if (malpka.wysokosc <= malpka.ziemia) {
    malpka.wysokosc = malpka.ziemia;
    malpka.predkoscSkoku = 0;
  }

  // Przy chodzeniu małpka lekko podskakuje przy każdym kroku
  let podskok = Math.abs(Math.sin(malpka.krokiNog)) * Math.abs(malpka.zamachChodu) * 0.12;
  // W wodzie małpka jest zanurzona, wystaje jej tylko głowa, i kołysze się na falach
  if (malpka.plywa) podskok = -0.6 + Math.sin(czas * 0.08) * 0.05;
  // Przy wspinaniu małpka przytula się do pnia
  const przytul = malpka.wspina ? 0.8 : 0;
  malpka.model.position.set(
    malpka.x + Math.sin(malpka.kat) * przytul,
    malpka.wysokosc + podskok,
    malpka.z + Math.cos(malpka.kat) * przytul
  );

  // Banany kręcą się, a jak małpka jest blisko, to je zjada
  for (const banan of banany) {
    if (!banan.visible) continue;
    if (banan.zebrany) {
      // zebrany banan kręci się szybko, leci w górę i robi się malutki
      banan.rotation.y += 0.3;
      banan.position.y += 0.06;
      banan.scale.multiplyScalar(0.9);
      if (banan.scale.x < 0.05) banan.visible = false;
      continue;
    }
    banan.rotation.y += 0.05;
    banan.position.y = 0.9 + Math.sin(czas * 0.05 + banan.position.x) * 0.15; // banan unosi się i opada
    const odleglosc = Math.hypot(banan.position.x - malpka.x, banan.position.z - malpka.z);
    if (odleglosc < 0.9) {
      banan.zebrany = true;
      zebraneBanany++;
      dzwiekChrup();
    }
  }
  let zywe = 0;
  for (const wojownik of wojownicy) if (wojownik.zycie > 0) zywe++;
  napisPunkty.textContent = "🍌 " + zebraneBanany + " / " + banany.length + "   🐺 " + zywe
    + (maGwiazdki ? "   ⭐ " + liczbaGwiazdek : "");

  // Poziom przechodzi się na dwa sposoby:
  // 1. zbierasz wszystkie banany
  // 2. pokonujesz wszystkich wojowników i masz przynajmniej BANANY_Z_WOJOWNIKAMI bananów
  if (zebraneBanany === banany.length) {
    nastepnyPoziom();
  } else if (zywe === 0) {
    if (zebraneBanany >= BANANY_Z_WOJOWNIKAMI) {
      nastepnyPoziom();
    } else if (!podpowiedzBananow) {
      podpowiedzBananow = true;
      const brakuje = BANANY_Z_WOJOWNIKAMI - zebraneBanany;
      pokazKomunikat("🐺 Wszyscy wojownicy pokonani! Zbierz jeszcze " + brakuje + " 🍌");
    }
  }
}

const BANANY_Z_WOJOWNIKAMI = 5; // ile bananów trzeba mieć, jak pokonasz wszystkich wojowników
let podpowiedzBananow = false;  // czy już powiedzieliśmy, ile bananów brakuje

// ----- Poziomy: każdy następny jest trudniejszy -----
//   szybkosc - jak szybko biegają wojownicy (małpka ma 0.09)
//   widzi    - z jak daleka wojownik widzi małpkę
const POZIOMY = [
  { szybkosc: 0.035, widzi: 8 },   // poziom 1
  { szybkosc: 0.042, widzi: 10 },  // poziom 2
  { szybkosc: 0.050, widzi: 12 },  // poziom 3
  { szybkosc: 0.057, widzi: 14 },  // poziom 4
  { szybkosc: 0.064, widzi: 16 },  // poziom 5
  { szybkosc: 0.071, widzi: 19 },  // poziom 6
  { szybkosc: 0.078, widzi: 22 },  // poziom 7
];
let poziom = 1;

function nastepnyPoziom() {
  if (poziom === POZIOMY.length) {
    pokazKomunikat("🏆 WYGRAŁEŚ! 🏆");
    poziom = 1;
    odNowa();
    return;
  }
  poziom++;
  zycia = WSZYSTKIE_ZYCIA; // na nowym poziomie znowu pełne serduszka
  zbudujPoziom(); // nowy poziom, nowa mapa!
  wrocNaStart();
  pokazKomunikat("Poziom " + poziom + "!");
}

// Duży napis na środku ekranu, znika po 2 sekundach
function pokazKomunikat(tekst) {
  napisKomunikat.textContent = tekst;
  setTimeout(function () { napisKomunikat.textContent = ""; }, 2000);
}

// ----- Wojownicy gonią małpkę -----
function ruszWojownikow() {
  const ustawienia = POZIOMY[poziom - 1];
  for (const wojownik of wojownicy) {
    if (!wojownik.visible) continue; // pokonany wojownik już nie goni
    pokazTrafienie(wojownik);
    ustawRece(wojownik);

    // Pokonany wojownik przewraca się do tyłu i zapada pod ziemię
    if (wojownik.zycie <= 0) {
      if (wojownik.rotation.x > -Math.PI / 2) {
        wojownik.rotation.x -= 0.12;
      } else {
        wojownik.position.y -= 0.03;
        if (wojownik.position.y < -1) wojownik.visible = false;
      }
      continue;
    }
    if (wojownik.ogluszony > 0) {
      wojownik.ogluszony--;
      wojownik.rotation.z = chwianie(wojownik); // oszołomiony chwieje się w miejscu
      continue;
    }

    const dx = malpka.x - wojownik.position.x;
    const dz = malpka.z - wojownik.position.z;
    const odleglosc = Math.hypot(dx, dz);

    // Wojownik wyje, kiedy zauważy małpkę, a potem co jakiś czas, kiedy ją goni.
    // Im bliżej małpki, tym głośniej.
    const widzi = !malpka.wDomku && odleglosc < ustawienia.widzi; // małpki w domku nie widać
    if (widzi) {
      wojownik.doJeku = (wojownik.doJeku || 0) - 1;
      if (!wojownik.widzial || wojownik.doJeku <= 0) {
        dzwiekWycie(0.08 + 0.3 * (1 - odleglosc / ustawienia.widzi));
        wojownik.doJeku = 180 + Math.random() * 240; // następne wycie za 3 do 7 sekund
        if (!wojownik.widzial) wojownik.wyje = 50;     // najpierw staje i wyje do nieba
      }
    }
    wojownik.widzial = widzi;
    if (wojownik.wyje > 0) wojownik.wyje--;
    animujWilka(wojownik, widzi && !(wojownik.wyje > 0));

    // Wojownik biegnie do małpki, jeśli ją widzi (ale nie w czasie wycia)
    if (widzi && !(wojownik.wyje > 0)) {
      const szybkosc = ustawienia.szybkosc * (wojownik.zycie === 1 ? 0.6 : 1); // słaby wojownik idzie wolniej
      const krokX = (dx / odleglosc) * szybkosc;
      const krokZ = (dz / odleglosc) * szybkosc;
      if (moznaStanac(wojownik.position.x + krokX, wojownik.position.z)) wojownik.position.x += krokX;
      if (moznaStanac(wojownik.position.x, wojownik.position.z + krokZ)) wojownik.position.z += krokZ;
      wojownik.rotation.y = Math.atan2(dx, dz); // patrzy na małpkę
      wojownik.chod = (wojownik.chod || 0) + 0.12;
      wojownik.rotation.z = Math.sin(wojownik.chod) * 0.03 + chwianie(wojownik); // lekko kołysze się w biegu
      wojownik.nogi[0].rotation.x = Math.sin(wojownik.chod) * 0.5;  // biegnie wilczymi susami
      wojownik.nogi[1].rotation.x = -Math.sin(wojownik.chod) * 0.5;
      wojownik.position.y = wysokoscZiemi(wojownik.position.x, wojownik.position.z) + Math.abs(Math.sin(wojownik.chod)) * 0.06;
    } else {
      wojownik.rotation.z *= 0.9; // stoi i przestaje się kołysać
      wojownik.nogi[0].rotation.x *= 0.9;
      wojownik.nogi[1].rotation.x *= 0.9;
    }

    // Drapnął Kiko pazurami! Kiko traci jedno serduszko, ale zostaje tam, gdzie jest
    if (!malpka.wDomku && odleglosc < 0.8 && Math.abs(malpka.wysokosc - wojownik.position.y) < 0.5) {
      if (zranKiko(1, wojownik)) return;
      wojownik.ogluszony = 40; // po ataku wilk chwilę stoi
    }
  }
}

// Po trafieniu: wojownik odlatuje do tyłu i mruga na czerwono
// Ręce wojownika sięgają po małpkę
function ustawRece(wojownik) {
  const krok = Math.sin((wojownik.chod || 0) * 1.0);
  // obie łapy z pazurami wyciągnięte przed siebie, na zmianę drapią powietrze
  for (let i = 0; i < 2; i++) {
    const strona = i === 0 ? 1 : -1;
    const cel = -1.0 + krok * 0.35 * strona;
    wojownik.rece[i].rotation.x += (cel - wojownik.rece[i].rotation.x) * 0.2;
    wojownik.rece[i].lokiec.rotation.x = -0.6;
  }
}

function pokazTrafienie(wojownik) {
  if (wojownik.odrzutX) {
    const nowyX = wojownik.position.x + wojownik.odrzutX;
    const nowyZ = wojownik.position.z + wojownik.odrzutZ;
    if (moznaStanac(nowyX, wojownik.position.z)) wojownik.position.x = nowyX;
    if (moznaStanac(wojownik.position.x, nowyZ)) wojownik.position.z = nowyZ;
    wojownik.odrzutX *= 0.8; // coraz wolniej
    wojownik.odrzutZ *= 0.8;
    if (Math.abs(wojownik.odrzutX) + Math.abs(wojownik.odrzutZ) < 0.01) wojownik.odrzutX = 0;
  }

  const czerwony = wojownik.migniecie > 0 && wojownik.migniecie % 4 < 2;
  wojownik.traverse(function (czesc) {
    if (czesc.material && czesc.material.emissive) czesc.material.emissive.set(czerwony ? "#ff0000" : "#000000");
  });
  if (wojownik.migniecie > 0) wojownik.migniecie--;
}

// ----- Życia -----
const WSZYSTKIE_ZYCIA = 5;
const CZAS_NIETYKALNOSCI = 90; // po zranieniu Kiko przez 1,5 sekundy nic nie może zranić
const POWIETRZE = 5 * 60; // małpka może pływać 5 sekund
let zycia = WSZYSTKIE_ZYCIA;

// Małpka traci jedno serduszko. Jak to było ostatnie, gra zaczyna się od poziomu 1.
// Odpowiada true, jeśli małpka gra dalej na tym samym poziomie.
function stracZycie(ile) {
  zycia -= ile === undefined ? 1 : ile;
  dzwiekAu();
  if (zycia <= 0) {
    poziom = 1;
    odNowa();
    pokazKomunikat("Koniec żyć! Poziom 1");
    return false;
  }
  return true;
}

// Ktoś zranił Kiko: traci "ile" serduszek (może być pół), odskakuje do tyłu
// i przez chwilę mruga, a wtedy nic nie może jej zranić.
// Odpowiada true, jeśli to było ostatnie serduszko i gra zaczęła się od nowa.
function zranKiko(ile, kto) {
  if (malpka.nietykalna > 0) return false;
  malpka.nietykalna = CZAS_NIETYKALNOSCI;
  // Kiko odskakuje od tego, kto ją zranił
  const dx = malpka.x - kto.position.x;
  const dz = malpka.z - kto.position.z;
  const d = Math.hypot(dx, dz) || 1;
  const nowyX = malpka.x + (dx / d) * 1.5;
  const nowyZ = malpka.z + (dz / d) * 1.5;
  if (moznaStanac(nowyX, malpka.z)) malpka.x = nowyX;
  if (moznaStanac(malpka.x, nowyZ)) malpka.z = nowyZ;
  return !stracZycie(ile);
}

// Kiko mruga, kiedy jest nietykalna po zranieniu
function mrugajPoZranieniu() {
  if (malpka.nietykalna > 0) {
    malpka.nietykalna--;
    malpka.model.visible = Math.floor(malpka.nietykalna / 5) % 2 === 0;
  } else {
    malpka.model.visible = true;
  }
}

// Małpka i wojownicy wracają na swoje miejsca
function wrocNaStart() {
  malpka.nietykalna = 0;
  malpka.wDomku = null;
  malpka.model.visible = true;
  malpka.powietrze = POWIETRZE;
  malpka.x = malpka.startX;
  malpka.z = malpka.startZ;
  malpka.kat = Math.PI;
  for (const z of wojownicy) {
    z.position.x = z.startX;
    z.position.z = z.startZ;
  }
  drapieznikiNaStart();
}

// Gra od nowa: pełne życia, a świat wygląda jak na początku
function odNowa() {
  zycia = WSZYSTKIE_ZYCIA;
  zbudujPoziom();
  wrocNaStart();
}

// ----- Kij bojowy -----
// Kiko podnosi kij, kiedy do niego podejdzie, i chodzi z nim jak mistrz:
// kij stoi pionowo przy jej boku. Kliknięcie: Kiko wyciąga kij przed siebie
// i obraca się dookoła, trafiając wojowników ze wszystkich stron.
const DLUGOSC_ZAMACHU = 20;      // tyle kroków gry trwa jeden obrót (jedna trzecia sekundy)
const ZASIEG_PATYKA = 2.4;       // w metrach
let trafilWTymZamachu = false;

function obslugaPatyka() {
  if (patykNaZiemi && patykNaZiemi.visible) {
    patykNaZiemi.rotation.y += 0.02; // kij powoli się kręci
    const odleglosc = Math.hypot(patykNaZiemi.position.x - malpka.x, patykNaZiemi.position.z - malpka.z);
    if (odleglosc < 1.0) {
      patykNaZiemi.visible = false;
      malpka.maPatyk = true;
      malpka.model.patyk.visible = true;
      pokazKomunikat("🥋 " + IMIE_MALPKI + " ma kij bojowy! Kliknij, żeby się zakręcić");
    }
  }
  if (trzymaPrzycisk && malpka.zamach === 0) uderz();

  const reka = malpka.model.reka;
  const lewa = malpka.model.lewaReka;
  const patyk = malpka.model.patyk;
  const slad = malpka.model.slad;
  if (malpka.zamach > 0) {
    malpka.zamach--;
    const postep = 1 - malpka.zamach / DLUGOSC_ZAMACHU; // od 0 do 1
    // Kiko obraca się dookoła raz, szybko na początku i wolniej na końcu
    const obrot = (1 - Math.pow(1 - postep, 2)) * Math.PI * 2;
    malpka.model.rotation.y = malpka.kat + obrot;
    reka.rotation.set(-1.4, -0.5, 0);   // kij wyciągnięty w bok i do przodu
    lewa.rotation.set(-1.4, -0.2, -0.6); // druga ręka też trzyma kij
    patyk.rotation.x = Math.PI / 2;      // kij w jednej linii z ręką
    // krąg w powietrzu i trafienie w połowie obrotu
    slad.visible = postep < 0.9;
    slad.material.opacity = Math.sin(postep * Math.PI) * 0.45;
    if (postep > 0.5 && !trafilWTymZamachu) {
      trafilWTymZamachu = true;
      trafPatykiem();
    }
  } else {
    slad.visible = false;
    lewa.rotation.z = 0;
    lewa.rotation.y = 0;
    reka.rotation.y = 0;
    if (malpka.maPatyk) {
      // kij stoi pionowo przy boku, jak laska mistrza
      reka.rotation.x = -0.4 - malpka.zamachChodu * 0.15;
      patyk.rotation.x = -1.17;
    } else {
      reka.rotation.x = -malpka.zamachChodu * 0.8;
    }
    if (malpka.wspina) reka.rotation.x = -2.6 + Math.sin(czas * 0.3) * 0.4; // łapie pień na zmianę z lewą
  }
}

// Kliknięcie: zaczyna się obrót z kijem
function uderz() {
  if (!malpka.maPatyk || malpka.zamach > 0 || malpka.wDomku || pauza) return;
  malpka.zamach = DLUGOSC_ZAMACHU;
  trafilWTymZamachu = false;
  dzwiekSwist();
}

// W połowie obrotu: kij trafia wszystko dookoła Kiko
function trafPatykiem() {
  const wZasiegu = function (obiekt) {
    const dx = obiekt.position.x - malpka.x;
    const dz = obiekt.position.z - malpka.z;
    const odleglosc = Math.hypot(dx, dz);
    if (odleglosc > ZASIEG_PATYKA || odleglosc < 0.01) return null;
    if (Math.abs(obiekt.position.y - malpka.wysokosc) > 1.5) return null;
    return [dx / odleglosc, dz / odleglosc];
  };
  for (const wojownik of wojownicy) {
    if (!wojownik.visible || wojownik.zycie <= 0) continue;
    const kierunek = wZasiegu(wojownik);
    if (kierunek) {
      trafWojownika(wojownik, kierunek[0], kierunek[1]);
      if (wojownik.zycie > 0) wojownik.zycie--; // kij zabiera 2 życia naraz
    }
  }
  for (const zwierze of zwierzeta) {
    if (zwierze.gatunek.drapieznik && wZasiegu(zwierze)) przestraszZwierze(zwierze); // drapieżnika kij tylko straszy
  }
}

// Wojownik dostaje trafienie: traci życie, odlatuje do tyłu, mruga i się chwieje
function trafWojownika(wojownik, kierunekX, kierunekZ) {
  wojownik.zycie--;
  dzwiekTrafienie();
  wojownik.odrzutX = kierunekX * 0.25; // wojownik odlatuje do tyłu
  wojownik.odrzutZ = kierunekZ * 0.25;
  wojownik.ogluszony = 25;            // przez chwilę nie goni
  wojownik.migniecie = 10;            // mruga na czerwono
  trafionyWojownik(wojownik);
}

// Pokazuje serduszka na ekranie
// Serduszka: ❤️ całe, 💔 pół, 🖤 stracone
function pokazZycia() {
  const cale = Math.floor(zycia);
  const pol = zycia - cale >= 0.5 ? 1 : 0;
  napisZycia.textContent = "🐒 " + IMIE_MALPKI + "  " + "❤️".repeat(cale) + "💔".repeat(pol)
    + "🖤".repeat(Math.max(0, WSZYSTKIE_ZYCIA - cale - pol));
  napisPoziom.textContent = "Poziom " + poziom + " / " + POZIOMY.length;
}

// Kamera leci tuż za plecami małpki, jak w grach przygodowych
const KAMERA_WYSOKO = 2.5; // jak wysoko nad ziemią jest kamera
const KAMERA_DALEKO = 5;   // jak daleko za małpką jest kamera

// Czy w tym miejscu coś zasłania kamerę? (drzewo, domek albo kamień wyższy od kamery)
const WYSOKOSC_PRZESZKOD = { drzewo: WYSOKOSC_DRZEWA + 0.5, domek: 6.5, kamien: 1.6 };
function zaslania(x, z, y) {
  const kafelek = KAFELKI[kafelekW(x, z)];
  if (!kafelek) return false;
  const wysokosc = WYSOKOSC_PRZESZKOD[kafelek.rzecz];
  return wysokosc !== undefined && y < wysokosc;
}

function ustawKamere() {
  // z której strony patrzy kamera: zwykle zza pleców, po F4 z przodu (na twarz)
  const katKamery = malpka.kat + (kameraZPrzodu ? Math.PI : 0);
  // miejsce za plecami małpki. Jak coś zasłania, kamera podjeżdża bliżej.
  // kiedy patrzymy w górę, kamera schodzi niżej, żeby było widać niebo
  const wysokoscKamery = malpka.wysokosc + Math.max(0.5, KAMERA_WYSOKO - malpka.patrz * 1.6);
  let daleko = KAMERA_DALEKO;
  for (let d = 0.8; d <= KAMERA_DALEKO; d += 0.25) {
    const px = malpka.x - Math.sin(katKamery) * d;
    const pz = malpka.z - Math.cos(katKamery) * d;
    if (zaslania(px, pz, wysokoscKamery)) {
      daleko = Math.max(1, d - 0.6);
      break;
    }
  }
  let celX = malpka.x - Math.sin(katKamery) * daleko;
  let celZ = malpka.z - Math.cos(katKamery) * daleko;
  if (malpka.wDomku) {
    // w pokoju kamera wisi pod sufitem przy drzwiach i patrzy na Kiko i cały pokój
    celX = POKOJ.x + (malpka.x - POKOJ.x) * 0.5;
    celZ = POKOJ.z + POLOWA_POKOJU - 0.4;
  }
  const szybko = daleko < KAMERA_DALEKO ? 0.3 : 0.1; // przed przeszkodą kamera ucieka szybciej
  kamera.position.x += (celX - kamera.position.x) * szybko;
  kamera.position.y += ((malpka.wDomku ? 3.2 : wysokoscKamery) - kamera.position.y) * 0.1;
  kamera.position.z += (celZ - kamera.position.z) * szybko;
  // patrzymy na głowę małpki, a jak myszka idzie w górę, to wyżej, w niebo
  if (malpka.wDomku) {
    // w pokoju patrzymy trochę za Kiko, w głąb pokoju, żeby widać było łóżka
    kamera.lookAt(malpka.x * 0.6 + POKOJ.x * 0.4, 0.9, Math.min(malpka.z, POKOJ.z + 1) - 1);
  } else {
    kamera.lookAt(malpka.x, malpka.wysokosc + 1 + Math.tan(malpka.patrz) * daleko, malpka.z);
  }

  niebo.position.copy(kamera.position); // niebo zawsze dookoła nas

  // Słońce świeci zawsze koło małpki, żeby cienie były wszędzie
  slonce.position.set(malpka.x + 8, 20, malpka.z + 6);
  slonce.target.position.set(malpka.x, 0, malpka.z);
}

// ----- Zapisywanie gry -----
// Gra sama zapisuje się w przeglądarce: poziom, serduszka i kij.
// Jak wrócisz jutro, zaczniesz na tym samym poziomie.
const NAZWA_ZAPISU = "monkeyWorldZapis";

function zapiszGre() {
  try {
    localStorage.setItem(NAZWA_ZAPISU, JSON.stringify({ poziom: poziom, zycia: zycia, maPatyk: malpka.maPatyk, gwiazdki: maGwiazdki ? liczbaGwiazdek : -1 }));
  } catch (blad) {
    // przeglądarka nie pozwala zapisywać: trudno, gra działa dalej
  }
}

function wczytajGre() {
  try {
    const zapis = JSON.parse(localStorage.getItem(NAZWA_ZAPISU));
    if (zapis && zapis.poziom >= 1 && zapis.poziom <= POZIOMY.length) return zapis;
  } catch (blad) {
    // nie ma zapisu albo jest zepsuty
  }
  return null;
}

// zapisujemy, kiedy zamykasz grę albo przechodzisz do innej karty
window.addEventListener("beforeunload", zapiszGre);
document.addEventListener("visibilitychange", zapiszGre);

// Na początku: wczytujemy zapisaną grę albo zaczynamy od pierwszego poziomu
const zapis = wczytajGre();
if (zapis) {
  poziom = zapis.poziom;
  odNowa();
  zycia = Math.max(1, Math.min(WSZYSTKIE_ZYCIA, zapis.zycia));
  if (zapis.maPatyk || zapis.maMiecz || zapis.maKusze || zapis.maKarabin || zapis.maPistolet) { // starsze zapisy miały inną broń
    malpka.maPatyk = true;
    malpka.model.patyk.visible = true;
    if (patykNaZiemi) patykNaZiemi.visible = false;
  }
  if (zapis.gwiazdki >= 0 && zapis.gwiazdki !== undefined) {
    maGwiazdki = true;
    liczbaGwiazdek = zapis.gwiazdki;
    if (gwiazdkiNaZiemi) gwiazdkiNaZiemi.peczek.visible = false;
  }
  pokazKomunikat("Witaj z powrotem, " + IMIE_MALPKI + "! Poziom " + poziom);
} else {
  odNowa();
}

// ----- Pętla gry: działa w kółko, około 60 razy na sekundę -----
kamera.position.set(
  malpka.x - Math.sin(malpka.kat) * KAMERA_DALEKO,
  KAMERA_WYSOKO,
  malpka.z - Math.cos(malpka.kat) * KAMERA_DALEKO
);

let czas = 0; // licznik kroków gry, do animacji (60 kroków to jedna sekunda)

// Jeden krok gry: wszystko rusza się o kawałek
function krokGry() {
  czas++;
  if (czas % 300 === 0) zapiszGre(); // co 5 sekund gra sama się zapisuje
  animujSwiat();
  ruszaj();
  mrugajPoZranieniu();
  obslugaMapyISkarbu();
  obslugaPatyka();
  obslugaGwiazdek();
  ruszWojownikow();
  ruszZwierzeta();
  ruszLudzi();
  ustawKamere();
}

// Gra zawsze idzie w tym samym tempie: 60 kroków na sekundę według zegara.
// Jak komputer rysuje wolniej, robimy kilka kroków naraz. Jak rysuje szybciej
// (szybki monitor), czekamy, aż przyjdzie czas na następny krok.
const DLUGOSC_KROKU = 1000 / 60; // milisekundy
let ostatniCzas = null;
let zaleglyCzas = 0;

function petlaGry(teraz) {
  if (teraz === undefined) teraz = performance.now();
  if (ostatniCzas === null) ostatniCzas = teraz;
  zaleglyCzas += Math.min(250, teraz - ostatniCzas); // po długiej przerwie nie nadrabiamy wszystkiego
  ostatniCzas = teraz;
  if (pauza || mapaOtwarta) zaleglyCzas = 0; // w czasie pauzy i oglądania mapy gra stoi
  let kroki = 0;
  while (zaleglyCzas >= DLUGOSC_KROKU && kroki < 5) {
    krokGry();
    zaleglyCzas -= DLUGOSC_KROKU;
    kroki++;
  }
  if (kroki === 5) zaleglyCzas = 0;
  pokazZycia();
  renderer.render(scena, kamera);
  requestAnimationFrame(petlaGry);
}

petlaGry();
