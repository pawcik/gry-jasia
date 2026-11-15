// ===== ŚRODEK DOMKU =====
// Wszystkie duże domki mają w środku taki sam pokój. Pokój stoi daleko poza światem
// (w punkcie POKOJ), więc kiedy Kiko wchodzi do domku, przenosimy ją do pokoju,
// a kiedy wychodzi przez drzwi, wraca przed domek. W pokoju są trzy łóżka:
// mieszkańcy wioski przychodzą tu spać i chować się przed drapieżnikami.

const POKOJ = { x: -400, z: -400 }; // środek pokoju
const POLOWA_POKOJU = 5;             // pokój ma 10 na 10 metrów
const WYSOKOSC_POKOJU = 3.6;
const LOZKA = [-3, 0, 3];            // gdzie stoją łóżka (x względem środka pokoju)
let pokoj = null;

// Deski podłogi: jasne i ciemne pasy drewna
let fakturaDesek = null;
function deski() {
  if (!fakturaDesek) {
    fakturaDesek = zrobFakture(function (pedzel) {
      for (let i = 0; i < 8; i++) {
        const jasnosc = 175 + Math.floor(Math.random() * 50);
        szary(pedzel, jasnosc, 1);
        pedzel.fillRect(0, i * 16, 128, 15);
        szary(pedzel, 120, 1);
        pedzel.fillRect(0, i * 16 + 15, 128, 1); // szpara między deskami
      }
    });
    fakturaDesek.repeat.set(3, 3);
  }
  return fakturaDesek;
}

// Łóżko: drewniana rama, biały materac, poduszka i czerwona kołdra
function zrobLozko() {
  const lozko = new THREE.Group();
  lozko.add(klocek(new THREE.BoxGeometry(1.2, 0.4, 2.2), "#6d4326", 0, 0.2, 0));        // rama
  lozko.add(klocek(new THREE.BoxGeometry(1.2, 0.9, 0.12), "#6d4326", 0, 0.45, -1.1));   // wezgłowie
  lozko.add(klocek(new THREE.BoxGeometry(1.05, 0.14, 2.0), "#f5f1e6", 0, 0.47, 0.02));  // materac
  lozko.add(owal(0.25, "#ffffff", 0, 0.6, -0.75, 1.5, 0.35, 0.8));                      // poduszka
  lozko.add(klocek(new THREE.BoxGeometry(1.1, 0.08, 1.3), "#b71c1c", 0, 0.57, 0.35));   // kołdra
  lozko.add(klocek(new THREE.BoxGeometry(1.12, 0.02, 0.15), "#d4a017", 0, 0.62, -0.22)); // złoty brzeg kołdry
  return lozko;
}

// Napis "Zzz" nad śpiącym
function zrobZzz() {
  const plotno = document.createElement("canvas");
  plotno.width = 128;
  plotno.height = 64;
  const pedzel = plotno.getContext("2d");
  pedzel.font = "bold 44px 'Comic Sans MS', sans-serif";
  pedzel.fillStyle = "#3949ab";
  pedzel.fillText("Zzz", 10, 46);
  const znak = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(plotno), transparent: true }));
  znak.scale.set(0.8, 0.4, 1);
  znak.visible = false;
  return znak;
}

// Buduje pokój raz, na początku gry
function zrobPokoj() {
  const g = new THREE.Group();
  g.position.set(POKOJ.x, 0, POKOJ.z);
  const P = POLOWA_POKOJU;
  const H = WYSOKOSC_POKOJU;

  // drewniana podłoga z deskami
  const podloga = new THREE.Mesh(new THREE.BoxGeometry(P * 2, 0.1, P * 2),
    new THREE.MeshStandardMaterial({ color: kolorek("#a0703f"), map: deski(), roughness: 0.8 }));
  podloga.position.y = -0.05;
  podloga.receiveShadow = true;
  g.add(podloga);

  // ściany (w przedniej jest miejsce na drzwi)
  const sciana = "#f3e6cc";
  g.add(klocek(new THREE.BoxGeometry(P * 2, H, 0.2), sciana, 0, H / 2, -P));            // tylna
  g.add(klocek(new THREE.BoxGeometry(0.2, H, P * 2), sciana, -P, H / 2, 0));            // lewa
  g.add(klocek(new THREE.BoxGeometry(0.2, H, P * 2), sciana, P, H / 2, 0));             // prawa
  g.add(klocek(new THREE.BoxGeometry(P - 0.7, H, 0.2), sciana, -(P + 0.7) / 2, H / 2, P)); // przednia z lewej
  g.add(klocek(new THREE.BoxGeometry(P - 0.7, H, 0.2), sciana, (P + 0.7) / 2, H / 2, P));  // przednia z prawej
  g.add(klocek(new THREE.BoxGeometry(1.4, H - 2.2, 0.2), sciana, 0, 2.2 + (H - 2.2) / 2, P)); // nad drzwiami
  g.add(klocek(new THREE.BoxGeometry(1.3, 2.15, 0.08), "#c62828", 0, 1.08, P - 0.06));  // czerwone drzwi
  g.add(owal(0.05, "#d4a017", 0.45, 1.05, P - 0.12, 1, 1, 1));                          // złota klamka
  g.add(klocek(new THREE.BoxGeometry(P * 2, 0.2, P * 2), "#5d4037", 0, H + 0.1, 0));     // sufit
  for (const bx of [-3, 0, 3]) {
    g.add(klocek(new THREE.BoxGeometry(0.25, 0.25, P * 2), "#4e342e", bx, H - 0.12, 0)); // belki pod sufitem
  }
  for (const [sx, sz] of [[-P + 0.2, -P + 0.2], [P - 0.2, -P + 0.2], [-P + 0.2, P - 0.2], [P - 0.2, P - 0.2]]) {
    g.add(klocek(new THREE.CylinderGeometry(0.15, 0.15, H, 10), "#c62828", sx, H / 2, sz)); // czerwone słupy w rogach
  }

  // okna z błękitnym niebem w bocznych ścianach
  const szybka = new THREE.MeshBasicMaterial({ color: kolorek("#bfe3ff") });
  for (const strona of [-1, 1]) {
    for (const oz of [-1.5, 2]) {
      const okno = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 1.2), szybka);
      okno.position.set(strona * (P - 0.12), 2.0, oz);
      g.add(okno);
      g.add(klocek(new THREE.BoxGeometry(0.08, 0.08, 1.3), "#4e342e", strona * (P - 0.13), 2.0, oz));  // szprosy
      g.add(klocek(new THREE.BoxGeometry(0.08, 1.1, 0.08), "#4e342e", strona * (P - 0.13), 2.0, oz));
    }
  }

  // łóżka pod tylną ścianą, a nad każdym napis Zzz
  g.zzz = [];
  for (const lx of LOZKA) {
    const lozko = zrobLozko();
    lozko.position.set(lx, 0, -P + 1.3);
    g.add(lozko);
    const zzz = zrobZzz();
    zzz.position.set(lx + 0.3, 1.5, -P + 0.9);
    g.add(zzz);
    g.zzz.push(zzz);
  }

  // dywan, niski stolik z miseczkami, poduszki do siedzenia i lampion
  g.add(klocek(new THREE.BoxGeometry(4, 0.02, 3), "#8e1b1b", 0, 0.01, 1.5));             // czerwony dywan
  g.add(klocek(new THREE.BoxGeometry(3.6, 0.025, 2.6), "#d4a017", 0, 0.012, 1.5));       // złoty wzór
  g.add(klocek(new THREE.BoxGeometry(3.4, 0.03, 2.4), "#8e1b1b", 0, 0.015, 1.5));
  g.add(klocek(new THREE.BoxGeometry(1.6, 0.08, 1.0), "#5d3a22", 0, 0.45, 1.5));         // blat stolika
  for (const [nx, nz] of [[-0.7, 1.1], [0.7, 1.1], [-0.7, 1.9], [0.7, 1.9]]) {
    g.add(klocek(new THREE.BoxGeometry(0.08, 0.42, 0.08), "#4e342e", nx, 0.21, nz));     // nogi stolika
  }
  g.add(owal(0.12, "#e0f2f1", -0.4, 0.53, 1.5, 1, 0.45, 1));                            // miseczki
  g.add(owal(0.12, "#e0f2f1", 0.4, 0.53, 1.4, 1, 0.45, 1));
  for (const [px, pz] of [[0, 0.5], [0, 2.5], [-1.3, 1.5], [1.3, 1.5]]) {
    g.add(owal(0.35, "#c62828", px, 0.1, pz, 1, 0.3, 1));                                // poduszki do siedzenia
  }
  g.add(klocek(new THREE.BoxGeometry(0.4, 1.4, 0.4), "#6d4326", -P + 0.5, 0.7, 2.5));    // szafka
  const wazon = owal(0.15, "#1565c0", -P + 0.5, 1.6, 2.5, 1, 1.4, 1);
  g.add(wazon);                                                                         // niebieski wazon
  for (let i = 0; i < 3; i++) {
    g.add(klocek(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4), "#7cb342", -P + 0.5 + (i - 1) * 0.05, 2.0, 2.5)); // bambus w wazonie
  }
  // lampiony pod sufitem świecą ciepłym światłem
  for (const lx of [-2.5, 2.5]) {
    const lampion = owal(0.25, "#e53935", lx, H - 0.8, 1, 1, 1.2, 1);
    lampion.material = new THREE.MeshStandardMaterial({ color: kolorek("#e53935"), emissive: kolorek("#ff5722"), emissiveIntensity: 0.9 });
    g.add(lampion);
  }
  const swiatlo = new THREE.PointLight(0xffd8a8, 1.4, 16, 1.5);
  swiatlo.position.set(0, H - 0.6, 0.5);
  g.add(swiatlo);

  podmienFarby(g, [
    [sciana, farbaZFaktura(sciana, fakturaPlotna, 1)],
    ["#6d4326", farbaZFaktura("#6d4326", fakturaFutra, 0.7)],
    ["#5d3a22", farbaZFaktura("#5d3a22", fakturaFutra, 0.6)],
    ["#f5f1e6", farbaZFaktura("#f5f1e6", fakturaPlotna, 1)],
    ["#b71c1c", farbaZFaktura("#b71c1c", fakturaMaterialu, 1)],
    ["#8e1b1b", farbaZFaktura("#8e1b1b", fakturaMaterialu, 1)],
  ]);
  scena.add(g);
  return g;
}

// Czy w pokoju w tym miejscu jest wolne miejsce (bez ścian, łóżek i stolika)?
function wolneWPokoju(x, z) {
  const lx = x - POKOJ.x;
  const lz = z - POKOJ.z;
  const P = POLOWA_POKOJU - 0.15;
  if (Math.abs(lx) > P || Math.abs(lz) > P) return false;           // ściany
  if (lz < -POLOWA_POKOJU + 2.45) {
    for (const bx of LOZKA) if (Math.abs(lx - bx) < 0.65) return false; // łóżka
  }
  if (Math.abs(lx) < 0.85 && lz > 0.95 && lz < 2.05) return false;  // stolik
  if (lx < -POLOWA_POKOJU + 0.75 && lz > 2.25 && lz < 2.75) return false; // szafka
  return true;
}

// Ustawia kamerę od razu za plecami Kiko (bez długiego przelotu po wejściu i wyjściu)
function skoczKamera() {
  if (malpka.wDomku) {
    kamera.position.set(POKOJ.x, 3.2, POKOJ.z + POLOWA_POKOJU - 0.4);
    return;
  }
  kamera.position.set(
    malpka.x - Math.sin(malpka.kat) * 3,
    malpka.wysokosc + KAMERA_WYSOKO,
    malpka.z - Math.cos(malpka.kat) * 3
  );
}

// Kiko wchodzi do domku: przenosimy ją do pokoju, zaraz za drzwiami
function wejdzDoDomku(domek) {
  if (!pokoj) pokoj = zrobPokoj();
  malpka.wDomku = domek;
  malpka.x = POKOJ.x;
  malpka.z = POKOJ.z + POLOWA_POKOJU - 1.6;
  malpka.kat = Math.PI; // patrzy w głąb pokoju
  malpka.wysokosc = 0;
  malpka.predkoscSkoku = 0;
  skoczKamera();
  dzwiekDrzwi();
  let spiacy = 0;
  for (const czlowiek of ludzie) if (czlowiek.wDomu === domek) spiacy++;
  pokazKomunikat(spiacy > 0 ? "Ciii... tu ktoś śpi 😴" : "🏠 Domek. Tu jesteś bezpieczny!");
}

// Kiko wychodzi przez drzwi i staje przed domkiem
function wyjdzZDomku() {
  const domek = malpka.wDomku;
  malpka.wDomku = null;
  malpka.x = domek.drzwiX;
  malpka.z = domek.drzwiZ + 1.0;
  malpka.kat = 0; // plecami do domku
  skoczKamera();
  dzwiekDrzwi();
  napisPowietrze.textContent = "";
}

// Kiko w pokoju: jak podejdzie do drzwi i idzie w ich stronę, wychodzi
function sprawdzWyjscie(krok) {
  napisPowietrze.textContent = "🏠 wyjście: przez drzwi";
  const przyDrzwiach = Math.abs(malpka.x - POKOJ.x) < 0.9 && malpka.z - POKOJ.z > POLOWA_POKOJU - 1.0;
  if (przyDrzwiach && krok > 0 && Math.cos(malpka.kat) > 0.5) wyjdzZDomku();
}

// Śpiący mieszkańcy leżą w łóżkach tego domku, w którym jest Kiko
function pokazSpiacych() {
  if (!pokoj) return;
  const zajete = [false, false, false];
  for (const czlowiek of ludzie) {
    if (!czlowiek.wDomu) continue;
    const widac = malpka.wDomku === czlowiek.wDomu && czlowiek.lozko >= 0;
    czlowiek.visible = widac;
    if (widac) {
      zajete[czlowiek.lozko] = true;
      // leży na plecach, głową na poduszce
      czlowiek.rotation.set(-Math.PI / 2, 0, 0);
      czlowiek.position.set(POKOJ.x + LOZKA[czlowiek.lozko], 0.72, POKOJ.z - POLOWA_POKOJU + 1.3 + 0.95);
    }
  }
  for (let i = 0; i < 3; i++) {
    pokoj.zzz[i].visible = zajete[i];
    pokoj.zzz[i].position.y = 1.5 + Math.sin(czas * 0.05 + i) * 0.1; // Zzz unosi się
  }
}
