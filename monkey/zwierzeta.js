// ===== LEŚNE ZWIERZĘTA =====
// Zając: puszysty, z długimi uszami i białym ogonkiem. Skacze.
function zrobZajaca() {
  const zajac = new THREE.Group();
  const futro = "#9c8166";
  const jasne = "#d7ccc8";
  zajac.add(owal(0.17, futro, 0, 0.2, -0.03, 1, 0.9, 1.35));          // tułów
  zajac.add(owal(0.11, futro, 0, 0.33, 0.2, 1, 0.95, 1.1));           // głowa
  zajac.add(owal(0.05, jasne, 0, 0.3, 0.3, 1, 0.8, 0.8));             // pyszczek
  zajac.add(owal(0.012, "#3e2723", 0, 0.32, 0.33, 1.4, 1, 1));         // nosek
  for (const ox of [-0.05, 0.05]) {
    zajac.add(owal(0.02, "#1a1a1a", ox * 1.3, 0.36, 0.29, 1, 1, 1));   // oko
    const ucho = owal(0.04, futro, ox, 0.5, 0.17, 0.6, 2.6, 0.4);       // długie ucho
    ucho.rotation.x = -0.25;
    ucho.rotation.z = -ox * 3;
    zajac.add(ucho);
    zajac.add(owal(0.05, futro, ox * 2.2, 0.1, -0.12, 1, 0.7, 1.6));   // tylna łapa
    zajac.add(owal(0.03, futro, ox * 1.4, 0.07, 0.15, 1, 1.3, 1));     // przednia łapka
  }
  zajac.add(owal(0.06, "#fafafa", 0, 0.24, -0.24, 1, 1, 1));          // biały ogonek
  podmienFarby(zajac, [
    [futro, farbaZFaktura(futro, fakturaFutra, 1)],
    [jasne, farbaZFaktura(jasne, fakturaFutra, 1)],
    ["#1a1a1a", farbaLsniaca("#1a1a1a", 0.05, 0)],
  ]);
  return zajac;
}

// Sarna: smukła, na długich nogach, z białą plamą z tyłu. Chodzi, skubie trawę i ucieka.
function zrobSarne() {
  const sarna = new THREE.Group();
  const siersc = "#a0703a";
  const jasna = "#e8d5b7";
  sarna.add(owal(0.3, siersc, 0, 0.95, 0, 0.8, 0.75, 1.6));           // tułów
  sarna.add(owal(0.12, "#fafafa", 0, 0.98, -0.45, 1, 1, 0.6));        // biała plama z tyłu
  sarna.add(owal(0.05, siersc, 0, 1.05, -0.5, 1, 1.4, 0.8));          // krótki ogonek
  // szyja i głowa na zawiasie, żeby mogła schylać się do trawy
  sarna.szyja = new THREE.Group();
  sarna.szyja.position.set(0, 1.05, 0.35);
  sarna.add(sarna.szyja);
  const szyja = klocek(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 10), siersc, 0, 0.2, 0.08);
  szyja.rotation.x = 0.4;
  sarna.szyja.add(szyja);
  sarna.szyja.add(owal(0.1, siersc, 0, 0.45, 0.2, 0.9, 0.9, 1.2));    // głowa
  sarna.szyja.add(owal(0.06, jasna, 0, 0.41, 0.33, 0.9, 0.8, 1.2));   // pyszczek
  sarna.szyja.add(owal(0.02, "#1a1a1a", 0, 0.42, 0.4, 1.3, 1, 1));    // nos
  for (const ox of [-0.06, 0.06]) {
    sarna.szyja.add(owal(0.022, "#1a1a1a", ox, 0.49, 0.27, 1, 1, 1));               // oko
    const ucho = owal(0.04, siersc, ox * 1.7, 0.57, 0.14, 0.5, 1.6, 0.9);            // ucho
    ucho.rotation.z = -ox * 8;
    sarna.szyja.add(ucho);
  }
  // cztery smukłe nogi na zawiasach
  sarna.nogi = [];
  for (const [nx, nz] of [[-0.12, 0.3], [0.12, 0.3], [-0.12, -0.3], [0.12, -0.3]]) {
    const noga = new THREE.Group();
    noga.position.set(nx, 0.8, nz);
    noga.add(klocek(new THREE.CylinderGeometry(0.045, 0.03, 0.75, 8), siersc, 0, -0.38, 0));
    noga.add(owal(0.03, "#3e2723", 0, -0.77, 0.01, 1, 0.8, 1.3));    // kopytko
    sarna.add(noga);
    sarna.nogi.push(noga);
  }
  podmienFarby(sarna, [
    [siersc, farbaZFaktura(siersc, fakturaFutra, 1)],
    [jasna, farbaZFaktura(jasna, fakturaFutra, 1)],
    ["#1a1a1a", farbaLsniaca("#1a1a1a", 0.05, 0)],
  ]);
  return sarna;
}

// ===== DRAPIEŻNIKI: tygrysy, pantery i goryle =====
// Małpka się ich boi: gonią ją, a jak złapią, małpka traci serduszko.
// Nie umieją wchodzić na drzewa ani do domków. Cios kijem tylko je straszy.

// Futro w tygrysie paski: jasne tło i ciemne, kręte paski
let fakturaPasow = null;
function paski() {
  if (!fakturaPasow) {
    fakturaPasow = zrobFakture(function (pedzel) {
      szary(pedzel, 235, 1);
      pedzel.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 16; i++) {
        szary(pedzel, 25, 1);
        let x = Math.random() * 128;
        const grubosc = 2 + Math.random() * 4;
        pedzel.beginPath();
        pedzel.moveTo(x, 0);
        for (let y = 0; y <= 128; y += 16) {
          x += Math.random() * 6 - 3;
          pedzel.lineTo(x, y); // pasek wije się z góry na dół
        }
        pedzel.lineWidth = grubosc;
        pedzel.stroke();
      }
    });
  }
  return fakturaPasow;
}

// Wielki kot: tygrys (pomarańczowy w paski) albo pantera (czarna)
function zrobKota(kolor, brzuch, kolorOczu, wPaski) {
  const kot = new THREE.Group();
  kot.add(owal(0.4, kolor, 0, 0.75, 0, 0.75, 0.72, 1.7));          // tułów
  kot.add(owal(0.3, brzuch, 0, 0.62, 0.05, 0.6, 0.5, 1.4));        // brzuch
  // głowa
  const glowa = new THREE.Group();
  glowa.position.set(0, 0.95, 0.75);
  kot.add(glowa);
  glowa.add(owal(0.24, kolor, 0, 0, 0, 1, 0.9, 1));
  glowa.add(owal(0.12, brzuch, 0, -0.06, 0.18, 1.1, 0.8, 0.9));     // pyszczek
  glowa.add(owal(0.035, "#3e2723", 0, 0, 0.29, 1.3, 0.8, 1));        // nos
  for (const ox of [-1, 1]) {
    glowa.add(owal(0.1, brzuch, ox * 0.14, -0.06, 0.08, 0.7, 0.8, 0.8)); // puszyste policzki
    glowa.add(owal(0.07, kolor, ox * 0.15, 0.19, -0.02, 1, 1, 0.4));    // ucho
    glowa.add(owal(0.035, kolorOczu, ox * 0.09, 0.06, 0.19, 1, 0.8, 0.6)); // oko
    glowa.add(owal(0.015, "#111111", ox * 0.09, 0.06, 0.215, 0.6, 1.4, 0.5)); // źrenica
  }
  // cztery łapy na zawiasach
  kot.nogi = [];
  for (const [nx, nz] of [[-0.2, 0.45], [0.2, 0.45], [-0.2, -0.45], [0.2, -0.45]]) {
    const noga = new THREE.Group();
    noga.position.set(nx, 0.62, nz);
    noga.add(klocek(new THREE.CylinderGeometry(0.09, 0.07, 0.6, 8), kolor, 0, -0.3, 0));
    noga.add(owal(0.09, kolor, 0, -0.6, 0.04, 1, 0.6, 1.3)); // łapa
    kot.add(noga);
    kot.nogi.push(noga);
  }
  // długi ogon zakręcony na końcu
  const punkty = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    punkty.push(new THREE.Vector3(0, 0.8 - t * 0.35 + t * t * 0.45, -0.65 - t * 0.8));
  }
  kot.ogon = new THREE.Group();
  kot.add(kot.ogon);
  const ogon = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punkty), 20, 0.05, 8, false), farba(kolor));
  ogon.castShadow = true;
  kot.ogon.add(ogon);

  const futro = farbaZFaktura(kolor, wPaski ? paski() : fakturaFutra, 1);
  podmienFarby(kot, [
    [kolor, futro],
    [brzuch, farbaZFaktura(brzuch, fakturaFutra, 1)],
    [kolorOczu, farbaLsniaca(kolorOczu, 0.1, 0)],
    ["#111111", farbaLsniaca("#111111", 0.05, 0)],
  ]);
  return kot;
}

function zrobTygrysa() {
  return zrobKota("#e8892b", "#f5efe6", "#ffb300", true);
}

function zrobPantere() {
  const pantera = zrobKota("#232323", "#2e2e2e", "#c6ff00", false);
  pantera.scale.set(0.85, 0.85, 0.85);
  return pantera;
}

// Goryl: wielki, czarny, chodzi podpierając się pięściami. Jak zobaczy małpkę,
// najpierw bije się w piersi, a potem rusza w pogoń.
function zrobGoryla() {
  const goryl = new THREE.Group();
  const czarny = "#2a2a2a";
  const skora = "#4a4a4a";
  const tulow = owal(0.45, czarny, 0, 1.05, 0, 1.1, 1.1, 0.85);
  tulow.rotation.x = 0.35; // pochylony do przodu
  goryl.add(tulow);
  goryl.add(owal(0.3, skora, 0, 1.05, 0.32, 1, 1, 0.4));          // pierś
  // głowa
  const glowa = new THREE.Group();
  glowa.position.set(0, 1.55, 0.35);
  goryl.add(glowa);
  glowa.add(owal(0.24, czarny, 0, 0, 0, 1, 1.05, 1));
  glowa.add(owal(0.12, czarny, 0, 0.2, -0.05, 1, 1.2, 1.4));       // wysoka czupryna
  glowa.add(owal(0.17, skora, 0, -0.02, 0.15, 1.1, 1, 0.6));       // twarz
  for (const ox of [-1, 1]) {
    glowa.add(owal(0.06, czarny, ox * 0.07, 0.07, 0.22, 1.6, 0.6, 0.8)); // wielkie brwi
    glowa.add(owal(0.025, "#3e2723", ox * 0.07, 0.03, 0.24, 1, 1, 0.6)); // oko
    glowa.add(owal(0.02, "#111111", ox * 0.03, -0.06, 0.27, 1, 0.7, 0.6)); // dziurka w nosie
  }
  // długie ręce na zawiasach, sięgają do ziemi
  goryl.rece = [];
  for (const ox of [-1, 1]) {
    const reka = new THREE.Group();
    reka.position.set(ox * 0.5, 1.4, 0.15);
    reka.add(owal(0.17, czarny, 0, 0, 0, 1, 1, 1));                                             // bark
    reka.add(klocek(new THREE.CylinderGeometry(0.13, 0.11, 0.55, 10), czarny, 0, -0.27, 0));  // ramię
    reka.add(klocek(new THREE.CylinderGeometry(0.11, 0.1, 0.55, 10), czarny, 0, -0.8, 0));    // przedramię
    reka.add(owal(0.12, skora, 0, -1.12, 0.02, 1, 0.9, 1.1));                                  // pięść
    goryl.add(reka);
    goryl.rece.push(reka);
  }
  // krótkie nogi
  goryl.nogi = [];
  for (const ox of [-1, 1]) {
    const noga = new THREE.Group();
    noga.position.set(ox * 0.25, 0.7, -0.2);
    noga.add(klocek(new THREE.CylinderGeometry(0.15, 0.12, 0.45, 10), czarny, 0, -0.22, 0));
    noga.add(owal(0.13, skora, 0, -0.6, 0.08, 1, 0.5, 1.6)); // stopa
    goryl.add(noga);
    goryl.nogi.push(noga);
  }
  podmienFarby(goryl, [
    [czarny, farbaZFaktura(czarny, fakturaFutra, 1)],
    [skora, farbaZFaktura(skora, fakturaSkory, 0.7)],
    ["#3e2723", farbaLsniaca("#3e2723", 0.1, 0)],
  ]);
  return goryl;
}

// Jakie są zwierzęta i jak się zachowują
//   ile     - ile ich jest na poziomie
//   chodzi  - jak szybko chodzą, kiedy się nie boją
//   ucieka  - jak szybko uciekają
//   boiSie  - z jak bliska boją się małpki (w metrach)
//   nora    - czy chowa się do nory
//   drapieznik - goni małpkę: widzi (z jak daleka ją widzi), goni (jak szybko biegnie;
//                małpka biega z szybkością 0.09)
const GATUNKI = {
  zajac: { zrob: zrobZajaca, ile: 12, chodzi: 0.03, ucieka: 0.13, boiSie: 6, nora: true },
  sarna: { zrob: zrobSarne, ile: 8, chodzi: 0.025, ucieka: 0.15, boiSie: 9, nora: false },
  tygrys: { zrob: zrobTygrysa, ile: 3, chodzi: 0.025, ucieka: 0.12, drapieznik: true, widzi: 12, goni: 0.085, nazwa: "🐯 Tygrys" },
  pantera: { zrob: zrobPantere, ile: 1, chodzi: 0.025, ucieka: 0.12, drapieznik: true, widzi: 12, goni: 0.087, nazwa: "🐆 Pantera" },
  goryl: { zrob: zrobGoryla, ile: 2, chodzi: 0.02, ucieka: 0.1, drapieznik: true, widzi: 10, goni: 0.075, nazwa: "🦍 Goryl" },
};

const ILE_NOR = 10;
const ILE_PTAKOW = 20;
const nory = [];
const ptaki = [];

// Nora: ciemna dziura w ziemi z kopczykiem wykopanej ziemi
function zrobNore() {
  const nora = new THREE.Group();
  nora.add(owal(0.45, "#6d4c33", 0, 0, -0.25, 1.4, 0.35, 1));   // kopczyk ziemi
  nora.add(owal(0.28, "#140d08", 0, 0.03, 0.1, 1, 0.12, 0.8));  // ciemna dziura
  nora.traverse(function (czesc) { czesc.castShadow = false; });
  return nora;
}

function dodajZwierzeta() {
  nory.length = 0;
  ptaki.length = 0;
  const wolne = wolneMiejsca(6);
  const losuj = function () {
    return wolne.splice(Math.floor(Math.random() * wolne.length), 1)[0];
  };

  for (let i = 0; i < ILE_NOR && wolne.length > 0; i++) {
    const [w, k] = losuj();
    const nora = zrobNore();
    nora.position.set(k * KAFELEK, 0, w * KAFELEK);
    nora.rotation.y = Math.random() * Math.PI * 2;
    kawalkiSwiata.add(nora);
    statyczne.push(nora);
    nory.push(nora);
  }

  // drapieżniki mieszkają daleko od startu, na nowym terenie
  const dlaDrapieznikow = wolneMiejsca(25).filter(([w, k]) => naNowymTerenie(w, k) && !wWiosce(w, k));

  for (const nazwa in GATUNKI) {
    const gatunek = GATUNKI[nazwa];
    const miejsca = gatunek.drapieznik ? dlaDrapieznikow : wolne;
    for (let i = 0; i < gatunek.ile && miejsca.length > 0; i++) {
      const [w, k] = miejsca.splice(Math.floor(Math.random() * miejsca.length), 1)[0];
      const zwierze = gatunek.zrob();
      zwierze.gatunek = gatunek;
      zwierze.nazwa = nazwa;
      zwierze.position.set(k * KAFELEK, 0, w * KAFELEK);
      zwierze.kierunek = Math.random() * Math.PI * 2;
      zwierze.rotation.y = zwierze.kierunek;
      zwierze.doZmiany = 0;   // za ile klatek zwierzę wymyśli, co robić dalej
      zwierze.idzie = false;
      zwierze.krok = Math.random() * 10;
      zwierze.wNorze = 0;     // ile jeszcze siedzi w norze
      zwierze.startX = zwierze.position.x;
      zwierze.startZ = zwierze.position.z;
      zwierze.goni = false;
      zwierze.przestraszony = 0; // ile jeszcze ucieka po strzale
      zwierze.bijeSie = 0;       // goryl bije się w piersi
      kawalkiSwiata.add(zwierze);
      zwierzeta.push(zwierze);
    }
  }

  // ptaki latają w kółko wysoko nad światem
  const szerokosc = swiat[0].length * KAFELEK;
  const dlugosc = swiat.length * KAFELEK;
  for (let i = 0; i < ILE_PTAKOW; i++) {
    const ptak = zrobPtaka();
    ptak.srodekX = Math.random() * szerokosc;
    ptak.srodekZ = Math.random() * dlugosc;
    ptak.promien = 6 + Math.random() * 18;
    ptak.wysoko = 9 + Math.random() * 10;
    ptak.predkosc = (0.004 + Math.random() * 0.006) * (Math.random() < 0.5 ? 1 : -1);
    ptak.kat = Math.random() * Math.PI * 2;
    ptak.faza = Math.random() * 10;
    kawalkiSwiata.add(ptak);
    ptaki.push(ptak);
  }
}

// Najbliższa nora, do której zwierzę zdąży dobiec
function najblizszaNora(zwierze) {
  let najlepsza = null;
  let najblizej = 20;
  for (const nora of nory) {
    const d = Math.hypot(nora.position.x - zwierze.position.x, nora.position.z - zwierze.position.z);
    if (d < najblizej) {
      najblizej = d;
      najlepsza = nora;
    }
  }
  return najlepsza;
}

// Zwierzęta chodzą sobie po lesie, a jak małpka podejdzie za blisko, uciekają.
// Zając ucieka do nory, chowa się w niej i po chwili wychodzi.
function ruszZwierzeta() {
  for (const zwierze of zwierzeta) {
    const g = zwierze.gatunek;
    if (g.drapieznik) {
      if (ruszDrapieznika(zwierze)) return; // złapał małpkę, świat zaczyna się od nowa
      continue;
    }

    // zając w norze: czeka, aż będzie bezpiecznie, i wychodzi
    if (zwierze.wNorze > 0) {
      zwierze.wNorze--;
      if (zwierze.wNorze === 0) zwierze.visible = true;
      continue;
    }

    const odX = zwierze.position.x - malpka.x;
    const odZ = zwierze.position.z - malpka.z;
    const odleglosc = Math.hypot(odX, odZ);
    const boiSie = !malpka.wDomku && odleglosc < g.boiSie;

    let szybkosc = 0;
    if (boiSie) {
      const nora = g.nora ? najblizszaNora(zwierze) : null;
      if (nora) {
        // biegnij do nory
        const doNoryX = nora.position.x - zwierze.position.x;
        const doNoryZ = nora.position.z - zwierze.position.z;
        zwierze.kierunek = Math.atan2(doNoryX, doNoryZ);
        if (Math.hypot(doNoryX, doNoryZ) < 0.5) {
          zwierze.visible = false;                    // hop, do nory!
          zwierze.wNorze = 300 + Math.random() * 400; // posiedzi tam 5 do 12 sekund
          zwierze.position.set(nora.position.x, 0, nora.position.z);
          continue;
        }
      } else {
        zwierze.kierunek = Math.atan2(odX, odZ); // uciekaj od małpki
      }
      zwierze.idzie = true;
      szybkosc = g.ucieka;
    } else {
      zwierze.doZmiany--;
      if (zwierze.doZmiany <= 0) {
        // nowy pomysł: idź gdzieś albo postój (sarna wtedy skubie trawę)
        zwierze.idzie = Math.random() < 0.5;
        zwierze.kierunek += (Math.random() - 0.5) * 2.5;
        zwierze.doZmiany = 90 + Math.random() * 200;
      }
      if (zwierze.idzie) szybkosc = g.chodzi;
    }

    if (szybkosc > 0) {
      const dx = Math.sin(zwierze.kierunek) * szybkosc;
      const dz = Math.cos(zwierze.kierunek) * szybkosc;
      let zablokowane = true;
      if (moznaStanac(zwierze.position.x + dx, zwierze.position.z)) { zwierze.position.x += dx; zablokowane = false; }
      if (moznaStanac(zwierze.position.x, zwierze.position.z + dz)) { zwierze.position.z += dz; zablokowane = false; }
      if (zablokowane) zwierze.kierunek += Math.PI / 2 + Math.random(); // ściana: skręć
      // zwierzę obraca się płynnie w stronę, w którą idzie
      let roznica = zwierze.kierunek - zwierze.rotation.y;
      roznica = Math.atan2(Math.sin(roznica), Math.cos(roznica));
      zwierze.rotation.y += roznica * 0.15;
      zwierze.krok += szybkosc * 4;
    }

    const ziemia = wysokoscZiemi(zwierze.position.x, zwierze.position.z);
    if (zwierze.nazwa === "zajac") {
      // zając skacze susami
      zwierze.position.y = ziemia + (szybkosc > 0 ? Math.abs(Math.sin(zwierze.krok * 2)) * 0.25 : 0);
    } else {
      zwierze.position.y = ziemia;
      // sarna przebiera nogami, a jak stoi, schyla głowę do trawy
      for (let i = 0; i < 4; i++) {
        const strona = (i === 0 || i === 3) ? 1 : -1;
        zwierze.nogi[i].rotation.x = szybkosc > 0 ? Math.sin(zwierze.krok * 2) * 0.5 * strona : 0;
      }
      const schyla = szybkosc === 0 ? 1.4 : 0;
      zwierze.szyja.rotation.x += (schyla - zwierze.szyja.rotation.x) * 0.05;
    }
  }
  ruszPtaki();
}

// Najbliższy mieszkaniec wioski na dworze, którego drapieżnik widzi (albo null)
function ofiara(zwierze) {
  let najlepszy = null;
  let najblizej = zwierze.gatunek.widzi;
  for (const czlowiek of ludzie) {
    if (czlowiek.stan === "wDomu") continue;
    const d = Math.hypot(czlowiek.position.x - zwierze.position.x, czlowiek.position.z - zwierze.position.z);
    if (d < najblizej) {
      najblizej = d;
      najlepszy = czlowiek;
    }
  }
  return najlepszy;
}

// Drapieżnik: chodzi sobie, a jak zobaczy małpkę, goni ją. Odpowiada true,
// kiedy złapał małpkę (wtedy wszystko wraca na start).
function ruszDrapieznika(zwierze) {
  const g = zwierze.gatunek;
  const dx = malpka.x - zwierze.position.x;
  const dz = malpka.z - zwierze.position.z;
  const odleglosc = Math.hypot(dx, dz);
  // małpki na drzewie albo w domku nie dosięgnie
  const bezpieczna = malpka.wDomku || malpka.wysokosc > 2.5;
  const widzi = !bezpieczna && odleglosc < g.widzi;

  if (widzi && !zwierze.goni && zwierze.przestraszony === 0) {
    zwierze.goni = true;
    dzwiekRyk(zwierze.nazwa === "goryl" ? 70 : 110);
    pokazKomunikat(g.nazwa + "! Uciekaj na drzewo!");
    if (zwierze.nazwa === "goryl") zwierze.bijeSie = 70; // najpierw bije się w piersi
  }
  if (!widzi && odleglosc > g.widzi * 1.5) zwierze.goni = false;

  let szybkosc = 0;
  if (zwierze.przestraszony > 0) {
    // po strzale ucieka od małpki
    zwierze.przestraszony--;
    zwierze.goni = false;
    zwierze.kierunek = Math.atan2(-dx, -dz);
    szybkosc = g.ucieka;
  } else if (zwierze.bijeSie > 0) {
    zwierze.bijeSie--;
    zwierze.kierunek = Math.atan2(dx, dz); // patrzy na małpkę
  } else if (zwierze.goni && !bezpieczna) {
    zwierze.kierunek = Math.atan2(dx, dz);
    szybkosc = g.goni;
  } else if (ofiara(zwierze)) {
    // poluje na mieszkańca wioski, który jest na dworze
    const czlowiek = ofiara(zwierze);
    const ox = czlowiek.position.x - zwierze.position.x;
    const oz = czlowiek.position.z - zwierze.position.z;
    zwierze.kierunek = Math.atan2(ox, oz);
    szybkosc = g.goni * 0.75;
    if (Math.hypot(ox, oz) < 1.2) {
      // dopadł go, ale człowiek krzyczy i ucieka do domku, a drapieżnik się płoszy
      zwierze.przestraszony = 240;
      dzwiekRyk(zwierze.nazwa === "goryl" ? 80 : 120);
    }
  } else {
    // spaceruje albo czeka pod drzewem; czasem idzie w stronę wioski
    zwierze.doZmiany--;
    if (zwierze.doZmiany <= 0) {
      zwierze.idzie = Math.random() < 0.5;
      zwierze.kierunek += (Math.random() - 0.5) * 2.5;
      if (wioska && Math.random() < 0.3) {
        const wx = (wioska.k + wioska.szerokosc / 2) * KAFELEK - zwierze.position.x;
        const wz = (wioska.w + wioska.wysokosc / 2) * KAFELEK - zwierze.position.z;
        zwierze.kierunek = Math.atan2(wx, wz);
        zwierze.idzie = true;
      }
      zwierze.doZmiany = 90 + Math.random() * 200;
    }
    if (zwierze.idzie) szybkosc = g.chodzi;
  }

  if (szybkosc > 0) {
    const kx = Math.sin(zwierze.kierunek) * szybkosc;
    const kz = Math.cos(zwierze.kierunek) * szybkosc;
    let zablokowane = true;
    if (moznaStanac(zwierze.position.x + kx, zwierze.position.z)) { zwierze.position.x += kx; zablokowane = false; }
    if (moznaStanac(zwierze.position.x, zwierze.position.z + kz)) { zwierze.position.z += kz; zablokowane = false; }
    if (zablokowane && !zwierze.goni) zwierze.kierunek += Math.PI / 2 + Math.random();
    zwierze.krok += szybkosc * 4;
  }
  let roznica = zwierze.kierunek - zwierze.rotation.y;
  roznica = Math.atan2(Math.sin(roznica), Math.cos(roznica));
  zwierze.rotation.y += roznica * 0.15;
  zwierze.position.y = wysokoscZiemi(zwierze.position.x, zwierze.position.z);

  // ruchy ciała
  const fala = Math.sin(zwierze.krok * 2);
  if (zwierze.nazwa === "goryl") {
    if (zwierze.bijeSie > 0) {
      // bije się pięściami w piersi, raz jedną, raz drugą ręką
      const raz = Math.sin(zwierze.bijeSie * 0.5) > 0;
      zwierze.rece[0].rotation.set(raz ? -1.9 : -1.3, 0, -0.7);
      zwierze.rece[1].rotation.set(raz ? -1.3 : -1.9, 0, 0.7);
    } else {
      // chodzi na pięściach
      zwierze.rece[0].rotation.set(-0.3 + (szybkosc > 0 ? fala * 0.4 : 0), 0, 0);
      zwierze.rece[1].rotation.set(-0.3 - (szybkosc > 0 ? fala * 0.4 : 0), 0, 0);
    }
    zwierze.nogi[0].rotation.x = szybkosc > 0 ? -fala * 0.4 : 0;
    zwierze.nogi[1].rotation.x = szybkosc > 0 ? fala * 0.4 : 0;
  } else {
    // kot: łapy na zmianę, ogon się kołysze
    for (let i = 0; i < 4; i++) {
      const strona = (i === 0 || i === 3) ? 1 : -1;
      zwierze.nogi[i].rotation.x = szybkosc > 0 ? fala * 0.6 * strona : 0;
    }
    zwierze.ogon.rotation.y = Math.sin(czas * 0.05 + zwierze.startX) * 0.3;
  }

  // ugryzł Kiko: pół serduszka. Potem odchodzi na chwilę, jakby się najadł strachu.
  if (zwierze.goni && !bezpieczna && odleglosc < 1.1) {
    if (zranKiko(0.5, zwierze)) return true;
    zwierze.przestraszony = 120;
    zwierze.goni = false;
  }
  return false;
}

// Cios kijem tylko straszy drapieżnika: ucieka na kilka sekund
function przestraszZwierze(zwierze) {
  zwierze.przestraszony = 300;
  zwierze.goni = false;
  zwierze.bijeSie = 0;
  dzwiekRyk(zwierze.nazwa === "goryl" ? 90 : 140);
}

// Drapieżniki wracają do siebie (kiedy małpka wraca na start)
function drapieznikiNaStart() {
  for (const zwierze of zwierzeta) {
    if (!zwierze.gatunek.drapieznik) continue;
    zwierze.position.set(zwierze.startX, 0, zwierze.startZ);
    zwierze.goni = false;
    zwierze.przestraszony = 0;
    zwierze.bijeSie = 0;
  }
}

// ===== PTAKI =====
// Ptak: ciemny tułów, główka z pomarańczowym dziobem i dwa skrzydła, które machają
function zrobPtaka() {
  const ptak = new THREE.Group();
  ptak.add(owal(0.12, "#37474f", 0, 0, 0, 0.8, 0.7, 1.6));     // tułów
  ptak.add(owal(0.08, "#263238", 0, 0.05, 0.18, 1, 1, 1));     // głowa
  const dziob = klocek(new THREE.ConeGeometry(0.03, 0.1, 6), "#ff9800", 0, 0.04, 0.28);
  dziob.rotation.x = Math.PI / 2;
  ptak.add(dziob);
  const ogon = klocek(new THREE.BoxGeometry(0.14, 0.02, 0.16), "#263238", 0, 0.02, -0.22);
  ptak.add(ogon);
  ptak.skrzydla = [];
  for (const strona of [-1, 1]) {
    const skrzydlo = new THREE.Group();
    skrzydlo.position.set(0.07 * strona, 0.03, 0);
    skrzydlo.add(klocek(new THREE.BoxGeometry(0.4, 0.02, 0.16), "#455a64", 0.2 * strona, 0, 0));
    ptak.add(skrzydlo);
    ptak.skrzydla.push(skrzydlo);
  }
  ptak.scale.set(1.6, 1.6, 1.6);
  return ptak;
}

// Ptaki krążą w kółko: chwilę machają skrzydłami, a chwilę szybują
function ruszPtaki() {
  for (const ptak of ptaki) {
    ptak.kat += ptak.predkosc;
    ptak.position.set(
      ptak.srodekX + Math.sin(ptak.kat) * ptak.promien,
      ptak.wysoko + Math.sin(czas * 0.01 + ptak.faza) * 1.5,
      ptak.srodekZ + Math.cos(ptak.kat) * ptak.promien
    );
    // ptak patrzy tam, gdzie leci (wzdłuż koła)
    ptak.rotation.y = ptak.kat + (ptak.predkosc > 0 ? Math.PI / 2 : -Math.PI / 2);
    ptak.rotation.z = ptak.predkosc > 0 ? -0.3 : 0.3; // przechyla się na zakręcie
    const macha = Math.sin(czas * 0.02 + ptak.faza) > -0.3; // czasem szybuje
    const skrzydla = macha ? Math.sin(czas * 0.45 + ptak.faza) * 0.7 : 0.1;
    ptak.skrzydla[0].rotation.z = skrzydla;
    ptak.skrzydla[1].rotation.z = -skrzydla;
  }
}
