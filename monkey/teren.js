// ===== TEREN =====
// Dookoła każdej mapy z mapa.js dokładamy nowy teren: las albo pustynię.
// Na samym brzegu stoi płot, dalej nie da się przejść, ale widać las i góry.

const RAMKA = 30; // o ile kawałków mapa rośnie z każdej strony

// Kryjówka skarbu: kamienny krąg otoczony głęboką fosą z wodą.
// Żeby dojść do skarbu (X), trzeba przepłynąć fosę (Shift!) i wejść przez jedyną
// szczelinę w skałach. W środku pilnują dwaj wilczy wojownicy (Z), którzy nie umieją pływać.
const PLAN_KRYJOWKI = [
  "...........",
  ".WWWWWWWWW.",
  ".WWWWWWWWW.",
  ".WWKKKKKWW.",
  ".WWK..ZKWW.",
  ".WWK.X.KWW.",
  ".WWKZ..KWW.",
  ".WWKK.KKWW.",
  ".WWWWWWWWW.",
  ".WWWWWWWWW.",
  "...........",
];

// Wioska z ludźmi: plan z literami, tak jak mapy w mapa.js.
// D = domek (DD nad DD to duży dom, drzwi od dołu), U = studnia, P = droga z piasku
const PLAN_WIOSKI = [
  "......................",
  ".DD...DD...DD....DD...",
  ".DD...DD...DD....DD...",
  "..........P...........",
  "..........P...........",
  "PPPPPPPPPPUPPPPPPPPPPP",
  "..........P...........",
  "..........P...........",
  ".DD...DD...DD....DD...",
  ".DD...DD...DD....DD...",
  "......................",
  "......................",
];

// Bierze mapę z mapa.js i dokłada dookoła nowy teren i wioskę
function powiekszMape(mapa) {
  // czy to pustynia? (więcej piasku niż trawy)
  let trawa = 0;
  let piasek = 0;
  for (const wiersz of mapa) {
    for (const litera of wiersz) {
      if (litera === ".") trawa++;
      if (litera === "P") piasek++;
    }
  }
  const pustynia = piasek > trawa;
  const grunt = pustynia ? "P" : ".";

  const nowa = [];
  for (let w = 0; w < mapa.length + 2 * RAMKA; w++) {
    const wiersz = [];
    for (let k = 0; k < mapa[0].length + 2 * RAMKA; k++) {
      const staryW = w - RAMKA;
      const staryK = k - RAMKA;
      const naStarejMapie = staryW >= 0 && staryW < mapa.length && staryK >= 0 && staryK < mapa[0].length;
      if (naStarejMapie) {
        const litera = mapa[staryW][staryK];
        const brzeg = staryW === 0 || staryW === mapa.length - 1 || staryK === 0 || staryK === mapa[0].length - 1;
        if (brzeg && (litera === "T" || litera === "K" || litera === "W")) {
          // stary brzeg mapy się otwiera, zostaje tylko kilka drzew i skał
          wiersz.push((litera !== "W" && Math.random() < 0.25) ? litera : grunt);
        } else {
          wiersz.push(litera);
        }
      } else {
        // nowy teren: las z kamieniami albo pustynia ze skałami
        const los = Math.random();
        if (pustynia) wiersz.push(los < 0.05 ? "K" : grunt);
        else wiersz.push(los < 0.1 ? "T" : (los < 0.12 ? "K" : grunt));
      }
    }
    nowa.push(wiersz);
  }

  // wioska na nowym terenie, pod starą mapą
  const wioska = {
    w: RAMKA + mapa.length + 3,
    k: RAMKA + Math.floor((mapa[0].length - PLAN_WIOSKI[0].length) / 2),
    wysokosc: PLAN_WIOSKI.length,
    szerokosc: PLAN_WIOSKI[0].length,
  };
  for (let w = 0; w < wioska.wysokosc; w++) {
    for (let k = 0; k < wioska.szerokosc; k++) {
      const litera = PLAN_WIOSKI[w][k];
      nowa[wioska.w + w][wioska.k + k] = litera === "." ? grunt : litera;
    }
  }

  // polana z gwiazdkami do rzucania w lewym dolnym rogu lasu (gwiazdki.js)
  const polanaW = nowa.length - PLAN_POLANY.length - 4;
  const polanaK = 4;
  for (let w = 0; w < PLAN_POLANY.length; w++) {
    for (let k = 0; k < PLAN_POLANY[0].length; k++) {
      const litera = PLAN_POLANY[w][k];
      nowa[polanaW + w][polanaK + k] = litera === "." ? grunt : litera;
    }
  }

  // kryjówka skarbu w dalekim rogu lasu, po przeciwnej stronie niż wioska
  const kryjowkaW = 4;
  const kryjowkaK = nowa[0].length - PLAN_KRYJOWKI[0].length - 4;
  for (let w = 0; w < PLAN_KRYJOWKI.length; w++) {
    for (let k = 0; k < PLAN_KRYJOWKI[0].length; k++) {
      const litera = PLAN_KRYJOWKI[w][k];
      nowa[kryjowkaW + w][kryjowkaK + k] = litera === "." ? grunt : litera;
    }
  }

  const gotowa = nowa.map((wiersz) => wiersz.join(""));
  gotowa.pustynia = pustynia;
  gotowa.wioska = wioska;
  return gotowa;
}

// Czy ten kawałek mapy leży w wiosce?
let wioska = null;
function wWiosce(w, k) {
  return wioska !== null && w >= wioska.w && w < wioska.w + wioska.wysokosc
    && k >= wioska.k && k < wioska.k + wioska.szerokosc;
}

// Studnia na środku wioski: kamienna cembrowina, daszek na dwóch słupkach i wiadro
function zrobStudnie() {
  const studnia = new THREE.Group();
  studnia.add(klocek(new THREE.CylinderGeometry(0.75, 0.8, 0.8, 16), "#9e9e9e", 0, 0.4, 0));   // kamienie
  studnia.add(klocek(new THREE.CylinderGeometry(0.6, 0.6, 0.02, 16), "#1d3b4f", 0, 0.75, 0));  // woda w środku
  for (const sx of [-0.7, 0.7]) {
    studnia.add(klocek(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8), "#6d4c41", sx, 1.4, 0)); // słupek
  }
  studnia.add(klocek(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8), "#6d4c41", 0, 1.9, 0));    // wałek na linę
  studnia.children[studnia.children.length - 1].rotation.z = Math.PI / 2;
  const daszek = klocek(new THREE.ConeGeometry(1.2, 0.6, 4), "#00796b", 0, 2.45, 0);           // zielony daszek
  daszek.rotation.y = Math.PI / 4;
  studnia.add(daszek);
  studnia.add(klocek(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4), "#d7ccc8", 0.2, 1.6, 0));  // lina
  studnia.add(klocek(new THREE.CylinderGeometry(0.12, 0.1, 0.18, 10), "#8d6e63", 0.2, 1.25, 0)); // wiadro
  return studnia;
}

// Czy ten kawałek mapy leży na nowym terenie (a nie na starej mapie z mapa.js)?
function naNowymTerenie(w, k) {
  return w < RAMKA || k < RAMKA || w >= swiat.length - RAMKA || k >= swiat[0].length - RAMKA;
}

// Płot dookoła świata: drewniane słupki i dwie poprzeczki z każdej strony
function zrobPlot() {
  const plot = new THREE.Group();
  const lewo = -KAFELEK / 2;
  const prawo = (swiat[0].length - 0.5) * KAFELEK;
  const gora = -KAFELEK / 2;
  const dol = (swiat.length - 0.5) * KAFELEK;
  const drewno = farbaZFaktura("#8d6e4f", fakturaFutra, 1);

  // słupki: jeden kształt powtórzony wiele razy, żeby gra działała szybko
  const miejsca = [];
  for (let x = lewo; x <= prawo; x += 2) {
    miejsca.push([x, gora]);
    miejsca.push([x, dol]);
  }
  for (let z = gora + 2; z < dol; z += 2) {
    miejsca.push([lewo, z]);
    miejsca.push([prawo, z]);
  }
  const slupki = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.08, 1.1, 6), drewno, miejsca.length);
  const ustaw = new THREE.Matrix4();
  miejsca.forEach(function ([x, z], i) {
    ustaw.makeTranslation(x, 0.55, z);
    slupki.setMatrixAt(i, ustaw);
  });
  slupki.castShadow = true;
  plot.add(slupki);

  // poprzeczki
  const szerokosc = prawo - lewo;
  const dlugosc = dol - gora;
  for (const y of [0.45, 0.9]) {
    for (const z of [gora, dol]) {
      const deska = new THREE.Mesh(new THREE.BoxGeometry(szerokosc, 0.08, 0.05), drewno);
      deska.position.set((lewo + prawo) / 2, y, z);
      deska.castShadow = true;
      plot.add(deska);
    }
    for (const x of [lewo, prawo]) {
      const deska = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, dlugosc), drewno);
      deska.position.set(x, y, (gora + dol) / 2);
      deska.castShadow = true;
      plot.add(deska);
    }
  }
  return plot;
}

// Widok za płotem: wielka łąka (albo pustynia), las i góry na horyzoncie.
// Tam nie da się dojść, ale wszystko widać.
function zrobWidok(pustynia) {
  const widok = new THREE.Group();
  const szerokosc = swiat[0].length * KAFELEK;
  const dlugosc = swiat.length * KAFELEK;
  const srodekX = szerokosc / 2 - KAFELEK / 2;
  const srodekZ = dlugosc / 2 - KAFELEK / 2;

  // wielka ziemia aż po horyzont (trochę niżej niż świat, żeby nie wystawała)
  const faktura = fakturaZiemi.clone();
  faktura.wrapS = THREE.RepeatWrapping;
  faktura.wrapT = THREE.RepeatWrapping;
  faktura.repeat.set(300, 300);
  faktura.needsUpdate = true;
  const ziemiaDaleko = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: kolorek(pustynia ? "#e6cf8b" : "#7aa84a"), map: faktura, roughness: 1 })
  );
  ziemiaDaleko.rotation.x = -Math.PI / 2;
  ziemiaDaleko.position.set(srodekX, -0.45, srodekZ);
  ziemiaDaleko.receiveShadow = true;
  widok.add(ziemiaDaleko);

  // las (albo skały) za płotem
  for (let i = 0; i < 180; i++) {
    const strona = Math.floor(Math.random() * 4);
    const odPlotu = 3 + Math.random() * 40;
    let x;
    let z;
    if (strona === 0) { x = Math.random() * (szerokosc + 80) - 40; z = -odPlotu; }
    else if (strona === 1) { x = Math.random() * (szerokosc + 80) - 40; z = dlugosc + odPlotu; }
    else if (strona === 2) { x = -odPlotu; z = Math.random() * dlugosc; }
    else { x = szerokosc + odPlotu; z = Math.random() * dlugosc; }
    const rzecz = pustynia && Math.random() < 0.8 ? zrobKamien() : zrobDrzewo();
    rzecz.position.set(x, -0.25, z);
    widok.add(rzecz);
  }

  // góry na horyzoncie, z białymi czubkami
  const farbaGor = new THREE.MeshStandardMaterial({ color: kolorek(pustynia ? "#b59a7a" : "#7f93a8"), roughness: 1, flatShading: true, fog: false });
  const farbaSniegu = new THREE.MeshStandardMaterial({ color: kolorek("#f4f7fb"), roughness: 1, flatShading: true, fog: false });
  const promien = Math.max(szerokosc, dlugosc) / 2 + 100;
  for (let i = 0; i < 18; i++) {
    const kat = (i / 18) * Math.PI * 2 + Math.random() * 0.2;
    const odleglosc = promien + Math.random() * 40;
    const wysokosc = 35 + Math.random() * 35;
    const szeroka = 30 + Math.random() * 25;
    const gora = new THREE.Mesh(new THREE.ConeGeometry(szeroka, wysokosc, 7), farbaGor);
    gora.position.set(srodekX + Math.sin(kat) * odleglosc, wysokosc / 2 - 1, srodekZ + Math.cos(kat) * odleglosc);
    gora.rotation.y = Math.random() * Math.PI;
    widok.add(gora);
    if (!pustynia) {
      // śnieg na czubku: mały stożek tego samego kształtu
      const snieg = new THREE.Mesh(new THREE.ConeGeometry(szeroka * 0.3, wysokosc * 0.3, 7), farbaSniegu);
      snieg.position.set(0, wysokosc * 0.35 + 0.1, 0);
      gora.add(snieg);
    }
  }
  return widok;
}

// Ziemia całego świata jako jeden kształt powtórzony wiele razy (gra działa dużo szybciej
// niż z tysiącami osobnych kawałków). Każdy kawałek ma swój kolor.
function zrobZiemie(kawalki) {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, map: fakturaZiemi, roughness: 1 });
  const ziemiaSwiata = new THREE.InstancedMesh(new THREE.BoxGeometry(KAFELEK, 0.2, KAFELEK), material, kawalki.length);
  const ustaw = new THREE.Matrix4();
  kawalki.forEach(function (kawalek, i) {
    ustaw.makeTranslation(kawalek.x, -0.1, kawalek.z);
    ziemiaSwiata.setMatrixAt(i, ustaw);
    ziemiaSwiata.setColorAt(i, kolorek(kawalek.kolor));
  });
  ziemiaSwiata.instanceColor.needsUpdate = true;
  ziemiaSwiata.receiveShadow = true;
  return ziemiaSwiata;
}

// ===== SKLEJANIE RZECZY, KTÓRE SIĘ NIE RUSZAJĄ =====
// Komputer rysuje szybciej kilka dużych kształtów niż tysiące małych.
// Dlatego drzewa, domki, kamienie i ozdoby sklejamy w duże kawałki:
// wszystko w jednym kwadracie świata i w tym samym kolorze staje się jednym kształtem.

const statyczne = [];     // rzeczy do sklejenia (dokładane przy budowaniu poziomu)
const KWADRAT = 24;       // wielkość kwadratu świata w metrach

// Wiatr dla sklejonych koron drzew: liczy go karta graficzna
const wiatrDlaDrzew = { czas: { value: 0 }, sila: { value: 1 } };
const farbyNaWietrze = {};
function farbaNaWietrze(material) {
  if (!farbyNaWietrze[material.uuid]) {
    const nowa = material.clone();
    nowa.onBeforeCompile = function (shader) {
      shader.uniforms.czasWiatru = wiatrDlaDrzew.czas;
      shader.uniforms.silaWiatru = wiatrDlaDrzew.sila;
      shader.vertexShader = "uniform float czasWiatru;\nuniform float silaWiatru;\n" + shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n" +
        "float wysoko = max(0.0, transformed.y - 1.5);\n" +
        "transformed.x += sin(czasWiatru * 1.8 + transformed.z * 0.15) * 0.03 * wysoko * silaWiatru;\n" +
        "transformed.z += cos(czasWiatru * 1.5 + transformed.x * 0.15) * 0.02 * wysoko * silaWiatru;"
      );
    };
    farbyNaWietrze[material.uuid] = nowa;
  }
  return farbyNaWietrze[material.uuid];
}

function scalStatyczne(grupa) {
  grupa.updateMatrixWorld(true);
  const kupki = {};      // kawałki pogrupowane: kwadrat + farba + cień
  const doUsuniecia = [];
  const pozycja = new THREE.Vector3();

  function zbierz(obiekt, naWietrze) {
    if (obiekt.userData.ruchome) return; // np. drzwi, które się otwierają
    const wiatr = naWietrze || obiekt.userData.kolysze === true;
    if (obiekt.isMesh && !obiekt.isInstancedMesh) {
      obiekt.getWorldPosition(pozycja);
      const material = wiatr ? farbaNaWietrze(obiekt.material) : obiekt.material;
      const klucz = Math.floor(pozycja.x / KWADRAT) + "," + Math.floor(pozycja.z / KWADRAT) + "," + material.uuid + "," + obiekt.castShadow;
      if (!kupki[klucz]) kupki[klucz] = { material: material, cien: obiekt.castShadow, ksztalty: [] };
      let ksztalt = obiekt.geometry.clone();
      ksztalt.applyMatrix4(obiekt.matrixWorld);
      if (ksztalt.index) ksztalt = ksztalt.toNonIndexed();
      kupki[klucz].ksztalty.push(ksztalt);
      doUsuniecia.push(obiekt);
    }
    for (const dziecko of obiekt.children) zbierz(dziecko, wiatr);
  }
  for (const rzecz of statyczne) zbierz(rzecz, false);
  for (const obiekt of doUsuniecia) obiekt.parent.remove(obiekt);

  for (const klucz in kupki) {
    const kupka = kupki[klucz];
    const sklejony = new THREE.Mesh(sklejKsztalty(kupka.ksztalty), kupka.material);
    sklejony.castShadow = kupka.cien;
    sklejony.receiveShadow = true;
    sklejony.userData.sklejony = true;
    grupa.add(sklejony);
  }
  statyczne.length = 0;
}

// Skleja wiele kształtów w jeden (punkty, kierunki ścian i miejsca na fakturę)
function sklejKsztalty(ksztalty) {
  let ilePunktow = 0;
  for (const k of ksztalty) ilePunktow += k.attributes.position.count;
  const punkty = new Float32Array(ilePunktow * 3);
  const normalne = new Float32Array(ilePunktow * 3);
  const uv = new Float32Array(ilePunktow * 2);
  let gdzie = 0;
  for (const k of ksztalty) {
    const ile = k.attributes.position.count;
    punkty.set(k.attributes.position.array, gdzie * 3);
    if (k.attributes.normal) normalne.set(k.attributes.normal.array, gdzie * 3);
    if (k.attributes.uv) uv.set(k.attributes.uv.array, gdzie * 2);
    gdzie += ile;
    k.dispose();
  }
  const wynik = new THREE.BufferGeometry();
  wynik.setAttribute("position", new THREE.BufferAttribute(punkty, 3));
  wynik.setAttribute("normal", new THREE.BufferAttribute(normalne, 3));
  wynik.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  wynik.computeBoundingSphere();
  return wynik;
}

// ===== ROŚLINY =====
// Krzaki, paprocie, wysoka trawa i palmy. Nie blokują drogi, więc można przez nie przejść.

// Krzak: kilka zielonych kul, czasem z czerwonymi albo niebieskimi jagodami
function zrobKrzak() {
  const krzak = new THREE.Group();
  const zielenie = ["#2e5d1f", "#3b7a2a", "#4a8c32"];
  const ile = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < ile; i++) {
    const r = 0.28 + Math.random() * 0.22;
    krzak.add(owal(r, wylosuj(zielenie), Math.random() * 0.6 - 0.3, r * 0.8, Math.random() * 0.6 - 0.3, 1, 0.85, 1));
  }
  if (Math.random() < 0.4) {
    const jagoda = Math.random() < 0.5 ? "#c62828" : "#283593";
    for (let i = 0; i < 8; i++) {
      const kat = Math.random() * Math.PI * 2;
      krzak.add(owal(0.035, jagoda, Math.sin(kat) * 0.42, 0.25 + Math.random() * 0.35, Math.cos(kat) * 0.42, 1, 1, 1));
    }
  }
  podmienFarby(krzak, zielenie.map((kolor) => [kolor, farbaZFaktura(kolor, fakturaFutra, 0.9)]));
  krzak.userData.kolysze = true; // liście trochę bujają się na wietrze
  return krzak;
}

// Paproć: długie, płaskie liście rozłożone dookoła jak gwiazda
function zrobPaproc() {
  const paproc = new THREE.Group();
  const ile = 7 + Math.floor(Math.random() * 4);
  for (let i = 0; i < ile; i++) {
    const kat = (i / ile) * Math.PI * 2 + Math.random() * 0.3;
    const lisc = new THREE.Group();
    lisc.rotation.y = kat;
    const blaszka = owal(0.3, "#3f7d2c", 0, 0.12, 0.28, 0.22, 0.04, 1);
    blaszka.rotation.x = -0.5; // liść wygięty do góry, końcem w dół
    lisc.add(blaszka);
    paproc.add(lisc);
  }
  paproc.traverse(function (czesc) { czesc.castShadow = false; });
  return paproc;
}

// Wysoka trawa: kępa cienkich, wysokich źdźbeł (na pustyni sucha i żółta)
function zrobWysokaTrawe(sucha) {
  const trawa = new THREE.Group();
  const kolor = sucha ? "#c9b26b" : "#7fae45";
  for (let i = 0; i < 9; i++) {
    const wysokosc = 0.5 + Math.random() * 0.5;
    const zdzblo = klocek(new THREE.ConeGeometry(0.025, wysokosc, 4), kolor,
      Math.random() * 0.4 - 0.2, wysokosc / 2, Math.random() * 0.4 - 0.2);
    zdzblo.rotation.z = Math.random() * 0.5 - 0.25;
    zdzblo.rotation.x = Math.random() * 0.5 - 0.25;
    zdzblo.castShadow = false;
    trawa.add(zdzblo);
  }
  return trawa;
}

// Palma: wygięty pień z pierścieniami, korona długich liści i kokosy
function zrobPalme() {
  const palma = new THREE.Group();
  const wygiecie = (Math.random() - 0.5) * 0.6;
  let x = 0;
  let y = 0;
  for (let i = 0; i < 9; i++) {
    // pień z kawałków, każdy trochę przesunięty w bok, więc pień jest wygięty
    const kawalek = klocek(new THREE.CylinderGeometry(0.13 - i * 0.006, 0.15 - i * 0.006, 0.5, 8), i % 2 ? "#8d6e4f" : "#7a5c40", x, y + 0.25, 0);
    kawalek.rotation.z = -wygiecie * 0.3;
    palma.add(kawalek);
    x += wygiecie * 0.12 * (i / 4);
    y += 0.48;
  }
  const korona = new THREE.Group();
  korona.position.set(x, y, 0);
  korona.userData.kolysze = true;
  palma.add(korona);
  for (let i = 0; i < 8; i++) {
    const lisc = new THREE.Group();
    lisc.rotation.y = (i / 8) * Math.PI * 2;
    const blaszka = owal(0.9, "#3d8b2f", 0, -0.15, 0.8, 0.22, 0.04, 1);
    blaszka.rotation.x = 0.45; // liść opada w dół
    lisc.add(blaszka);
    korona.add(lisc);
  }
  for (let i = 0; i < 3; i++) {
    const kat = i * 2.1;
    korona.add(owal(0.1, "#5d4037", Math.sin(kat) * 0.15, -0.15, Math.cos(kat) * 0.15, 1, 1, 1)); // kokos
  }
  palma.rotation.y = Math.random() * Math.PI * 2;
  return palma;
}

// Czy obok tego kawałka mapy jest woda?
function przyWodzie(w, k) {
  for (let dw = -1; dw <= 1; dw++) {
    for (let dk = -1; dk <= 1; dk++) {
      if (swiat[w + dw] && swiat[w + dw][k + dk] === "W") return true;
    }
  }
  return false;
}

// Wybiera roślinę dla kawałka trawy (".") albo piasku ("P"). Może nic nie wybrać.
function wybierzRosline(litera, w, k) {
  const los = Math.random();
  if (wWiosce(w, k)) {
    return litera === "." && los < 0.15 ? zrobOzdobe() : null; // w wiosce tylko kwiatki
  }
  if (litera === "P") {
    if (los < (przyWodzie(w, k) ? 0.25 : 0.04)) return zrobPalme();
    if (los < 0.08) return zrobWysokaTrawe(true);
    if (los < 0.1) return zrobKrzak();
    return null;
  }
  if (litera !== ".") return null;
  if (przyWodzie(w, k) && los < 0.12) return zrobPalme();
  if (los < 0.03) return zrobBambus();
  if (los < 0.08) return zrobKrzak();
  if (los < 0.12) return zrobPaproc();
  if (los < 0.18) return zrobWysokaTrawe(false);
  if (los < 0.19) return zrobPalme();
  if (los < 0.38) return zrobOzdobe();
  return null;
}

// ===== GĘSTA TRAWA =====
// Na każdym kawałku łąki rośnie kilka kępek trawy. Jest ich tysiące, więc
// rysujemy je jako jeden kształt powtórzony wiele razy (jak ziemię), żeby gra była szybka.
const KEPEK_NA_KAWALEK = 7;

// Jedna kępka: kilka cienkich źdźbeł rozchylonych na boki
function ksztaltKepki() {
  const zdzbla = [];
  for (let i = 0; i < 4; i++) {
    const wysokosc = 0.22 + Math.random() * 0.18;
    const zdzblo = new THREE.ConeGeometry(0.022, wysokosc, 3);
    zdzblo.translate(0, wysokosc / 2, 0);
    zdzblo.rotateZ((Math.random() - 0.5) * 0.7);
    zdzblo.rotateX((Math.random() - 0.5) * 0.7);
    zdzblo.translate((Math.random() - 0.5) * 0.12, 0, (Math.random() - 0.5) * 0.12);
    zdzbla.push(zdzblo.toNonIndexed());
  }
  return sklejKsztalty(zdzbla);
}

function zrobGestaTrawe() {
  const miejsca = [];
  for (let w = 0; w < swiat.length; w++) {
    for (let k = 0; k < swiat[w].length; k++) {
      if (swiat[w][k] === ".") miejsca.push([w, k]);
    }
  }
  const ile = miejsca.length * KEPEK_NA_KAWALEK;
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const trawa = new THREE.InstancedMesh(ksztaltKepki(), material, ile);
  const ustaw = new THREE.Matrix4();
  const obrot = new THREE.Quaternion();
  const os = new THREE.Vector3(0, 1, 0);
  const wielkosc = new THREE.Vector3();
  const pozycja = new THREE.Vector3();
  const zielenie = ["#5f8f2e", "#6fa337", "#7fb342", "#8cbf4a", "#5a8a2a"];
  let i = 0;
  for (const [w, k] of miejsca) {
    for (let n = 0; n < KEPEK_NA_KAWALEK; n++) {
      pozycja.set(k * KAFELEK + (Math.random() - 0.5) * KAFELEK, 0, w * KAFELEK + (Math.random() - 0.5) * KAFELEK);
      obrot.setFromAxisAngle(os, Math.random() * Math.PI * 2);
      const s = 0.7 + Math.random() * 0.8;
      wielkosc.set(s, s, s);
      ustaw.compose(pozycja, obrot, wielkosc);
      trawa.setMatrixAt(i, ustaw);
      trawa.setColorAt(i, kolorek(zielenie[Math.floor(Math.random() * zielenie.length)]));
      i++;
    }
  }
  trawa.instanceColor.needsUpdate = true;
  trawa.receiveShadow = true;
  trawa.userData.sklejony = true; // przy zmianie poziomu zwalniamy pamięć
  return trawa;
}
