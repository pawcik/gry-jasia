// ===== MAPA I UKRYTY SKARB =====
// W wiosce, obok studni, leży zwinięta mapa. Kiedy Kiko ją podniesie,
// klawisz M ją otwiera. Na mapie widać drzewa, kamienie, wodę, wioskę,
// wilczych wojowników, Kiko i czerwony krzyżyk: tam jest ukryty skarb!

let mapaNaZiemi = null;   // zwinięta mapa leżąca w wiosce
let maMape = false;       // czy Kiko ma już mapę
let mapaOtwarta = false;  // czy mapa jest teraz na ekranie (gra wtedy stoi)
let skrzyniaSkarbu = null;
let skarbZnaleziony = false;
let tloMapy = null;       // obrazek mapy bez ruchomych rzeczy (rysowany raz na poziom)

const plotnoMapy = document.getElementById("mapa");
const pedzelMapy = plotnoMapy.getContext("2d");

// Zwinięta mapa: rulon starego papieru przewiązany czerwoną wstążką
function zrobZwinietaMape() {
  const grupa = new THREE.Group();
  const rulon = new THREE.Group();
  rulon.position.y = 0.7;
  grupa.add(rulon);
  const papier = klocek(new THREE.CylinderGeometry(0.09, 0.09, 0.6, 16), "#e8d5a3", 0, 0, 0);
  papier.rotation.z = Math.PI / 2;
  rulon.add(papier);
  for (const x of [-0.31, 0.31]) {
    const koniec = klocek(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), "#d9c08a", x, 0, 0);
    koniec.rotation.z = Math.PI / 2; // zawinięte brzegi
    rulon.add(koniec);
  }
  const wstazka = klocek(new THREE.TorusGeometry(0.095, 0.015, 6, 16), "#c62828", 0, 0, 0);
  wstazka.rotation.y = Math.PI / 2;
  rulon.add(wstazka);
  podmienFarby(grupa, [
    ["#e8d5a3", farbaZFaktura("#e8d5a3", fakturaPlotna, 1)],
    ["#d9c08a", farbaZFaktura("#d9c08a", fakturaPlotna, 1)],
  ]);
  grupa.rulon = rulon;
  return grupa;
}

// Skrzynia skarbu: drewniana, z metalowymi okuciami i wieczkiem, które się otwiera.
// W środku błyszczą złote monety.
function zrobSkrzynie() {
  const skrzynia = new THREE.Group();
  const drewno = "#7a4a26";
  skrzynia.add(klocek(new THREE.BoxGeometry(0.8, 0.45, 0.5), drewno, 0, 0.225, 0));          // skrzynia
  for (const x of [-0.3, 0.3]) {
    skrzynia.add(klocek(new THREE.BoxGeometry(0.06, 0.47, 0.52), "#4a4a4a", x, 0.225, 0));   // okucia
  }
  skrzynia.add(owal(0.3, "#ffca28", 0, 0.46, 0, 1.2, 0.3, 0.75));                             // kupka monet w środku
  // wieczko na zawiasie z tyłu
  skrzynia.wieczko = new THREE.Group();
  skrzynia.wieczko.position.set(0, 0.45, -0.25);
  skrzynia.add(skrzynia.wieczko);
  const luk = klocek(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 16, 1, false, 0, Math.PI), drewno, 0, 0, 0.25);
  luk.rotation.z = Math.PI / 2;
  skrzynia.wieczko.add(luk);
  skrzynia.wieczko.add(klocek(new THREE.BoxGeometry(0.1, 0.12, 0.04), "#d4a017", 0, 0.0, 0.51)); // złoty zamek
  podmienFarby(skrzynia, [
    [drewno, farbaZFaktura(drewno, fakturaFutra, 0.8)],
    ["#4a4a4a", farbaLsniaca("#4a4a4a", 0.4, 0.8)],
    ["#d4a017", farbaLsniaca("#d4a017", 0.3, 0.9)],
    ["#ffca28", farbaLsniaca("#ffca28", 0.25, 1)],
  ]);
  return skrzynia;
}

// Przy budowaniu poziomu: mapa obok studni i skarb ukryty daleko w lesie
function dodajMapeISkarb() {
  mapaOtwarta = false;
  plotnoMapy.style.display = "none";
  maMape = false;
  skarbZnaleziony = false;
  mapaNaZiemi = null;
  skrzyniaSkarbu = null;

  if (wioska) {
    mapaNaZiemi = zrobZwinietaMape();
    mapaNaZiemi.position.set((wioska.k + 12) * KAFELEK, 0, (wioska.w + 5) * KAFELEK); // przy studni
    kawalkiSwiata.add(mapaNaZiemi);
  }

  // skarb leży w kryjówce: tam, gdzie na mapie jest litera X
  let miejsce = null;
  for (let w = 0; w < swiat.length && !miejsce; w++) {
    const k = swiat[w].indexOf("X");
    if (k >= 0) miejsce = [w, k];
  }
  if (miejsce) {
    const [w, k] = miejsce;
    skrzyniaSkarbu = zrobSkrzynie();
    skrzyniaSkarbu.position.set(k * KAFELEK, 0, w * KAFELEK);
    skrzyniaSkarbu.rotation.y = Math.random() * Math.PI * 2;
    kawalkiSwiata.add(skrzyniaSkarbu);
  }

  narysujTloMapy();
}

// Każdy krok gry: zbieranie mapy i szukanie skarbu
function obslugaMapyISkarbu() {
  if (mapaNaZiemi && mapaNaZiemi.visible) {
    mapaNaZiemi.rulon.rotation.y += 0.03;
    mapaNaZiemi.rulon.position.y = 0.7 + Math.sin(czas * 0.05) * 0.1;
    if (Math.hypot(mapaNaZiemi.position.x - malpka.x, mapaNaZiemi.position.z - malpka.z) < 1.2) {
      mapaNaZiemi.visible = false;
      maMape = true;
      dzwiekChrup();
      pokazKomunikat("🗺️ " + IMIE_MALPKI + " ma mapę! Naciśnij M, żeby ją obejrzeć");
    }
  }
  if (skrzyniaSkarbu && !skarbZnaleziony) {
    if (Math.hypot(skrzyniaSkarbu.position.x - malpka.x, skrzyniaSkarbu.position.z - malpka.z) < 1.3) {
      skarbZnaleziony = true;
      zycia = WSZYSTKIE_ZYCIA;
      dzwiekSkarbu();
      pokazKomunikat("💰 SKARB! " + IMIE_MALPKI + " ma znowu wszystkie serduszka!");
    }
  }
  // wieczko skrzyni powoli się otwiera, kiedy skarb jest znaleziony
  if (skrzyniaSkarbu && skarbZnaleziony && skrzyniaSkarbu.wieczko.rotation.x > -1.9) {
    skrzyniaSkarbu.wieczko.rotation.x -= 0.05;
  }
}

// Klawisz M: otwiera i zamyka mapę (tylko jak Kiko ją ma)
document.addEventListener("keydown", function (e) {
  if (e.key.toLowerCase() !== "m" || e.repeat) return;
  if (!maMape) {
    pokazKomunikat("Nie masz jeszcze mapy. Poszukaj jej w wiosce przy studni! 🗺️");
    return;
  }
  mapaOtwarta = !mapaOtwarta;
  plotnoMapy.style.display = mapaOtwarta ? "block" : "none";
  if (mapaOtwarta) narysujMape();
});

// ----- Rysowanie mapy -----
const KRATKA = 7; // ile punktów na mapie ma jeden kawałek świata

// Tło mapy: stary papier, ziemia, woda, drzewa, kamienie, domki i wioska
function narysujTloMapy() {
  const szer = swiat[0].length;
  const wys = swiat.length;
  tloMapy = document.createElement("canvas");
  tloMapy.width = szer * KRATKA;
  tloMapy.height = wys * KRATKA;
  const p = tloMapy.getContext("2d");
  p.fillStyle = "#e9d8a6";
  p.fillRect(0, 0, tloMapy.width, tloMapy.height);
  for (let w = 0; w < wys; w++) {
    for (let k = 0; k < szer; k++) {
      const litera = swiat[w][k];
      const x = k * KRATKA;
      const y = w * KRATKA;
      if (litera === "." || litera === "S") p.fillStyle = "#b9c98a";
      else if (litera === "P" || litera === "U") p.fillStyle = "#e3c98b";
      else if (litera === "W") p.fillStyle = "#7fb3d5";
      else if (litera === "=") p.fillStyle = "#a0522d";
      else p.fillStyle = "#b9c98a";
      p.fillRect(x, y, KRATKA, KRATKA);
      if (litera === "T") {
        p.fillStyle = "#3e6b2a"; // drzewo: zielone kółko
        p.beginPath();
        p.arc(x + KRATKA / 2, y + KRATKA / 2, KRATKA * 0.45, 0, Math.PI * 2);
        p.fill();
      } else if (litera === "K") {
        p.fillStyle = "#8a8a8a"; // kamień: szary trójkąt
        p.beginPath();
        p.moveTo(x + KRATKA / 2, y + 1);
        p.lineTo(x + KRATKA - 1, y + KRATKA - 1);
        p.lineTo(x + 1, y + KRATKA - 1);
        p.fill();
      } else if (litera === "D") {
        p.fillStyle = "#b71c1c"; // domek: czerwony kwadrat
        p.fillRect(x + 1, y + 1, KRATKA - 2, KRATKA - 2);
      } else if (litera === "U") {
        p.fillStyle = "#4a6fa5"; // studnia
        p.beginPath();
        p.arc(x + KRATKA / 2, y + KRATKA / 2, KRATKA * 0.4, 0, Math.PI * 2);
        p.fill();
      }
    }
  }
  // wioska: przerywana ramka i napis
  if (wioska) {
    p.strokeStyle = "#6d3b1a";
    p.lineWidth = 2;
    p.setLineDash([6, 4]);
    p.strokeRect(wioska.k * KRATKA, wioska.w * KRATKA, wioska.szerokosc * KRATKA, wioska.wysokosc * KRATKA);
    p.setLineDash([]);
    p.fillStyle = "#4e2a12";
    p.font = "bold 16px 'Comic Sans MS', sans-serif";
    p.textAlign = "center";
    p.fillText("🏯 Wioska", (wioska.k + wioska.szerokosc / 2) * KRATKA, wioska.w * KRATKA - 6);
  }
  // brzeg mapy: płot
  p.strokeStyle = "#6d3b1a";
  p.lineWidth = 3;
  p.strokeRect(1, 1, tloMapy.width - 2, tloMapy.height - 2);
}

// Cała mapa: tło, a na nim skarb, wilczy wojownicy i Kiko
function narysujMape() {
  if (!tloMapy) return;
  const ramka = 30;
  plotnoMapy.width = tloMapy.width + ramka * 2;
  plotnoMapy.height = tloMapy.height + ramka * 2 + 30;
  const p = pedzelMapy;
  // brzegi starego papieru
  p.fillStyle = "#d8c08a";
  p.fillRect(0, 0, plotnoMapy.width, plotnoMapy.height);
  p.drawImage(tloMapy, ramka, ramka + 30);
  p.fillStyle = "#4e2a12";
  p.font = "bold 22px 'Comic Sans MS', sans-serif";
  p.textAlign = "center";
  p.fillText("🗺️ Mapa poziomu " + poziom + "   (M = zamknij)", plotnoMapy.width / 2, 34);

  const naMapie = function (x, z) {
    return [ramka + (x / KAFELEK + 0.5) * KRATKA, ramka + 30 + (z / KAFELEK + 0.5) * KRATKA];
  };
  p.textBaseline = "middle";

  // skarb: czerwony krzyżyk (po znalezieniu zielony ptaszek)
  if (skrzyniaSkarbu) {
    const [x, y] = naMapie(skrzyniaSkarbu.position.x, skrzyniaSkarbu.position.z);
    if (skarbZnaleziony) {
      p.font = "bold 22px sans-serif";
      p.fillStyle = "#2e7d32";
      p.fillText("✔", x, y);
    } else {
      p.strokeStyle = "#c62828";
      p.lineWidth = 4;
      p.beginPath();
      p.moveTo(x - 8, y - 8);
      p.lineTo(x + 8, y + 8);
      p.moveTo(x + 8, y - 8);
      p.lineTo(x - 8, y + 8);
      p.stroke();
      p.font = "bold 14px 'Comic Sans MS', sans-serif";
      p.fillStyle = "#c62828";
      p.fillText("skarb", x, y + 16);
    }
  }

  // gwiazdki do rzucania (dopóki leżą na postumencie)
  if (gwiazdkiNaZiemi && gwiazdkiNaZiemi.peczek.visible) {
    const [x, y] = naMapie(gwiazdkiNaZiemi.position.x, gwiazdkiNaZiemi.position.z);
    p.font = "20px sans-serif";
    p.fillText("⭐", x, y);
    p.font = "bold 14px 'Comic Sans MS', sans-serif";
    p.fillStyle = "#4e2a12";
    p.fillText("gwiazdki", x, y + 16);
  }

  // rzucone gwiazdki leżące na ziemi: małe gwiazdki, żeby łatwo je znaleźć i podnieść
  p.font = "18px sans-serif";
  for (const g of lezaceGwiazdki) {
    const [x, y] = naMapie(g.position.x, g.position.z);
    p.fillText("⭐", x, y);
  }

  // wilczy wojownicy
  p.font = "14px sans-serif";
  for (const wojownik of wojownicy) {
    if (!wojownik.visible || wojownik.zycie <= 0) continue;
    const [x, y] = naMapie(wojownik.position.x, wojownik.position.z);
    p.fillText("🐺", x, y);
  }

  // Kiko: małpka i strzałka, w którą stronę patrzy
  const [kx, ky] = naMapie(malpka.x, malpka.z);
  p.strokeStyle = "#ffffff";
  p.lineWidth = 3;
  p.beginPath();
  p.moveTo(kx, ky);
  p.lineTo(kx + Math.sin(malpka.kat) * 18, ky + Math.cos(malpka.kat) * 18);
  p.stroke();
  p.font = "20px sans-serif";
  p.fillText("🐒", kx, ky);
}
