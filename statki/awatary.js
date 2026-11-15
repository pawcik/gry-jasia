// Mali niebiescy skrzaciki w białych, miękkich czapkach z pomponem.
// Każdy ma inny charakter. To nasze rysunki długopisem, nie z żadnej bajki.
// Serwer pamięta tylko krótki numer (id). Obrazek zostaje w przeglądarce.

var KOLOR_ATR = "#1c3352";
var KOLOR_SKORA = "#5ec4f5";
var KOLOR_NOS = "#3aa6de";
var KOLOR_UBR = "#2b86c2";
var KOLOR_CZAPKA = "#fffdf8";
var KOLOR_PAPIER = "#fff4dc";
var KOLOR_RUZ = "#f6a8bb";
var KOLOR_PASKA = "#c4843c";
var KOLOR_BUTA = "#6b4423";

function ramka(srodek) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" aria-hidden="true" focusable="false">' + srodek + "</svg>";
}

function tlo() {
  // Duże kółko, żeby czapka, buciki i rzeczy mieściły się w środku.
  return '<path d="M40 3c17 0 33 12 35 30 2 18-8 36-26 41C30 79 8 70 4 50 0 30 12 8 28 4 32 3 36 3 40 3z" fill="' + KOLOR_PAPIER + '" stroke="' + KOLOR_ATR + '" stroke-width="2.2"/>';
}

function uszy() {
  return '<ellipse cx="22" cy="46" rx="5.4" ry="6.4" fill="' + KOLOR_SKORA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.6"/>' +
    '<ellipse cx="54" cy="46" rx="5.4" ry="6.4" fill="' + KOLOR_SKORA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.6"/>';
}

function tunika() {
  return '<path d="M26 55c1-5 6-8 12-8s11 3 12 8l4 14H22z" fill="' + KOLOR_UBR + '" stroke="' + KOLOR_ATR + '" stroke-width="1.7" stroke-linejoin="round"/>' +
    '<rect x="25" y="60" width="26" height="3.6" rx="1.2" fill="' + KOLOR_PASKA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.1"/>' +
    '<circle cx="38" cy="61.8" r="1.5" fill="#ffe566" stroke="' + KOLOR_ATR + '" stroke-width="0.8"/>';
}

function buty() {
  return '<ellipse cx="30" cy="70" rx="7" ry="3.5" fill="' + KOLOR_BUTA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.4"/>' +
    '<ellipse cx="46" cy="70" rx="7" ry="3.5" fill="' + KOLOR_BUTA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.4"/>';
}

function glowa() {
  return '<ellipse cx="38" cy="46" rx="15" ry="13.6" fill="' + KOLOR_SKORA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.8"/>' +
    '<ellipse cx="38" cy="50" rx="2.8" ry="2" fill="' + KOLOR_NOS + '"/>';
}

// Długa miękka czapka opada w prawo i kończy się pomponem.
function czapka() {
  return '<path d="M24 44c-1-12 8-22 16-20 6-7 16-4 18 6 7-4 16 2 12 12-4 2-8 0-10-3-2 6-8 8-14 6-6 2-14 4-22-1z" fill="' + KOLOR_CZAPKA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<circle cx="66" cy="40" r="5.2" fill="' + KOLOR_CZAPKA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.7"/>' +
    '<path d="M32 28c4-2 10-1 13 3" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>';
}

function czapkaWLewo() {
  return '<g transform="translate(76 0) scale(-1 1)">' + czapka() + "</g>";
}

function policzki() {
  return '<ellipse cx="28" cy="53" rx="2.4" ry="1.5" fill="' + KOLOR_RUZ + '"/>' +
    '<ellipse cx="48" cy="53" rx="2.4" ry="1.5" fill="' + KOLOR_RUZ + '"/>';
}

function oczyOtwarte() {
  return '<ellipse cx="32" cy="46" rx="3.2" ry="3.5" fill="#fff" stroke="' + KOLOR_ATR + '" stroke-width="1.3"/>' +
    '<ellipse cx="45" cy="46" rx="3.2" ry="3.5" fill="#fff" stroke="' + KOLOR_ATR + '" stroke-width="1.3"/>' +
    '<circle cx="33" cy="47" r="1.5" fill="' + KOLOR_ATR + '"/>' +
    '<circle cx="46" cy="47" r="1.5" fill="' + KOLOR_ATR + '"/>' +
    '<circle cx="32.3" cy="45.8" r="0.55" fill="#fff"/>' +
    '<circle cx="45.3" cy="45.8" r="0.55" fill="#fff"/>';
}

function usmiech() {
  return '<path d="M31 54c2.2 3 7 3.6 14 0" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.7" stroke-linecap="round"/>';
}

function duzyUsmiech() {
  return '<path d="M29 53c3 5.4 11 6.2 17 0" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.8" stroke-linecap="round"/>';
}

function cialo() {
  return uszy() + tunika() + buty() + glowa();
}

// Śpioch ciągle zasypia. Oczy ma zamknięte, a obok lecą zzz.
function svgSpioch() {
  var zzz = '<path d="M16 22h10L16 32h10" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M24 15h7L24 22h7" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';
  var spi = '<path d="M28 47c2-2.6 5.4-2.6 7.2 0" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M41 47c2-2.6 5.4-2.6 7.2 0" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="2" stroke-linecap="round"/>' +
    '<ellipse cx="38" cy="55" rx="2.6" ry="3" fill="' + KOLOR_ATR + '"/>' +
    '<ellipse cx="38" cy="54.4" rx="1.3" ry="1.4" fill="' + KOLOR_RUZ + '"/>';
  return ramka(tlo() + zzz + cialo() + czapka() + spi + policzki());
}

// Łasuch trzyma wielkie ciastko i ma okruszki na buzi.
function svgLasuch() {
  var ciastko = '<circle cx="64" cy="58" r="10" fill="#e4b15c" stroke="' + KOLOR_ATR + '" stroke-width="1.7"/>' +
    '<circle cx="60" cy="54" r="1.5" fill="#5c3b22"/>' +
    '<circle cx="67" cy="56" r="1.45" fill="#5c3b22"/>' +
    '<circle cx="62" cy="61" r="1.35" fill="#5c3b22"/>' +
    '<circle cx="68" cy="62" r="1.2" fill="#5c3b22"/>' +
    '<circle cx="55" cy="58" r="3" fill="' + KOLOR_SKORA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.3"/>' +
    '<circle cx="34" cy="51" r="0.8" fill="#c4843c"/>' +
    '<circle cx="42" cy="49.5" r="0.7" fill="#c4843c"/>';
  var radosne = '<path d="M28 47q3.4-3.6 7 0" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path d="M41 47q3.4-3.6 7 0" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.8" stroke-linecap="round"/>';
  return ramka(tlo() + cialo() + czapkaWLewo() + radosne + duzyUsmiech() + policzki() + ciastko);
}

// Kucharz ma czerwoną chustkę i drewnianą łyżkę. Czapka zostaje biała.
function svgKucharz() {
  var chusta = '<path d="M32 56l6 8 6-8" fill="#e14b46" stroke="' + KOLOR_ATR + '" stroke-width="1.3" stroke-linejoin="round"/>';
  var lyzka = '<g transform="translate(62 46) rotate(-35)">' +
    '<rect x="-2.2" y="2" width="4.6" height="20" rx="2" fill="' + KOLOR_PASKA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.3"/>' +
    '<ellipse cx="0" cy="-1" rx="7.2" ry="8.2" fill="#e8c48a" stroke="' + KOLOR_ATR + '" stroke-width="1.6"/>' +
    "</g>";
  return ramka(tlo() + cialo() + chusta + czapkaWLewo() + oczyOtwarte() + usmiech() + policzki() + lyzka);
}

// Mądrala nosi duże okulary i czyta małą książkę.
function svgMadrala() {
  var ksiazka = '<path d="M26 63h24v10H26z" fill="#fff" stroke="' + KOLOR_ATR + '" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<path d="M38 63v10" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.2"/>' +
    '<path d="M29 66h6M41 66h6M29 69h6M41 69h5" fill="none" stroke="#7ea0c4" stroke-width="1.1" stroke-linecap="round"/>';
  var okulary = '<circle cx="32" cy="46" r="6.3" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.7"/>' +
    '<circle cx="45" cy="46" r="6.3" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.7"/>' +
    '<path d="M38.2 46h1.6" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.5" stroke-linecap="round"/>';
  var brew = '<path d="M26 40q5-3.4 9 0" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M41 41.5h9" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.6" stroke-linecap="round"/>';
  return ramka(tlo() + cialo() + ksiazka + czapka() + oczyOtwarte() + okulary + brew + usmiech() + policzki());
}

// Siłacz trzyma czerwoną hantlę z boku, żeby było ją widać.
function svgSilacz() {
  var hantla = '<rect x="54" y="46" width="14" height="4.2" rx="2" fill="#d5dbe2" stroke="' + KOLOR_ATR + '" stroke-width="1.3"/>' +
    '<circle cx="55" cy="48.1" r="5" fill="#e14b46" stroke="' + KOLOR_ATR + '" stroke-width="1.5"/>' +
    '<circle cx="68" cy="48.1" r="5" fill="#e14b46" stroke="' + KOLOR_ATR + '" stroke-width="1.5"/>' +
    '<circle cx="50" cy="50" r="2.6" fill="' + KOLOR_SKORA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.2"/>';
  var brwi = '<path d="M27 42l7 2" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.7" stroke-linecap="round"/>' +
    '<path d="M42 44l7-2" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.7" stroke-linecap="round"/>';
  return ramka(tlo() + cialo() + czapkaWLewo() + brwi + oczyOtwarte() + usmiech() + policzki() + hantla);
}

// Maruda ma zmarszczone brwi, smutne usta i skrzyżowane ręce.
function svgMaruda() {
  var rece = '<path d="M27 60l22 9" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="4.4" stroke-linecap="round"/>' +
    '<path d="M27 60l22 9" fill="none" stroke="' + KOLOR_SKORA + '" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M27 69l22-9" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="4.4" stroke-linecap="round"/>' +
    '<path d="M27 69l22-9" fill="none" stroke="' + KOLOR_SKORA + '" stroke-width="2.2" stroke-linecap="round"/>';
  var brwi = '<path d="M27 41l8 3.5" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path d="M41 44.5l8-3.5" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.8" stroke-linecap="round"/>';
  var usta = '<path d="M31 56c2.2-3.2 7.4-3.6 14 0" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.8" stroke-linecap="round"/>';
  return ramka(tlo() + cialo() + rece + czapka() + brwi + oczyOtwarte() + usta);
}

// Wesołek macha ręką i ma wielki uśmiech.
function svgWesolek() {
  var reka = '<path d="M50 58c3-3 6-7 8-11" fill="none" stroke="' + KOLOR_UBR + '" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="62" cy="44" r="6.4" fill="' + KOLOR_SKORA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.5"/>' +
    '<circle cx="57" cy="39" r="2.5" fill="' + KOLOR_SKORA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.2"/>' +
    '<circle cx="62.5" cy="36.5" r="2.5" fill="' + KOLOR_SKORA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.2"/>' +
    '<circle cx="68" cy="40" r="2.5" fill="' + KOLOR_SKORA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.2"/>';
  var iskra = '<path d="M16 28l1.5 3.8 4 .6-3.1 2.6 1 4L16 36.4l-3.4 2.6 1-4-3.1-2.6 4-.6z" fill="#ffe566" stroke="' + KOLOR_ATR + '" stroke-width="1" stroke-linejoin="round"/>';
  return ramka(tlo() + iskra + cialo() + reka + czapkaWLewo() + oczyOtwarte() + duzyUsmiech() + policzki());
}

// Malarz macha pędzlem. Obok są kleksy farby.
function svgMalarz() {
  var kleksy = '<circle cx="14" cy="36" r="3.3" fill="#3d9a4a" stroke="' + KOLOR_ATR + '" stroke-width="1.2"/>' +
    '<circle cx="16" cy="58" r="2.3" fill="#3d7ec9" stroke="' + KOLOR_ATR + '" stroke-width="1"/>';
  var pedzel = '<g transform="translate(64 50) rotate(-50)">' +
    '<rect x="-2" y="0" width="4.2" height="18" rx="2" fill="#8a5a32" stroke="' + KOLOR_ATR + '" stroke-width="1.2"/>' +
    '<rect x="-2.6" y="-4" width="5.4" height="6" rx="1" fill="#d5dbe2" stroke="' + KOLOR_ATR + '" stroke-width="1.1"/>' +
    '<ellipse cx="0" cy="-8" rx="4.4" ry="5.6" fill="#ffe566" stroke="' + KOLOR_ATR + '" stroke-width="1.4"/>' +
    "</g>";
  return ramka(tlo() + kleksy + cialo() + czapkaWLewo() + oczyOtwarte() + usmiech() + policzki() + pedzel);
}

// Pirat ma opaskę na oku i czerwoną wstążkę na czapce. Bez czaszki, żeby nie straszył.
function svgPirat() {
  var wstazka = '<path d="M28 34c6-3 14-2 20 2" fill="none" stroke="#e14b46" stroke-width="3" stroke-linecap="round"/>';
  var opaska = '<path d="M24 42c6-2 12-1 18 2" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.4" stroke-linecap="round"/>' +
    '<ellipse cx="32" cy="46.5" rx="5.8" ry="5" fill="' + KOLOR_ATR + '"/>';
  var oko = '<ellipse cx="45" cy="46" rx="3.2" ry="3.5" fill="#fff" stroke="' + KOLOR_ATR + '" stroke-width="1.3"/>' +
    '<circle cx="46" cy="47" r="1.5" fill="' + KOLOR_ATR + '"/>' +
    '<circle cx="45.3" cy="45.8" r="0.55" fill="#fff"/>';
  var statek = '<path d="M12 62h11l-2.2 5.2H14.2z" fill="' + KOLOR_PASKA + '" stroke="' + KOLOR_ATR + '" stroke-width="1.2" stroke-linejoin="round"/>' +
    '<path d="M17.5 62v-8" fill="none" stroke="' + KOLOR_ATR + '" stroke-width="1.3" stroke-linecap="round"/>' +
    '<path d="M17.5 54l6 6h-6z" fill="#fff" stroke="' + KOLOR_ATR + '" stroke-width="1.1" stroke-linejoin="round"/>';
  return ramka(tlo() + statek + cialo() + czapka() + wstazka + oko + opaska + usmiech() + policzki());
}

// Kapitan patrzy przez złotą lunetę. Na ubraniu ma dwa złote guziki.
function svgKapitan() {
  var guziki = '<circle cx="38" cy="66" r="2" fill="#e2b100" stroke="' + KOLOR_ATR + '" stroke-width="1"/>' +
    '<circle cx="38" cy="70.5" r="1.7" fill="#e2b100" stroke="' + KOLOR_ATR + '" stroke-width="0.9"/>';
  var luneta = '<g transform="translate(46 44) rotate(-8)">' +
    '<rect x="0" y="-3.6" width="20" height="7.2" rx="3" fill="#e2b100" stroke="' + KOLOR_ATR + '" stroke-width="1.4"/>' +
    '<rect x="16" y="-4.8" width="6.5" height="9.6" rx="2" fill="#f0d56a" stroke="' + KOLOR_ATR + '" stroke-width="1.3"/>' +
    '<circle cx="3" cy="0" r="1.8" fill="#9fd4f0" stroke="' + KOLOR_ATR + '" stroke-width="1"/>' +
    "</g>";
  var oko = '<ellipse cx="32" cy="46" rx="3.2" ry="3.5" fill="#fff" stroke="' + KOLOR_ATR + '" stroke-width="1.3"/>' +
    '<circle cx="33" cy="47" r="1.5" fill="' + KOLOR_ATR + '"/>' +
    '<circle cx="32.3" cy="45.8" r="0.55" fill="#fff"/>';
  return ramka(tlo() + cialo() + guziki + czapkaWLewo() + oko + luneta + usmiech() + policzki());
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
