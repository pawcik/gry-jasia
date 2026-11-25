// Pamięta pliki gry, żeby po pierwszym otwarciu działała bez sieci.
var CACHE = "sudoku-v4";
var PLIKI = [
  "./",
  "./index.html",
  "./style.css",
  "./silnik.js",
  "./game.js",
  "./manifest.webmanifest",
  "./ikona.svg",
  "./ikona-32.png",
  "./ikona-180.png",
  "./favicon.ico",
  "./czcionki/PatrickHand-Regular.woff2",
  "./czcionki/OFL.txt",
  "./paczki/zestaw-1.json"
];

self.addEventListener("install", function (zdarzenie) {
  zdarzenie.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PLIKI);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (zdarzenie) {
  zdarzenie.waitUntil(
    caches.keys().then(function (klucze) {
      var kasowanie = [];
      var i;
      for (i = 0; i < klucze.length; i++) {
        if (klucze[i] !== CACHE) kasowanie.push(caches.delete(klucze[i]));
      }
      return Promise.all(kasowanie);
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function zPamieci(zadanie) {
  return caches.match(zadanie).then(function (zapis) {
    if (zapis) return zapis;
    if (zadanie.mode === "navigate") return caches.match("./index.html");
    return caches.match(zadanie, { ignoreSearch: true });
  });
}

self.addEventListener("fetch", function (zdarzenie) {
  var zadanie = zdarzenie.request;
  if (zadanie.method !== "GET") return;
  var url = new URL(zadanie.url);
  if (url.origin !== self.location.origin) return;
  zdarzenie.respondWith(
    fetch(zadanie).then(function (odpowiedz) {
      if (odpowiedz && odpowiedz.status === 200 && odpowiedz.type === "basic") {
        var kopia = odpowiedz.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(zadanie, kopia);
        });
      }
      return odpowiedz;
    }).catch(function () {
      return zPamieci(zadanie);
    })
  );
});
