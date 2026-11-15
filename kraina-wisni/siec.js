// ===== Gra z innymi =====
// Każdy gracz wpisuje imię, wybiera kolor liska i widzi pozostałych graczy.
// Działa, gdy gra jest otwarta przez serwer (mise run serwer). Otwarta z pliku gra działa sama.

var KOLORY_LISKOW = [["rudy", KOLOR_FUTRA], ["biały", "#f2eee6"], ["czarny", "#3b3442"], ["niebieski", "#4a90d9"], ["różowy", "#f48fb1"]];
var NAZWA_ZAPISU = "kraina-wisni-gracz";

var siec = {
  wlaczona: location.protocol === "http:" || location.protocol === "https:",
  id: Math.random().toString(36).slice(2, 10),  // losowy numer tego okna gry
  imie: "",
  kolor: KOLOR_FUTRA,
  polaczona: false,
  wysyla: false,
  inni: {}  // id -> postać innego gracza
};

function przygotujSiec() {
  if (!siec.wlaczona) return;
  zrobGuzikiKolorow();
  document.getElementById("zmienImie").style.display = "block";
  document.getElementById("zmienImie").addEventListener("click", pokazLogowanie);
  document.getElementById("graj").addEventListener("click", zatwierdzImie);
  document.getElementById("imie").addEventListener("keydown", function (zdarzenie) {
    if (zdarzenie.key === "Enter") zatwierdzImie();
  });

  polacz();

  // Ktoś już tu grał: od razu wchodzi pod swoim imieniem
  var zapisany = wczytajGracza();
  if (zapisany && zapisany.imie) {
    siec.imie = zapisany.imie;
    siec.kolor = zapisany.kolor || KOLOR_FUTRA;
    dolacz();
  } else {
    pokazLogowanie();
  }
}

// ----- Okienko z imieniem -----
function pokazLogowanie() {
  document.getElementById("logowanie").style.display = "flex";
  document.getElementById("imie").value = siec.imie;
  zaznaczKolor();
}

function zrobGuzikiKolorow() {
  var miejsce = document.getElementById("kolory");
  for (var i = 0; i < KOLORY_LISKOW.length; i++) {
    var guzik = document.createElement("button");
    guzik.className = "kolorLiska";
    guzik.title = KOLORY_LISKOW[i][0];
    guzik.style.background = KOLORY_LISKOW[i][1];
    guzik.dataset.kolor = KOLORY_LISKOW[i][1];
    guzik.addEventListener("click", function () {
      siec.kolor = this.dataset.kolor;
      zaznaczKolor();
    });
    miejsce.appendChild(guzik);
  }
}

function zaznaczKolor() {
  var guziki = document.querySelectorAll(".kolorLiska");
  for (var i = 0; i < guziki.length; i++) {
    guziki[i].classList.toggle("wybrany", guziki[i].dataset.kolor === siec.kolor);
  }
}

function zatwierdzImie() {
  var pole = document.getElementById("imie");
  var imie = pole.value.trim().slice(0, 12);
  if (!imie) {
    pole.focus();
    return;
  }
  siec.imie = imie;
  pole.blur();
  document.getElementById("logowanie").style.display = "none";
  zapiszGracza();
  dolacz();
}

function dolacz() {
  zmienWyglad(bohater, siec.imie, siec.kolor);
  pokazListeGraczy();
}

function wczytajGracza() {
  try {
    return JSON.parse(localStorage.getItem(NAZWA_ZAPISU));
  } catch (blad) {
    return null;
  }
}

function zapiszGracza() {
  try {
    localStorage.setItem(NAZWA_ZAPISU, JSON.stringify({ imie: siec.imie, kolor: siec.kolor }));
  } catch (blad) {
    // bez zapisu też się da grać
  }
}

// ----- Połączenie z serwerem -----
function polacz() {
  var zrodlo = new EventSource("/wydarzenia?id=" + siec.id);
  zrodlo.onopen = function () {
    siec.polaczona = true;
  };
  zrodlo.onerror = function () {
    siec.polaczona = false;  // przeglądarka sama spróbuje połączyć się znowu
  };
  zrodlo.addEventListener("gracze", function (zdarzenie) {
    aktualizujInnych(JSON.parse(zdarzenie.data));
  });
  zrodlo.addEventListener("odswiez", function () {
    location.reload();
  });
}

// Mówimy serwerowi, gdzie jest nasz lisek (wołane co kilka kroków gry)
function wyslijStan() {
  if (!siec.wlaczona || !siec.polaczona || !siec.imie || siec.wysyla) return;
  siec.wysyla = true;
  fetch("/ruch", {
    method: "POST",
    body: JSON.stringify({
      id: siec.id,
      imie: siec.imie,
      kolor: siec.kolor,
      x: Math.round(bohater.x * 100) / 100,
      z: Math.round(bohater.z * 100) / 100,
      kat: Math.round(bohater.kat * 100) / 100,
      liczbaCiec: bohater.liczbaCiec,
      katCiecia: Math.round(bohater.katCiecia * 100) / 100
    })
  }).catch(function () {}).then(function () {
    siec.wysyla = false;
  });
}

// ----- Inni gracze -----
function aktualizujInnych(lista) {
  var widziani = {};
  for (var i = 0; i < lista.length; i++) {
    var g = lista[i];
    if (g.id === siec.id) continue;
    widziani[g.id] = true;
    var inny = siec.inni[g.id];
    if (!inny) {
      inny = zrobPostac(g.imie, g.kolor);
      inny.x = g.x;
      inny.z = g.z;
      inny.kat = g.kat;
      inny.liczbaCiec = g.liczbaCiec;
      siec.inni[g.id] = inny;
    } else if (inny.imie !== g.imie || inny.kolor !== g.kolor) {
      zmienWyglad(inny, g.imie, g.kolor);
    }
    inny.celX = g.x;
    inny.celZ = g.z;
    inny.celKat = g.kat;
    // Liczba cięć urosła: ten gracz właśnie machnął mieczem
    if (g.liczbaCiec > inny.liczbaCiec) {
      inny.ciecie = DLUGOSC_CIECIA;
      inny.katCiecia = g.katCiecia;
      inny.kat = g.katCiecia;
      dzwiekCiecia();
    }
    inny.liczbaCiec = g.liczbaCiec;
  }
  // Kto zniknął z listy, wyszedł z gry
  for (var id in siec.inni) {
    if (!widziani[id]) {
      usunPostac(siec.inni[id]);
      delete siec.inni[id];
    }
  }
  pokazListeGraczy();
}

// Inni gracze płynnie idą tam, gdzie powiedział serwer (60 razy na sekundę)
function ruszInnych() {
  for (var id in siec.inni) {
    var inny = siec.inni[id];
    var dx = inny.celX - inny.x;
    var dz = inny.celZ - inny.z;
    var odleglosc = Math.sqrt(dx * dx + dz * dz);
    if (odleglosc > 5) {
      // bardzo daleko: przeskakuje od razu
      inny.x = inny.celX;
      inny.z = inny.celZ;
      inny.predkosc = 0;
    } else {
      inny.x += dx * 0.25;
      inny.z += dz * 0.25;
      inny.predkosc = Math.min(1, odleglosc * 0.25 / SZYBKOSC);
    }
    if (inny.ciecie > 0) {
      inny.ciecie--;
      if (inny.ciecie === MOMENT_TRAFIENIA) trafKukly(inny, inny.katCiecia, false);
    } else {
      inny.kat += roznicaKatow(inny.celKat, inny.kat) * 0.3;
    }
    animujPostac(inny);
    pokazSlad(inny);
  }
}

function pokazListeGraczy() {
  if (!siec.imie) return;
  var imiona = [siec.imie];
  for (var id in siec.inni) imiona.push(siec.inni[id].imie);
  document.getElementById("gracze").textContent = "👥 " + imiona.join(", ");
}
