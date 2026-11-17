// Dziesięciu skrzatów. Każdy ma inny kolor i jedną dużą rzecz,
// żeby dało się go poznać nawet na malutkim obrazku.
// To nasze rysunki, nie z żadnej bajki.
// Serwer pamięta tylko krótki numer (id). Obrazek zostaje w przeglądarce.

var ATR = "#1c2430";
var SKORA = "#ffd2a6";

function ramka(kolor, srodek) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
    '<circle cx="32" cy="32" r="30" fill="' + kolor + '"/>' +
    srodek +
    '<circle cx="32" cy="32" r="30" fill="none" stroke="' + ATR + '" stroke-width="2.8"/>' +
    "</svg>";
}

function oczy(y) {
  return '<circle cx="24.5" cy="' + y + '" r="3.1" fill="' + ATR + '"/>' +
    '<circle cx="39.5" cy="' + y + '" r="3.1" fill="' + ATR + '"/>';
}

function usmiech(y) {
  return '<path d="M24 ' + y + 'c2.6 4.2 13.4 4.2 16 0" fill="none" stroke="' + ATR + '" stroke-width="2.8" stroke-linecap="round"/>';
}

// Śpioch: fiolet, długa nocna czapka z żółtym pomponem i poduszka.
function svgSpioch() {
  var glowa = '<circle cx="34" cy="38" r="14" fill="' + SKORA + '" stroke="' + ATR + '" stroke-width="2.3"/>';
  var spi = '<path d="M24 37c2.6 3.6 6.8 3.6 9.2 0" fill="none" stroke="' + ATR + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M38 37c2.6 3.6 6.8 3.6 9.2 0" fill="none" stroke="' + ATR + '" stroke-width="3.2" stroke-linecap="round"/>';
  var czapka = '<path d="M22 34c1-16 14-22 20-12 5-8 16-2 12 8-3 4-7 5-11 4-1 7-10 11-18 8-5-1-6-4-3-8z" fill="#fffdf8" stroke="' + ATR + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="48" cy="18" r="8" fill="#ffe14a" stroke="' + ATR + '" stroke-width="2.4"/>';
  var poduszka = '<rect x="12" y="48" width="40" height="13" rx="6" fill="#ffe7b0" stroke="' + ATR + '" stroke-width="2.3"/>' +
    '<path d="M20 54.5h24" stroke="#e7c56a" stroke-width="2.6" stroke-linecap="round"/>';
  var zzz = '<path d="M8 28h11L8 38h11" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>';
  return ramka("#6d45c4", glowa + spi + czapka + poduszka + zzz);
}

// Łasuch: różowy, wielka babeczka z wisienką zasłania pół buzi.
function svgLasuch() {
  var glowa = '<circle cx="28" cy="30" r="15" fill="' + SKORA + '" stroke="' + ATR + '" stroke-width="2.3"/>';
  var radosne = '<path d="M18 28c2-3.4 6-3.4 8 0" fill="none" stroke="' + ATR + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M30 28c2-3.4 6-3.4 8 0" fill="none" stroke="' + ATR + '" stroke-width="3" stroke-linecap="round"/>';
  var papilot = '<path d="M30 42h28l-4 14H34z" fill="#f0b429" stroke="' + ATR + '" stroke-width="2.3" stroke-linejoin="round"/>' +
    '<path d="M37 44l-1 10M44 44v11M51 44l1 10" stroke="' + ATR + '" stroke-width="1.8"/>';
  var krem = '<ellipse cx="44" cy="40" rx="15" ry="11" fill="#fff" stroke="' + ATR + '" stroke-width="2.3"/>' +
    '<path d="M32 40c4-6 8-6 12 0s8 6 12 0" fill="none" stroke="#ff8ab4" stroke-width="2.6" stroke-linecap="round"/>';
  var wisnia = '<circle cx="44" cy="28" r="6" fill="#e11d48" stroke="' + ATR + '" stroke-width="2.2"/>' +
    '<path d="M44 22c2-5 8-4 7 1" fill="none" stroke="#166534" stroke-width="2.4" stroke-linecap="round"/>';
  return ramka("#ff4f8b", glowa + radosne + papilot + krem + wisnia);
}

// Kucharz: czerwony, wysoka biała czapka kucharza.
function svgKucharz() {
  var fartuch = '<path d="M16 58c4-14 28-14 32 0z" fill="#fff" stroke="' + ATR + '" stroke-width="2.3"/>';
  var glowa = '<circle cx="32" cy="46" r="13" fill="' + SKORA + '" stroke="' + ATR + '" stroke-width="2.3"/>';
  var czapka = '<rect x="18" y="6" width="28" height="24" rx="12" fill="#fff" stroke="' + ATR + '" stroke-width="2.4"/>' +
    '<rect x="14" y="24" width="36" height="10" rx="2" fill="#fff" stroke="' + ATR + '" stroke-width="2.4"/>';
  return ramka("#e53935", fartuch + glowa + oczy(45) + usmiech(50) + czapka);
}

// Mądrala: zielony, wielkie okulary i otwarta książka.
function svgMadrala() {
  var glowa = '<circle cx="32" cy="30" r="16" fill="' + SKORA + '" stroke="' + ATR + '" stroke-width="2.3"/>';
  var okulary = '<circle cx="23" cy="27" r="8.2" fill="#e7f4ff" stroke="' + ATR + '" stroke-width="3.4"/>' +
    '<circle cx="42" cy="27" r="8.2" fill="#e7f4ff" stroke="' + ATR + '" stroke-width="3.4"/>' +
    '<path d="M31.2 27h3.6" stroke="' + ATR + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<circle cx="24.2" cy="27.6" r="2.4" fill="' + ATR + '"/>' +
    '<circle cx="43.2" cy="27.6" r="2.4" fill="' + ATR + '"/>';
  var buzia = '<path d="M25 40c2.4 3.4 12 3.4 15 0" fill="none" stroke="' + ATR + '" stroke-width="2.6" stroke-linecap="round"/>';
  var ksiazka = '<path d="M6 50 L32 44 L32 60 L6 62 Z" fill="#fffdf8" stroke="' + ATR + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M58 50 L32 44 L32 60 L58 62 Z" fill="#d9e6ff" stroke="' + ATR + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M14 53h10M40 53h10" stroke="#2f62d6" stroke-width="2.3" stroke-linecap="round"/>';
  return ramka("#1f9d57", glowa + okulary + buzia + ksiazka);
}

// Siłacz: pomarańczowy, czerwona hantla nad głową.
function svgSilacz() {
  var koszula = '<path d="M12 58c6-14 34-14 40 0z" fill="#d32f2f" stroke="' + ATR + '" stroke-width="2.3"/>';
  var glowa = '<circle cx="32" cy="44" r="13" fill="' + SKORA + '" stroke="' + ATR + '" stroke-width="2.3"/>';
  var brwi = '<path d="M22 38h8M34 38h8" stroke="' + ATR + '" stroke-width="3" stroke-linecap="round"/>';
  var hantla = '<rect x="12" y="14" width="40" height="8" rx="3" fill="#6d4c41" stroke="' + ATR + '" stroke-width="2.2"/>' +
    '<circle cx="14" cy="18" r="9.5" fill="#e23b32" stroke="' + ATR + '" stroke-width="2.3"/>' +
    '<circle cx="50" cy="18" r="9.5" fill="#e23b32" stroke="' + ATR + '" stroke-width="2.3"/>';
  return ramka("#f57c00", koszula + glowa + brwi + oczy(44) + usmiech(50) + hantla);
}

// Maruda: szary, zmarszczone brwi, duży dąs i skrzyżowane ręce.
function svgMaruda() {
  var glowa = '<circle cx="32" cy="28" r="16" fill="' + SKORA + '" stroke="' + ATR + '" stroke-width="2.3"/>';
  var brwi = '<path d="M16 18l12 6" stroke="' + ATR + '" stroke-width="4.4" stroke-linecap="round"/>' +
    '<path d="M48 18L36 24" stroke="' + ATR + '" stroke-width="4.4" stroke-linecap="round"/>';
  var usta = '<path d="M20 44c4-8 20-8 24 0" fill="none" stroke="' + ATR + '" stroke-width="4.4" stroke-linecap="round"/>';
  var rece = '<path d="M12 48L52 60" stroke="' + ATR + '" stroke-width="9" stroke-linecap="round"/>' +
    '<path d="M12 48L52 60" stroke="' + SKORA + '" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M52 48L12 60" stroke="' + ATR + '" stroke-width="9" stroke-linecap="round"/>' +
    '<path d="M52 48L12 60" stroke="' + SKORA + '" stroke-width="5" stroke-linecap="round"/>';
  return ramka("#607086", glowa + brwi + oczy(30) + usta + rece);
}

// Wesołek: żółty, wielki uśmiech i machająca ręka.
function svgWesolek() {
  var reka = '<path d="M40 38c8-2 12-10 10-16" fill="none" stroke="' + ATR + '" stroke-width="8" stroke-linecap="round"/>' +
    '<path d="M40 38c8-2 12-10 10-16" fill="none" stroke="' + SKORA + '" stroke-width="4.6" stroke-linecap="round"/>' +
    '<circle cx="50" cy="20" r="7" fill="' + SKORA + '" stroke="' + ATR + '" stroke-width="2.2"/>' +
    '<circle cx="45" cy="15" r="2.7" fill="' + SKORA + '" stroke="' + ATR + '" stroke-width="1.6"/>' +
    '<circle cx="50" cy="13" r="2.7" fill="' + SKORA + '" stroke="' + ATR + '" stroke-width="1.6"/>' +
    '<circle cx="55" cy="16" r="2.7" fill="' + SKORA + '" stroke="' + ATR + '" stroke-width="1.6"/>';
  var glowa = '<circle cx="30" cy="36" r="18" fill="' + SKORA + '" stroke="' + ATR + '" stroke-width="2.3"/>';
  var radosne = '<path d="M18 32c2.4-4.5 7-4.5 9.2 0" fill="none" stroke="' + ATR + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M33 32c2.4-4.5 7-4.5 9.2 0" fill="none" stroke="' + ATR + '" stroke-width="3.2" stroke-linecap="round"/>';
  var buzia = '<path d="M16 38c2 14 26 14 28 0z" fill="#fff" stroke="' + ATR + '" stroke-width="2.4"/>';
  return ramka("#f5c000", reka + glowa + radosne + buzia);
}

// Malarz: morski, czerwony beret i paleta z trzema plamami farby.
function svgMalarz() {
  var beret = '<ellipse cx="32" cy="16" rx="18" ry="9" fill="#e53935" stroke="' + ATR + '" stroke-width="2.3"/>' +
    '<ellipse cx="32" cy="17" rx="6" ry="3" fill="#b71c1c"/>';
  var glowa = '<circle cx="32" cy="32" r="14" fill="' + SKORA + '" stroke="' + ATR + '" stroke-width="2.3"/>';
  var paleta = '<ellipse cx="36" cy="50" rx="20" ry="12" fill="#f6e2c0" stroke="' + ATR + '" stroke-width="2.3"/>' +
    '<circle cx="22" cy="50" r="4.2" fill="#00a0b8" stroke="' + ATR + '" stroke-width="2"/>' +
    '<circle cx="34" cy="45" r="4.6" fill="#e53935" stroke="' + ATR + '" stroke-width="1.6"/>' +
    '<circle cx="44" cy="48" r="4.6" fill="#f5c000" stroke="' + ATR + '" stroke-width="1.6"/>' +
    '<circle cx="38" cy="55" r="4.6" fill="#1f9d57" stroke="' + ATR + '" stroke-width="1.6"/>';
  return ramka("#00a0b8", beret + glowa + oczy(31) + usmiech(37) + paleta);
}

// Pirat: ciemny, czerwona chusta i wielka opaska na oku. Bez czaszki, żeby nie straszył.
function svgPirat() {
  var glowa = '<circle cx="32" cy="36" r="17" fill="' + SKORA + '" stroke="' + ATR + '" stroke-width="2.3"/>';
  var bandana = '<path d="M14 36c1-16 12-22 18-18 6-6 18-2 18 18z" fill="#e11d48" stroke="' + ATR + '" stroke-width="2.3" stroke-linejoin="round"/>' +
    '<path d="M46 28c8 0 12 6 8 10-5 0-8-3-8-10z" fill="#e11d48" stroke="' + ATR + '" stroke-width="2.2"/>';
  var pasek = '<path d="M14 34c12-6 24-2 38 8" fill="none" stroke="#141414" stroke-width="4.5" stroke-linecap="round"/>';
  var opaska = '<ellipse cx="24" cy="40" rx="9" ry="8" fill="#141414"/>';
  var oko = '<circle cx="43" cy="40" r="4.2" fill="#fff" stroke="' + ATR + '" stroke-width="2"/>' +
    '<circle cx="44.2" cy="40.6" r="2.1" fill="' + ATR + '"/>';
  var usmiechPirat = '<path d="M28 50c2.4 3.4 8 3.6 11 0" fill="none" stroke="' + ATR + '" stroke-width="2.8" stroke-linecap="round"/>';
  var kolczyk = '<circle cx="50" cy="48" r="3.6" fill="none" stroke="#f5c000" stroke-width="2.6"/>';
  return ramka("#3b271c", glowa + bandana + pasek + opaska + oko + usmiechPirat + kolczyk);
}

// Kapitan: niebieski, biała czapka z daszkiem i złotym kółkiem.
function svgKapitan() {
  var mundur = '<path d="M12 58c6-12 34-12 40 0z" fill="#0d3b86" stroke="' + ATR + '" stroke-width="2.3"/>' +
    '<circle cx="26" cy="52" r="2.6" fill="#f5c000" stroke="' + ATR + '" stroke-width="1.4"/>' +
    '<circle cx="38" cy="52" r="2.6" fill="#f5c000" stroke="' + ATR + '" stroke-width="1.4"/>';
  var glowa = '<circle cx="32" cy="44" r="14" fill="' + SKORA + '" stroke="' + ATR + '" stroke-width="2.3"/>';
  var czapka = '<rect x="16" y="12" width="32" height="16" rx="3" fill="#fff" stroke="' + ATR + '" stroke-width="2.4"/>' +
    '<circle cx="32" cy="20" r="4.4" fill="#f5c000" stroke="' + ATR + '" stroke-width="1.8"/>' +
    '<path d="M8 28h48l-7 8H15z" fill="#141414" stroke="' + ATR + '" stroke-width="2.2" stroke-linejoin="round"/>';
  return ramka("#1d6fd4", mundur + glowa + oczy(44) + usmiech(50) + czapka);
}

var AWATARY = [
  { id: "spioch", imie: "Śpioch", svg: svgSpioch() },
  { id: "lasuch", imie: "Łasuch", svg: svgLasuch() },
  { id: "kucharz", imie: "Kucharz", svg: svgKucharz() },
  { id: "madrala", imie: "Mądrala", svg: svgMadrala() },
  { id: "silacz", imie: "Siłacz", svg: svgSilacz() },
  { id: "maruda", imie: "Maruda", svg: svgMaruda() },
  { id: "wesolek", imie: "Wesołek", svg: svgWesolek() },
  { id: "malarz", imie: "Malarz", svg: svgMalarz() },
  { id: "pirat", imie: "Pirat", svg: svgPirat() },
  { id: "kapitan", imie: "Kapitan", svg: svgKapitan() }
];

function awatarPoId(id) {
  for (var i = 0; i < AWATARY.length; i++) {
    if (AWATARY[i].id === id) return AWATARY[i];
  }
  return null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { AWATARY: AWATARY, awatarPoId: awatarPoId };
}
