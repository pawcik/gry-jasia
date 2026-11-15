// ===== LUDZIE Z WIOSKI =====
// Mieszkańcy chodzą po wiosce. Kiedy Kiko podejdzie, zatrzymują się,
// machają ręką i mówią coś miłego.

const ILE_LUDZI = 7;
const ludzie = [];

const KOLORY_SKORY = ["#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#ffdbac"];
const KOLORY_KOSZUL = ["#c62828", "#1565c0", "#2e7d32", "#f9a825", "#6a1b9a", "#00838f", "#eceff1"];
const KOLORY_SPODNI = ["#37474f", "#5d4037", "#283593", "#424242"];
const KOLORY_SUKIENEK = ["#ad1457", "#00897b", "#5e35b1", "#ef6c00", "#1e88e5"];
const KOLORY_WLOSOW = ["#2b1d0e", "#4e342e", "#111111", "#8d6e63", "#d7ccc8", "#e6c27a"];
const KOLORY_OCZU = ["#4e342e", "#3e2723", "#1565c0", "#2e7d32", "#6d4c41"];

const POWITANIA = [
  "Cześć, Kiko! 👋",
  "Witaj w naszej wiosce! 🏯",
  "Uważaj na wilczych wojowników, Kiko! Mają ostre pazury!",
  "W lesie są tygrysy, uciekaj na drzewo! 🐯",
  "Ładny dzień, prawda? ☀️",
  "Masz może banana? 🍌",
  "Do domku można się schować przed wojownikami!",
];

function wylosuj(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

// Człowiek: mężczyzna, kobieta albo dziecko. Każdy wygląda inaczej:
// skóra, ubranie, fryzura, kolor oczu, czasem broda albo słomkowy kapelusz.
// Ręce zginają się w łokciach, a nogi w kolanach, jak u prawdziwych ludzi.
function zrobCzlowieka() {
  const los = Math.random();
  const typ = los < 0.4 ? "mezczyzna" : (los < 0.75 ? "kobieta" : "dziecko");
  const czlowiek = new THREE.Group();
  czlowiek.typ = typ;
  const skora = wylosuj(KOLORY_SKORY);
  const koszula = wylosuj(KOLORY_KOSZUL);
  const spodnie = wylosuj(KOLORY_SPODNI);
  const wlosy = typ === "mezczyzna" && Math.random() < 0.3 ? "#bdbdbd" : wylosuj(KOLORY_WLOSOW); // czasem siwy
  const oczy = wylosuj(KOLORY_OCZU);
  const sukienka = typ === "kobieta" && Math.random() < 0.6 ? wylosuj(KOLORY_SUKIENEK) : null;
  const buty = "#3e2723";

  // --- nogi: udo, kolano, łydka i but ---
  czlowiek.nogi = [];
  for (const ox of [-0.1, 0.1]) {
    const noga = new THREE.Group();
    noga.position.set(ox, 0.92, 0);
    const kolorNogi = sukienka ? skora : spodnie;
    noga.add(klocek(new THREE.CylinderGeometry(0.085, 0.07, 0.45, 10), kolorNogi, 0, -0.22, 0)); // udo
    noga.kolano = new THREE.Group();
    noga.kolano.position.y = -0.45;
    noga.add(noga.kolano);
    noga.kolano.add(owal(0.068, kolorNogi, 0, 0, 0, 1, 1, 1));                                      // kolano
    noga.kolano.add(klocek(new THREE.CylinderGeometry(0.066, 0.05, 0.42, 10), kolorNogi, 0, -0.21, 0)); // łydka
    noga.kolano.add(owal(0.07, buty, 0, -0.44, 0.05, 1, 0.55, 1.7));                                 // but
    czlowiek.add(noga);
    czlowiek.nogi.push(noga);
  }

  // --- biodra, tułów, ramiona, szyja ---
  if (sukienka) {
    // sukienka: rozkloszowana od pasa do kolan
    czlowiek.add(klocek(new THREE.CylinderGeometry(0.17, 0.3, 0.55, 14), sukienka, 0, 0.75, 0));
  } else {
    czlowiek.add(owal(0.17, spodnie, 0, 0.92, 0, 1.05, 0.6, 0.75));                                 // biodra
    czlowiek.add(klocek(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 14), "#2b1d0e", 0, 1.0, 0));  // pasek
  }
  const gora = sukienka || koszula;
  const tulow = klocek(new THREE.CylinderGeometry(0.21, 0.16, 0.5, 14), gora, 0, 1.24, 0);        // klatka i brzuch
  tulow.scale.z = 0.62;
  czlowiek.add(tulow);
  czlowiek.add(owal(0.2, gora, 0, 1.44, 0, 1.25, 0.45, 0.75));                                    // zaokrąglone ramiona
  czlowiek.add(klocek(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 10), skora, 0, 1.55, 0));    // szyja
  const kolnierz = klocek(new THREE.TorusGeometry(0.07, 0.018, 6, 14), gora, 0, 1.51, 0);
  kolnierz.rotation.x = Math.PI / 2;
  czlowiek.add(kolnierz);                                                                           // kołnierzyk

  // --- ręce: bark, ramię w rękawie, łokieć, przedramię, dłoń z kciukiem ---
  czlowiek.rece = [];
  for (const ox of [-0.25, 0.25]) {
    const reka = new THREE.Group();
    reka.position.set(ox, 1.45, 0);
    reka.add(owal(0.07, gora, 0, 0, 0, 1, 1, 1));                                                   // bark
    reka.add(klocek(new THREE.CylinderGeometry(0.062, 0.052, 0.28, 10), gora, 0, -0.14, 0));     // rękaw
    reka.lokiec = new THREE.Group();
    reka.lokiec.position.y = -0.28;
    reka.add(reka.lokiec);
    reka.lokiec.add(owal(0.045, skora, 0, 0, 0, 1, 1, 1));                                        // łokieć
    reka.lokiec.add(klocek(new THREE.CylinderGeometry(0.045, 0.035, 0.25, 8), skora, 0, -0.13, 0)); // przedramię
    reka.lokiec.add(owal(0.045, skora, 0, -0.3, 0.005, 0.8, 1.25, 0.55));                          // dłoń
    reka.lokiec.add(owal(0.017, skora, ox > 0 ? -0.035 : 0.035, -0.27, 0.03, 1, 1.8, 1));          // kciuk
    czlowiek.add(reka);
    czlowiek.rece.push(reka);
  }

  // --- głowa ---
  const glowa = new THREE.Group();
  glowa.position.set(0, 1.72, 0);
  czlowiek.add(glowa);
  czlowiek.glowa = glowa;
  glowa.add(owal(0.12, skora, 0, 0.02, 0, 0.92, 1.15, 1.02));                     // czaszka
  glowa.add(owal(0.085, skora, 0, -0.06, 0.03, 1, 0.8, 1));                       // żuchwa i podbródek
  glowa.add(owal(0.022, skora, 0, 0, 0.115, 0.85, 1.3, 1));                        // nos
  glowa.add(owal(0.012, skora, 0, -0.02, 0.125, 1.6, 0.8, 1));                     // czubek nosa
  glowa.add(owal(0.024, "#b5524f", 0, -0.055, 0.11, 1.6, 0.45, 0.6));              // usta
  for (const ox of [-0.042, 0.042]) {
    glowa.add(owal(0.019, "#f5f5f5", ox, 0.025, 0.105, 1.2, 0.85, 0.5));           // białko oka
    glowa.add(owal(0.011, oczy, ox, 0.025, 0.113, 1, 1, 0.5));                     // tęczówka
    glowa.add(owal(0.005, "#111111", ox, 0.025, 0.118, 1, 1, 0.5));                // źrenica
    glowa.add(owal(0.021, skora, ox, 0.041, 0.101, 1.2, 0.5, 0.6));                 // powieka
    glowa.add(owal(0.024, wlosy, ox, 0.062, 0.106, 1.3, 0.28, 0.45));                // brew
    glowa.add(owal(0.03, skora, ox * 2.65, 0.01, -0.005, 0.45, 1, 0.75));          // ucho
  }
  // fryzura
  const fryzura = typ === "kobieta" ? wylosuj(["dlugie", "kucyk", "kok"]) : wylosuj(["krotkie", "krotkie", "lysy"]);
  if (fryzura !== "lysy") glowa.add(owal(0.126, wlosy, 0, 0.06, -0.012, 0.96, 0.95, 1.04)); // włosy na głowie
  if (fryzura === "lysy") glowa.add(owal(0.122, wlosy, 0, -0.005, -0.03, 0.98, 0.55, 0.95)); // włosy tylko z boku i z tyłu
  if (fryzura === "dlugie") glowa.add(owal(0.12, wlosy, 0, -0.1, -0.05, 1.05, 1.4, 0.6));    // długie włosy na plecy
  if (fryzura === "kucyk") glowa.add(owal(0.05, wlosy, 0, -0.03, -0.15, 0.8, 1.8, 0.8));      // kucyk
  if (fryzura === "kok") glowa.add(owal(0.06, wlosy, 0, 0.1, -0.1, 1, 1, 1));                 // kok
  if (typ === "mezczyzna" && Math.random() < 0.4) {
    glowa.add(owal(0.08, wlosy, 0, -0.08, 0.05, 1.05, 0.75, 0.9));                           // broda
    glowa.add(owal(0.03, wlosy, 0, -0.035, 0.11, 1.8, 0.45, 0.6));                           // wąsy
  }
  if (Math.random() < 0.3) {
    glowa.add(klocek(new THREE.ConeGeometry(0.3, 0.16, 18), "#d9b56b", 0, 0.17, 0));        // słomkowy kapelusz
  }

  // dziecko jest mniejsze i ma trochę większą głowę; dorośli są różnego wzrostu
  if (typ === "dziecko") {
    glowa.scale.set(1.2, 1.2, 1.2);
    czlowiek.scale.set(0.62, 0.62, 0.62);
  } else {
    const wzrost = 0.92 + Math.random() * 0.14;
    czlowiek.scale.set(wzrost, wzrost, wzrost);
  }

  podmienFarby(czlowiek, [
    [skora, farbaZFaktura(skora, fakturaSkory, 0.65)],
    [koszula, farbaZFaktura(koszula, fakturaMaterialu, 1)],
    [spodnie, farbaZFaktura(spodnie, fakturaMaterialu, 1)],
    [wlosy, farbaZFaktura(wlosy, fakturaFutra, 0.9)],
    [buty, farbaZFaktura(buty, fakturaSkory, 0.45)],
    ["#d9b56b", farbaZFaktura("#d9b56b", fakturaMaterialu, 1)],
    ["#f5f5f5", farbaLsniaca("#f5f5f5", 0.15, 0)],
    [oczy, farbaLsniaca(oczy, 0.1, 0)],
    ["#111111", farbaLsniaca("#111111", 0.05, 0)],
    ["#b5524f", farbaLsniaca("#b5524f", 0.45, 0)],
  ]);
  if (sukienka) podmienFarby(czlowiek, [[sukienka, farbaZFaktura(sukienka, fakturaMaterialu, 1)]]);
  return czlowiek;
}

// Ludzie pojawiają się w wiosce, na trawie albo na drodze
function dodajLudzi() {
  ludzie.length = 0;
  if (!wioska) return;
  const miejsca = [];
  for (let w = wioska.w; w < wioska.w + wioska.wysokosc; w++) {
    for (let k = wioska.k; k < wioska.k + wioska.szerokosc; k++) {
      if (swiat[w][k] === "." || swiat[w][k] === "P") miejsca.push([w, k]);
    }
  }
  for (let i = 0; i < ILE_LUDZI && miejsca.length > 0; i++) {
    const [w, k] = miejsca.splice(Math.floor(Math.random() * miejsca.length), 1)[0];
    const czlowiek = zrobCzlowieka();
    czlowiek.position.set(k * KAFELEK, 0, w * KAFELEK);
    czlowiek.kierunek = Math.random() * Math.PI * 2;
    czlowiek.doZmiany = 0;
    czlowiek.idzie = false;
    czlowiek.krok = Math.random() * 10;
    czlowiek.ostatniePowitanie = -10000;
    czlowiek.stan = "spacer";   // spacer, doDomu (idzie spać), ucieka (przed drapieżnikiem), wDomu
    czlowiek.wDomu = null;
    czlowiek.lozko = -1;
    czlowiek.objazd = 0;        // ile kroków obchodzi domek bokiem
    kawalkiSwiata.add(czlowiek);
    ludzie.push(czlowiek);
  }
}

// ----- Domki ludzi -----
// Duże domki w wiosce, do których mieszkańcy chodzą spać i się chować
function domkiWWiosce() {
  return domki.filter((d) => wWiosce(Math.round(d.position.z / KAFELEK), Math.round(d.position.x / KAFELEK)));
}

// Wolne łóżko w domku (każdy domek ma 3 łóżka), albo -1
function wolneLozko(domek) {
  const zajete = [false, false, false];
  for (const c of ludzie) if (c.wDomu === domek && c.lozko >= 0) zajete[c.lozko] = true;
  return zajete.indexOf(false);
}

// Najbliższy domek z wolnym łóżkiem
function najblizszyDomek(czlowiek) {
  let najlepszy = null;
  let najblizej = Infinity;
  for (const d of domkiWWiosce()) {
    if (wolneLozko(d) < 0) continue;
    const odl = Math.hypot(d.drzwiX - czlowiek.position.x, d.drzwiZ - czlowiek.position.z);
    if (odl < najblizej) {
      najblizej = odl;
      najlepszy = d;
    }
  }
  return najlepszy;
}

// Najbliższy drapieżnik, który poluje blisko tego miejsca (albo null)
function drapieznikBlisko(x, z, zasieg) {
  for (const zwierze of zwierzeta) {
    if (!zwierze.gatunek.drapieznik || zwierze.przestraszony > 0) continue;
    if (Math.hypot(zwierze.position.x - x, zwierze.position.z - z) < zasieg) return zwierze;
  }
  return null;
}

// Człowiek idzie do punktu (x, z). Jak domek zagradza drogę, obchodzi go bokiem.
// Odpowiada true, kiedy doszedł.
function idzDo(czlowiek, x, z, szybkosc) {
  const dx = x - czlowiek.position.x;
  const dz = z - czlowiek.position.z;
  const odl = Math.hypot(dx, dz);
  if (odl < 0.4) return true;
  let kx = dx / odl;
  let kz = dz / odl;
  if (czlowiek.objazd > 0) {
    czlowiek.objazd--;
    kx = czlowiek.objazdKierunek;
    kz = 0;
  }
  const nx = czlowiek.position.x + kx * szybkosc;
  const nz = czlowiek.position.z + kz * szybkosc;
  const ruszylX = moznaStanac(nx, czlowiek.position.z);
  if (ruszylX) czlowiek.position.x = nx;
  const ruszylZ = moznaStanac(czlowiek.position.x, nz);
  if (ruszylZ) czlowiek.position.z = nz;
  if (!ruszylZ && Math.abs(kz) > 0.3 && czlowiek.objazd === 0) {
    // domek na drodze: obchodzimy go z boku, w stronę bliższego rogu domku
    const domek = czlowiek.cel;
    const odSrodka = domek ? czlowiek.position.x - domek.position.x : -dx;
    czlowiek.objazdKierunek = odSrodka >= 0 ? 1 : -1;
    const doRogu = domek ? 2.2 * domek.scale.x + 0.6 - Math.abs(odSrodka) : 2.6;
    czlowiek.objazd = Math.ceil(Math.max(0.5, doRogu) / szybkosc);
  }
  czlowiek.kierunek = Math.atan2(kx, kz);
  return false;
}

// Człowiek wchodzi do domku i kładzie się do łóżka
function wejdzDoLozka(czlowiek, domek, ileKrokow) {
  czlowiek.stan = "wDomu";
  czlowiek.wDomu = domek;
  czlowiek.lozko = wolneLozko(domek);
  czlowiek.wDomuJeszcze = ileKrokow;
  czlowiek.visible = false;
}

// Człowiek wychodzi z domku przed drzwi
function wyjdzZLozka(czlowiek) {
  const domek = czlowiek.wDomu;
  czlowiek.stan = "spacer";
  czlowiek.wDomu = null;
  czlowiek.lozko = -1;
  czlowiek.visible = true;
  czlowiek.rotation.set(0, 0, 0);
  czlowiek.position.set(domek.drzwiX, 0, domek.drzwiZ + 1.2);
  czlowiek.kierunek = 0;
}

// Ludzie spacerują po wiosce, chodzą spać do domków i uciekają przed drapieżnikami.
// Na widok Kiko machają.
function ruszLudzi() {
  pokazSpiacych();
  for (const czlowiek of ludzie) {
    // w domku: śpi albo się chowa. Wychodzi, kiedy minie czas i w pobliżu nie ma drapieżnika.
    if (czlowiek.stan === "wDomu" && !czlowiek.wDomu) czlowiek.stan = "spacer";
    if (czlowiek.stan === "wDomu") {
      czlowiek.wDomuJeszcze--;
      const bezpiecznie = !drapieznikBlisko(czlowiek.wDomu.drzwiX, czlowiek.wDomu.drzwiZ, 14);
      const kikoWTymDomku = malpka.wDomku === czlowiek.wDomu;
      if (czlowiek.wDomuJeszcze <= 0 && bezpiecznie && !kikoWTymDomku) wyjdzZLozka(czlowiek);
      continue;
    }

    // drapieżnik blisko: krzyk i ucieczka do najbliższego domku!
    const drapieznik = drapieznikBlisko(czlowiek.position.x, czlowiek.position.z, 10);
    if (drapieznik && czlowiek.stan !== "ucieka") {
      const domek = najblizszyDomek(czlowiek);
      if (domek) {
        czlowiek.stan = "ucieka";
        czlowiek.cel = domek;
        czlowiek.objazd = 0;
        if (Math.hypot(malpka.x - czlowiek.position.x, malpka.z - czlowiek.position.z) < 30) {
          pokazKomunikat("😱 Ratunku! " + drapieznik.gatunek.nazwa + "! Do domku!");
        }
      }
    }

    const dx = malpka.x - czlowiek.position.x;
    const dz = malpka.z - czlowiek.position.z;
    const blisko = !malpka.wDomku && Math.hypot(dx, dz) < 4 && czlowiek.stan === "spacer";

    let szybkosc = 0;
    if (czlowiek.stan === "ucieka" || czlowiek.stan === "doDomu") {
      const domek = czlowiek.cel;
      szybkosc = czlowiek.stan === "ucieka" ? 0.07 : 0.025;
      if (wolneLozko(domek) < 0) {
        czlowiek.cel = najblizszyDomek(czlowiek); // ktoś zajął ostatnie łóżko
        if (!czlowiek.cel) czlowiek.stan = "spacer";
      } else if (idzDo(czlowiek, domek.drzwiX, domek.drzwiZ + 1.0, szybkosc)) {
        // ucieka: chowa się na co najmniej 8 sekund, idzie spać: śpi 10 do 25 sekund
        const ileKrokow = czlowiek.stan === "ucieka" ? 480 : 600 + Math.random() * 900;
        wejdzDoLozka(czlowiek, domek, ileKrokow);
        continue;
      }
      czlowiek.krok += szybkosc * 4;
    } else if (blisko) {
      czlowiek.kierunek = Math.atan2(dx, dz); // patrzy na Kiko
      if (czas - czlowiek.ostatniePowitanie > 900) {
        czlowiek.ostatniePowitanie = czas;
        pokazKomunikat(wylosuj(POWITANIA));
      }
    } else {
      czlowiek.doZmiany--;
      if (czlowiek.doZmiany <= 0) {
        czlowiek.idzie = Math.random() < 0.6;
        czlowiek.kierunek += (Math.random() - 0.5) * 2.5;
        czlowiek.doZmiany = 120 + Math.random() * 200;
        // czasem robi się śpiący i idzie do domku się zdrzemnąć
        if (Math.random() < 0.15) {
          const domek = najblizszyDomek(czlowiek);
          if (domek) {
            czlowiek.stan = "doDomu";
            czlowiek.cel = domek;
            czlowiek.objazd = 0;
          }
        }
      }
      if (czlowiek.idzie) szybkosc = 0.02;
    }

    if (szybkosc > 0 && czlowiek.stan === "spacer") {
      const nx = czlowiek.position.x + Math.sin(czlowiek.kierunek) * szybkosc;
      const nz = czlowiek.position.z + Math.cos(czlowiek.kierunek) * szybkosc;
      const wWiosceDalej = wWiosce(Math.round(nz / KAFELEK), Math.round(nx / KAFELEK));
      if (wWiosceDalej && moznaStanac(nx, nz)) {
        czlowiek.position.x = nx;
        czlowiek.position.z = nz;
      } else {
        czlowiek.kierunek += Math.PI * (0.6 + Math.random() * 0.8); // zawraca
      }
      czlowiek.krok += szybkosc * 4;
    }
    let roznica = czlowiek.kierunek - czlowiek.rotation.y;
    roznica = Math.atan2(Math.sin(roznica), Math.cos(roznica));
    czlowiek.rotation.y += roznica * 0.12;

    // chodzenie: nogi i ręce na zmianę, kolana i łokcie się zginają
    const fala = szybkosc > 0 ? Math.sin(czlowiek.krok * 2) * 0.45 : 0;
    for (let i = 0; i < 2; i++) {
      const strona = i === 0 ? 1 : -1;
      const noga = czlowiek.nogi[i];
      noga.rotation.x = fala * strona;
      noga.kolano.rotation.x = Math.max(0, -fala * strona) * 1.3; // kolano zgina się, kiedy noga idzie do tyłu
    }
    czlowiek.rece[1].rotation.x = fala * 0.8;
    czlowiek.rece[1].lokiec.rotation.x = -0.25 - Math.max(0, fala) * 0.5;
    if (blisko) {
      // macha do Kiko: ręka w górze, przedramię kiwa się na boki
      czlowiek.rece[0].rotation.x = 0;
      czlowiek.rece[0].rotation.z += (-2.5 - czlowiek.rece[0].rotation.z) * 0.2;
      czlowiek.rece[0].lokiec.rotation.x = 0;
      czlowiek.rece[0].lokiec.rotation.z = Math.sin(czas * 0.25) * 0.5;
    } else {
      czlowiek.rece[0].rotation.x = -fala * 0.8;
      czlowiek.rece[0].rotation.z += (0 - czlowiek.rece[0].rotation.z) * 0.2;
      czlowiek.rece[0].lokiec.rotation.z = 0;
      czlowiek.rece[0].lokiec.rotation.x = -0.25 - Math.max(0, -fala) * 0.5;
    }
    // oddychanie i lekkie kołysanie przy chodzeniu
    czlowiek.position.y = Math.abs(fala) * 0.04 + Math.sin(czas * 0.05 + czlowiek.krok) * 0.004;
  }
}
