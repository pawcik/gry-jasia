// Rysuje jeden kafelek na każdą grę z listy GRY.

function rysujGry() {
  var siatka = document.getElementById("siatka");
  var i;

  if (typeof GRY === "undefined" || !GRY.length) {
    var pusto = document.createElement("li");
    pusto.className = "pusto";
    pusto.textContent = "Nie ma jeszcze żadnej gry.";
    siatka.appendChild(pusto);
    return;
  }

  for (i = 0; i < GRY.length; i++) {
    siatka.appendChild(zrobKafelek(GRY[i]));
  }
}

function zrobKafelek(gra) {
  var punkt = document.createElement("li");
  var link = document.createElement("a");
  var ikona = document.createElement("span");
  var tekst = document.createElement("span");
  var nazwa = document.createElement("span");
  var opis = document.createElement("span");

  link.className = "kafelek";
  link.href = adresGry(gra);

  ikona.className = "ikona";
  ikona.textContent = gra.ikona || "🎲";
  ikona.setAttribute("aria-hidden", "true");

  tekst.className = "tekst";
  nazwa.className = "nazwa";
  nazwa.textContent = gra.nazwa;
  opis.className = "opis";
  opis.textContent = gra.opis;

  tekst.appendChild(nazwa);
  tekst.appendChild(opis);
  link.appendChild(ikona);
  link.appendChild(tekst);
  punkt.appendChild(link);
  return punkt;
}

// Adres gry: podany wprost albo ta sama domena co strona i port z listy.
function adresGry(gra) {
  if (gra.adres) return gra.adres;
  if (!location.hostname || !gra.port) return "#";
  return location.protocol + "//" + location.hostname + ":" + gra.port + "/";
}

rysujGry();
