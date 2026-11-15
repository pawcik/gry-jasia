// ===== Świat: stara Japonia =====

// ----- Rzeczy, które możesz zmieniać -----
var GRANICA = 60;              // jak daleko od środka można dojść (w metrach)
var START_X = 0;               // gdzie bohater zaczyna
var START_Z = 24;
var KOLOR_NIEBA = "#bfe3f5";
var KOLOR_TRAWY = "#8cc56a";
var KOLOR_SCIEZKI = "#d8c59c";
var KOLOR_WODY = "#4fa3c7";
var LICZBA_WISNI = 60;         // różowe drzewa wiśni
var LICZBA_SOSEN = 20;         // ciemne sosny
var LICZBA_PLATKOW = 220;      // płatki wiśni lecące w powietrzu

// Rzeka płynie z północy na południe, a przez nią idzie łukowy most
var RZEKA_OD = 18;
var RZEKA_DO = 24;
var MOST_OD = 16.5;
var MOST_DO = 25.5;
var MOST_POL = 2;              // połowa szerokości mostu
var WYSOKOSC_MOSTU = 1.1;

// ----- Farby -----
// Kolory z obrazka trzeba przeliczyć, żeby w 3D wyglądały tak samo
function kolorek(kolor) {
  return new THREE.Color(kolor).convertSRGBToLinear();
}

// Farba "jak z kreskówki" (dwa odcienie: światło i cień). Jeden kolor = jedna farba.
var farby = {};
function farba(kolor) {
  if (!farby[kolor]) farby[kolor] = new THREE.MeshToonMaterial({ color: kolorek(kolor) });
  return farby[kolor];
}

// Farba, która świeci sama (bez cienia): oczy, lampiony, okna
var swiecace = {};
function swiecaca(kolor) {
  if (!swiecace[kolor]) swiecace[kolor] = new THREE.MeshBasicMaterial({ color: kolorek(kolor) });
  return swiecace[kolor];
}

// Biała farba dla gromad (każda rzecz w gromadzie dostaje swój kolor)
var farbaGromady = new THREE.MeshToonMaterial({ color: 0xffffff });

// Jeden kawałek modelu: kształt, kolor (albo gotowa farba) i miejsce
function klocek(ksztalt, kolor, x, y, z, rodzic) {
  var kawalek = new THREE.Mesh(ksztalt, typeof kolor === "string" ? farba(kolor) : kolor);
  kawalek.position.set(x, y, z);
  kawalek.castShadow = true;
  kawalek.receiveShadow = true;
  (rodzic || scena).add(kawalek);
  return kawalek;
}

// Płaski kawałek ziemi (ścieżka, woda, plac)
function plaski(x1, z1, x2, z2, kolor, y) {
  var kawalek = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), farba(kolor));
  kawalek.rotation.x = -Math.PI / 2;
  kawalek.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
  kawalek.receiveShadow = true;
  scena.add(kawalek);
  return kawalek;
}

// Gromada: wiele takich samych kształtów narysowanych za jednym razem (szybko na telefonie).
// Każda rzecz to { x, y, z, sx, sy, sz (rozmiar), obrot, kolor }
function zrobGromade(ksztalt, rzeczy) {
  var gromada = new THREE.InstancedMesh(ksztalt, farbaGromady, rzeczy.length);
  var macierz = new THREE.Matrix4();
  var pozycja = new THREE.Vector3();
  var obrot = new THREE.Quaternion();
  var rozmiar = new THREE.Vector3();
  var os = new THREE.Vector3(0, 1, 0);
  for (var i = 0; i < rzeczy.length; i++) {
    var r = rzeczy[i];
    pozycja.set(r.x, r.y, r.z);
    obrot.setFromAxisAngle(os, r.obrot || 0);
    rozmiar.set(r.sx, r.sy, r.sz);
    macierz.compose(pozycja, obrot, rozmiar);
    gromada.setMatrixAt(i, macierz);
    gromada.setColorAt(i, kolorek(r.kolor));
  }
  gromada.castShadow = true;
  gromada.receiveShadow = true;
  scena.add(gromada);
  return gromada;
}

// ----- Losowanie, które za każdym razem daje ten sam świat -----
var ziarno = 7;
function losuj() {
  ziarno = (ziarno * 16807) % 2147483647;
  return (ziarno - 1) / 2147483646;
}
function losujOd(od, doo) {
  return od + losuj() * (doo - od);
}
function wybierz(lista) {
  return lista[Math.floor(losuj() * lista.length)];
}

// O ile trzeba się obrócić z kąta b do kąta a (zawsze krótszą drogą)
function roznicaKatow(a, b) {
  var r = a - b;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

// ----- Przeszkody -----
var kola = [];          // okrągłe przeszkody: drzewa, latarnie, słupy { x, z, r }
var prostokaty = [];    // prostokątne przeszkody: domy, rzeka, pagoda { x1, z1, x2, z2 }
var zarezerwowane = []; // miejsca, gdzie nie sadzimy drzew ani trawy (ścieżki, pola, rzeka)

// Czy można tu stanąć? (promien = jak gruby jest ten, kto chce stanąć)
function moznaStanac(x, z, promien) {
  if (promien === undefined) promien = PROMIEN_BOHATERA;
  if (Math.abs(x) > GRANICA || Math.abs(z) > GRANICA) return false;
  for (var i = 0; i < kola.length; i++) {
    var k = kola[i];
    var dx = x - k.x;
    var dz = z - k.z;
    if (dx * dx + dz * dz < (k.r + promien) * (k.r + promien)) return false;
  }
  for (var j = 0; j < prostokaty.length; j++) {
    var p = prostokaty[j];
    if (x > p.x1 - promien && x < p.x2 + promien && z > p.z1 - promien && z < p.z2 + promien) return false;
  }
  return true;
}

// Czy to dobre miejsce na nowe drzewo albo kępkę trawy?
function wolneMiejsce(x, z, odstep) {
  if (!moznaStanac(x, z, odstep)) return false;
  for (var i = 0; i < zarezerwowane.length; i++) {
    var p = zarezerwowane[i];
    if (x > p.x1 - odstep && x < p.x2 + odstep && z > p.z1 - odstep && z < p.z2 + odstep) return false;
  }
  return true;
}

// Jak wysoko jest ziemia (na moście wyżej, bo most jest łukiem)
function wysokoscZiemi(x, z) {
  if (Math.abs(z) <= MOST_POL + 0.3 && x > MOST_OD && x < MOST_DO) {
    return WYSOKOSC_MOSTU * Math.sin(Math.PI * (x - MOST_OD) / (MOST_DO - MOST_OD));
  }
  return 0;
}

// ----- Budowanie świata -----
function zbudujSwiat() {
  plaski(-200, -200, 200, 200, KOLOR_TRAWY, 0);
  zrobSciezki();
  zrobRzeke();
  zrobMost();
  zrobPolaRyzowe();
  zrobBrame(0, -20);
  latarnia(-2.8, -8);
  latarnia(2.8, -8);
  latarnia(-2.8, -30);
  latarnia(2.8, -30);
  zrobPagode(0, -45);
  zrobDom(-14, 4, 6, 4.5, "s");
  zrobDom(-25, 4, 5.5, 4.5, "s");
  zrobDom(-14, 20, 6, 4.5, "n");
  zrobDom(-25, 20, 5.5, 4.5, "n");
  zrobDom(-36, 11.9, 4.5, 6, "e");
  zrobBambusy();
  zrobDrzewa();
  zrobKepki();
  zrobGranice();
  zrobPlatki();
}

// Ścieżka z ubitej ziemi
function sciezka(x1, z1, x2, z2) {
  plaski(x1, z1, x2, z2, KOLOR_SCIEZKI, 0.04);
  zarezerwowane.push({ x1: x1, z1: z1, x2: x2, z2: z2 });
}

function zrobSciezki() {
  // Piaszczysty plac do ćwiczeń, tu zaczyna bohater
  plaski(-10, 16, 10, 33, "#e6d6ae", 0.02);
  zarezerwowane.push({ x1: -10, z1: 16, x2: 10, z2: 33 });
  // Żwirowy plac przed pagodą
  plaski(-9, -54, 9, -35, "#cfcac0", 0.02);
  zarezerwowane.push({ x1: -9, z1: -54, x2: 9, z2: -35 });

  sciezka(-1.6, -38, 1.6, 30);              // główna droga na północ, do pagody
  sciezka(-36, 10.4, -1.6, 13.4);           // droga do wioski
  sciezka(1.6, -1.5, MOST_OD, 1.5);         // droga do mostu
  sciezka(MOST_DO, -1.5, 28, 1.5);          // za mostem, do pól ryżowych
}

function zrobRzeke() {
  plaski(RZEKA_OD - 0.6, -200, RZEKA_OD, 200, "#cdb98f", 0.03);
  plaski(RZEKA_DO, -200, RZEKA_DO + 0.6, 200, "#cdb98f", 0.03);
  plaski(RZEKA_OD, -200, RZEKA_DO, 200, KOLOR_WODY, 0.05);

  // Do wody nie można wejść, tylko na most
  prostokaty.push({ x1: RZEKA_OD, z1: -GRANICA - 10, x2: RZEKA_DO, z2: -MOST_POL });
  prostokaty.push({ x1: RZEKA_OD, z1: MOST_POL, x2: RZEKA_DO, z2: GRANICA + 10 });
  zarezerwowane.push({ x1: RZEKA_OD - 1, z1: -200, x2: RZEKA_DO + 1, z2: 200 });

  // Kamienie na brzegach
  var kamienie = [];
  for (var i = 0; i < 70; i++) {
    var brzeg = losuj() < 0.5 ? RZEKA_OD : RZEKA_DO;
    var z = losujOd(-GRANICA - 15, GRANICA + 15);
    if (Math.abs(z) < MOST_POL + 1) continue;
    var s = losujOd(0.3, 0.7);
    kamienie.push({ x: brzeg + losujOd(-0.3, 0.3), y: 0.05, z: z, sx: s * 1.3, sy: s * 0.6, sz: s, obrot: losuj() * 6, kolor: wybierz(["#9e9e9e", "#8a8f94", "#a8a39a"]) });
  }
  zrobGromade(new THREE.DodecahedronGeometry(1, 0), kamienie);
}

// Czerwony łukowy most z drewnianymi deskami
function zrobMost() {
  var ile = 14;
  var dl = (MOST_DO - MOST_OD) / ile;
  var czerwony = "#c0392b";
  for (var i = 0; i < ile; i++) {
    var xa = MOST_OD + i * dl;
    var xb = xa + dl;
    var ya = wysokoscZiemi(xa, 0);
    var yb = wysokoscZiemi(xb, 0);
    var nachylenie = Math.atan2(yb - ya, dl);
    var dlugosc = Math.sqrt(dl * dl + (yb - ya) * (yb - ya));
    var deska = klocek(new THREE.BoxGeometry(dlugosc + 0.02, 0.14, MOST_POL * 2 + 0.2), "#9b7b5b", (xa + xb) / 2, (ya + yb) / 2 - 0.07, 0);
    deska.rotation.z = nachylenie;
    for (var s = -1; s <= 1; s += 2) {
      var porecz = klocek(new THREE.BoxGeometry(dlugosc + 0.02, 0.1, 0.1), czerwony, (xa + xb) / 2, (ya + yb) / 2 + 0.85, s * MOST_POL);
      porecz.rotation.z = nachylenie;
      if (i % 2 === 0) klocek(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 6), czerwony, xa, ya + 0.42, s * MOST_POL);
    }
  }
  for (var t = -1; t <= 1; t += 2) {
    klocek(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 6), czerwony, MOST_DO, 0.42, t * MOST_POL);
  }
}

// Pola ryżowe: płytka woda i rządki ryżu (można po nich chodzić)
function zrobPolaRyzowe() {
  var kolumny = [[28, 39], [40.5, 51.5]];
  var rzedy = [[-25, -10], [-8.2, 6.8], [8.6, 23.6]];
  var ryz = [];
  for (var k = 0; k < kolumny.length; k++) {
    for (var r = 0; r < rzedy.length; r++) {
      var x1 = kolumny[k][0], x2 = kolumny[k][1];
      var z1 = rzedy[r][0], z2 = rzedy[r][1];
      plaski(x1, z1, x2, z2, "#86b9a6", 0.03);
      zarezerwowane.push({ x1: x1 - 1, z1: z1 - 1, x2: x2 + 1, z2: z2 + 1 });
      for (var x = x1 + 0.6; x < x2 - 0.3; x += 1.1) {
        for (var z = z1 + 0.6; z < z2 - 0.3; z += 1.1) {
          var s = losujOd(0.8, 1.2);
          ryz.push({ x: x + losujOd(-0.1, 0.1), y: 0.3, z: z + losujOd(-0.1, 0.1), sx: s, sy: losujOd(0.8, 1.2), sz: s, obrot: losuj() * 6, kolor: wybierz(["#7cb342", "#8bc34a"]) });
        }
      }
    }
  }
  zrobGromade(new THREE.ConeGeometry(0.14, 0.6, 5), ryz);
}

// Czerwona brama przy drodze do pagody
function zrobBrame(x, z) {
  var czerwony = "#d2382c";
  var czarny = "#26221f";
  for (var s = -1; s <= 1; s += 2) {
    klocek(new THREE.CylinderGeometry(0.2, 0.24, 4.2, 10), czerwony, x + s * 2.2, 2.1, z);
    klocek(new THREE.CylinderGeometry(0.27, 0.27, 0.4, 10), czarny, x + s * 2.2, 0.2, z);
    kola.push({ x: x + s * 2.2, z: z, r: 0.3 });
    // końce górnej belki zadarte do góry
    var koniec = klocek(new THREE.BoxGeometry(0.8, 0.22, 0.6), czarny, x + s * 3.6, 4.52, z);
    koniec.rotation.z = s * 0.3;
  }
  klocek(new THREE.BoxGeometry(5.4, 0.3, 0.32), czerwony, x, 3.4, z);
  klocek(new THREE.BoxGeometry(6.6, 0.28, 0.5), czerwony, x, 4.15, z);
  klocek(new THREE.BoxGeometry(6.6, 0.22, 0.6), czarny, x, 4.4, z);
  klocek(new THREE.BoxGeometry(0.5, 0.7, 0.12), czarny, x, 3.8, z);
}

// Kamienna latarnia ze świecącym okienkiem
function latarnia(x, z) {
  var szary = "#a7a39b";
  klocek(new THREE.CylinderGeometry(0.35, 0.42, 0.25, 6), szary, x, 0.12, z);
  klocek(new THREE.CylinderGeometry(0.13, 0.16, 0.9, 8), szary, x, 0.7, z);
  klocek(new THREE.BoxGeometry(0.6, 0.12, 0.6), szary, x, 1.2, z);
  klocek(new THREE.BoxGeometry(0.42, 0.4, 0.42), swiecaca("#ffd77a"), x, 1.46, z);
  klocek(new THREE.ConeGeometry(0.55, 0.38, 6), szary, x, 1.85, z);
  klocek(new THREE.SphereGeometry(0.08, 6, 4), szary, x, 2.08, z);
  kola.push({ x: x, z: z, r: 0.45 });
}

// Wysoka pagoda: pięć pięter z dachami
function zrobPagode(x, z) {
  var kamien = "#9e9a92";
  klocek(new THREE.BoxGeometry(10, 0.6, 10), kamien, x, 0.3, z);
  klocek(new THREE.BoxGeometry(3, 0.3, 1.2), kamien, x, 0.15, z + 5.6);
  prostokaty.push({ x1: x - 5, z1: z - 5, x2: x + 5, z2: z + 5 });

  var y = 0.6;
  for (var i = 0; i < 5; i++) {
    var s = 4.4 - 0.62 * i;
    var h = i === 0 ? 1.8 : 1.3;
    klocek(new THREE.BoxGeometry(s, h, s), "#b8432f", x, y + h / 2, z);
    klocek(new THREE.BoxGeometry(s + 0.1, 0.25, s + 0.1), "#f1e6d0", x, y + h - 0.35, z);
    var dach = klocek(new THREE.ConeGeometry(s * 1.05, 0.8, 4), "#3a3f47", x, y + h + 0.3, z);
    dach.rotation.y = Math.PI / 4;
    y += h + 0.15;
  }
  // Złota iglica na szczycie
  klocek(new THREE.CylinderGeometry(0.07, 0.07, 3, 6), "#c9a43a", x, y + 1.4, z);
  for (var j = 0; j < 6; j++) {
    klocek(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 8), "#c9a43a", x, y + 0.6 + j * 0.35, z);
  }
  // Drzwi
  klocek(new THREE.BoxGeometry(1.2, 1.4, 0.05), "#3e2723", x, 1.3, z + 2.23);
}

// Dom z ciemnym dachem. strona = gdzie są drzwi: "s" (południe), "n" (północ), "e" (wschód)
function zrobDom(x, z, szer, gleb, strona) {
  var drewno = "#5a3d2b";
  klocek(new THREE.BoxGeometry(szer + 0.4, 0.35, gleb + 0.4), "#8d8a84", x, 0.175, z);
  klocek(new THREE.BoxGeometry(szer, 2.1, gleb), "#efe4cb", x, 1.4, z);
  for (var sx = -1; sx <= 1; sx += 2) {
    for (var sz = -1; sz <= 1; sz += 2) {
      klocek(new THREE.BoxGeometry(0.2, 2.1, 0.2), drewno, x + sx * szer / 2, 1.4, z + sz * gleb / 2);
    }
  }
  klocek(new THREE.BoxGeometry(szer + 0.05, 0.18, gleb + 0.05), drewno, x, 2.36, z);

  // Dach: czterospadowy, wystaje poza ściany
  var ksztaltDachu = new THREE.ConeGeometry(1, 1, 4);
  ksztaltDachu.rotateY(Math.PI / 4);
  var dach = klocek(ksztaltDachu, "#4a4e57", x, 2.45 + 0.85, z);
  dach.scale.set((szer / 2 + 0.7) / 0.7071, 1.7, (gleb / 2 + 0.7) / 0.7071);

  // Drzwi i dwa papierowe okna
  var okno = swiecaca("#fff4d6");
  if (strona === "e") {
    klocek(new THREE.BoxGeometry(0.08, 1.7, 1.1), "#6d4c35", x + szer / 2 + 0.02, 1.2, z);
    for (var w = -1; w <= 1; w += 2) klocek(new THREE.BoxGeometry(0.06, 0.7, 0.9), okno, x + szer / 2 + 0.02, 1.6, z + w * gleb * 0.3);
  } else {
    var nz = strona === "s" ? 1 : -1;
    klocek(new THREE.BoxGeometry(1.1, 1.7, 0.08), "#6d4c35", x, 1.2, z + nz * (gleb / 2 + 0.02));
    for (var v = -1; v <= 1; v += 2) klocek(new THREE.BoxGeometry(0.9, 0.7, 0.06), okno, x + v * szer * 0.3, 1.6, z + nz * (gleb / 2 + 0.02));
  }
  prostokaty.push({ x1: x - szer / 2 - 0.2, z1: z - gleb / 2 - 0.2, x2: x + szer / 2 + 0.2, z2: z + gleb / 2 + 0.2 });
}

// Gaj bambusowy
function zrobBambusy() {
  var lodygi = [];
  var liscie = [];
  for (var i = 0; i < 80; i++) {
    var x = losujOd(-52, -36);
    var z = losujOd(-46, -22);
    var s = losujOd(0.8, 1.2);
    lodygi.push({ x: x, y: 3.5 * s, z: z, sx: 1, sy: s, sz: 1, kolor: wybierz(["#7cb342", "#8bc34a", "#689f38"]) });
    liscie.push({ x: x + losujOd(-0.4, 0.4), y: 7 * s - 0.3, z: z + losujOd(-0.4, 0.4), sx: 0.9, sy: 0.4, sz: 0.9, kolor: "#9ccc65" });
    liscie.push({ x: x + losujOd(-0.4, 0.4), y: 5.5 * s, z: z + losujOd(-0.4, 0.4), sx: 0.7, sy: 0.3, sz: 0.7, kolor: "#8bc34a" });
    kola.push({ x: x, z: z, r: 0.12 });
  }
  zrobGromade(new THREE.CylinderGeometry(0.08, 0.09, 7, 6), lodygi);
  zrobGromade(new THREE.SphereGeometry(1, 6, 4), liscie);
  zarezerwowane.push({ x1: -53, z1: -47, x2: -35, z2: -21 });
}

// Drzewa wiśni (różowe) i sosny (ciemnozielone, płaskie korony)
function zrobDrzewa() {
  var pnie = [];
  var korony = [];
  var platkiNaZiemi = [];
  var wisnie = 0;
  var sosny = 0;
  var proby = 0;
  while ((wisnie < LICZBA_WISNI || sosny < LICZBA_SOSEN) && proby < 4000) {
    proby++;
    var x = losujOd(-GRANICA + 2, GRANICA - 2);
    var z = losujOd(-GRANICA + 2, GRANICA - 2);
    if (!wolneMiejsce(x, z, 2.2)) continue;
    var s = losujOd(0.85, 1.25);
    var sosna = sosny < LICZBA_SOSEN && (wisnie >= LICZBA_WISNI || losuj() < 0.25);
    pnie.push({ x: x, y: 1.3 * s, z: z, sx: s, sy: s, sz: s, obrot: losuj() * 6, kolor: sosna ? "#4e3b2c" : "#6b4a3a" });
    if (sosna) {
      for (var j = 0; j < 3; j++) {
        var r = (1.6 - 0.35 * j) * s;
        korony.push({ x: x + losujOd(-0.4, 0.4), y: (2.6 + j * 0.7) * s, z: z + losujOd(-0.4, 0.4), sx: r, sy: 0.55 * s, sz: r, kolor: "#2f6b3f" });
      }
      sosny++;
    } else {
      korony.push({ x: x, y: 3.2 * s, z: z, sx: 1.7 * s, sy: 1.4 * s, sz: 1.7 * s, kolor: wybierz(["#f8bbd0", "#f48fb1", "#fbd3e0"]) });
      for (var k = 0; k < 3; k++) {
        var a = k * 2.1 + losuj();
        korony.push({ x: x + Math.cos(a) * 1.1 * s, y: 2.8 * s, z: z + Math.sin(a) * 1.1 * s, sx: 1.2 * s, sy: 1.0 * s, sz: 1.2 * s, kolor: wybierz(["#f8bbd0", "#f48fb1", "#fbd3e0"]) });
      }
      platkiNaZiemi.push({ x: x, y: 0.025, z: z, sx: 1.9 * s, sy: 1, sz: 1.9 * s, kolor: "#f7c6d9" });
      wisnie++;
    }
    kola.push({ x: x, z: z, r: 0.4 * s });
  }
  zrobGromade(new THREE.CylinderGeometry(0.18, 0.28, 2.6, 6), pnie);
  zrobGromade(new THREE.IcosahedronGeometry(1, 1), korony);
  zrobGromade(new THREE.CylinderGeometry(1, 1, 0.02, 16), platkiNaZiemi);
}

// Kępki trawy, żeby łąka nie była gładka
function zrobKepki() {
  var kepki = [];
  for (var i = 0; i < 1200; i++) {
    var x = losujOd(-GRANICA, GRANICA);
    var z = losujOd(-GRANICA, GRANICA);
    if (!wolneMiejsce(x, z, 0.3)) continue;
    var s = losujOd(0.7, 1.3);
    kepki.push({ x: x, y: 0.2 * s, z: z, sx: s, sy: s, sz: s, obrot: losuj() * 6, kolor: wybierz(["#6da850", "#7bb85a", "#5f9a45"]) });
  }
  zrobGromade(new THREE.ConeGeometry(0.08, 0.4, 4), kepki);
}

// Gęsty las sosen dookoła: tu kończy się świat
function zrobGranice() {
  var sosny = [];
  for (var i = 0; i < 2000 && sosny.length < 260; i++) {
    var x = losujOd(-GRANICA - 20, GRANICA + 20);
    var z = losujOd(-GRANICA - 20, GRANICA + 20);
    if (Math.max(Math.abs(x), Math.abs(z)) < GRANICA + 1.5) continue;
    if (x > RZEKA_OD - 1 && x < RZEKA_DO + 1) continue;
    var s = losujOd(0.9, 1.6);
    sosny.push({ x: x, y: 3 * s, z: z, sx: s, sy: s, sz: s, kolor: wybierz(["#2e5d3a", "#24502f", "#3a6b44"]) });
  }
  zrobGromade(new THREE.ConeGeometry(1.7, 6, 7), sosny);
}

// ----- Płatki wiśni lecące na wietrze -----
var platki = null;
var predkosciPlatkow = [];

function zrobPlatki() {
  var pozycje = new Float32Array(LICZBA_PLATKOW * 3);
  for (var i = 0; i < LICZBA_PLATKOW; i++) {
    pozycje[i * 3] = START_X + losujOd(-16, 16);
    pozycje[i * 3 + 1] = losujOd(0, 9);
    pozycje[i * 3 + 2] = START_Z + losujOd(-14, 10);
    predkosciPlatkow.push({ spadanie: losujOd(0.008, 0.02), faza: losuj() * 6 });
  }
  var ksztalt = new THREE.BufferGeometry();
  ksztalt.setAttribute("position", new THREE.BufferAttribute(pozycje, 3));
  platki = new THREE.Points(ksztalt, new THREE.PointsMaterial({ color: kolorek("#ffb7d0"), size: 0.14 }));
  platki.frustumCulled = false;
  scena.add(platki);
}

function ruszPlatki() {
  var p = platki.geometry.attributes.position.array;
  for (var i = 0; i < LICZBA_PLATKOW; i++) {
    var d = predkosciPlatkow[i];
    var n = i * 3;
    p[n + 1] -= d.spadanie;
    p[n] += 0.012 + Math.sin(czasGry * 0.02 + d.faza) * 0.01;
    p[n + 2] += Math.cos(czasGry * 0.017 + d.faza) * 0.008;
    // Płatek spadł albo odleciał daleko: zaczyna od nowa nad bohaterem
    if (p[n + 1] < 0 || Math.abs(p[n] - bohater.x) > 16 || Math.abs(p[n + 2] - bohater.z) > 14) {
      p[n] = bohater.x + losujOd(-16, 16);
      p[n + 1] = losujOd(3, 9);
      p[n + 2] = bohater.z + losujOd(-14, 10);
    }
  }
  platki.geometry.attributes.position.needsUpdate = true;
}
