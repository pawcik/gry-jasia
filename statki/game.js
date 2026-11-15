// ===== Statki: gra w statki dla całej rodziny =====
// Każdy gracz ma swoją planszę 10x10. Strzelamy po kolei w plansze innych.
// Serwer pilnuje zasad i mówi nam, co widać. Tu tylko rysujemy i wysyłamy ruchy.

var NAZWA_ZAPISU = "statki";
var KLASY_POL = { "0": "woda", "1": "pudlo", "2": "trafiony", "3": "zatopiony", "4": "statek" };

function el(id) {
  return document.getElementById(id);
}

// Pamięć przeglądarki: kim jestem i jak mam na imię
function wczytaj(klucz) {
  try {
    return localStorage.getItem(NAZWA_ZAPISU + "-" + klucz);
  } catch (e) {
    return null;
  }
}

function zapisz(klucz, wartosc) {
  try {
    localStorage.setItem(NAZWA_ZAPISU + "-" + klucz, wartosc);
  } catch (e) {
    // bez zapisu też się da grać
  }
}

// Mój tajny numer: dzięki niemu po zgaszeniu telefonu wracam do tej samej gry
var mojeId = wczytaj("id");
if (!mojeId) {
  mojeId = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  zapisz("id", mojeId);
}

var stan = null;             // to, co ostatnio powiedział serwer
var poprzedniEtap = "";
var ostatniStrzal = -1;      // numer ostatniego strzału, który już pokazaliśmy
var bylaMojaKolej = false;
var czekamNaSerwer = false;  // wysłaliśmy strzał i czekamy na odpowiedź
var wyslalemDolacz = false;
var zmieniamImie = false;
var czasPytania = null;
var czasDymka = null;
var wybuchDo = 0;            // do kiedy pokazujemy plusk albo wybuch na ostatnim polu

// Ustawianie statków (tylko u nas, dopóki nie klikniemy "Gotowe")
var ustawianie = nowePlanowanie();
function nowePlanowanie() {
  return { statki: [], wybrany: 0, poziomo: true, podglad: -1 };
}

// ----- Połączenie z serwerem -----
function polacz() {
  var zrodlo = new EventSource("/wydarzenia?id=" + mojeId);
  zrodlo.onopen = function () {
    el("polaczenie").style.display = "none";
  };
  zrodlo.onerror = function () {
    el("polaczenie").style.display = "block";
    // Zwykle przeglądarka sama łączy się znowu. Gdy się podda (np. serwer był wyłączony), łączymy od nowa.
    if (zrodlo.readyState === EventSource.CLOSED) setTimeout(polacz, 2000);
  };
  zrodlo.addEventListener("stan", function (zdarzenie) {
    stan = JSON.parse(zdarzenie.data);
    czekamNaSerwer = false;
    reaguj();
    rysuj();
  });
  zrodlo.addEventListener("odswiez", function () {
    location.reload();
  });
}

function wyslij(typ, dane) {
  dane = dane || {};
  dane.id = mojeId;
  dane.typ = typ;
  fetch("/akcja", { method: "POST", body: JSON.stringify(dane) })
    .then(function (odpowiedz) {
      return odpowiedz.json();
    })
    .then(function (wynik) {
      if (wynik.blad) {
        czekamNaSerwer = false;
        pokazDymek(wynik.blad);
      }
    })
    .catch(function () {
      czekamNaSerwer = false;
      if (typ === "dolacz") wyslalemDolacz = false;
      pokazDymek("📡 Brak połączenia z serwerem");
    });
}

// ----- Pomocnicy -----
function gracz(nr) {
  for (var i = 0; i < stan.gracze.length; i++) {
    if (stan.gracze[i].nr === nr) return stan.gracze[i];
  }
  return null;
}

// Zasady wybranego rodzaju gry: rozmiar planszy i statki
function tryb() {
  return TRYBY[stan.tryb];
}

function mnie() {
  return stan ? gracz(stan.ja) : null;
}

function grajacy() {
  var lista = [];
  for (var i = 0; i < stan.gracze.length; i++) {
    if (!stan.gracze[i].widz) lista.push(stan.gracze[i]);
  }
  return lista;
}

function pokazTylko(id) {
  var ekrany = document.querySelectorAll(".ekran");
  for (var i = 0; i < ekrany.length; i++) {
    ekrany[i].style.display = ekrany[i].id === id ? "block" : "none";
  }
}

function pokazDymek(tekst) {
  var dymek = el("dymek");
  dymek.textContent = tekst;
  dymek.classList.add("widac");
  clearTimeout(czasDymka);
  czasDymka = setTimeout(function () {
    dymek.classList.remove("widac");
  }, 2200);
}

function dodajKlik(element, funkcja, wartosc) {
  element.addEventListener("click", function () {
    funkcja(wartosc);
  });
}

// Guzik "Usuń" przy graczu, który od dawna nie ma połączenia
function dodajUsun(element, g) {
  if (g.online || g.offline < stan.sekundyDoUsuniecia || g.nr === stan.ja || stan.etap === "koniec") return;
  var guzik = document.createElement("button");
  guzik.className = "maly";
  guzik.textContent = "Usuń";
  dodajKlik(guzik, function (nr) {
    wyslij("usun", { nr: nr });
  }, g.nr);
  element.appendChild(guzik);
}

// ----- Co się zmieniło: dźwięki i dymki -----
function reaguj() {
  // Nie ma mnie w grze (np. serwer wystartował od nowa): dołączam pod zapisanym imieniem.
  // Po "zacznij od nowa" nie dołączam sam — trzeba nacisnąć Gram!, żeby wiszący telefon nie blokował gry.
  if (stan.ja === 0) {
    var imie = wczytaj("imie");
    if (imie && !stan.trzebaPotwierdzic && !wyslalemDolacz && !zmieniamImie) {
      wyslalemDolacz = true;
      wyslij("dolacz", { imie: imie });
    }
  } else {
    wyslalemDolacz = false;
  }

  if (stan.etap !== poprzedniEtap) {
    if (stan.etap === "ustawianie") ustawianie = nowePlanowanie();
    poprzedniEtap = stan.etap;
    schowajPytanie();
  }

  var o = stan.ostatni;
  if (o && o.numer > ostatniStrzal) {
    if (ostatniStrzal !== -1) {
      pokazDymek(o.tekst);
      wybuchDo = Date.now() + 900;
      if (o.wynik === "pudlo") dzwiekPlusk();
      else if (o.wynik === "trafiony") dzwiekWybuch();
      else dzwiekZatopienie();
      if (o.cel === stan.ja && o.wynik !== "pudlo" && navigator.vibrate) navigator.vibrate(300);
    }
    ostatniStrzal = o.numer;
  } else if (ostatniStrzal === -1) {
    ostatniStrzal = 0;
  }

  var mojaKolej = stan.etap === "bitwa" && stan.tura === stan.ja;
  if (mojaKolej && !bylaMojaKolej) dzwiekKolej();
  bylaMojaKolej = mojaKolej;
}

// ----- Rysowanie -----
function rysuj() {
  if (!stan) return;
  var ja = mnie();
  var zapisaneImie = wczytaj("imie");
  el("mojeImie").textContent = ja ? "🙂 " + ja.imie : (zapisaneImie ? "🙂 " + zapisaneImie : "");
  if (zmieniamImie || (!ja && !zapisaneImie)) {
    pokazTylko("ekranImie");
    return;
  }
  if (!ja && stan.trzebaPotwierdzic) {
    rysujGram();
    return;
  }
  if (!ja) {
    pokazTylko("ekranLaczenie");
    return;
  }
  if (stan.etap === "poczekalnia") rysujPoczekalnie();
  else if (stan.etap === "ustawianie" && !ja.widz) rysujUstawianie(ja);
  else rysujBitwe(ja);
}

// Imiona z listy graczy. Przy zgaszonym telefonie doklejamy znaczek.
function imiona(lista, znaczek) {
  var nazwy = [];
  for (var i = 0; i < lista.length; i++) {
    nazwy.push(lista[i].imie + (znaczek && !lista[i].online ? " 📵" : ""));
  }
  return nazwy;
}

// Kto jeszcze nie nacisnął Gram!
function napiszOczekujacych(element, przedrostek) {
  var oczek = stan.oczekujacy || [];
  if (!oczek.length) {
    element.style.display = "none";
    element.textContent = "";
    return;
  }
  element.style.display = "block";
  element.textContent = przedrostek + imiona(oczek, true).join(", ");
}

function rysujGram() {
  pokazTylko("ekranGram");
  el("gramImie").textContent = "Cześć, " + (wczytaj("imie") || "") + "!";
  var wSrodku = imiona(stan.gracze, true);
  el("gramCzekaja").textContent = wSrodku.length ? "Już w poczekalni: " + wSrodku.join(", ") : "W poczekalni nie ma jeszcze nikogo.";
  napiszOczekujacych(el("gramJeszcze"), "Jeszcze nie: ");
}

// Plansza z kratkami. pola = 100 znaków od serwera (albo z ustawiania).
// opcje: aktywna (można klikać), klik(pole), najazd(pole), podglad { pole: klasa }, ostatnie (pole)
function zrobPlansze(pola, opcje) {
  var siatka = document.createElement("div");
  siatka.className = "plansza" + (opcje.aktywna ? " aktywna" : "");
  siatka.style.gridTemplateColumns = "repeat(" + (tryb().rozmiar + 1) + ", 1fr)";
  siatka.appendChild(document.createElement("div"));
  for (var k = 0; k < tryb().rozmiar; k++) {
    var litera = document.createElement("div");
    litera.className = "opis";
    litera.textContent = LITERY.charAt(k);
    siatka.appendChild(litera);
  }
  for (var w = 0; w < tryb().rozmiar; w++) {
    var cyfra = document.createElement("div");
    cyfra.className = "opis";
    cyfra.textContent = w + 1;
    siatka.appendChild(cyfra);
    for (var kk = 0; kk < tryb().rozmiar; kk++) {
      var pole = w * tryb().rozmiar + kk;
      var kratka = document.createElement("div");
      kratka.className = "kratka " + KLASY_POL[pola.charAt(pole)];
      if (opcje.podglad && opcje.podglad[pole]) kratka.classList.add(opcje.podglad[pole]);
      if (opcje.ostatnie === pole) {
        kratka.classList.add("ostatni");
        if (Date.now() < wybuchDo) kratka.classList.add("wybuch");
      }
      if (opcje.klik) dodajKlik(kratka, opcje.klik, pole);
      if (opcje.najazd) dodajNajazd(kratka, opcje.najazd, pole);
      siatka.appendChild(kratka);
    }
  }
  if (opcje.najazd) {
    siatka.addEventListener("mouseleave", function () {
      opcje.najazd(-1);
    });
  }
  return siatka;
}

function dodajNajazd(element, funkcja, wartosc) {
  element.addEventListener("mouseenter", function () {
    funkcja(wartosc);
  });
}

// ----- Poczekalnia -----
function rysujPoczekalnie() {
  pokazTylko("ekranPoczekalnia");
  var lista = el("listaGraczy");
  lista.innerHTML = "";
  var polaczonych = 0;
  for (var i = 0; i < stan.gracze.length; i++) {
    var g = stan.gracze[i];
    if (g.online) polaczonych++;
    var wiersz = document.createElement("li");
    wiersz.textContent = (g.online ? "🟢 " : "⚪ ") + g.imie + (g.nr === stan.ja ? " (ty)" : "");
    lista.appendChild(wiersz);
  }
  napiszOczekujacych(el("oczekujacy"), "Czekamy na Gram!: ");
  el("start").disabled = polaczonych < 2;

  // Guziki: klasyczna albo szybka gra
  var miejsceTrybow = el("tryby");
  miejsceTrybow.innerHTML = "";
  for (var nazwa in TRYBY) {
    var guzik = document.createElement("button");
    guzik.className = "trybGuzik" + (nazwa === stan.tryb ? " wybrany" : "");
    guzik.textContent = TRYBY[nazwa].nazwa + ": " + TRYBY[nazwa].opis;
    dodajKlik(guzik, function (wybrany) {
      wyslij("tryb", { tryb: wybrany });
    }, nazwa);
    miejsceTrybow.appendChild(guzik);
  }
  el("adresy").textContent = stan.adresy.length ? "Inni dołączają na telefonie albo komputerze: " + stan.adresy.join(" albo ") : "";
}

// ----- Ustawianie statków -----
function pierwszyWolnyStatek() {
  for (var i = 0; i < tryb().statki.length; i++) {
    var zajety = false;
    for (var j = 0; j < ustawianie.statki.length; j++) {
      if (ustawianie.statki[j].nr === i) zajety = true;
    }
    if (!zajety) return i;
  }
  return -1;
}

function kandydatNa(pole) {
  return {
    w: Math.floor(pole / tryb().rozmiar),
    k: pole % tryb().rozmiar,
    dlugosc: tryb().statki[ustawianie.wybrany],
    poziomo: ustawianie.poziomo,
    nr: ustawianie.wybrany
  };
}

function kliknijUstawianie(pole) {
  var flota = zbudujFlote(ustawianie.statki, tryb(), false);
  var ktory = flota.naPolu[pole];
  if (ktory !== -1) {
    // Stuknięcie w postawiony statek: zabieramy go
    var zabrany = ustawianie.statki.splice(ktory, 1)[0];
    ustawianie.wybrany = zabrany.nr;
    ustawianie.poziomo = zabrany.poziomo;
    dzwiekKlik();
    rysuj();
    return;
  }
  if (ustawianie.wybrany < 0) return;
  var kandydat = kandydatNa(pole);
  if (zbudujFlote(ustawianie.statki.concat([kandydat]), tryb(), false)) {
    ustawianie.statki.push(kandydat);
    ustawianie.wybrany = pierwszyWolnyStatek();
    ustawianie.podglad = -1;
    dzwiekKlik();
  } else {
    pokazDymek("Tu się nie zmieści. Statki nie mogą się stykać!");
  }
  rysuj();
}

// Zielone albo czerwone pola podglądu: numer pola -> klasa.
function klasyPodgladu() {
  var podglad = {};
  var flota = zbudujFlote(ustawianie.statki, tryb(), false);
  if (!flota) return podglad;
  if (ustawianie.podglad < 0 || ustawianie.wybrany < 0) return podglad;
  if (flota.naPolu[ustawianie.podglad] !== -1) return podglad;
  var kandydat = kandydatNa(ustawianie.podglad);
  var dobrze = !!zbudujFlote(ustawianie.statki.concat([kandydat]), tryb(), false);
  for (var j = 0; j < kandydat.dlugosc; j++) {
    var w = kandydat.poziomo ? kandydat.w : kandydat.w + j;
    var k = kandydat.poziomo ? kandydat.k + j : kandydat.k;
    if (w < tryb().rozmiar && k < tryb().rozmiar) podglad[w * tryb().rozmiar + k] = dobrze ? "podglad" : "zlyPodglad";
  }
  return podglad;
}

function najedzUstawianie(pole) {
  if (ustawianie.podglad === pole) return;
  ustawianie.podglad = pole;
  // Nie budujemy planszy od nowa. Na iPhonie stuknięcie najpierw udaje najazd,
  // a nowa plansza pod palcem sprawia, że Safari nie stawia statku.
  var kratki = el("planszaUstawiania").querySelectorAll(".kratka");
  if (kratki.length !== tryb().rozmiar * tryb().rozmiar) return;
  var podglad = klasyPodgladu();
  for (var i = 0; i < kratki.length; i++) {
    kratki[i].classList.remove("podglad");
    kratki[i].classList.remove("zlyPodglad");
    if (podglad[i]) kratki[i].classList.add(podglad[i]);
  }
}

function rysujListeStatkow() {
  var lista = el("listaStatkow");
  lista.innerHTML = "";
  for (var i = 0; i < tryb().statki.length; i++) {
    var postawiony = false;
    for (var j = 0; j < ustawianie.statki.length; j++) {
      if (ustawianie.statki[j].nr === i) postawiony = true;
    }
    var guzik = document.createElement("button");
    guzik.className = "statekGuzik" + (postawiony ? " postawiony" : "") + (i === ustawianie.wybrany ? " wybrany" : "");
    var kwadraty = "";
    for (var m = 0; m < tryb().statki[i]; m++) kwadraty += "■";
    guzik.textContent = kwadraty;
    if (!postawiony) {
      dodajKlik(guzik, function (nr) {
        ustawianie.wybrany = nr;
        rysuj();
      }, i);
    }
    lista.appendChild(guzik);
  }
  el("obroc").textContent = ustawianie.poziomo ? "↻ Poziomo ➡" : "↻ Pionowo ⬇";
}

function rysujUstawianie(ja) {
  pokazTylko("ekranUstawianie");
  var miejsce = el("planszaUstawiania");
  miejsce.innerHTML = "";

  if (ja.gotowy) {
    el("ustawPanel").style.display = "none";
    miejsce.appendChild(zrobPlansze(ja.pola, {}));
    el("czekamNaInnych").textContent = "✔ Gotowe! Czekamy, aż inni ustawią statki.";
  } else {
    el("ustawPanel").style.display = "block";
    el("czekamNaInnych").textContent = "";
    rysujListeStatkow();

    var flota = zbudujFlote(ustawianie.statki, tryb(), false);
    var pola = "";
    for (var p = 0; p < tryb().rozmiar * tryb().rozmiar; p++) pola += flota.naPolu[p] !== -1 ? "4" : "0";

    // Podgląd statku pod myszką: zielony = można postawić, czerwony = nie
    miejsce.appendChild(zrobPlansze(pola, { aktywna: true, klik: kliknijUstawianie, najazd: najedzUstawianie, podglad: klasyPodgladu() }));
    el("gotowe").disabled = ustawianie.statki.length !== tryb().statki.length;
  }

  var lista = el("gotowiGracze");
  lista.innerHTML = "";
  var inni = grajacy();
  for (var i = 0; i < inni.length; i++) {
    var g = inni[i];
    var wiersz = document.createElement("li");
    wiersz.textContent = (g.gotowy ? "✔ " : "⏳ ") + g.imie + (g.online ? "" : " 📵");
    dodajUsun(wiersz, g);
    lista.appendChild(wiersz);
  }
  napiszOczekujacych(el("oczekujacyUstawianie"), "Czekamy na Gram!: ");
}

// ----- Bitwa (i koniec gry) -----
function strzel(cel, pole) {
  var g = gracz(cel);
  if (czekamNaSerwer || !g || g.pola.charAt(pole) !== "0") return;
  czekamNaSerwer = true;
  dzwiekStrzalu();
  wyslij("strzal", { cel: cel, pole: pole });
}

function rysujBitwe(ja) {
  pokazTylko("ekranBitwa");
  var mojaKolej = stan.etap === "bitwa" && stan.tura === stan.ja && !ja.widz;
  var naTurze = gracz(stan.tura);

  var napis = "";
  if (stan.etap === "koniec") napis = "🏆 Wygrywa " + stan.zwyciezca + "!";
  else if (stan.etap === "ustawianie") napis = "🚢 Gracze ustawiają statki. Zagrasz w następnej grze.";
  else if (ja.widz) napis = "👀 Oglądasz. Zagrasz w następnej grze.";
  else if (ja.odpadl) napis = "💀 Twoje statki zatonęły. Oglądaj dalej!";
  else if (mojaKolej) napis = "🎯 Twoja kolej! Strzel w planszę przeciwnika";
  else if (naTurze) napis = "⏳ Strzela " + naTurze.imie + (naTurze.online ? "" : " (nie ma połączenia 📵)");
  el("tura").textContent = napis;
  el("tura").className = mojaKolej ? "mojaTura" : "";
  var koniec = stan.etap === "koniec";
  var mogeOdNowa = !koniec && !ja.widz;
  el("odNowaBitwa").style.display = mogeOdNowa ? "inline-block" : "none";
  el("opisOdNowaBitwa").style.display = mogeOdNowa ? "block" : "none";
  el("nowaGra").style.display = koniec ? "inline-block" : "none";

  // Najpierw plansze przeciwników, na końcu moja
  var kolejnosc = [];
  var gracze = grajacy();
  for (var i = 0; i < gracze.length; i++) {
    if (gracze[i].nr !== stan.ja) kolejnosc.push(gracze[i]);
  }
  for (var j = 0; j < gracze.length; j++) {
    if (gracze[j].nr === stan.ja) kolejnosc.push(gracze[j]);
  }

  var miejsce = el("plansze");
  miejsce.innerHTML = "";
  for (var n = 0; n < kolejnosc.length; n++) {
    var g = kolejnosc[n];
    var moznaStrzelac = mojaKolej && g.nr !== stan.ja && !g.odpadl;
    var karta = document.createElement("div");
    karta.className = "karta" + (g.nr === stan.tura && stan.etap === "bitwa" ? " naTurze" : "") + (moznaStrzelac ? " cel" : "") + (g.odpadl ? " odpadl" : "");
    var tytul = document.createElement("h3");
    tytul.textContent = (g.nr === stan.ja ? "Twoje statki" : g.imie) + "  🚢 " + g.zostalo + (g.odpadl ? " 💀" : "") + (g.online ? "" : " 📵");
    dodajUsun(tytul, g);
    karta.appendChild(tytul);
    var opcje = { aktywna: moznaStrzelac };
    if (moznaStrzelac) opcje.klik = strzelWGracza(g.nr);
    if (stan.ostatni && stan.ostatni.cel === g.nr) opcje.ostatnie = stan.ostatni.pole;
    karta.appendChild(zrobPlansze(g.pola, opcje));
    miejsce.appendChild(karta);
  }

  var dziennik = el("dziennik");
  dziennik.innerHTML = "";
  for (var d = stan.dziennik.length - 1; d >= 0; d--) {
    var wiersz = document.createElement("li");
    wiersz.textContent = stan.dziennik[d];
    dziennik.appendChild(wiersz);
  }
}

function strzelWGracza(nr) {
  return function (pole) {
    strzel(nr, pole);
  };
}

// ----- Guziki -----
el("dolacz").addEventListener("click", function () {
  var imie = el("imie").value.trim();
  if (!imie) {
    el("imie").focus();
    return;
  }
  zapisz("imie", imie);
  el("imie").blur();
  zmieniamImie = false;
  wyslalemDolacz = true;
  wyslij("dolacz", { imie: imie });
  pokazTylko("ekranLaczenie");
});

el("imie").addEventListener("keydown", function (zdarzenie) {
  if (zdarzenie.key === "Enter") el("dolacz").click();
});

el("zmienImie").addEventListener("click", function () {
  el("imie").value = wczytaj("imie") || "";
  zmieniamImie = true;
  pokazTylko("ekranImie");
});

el("start").addEventListener("click", function () {
  wyslij("start");
});

el("obroc").addEventListener("click", function () {
  ustawianie.poziomo = !ustawianie.poziomo;
  rysuj();
});

el("losuj").addEventListener("click", function () {
  ustawianie.statki = losujFlote(tryb());
  ustawianie.wybrany = -1;
  dzwiekKlik();
  rysuj();
});

el("wyczysc").addEventListener("click", function () {
  ustawianie = nowePlanowanie();
  rysuj();
});

el("gotowe").addEventListener("click", function () {
  wyslij("ustaw", { statki: ustawianie.statki });
});

el("nowaGra").addEventListener("click", function () {
  wyslij("nowaGra");
});

// Pytamy w osobnym okienku, żeby nie zacząć od nowa przez przypadek.
function schowajPytanie() {
  clearTimeout(czasPytania);
  el("zaslonaOdNowa").style.display = "none";
  el("pytanieOdNowa").style.display = "none";
}

function pokazPytanie() {
  dzwiekKlik();
  el("zaslonaOdNowa").style.display = "block";
  el("pytanieOdNowa").style.display = "block";
  clearTimeout(czasPytania);
  czasPytania = setTimeout(schowajPytanie, 8000);
}

function podlaczOdNowa(przycisk) {
  przycisk.addEventListener("click", pokazPytanie);
}
podlaczOdNowa(el("odNowaPoczekalnia"));
podlaczOdNowa(el("odNowaUstawianie"));
podlaczOdNowa(el("odNowaBitwa"));

el("odNowaTak").addEventListener("click", function () {
  schowajPytanie();
  wyslij("odNowa");
  dzwiekKlik();
});

el("odNowaNie").addEventListener("click", function () {
  dzwiekKlik();
  schowajPytanie();
});

el("gram").addEventListener("click", function () {
  var imie = wczytaj("imie");
  if (!imie) {
    zmieniamImie = true;
    pokazTylko("ekranImie");
    return;
  }
  dzwiekKlik();
  wyslalemDolacz = true;
  wyslij("dolacz", { imie: imie });
  pokazTylko("ekranLaczenie");
});

// R obraca statek przy ustawianiu
document.addEventListener("keydown", function (zdarzenie) {
  if (zdarzenie.target.tagName === "INPUT") return;
  if (zdarzenie.key === "r" || zdarzenie.key === "R") el("obroc").click();
});

// ----- Start -----
if (location.protocol === "file:") {
  pokazTylko("ekranPlik");
} else {
  pokazTylko("ekranLaczenie");
  polacz();
}
