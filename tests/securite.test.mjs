// Les verrous de sécurité de la phase 0 qui se testent sans réseau ni base :
// le filtre d'adresses des requêtes émises par le serveur (SSRF, audit du
// 10/11/2026, S1). Lancé par `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ipInterdite, destinationAutorisee } from "../src/lib/requeteSure.js";

test("adresses internes refusées, adresses publiques acceptées", () => {
  for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1"]) {
    assert.equal(ipInterdite(ip), true, `${ip} doit être refusée`);
  }
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) {
    assert.equal(ipInterdite(ip), false, `${ip} doit être acceptée`);
  }
  assert.equal(ipInterdite("pas-une-ip"), true);
});

test("destination : protocole et réseau interne refusés avant toute requête", async () => {
  assert.equal((await destinationAutorisee(new URL("ftp://exemple.com/"))).code, "protocole");
  assert.equal((await destinationAutorisee(new URL("http://127.0.0.1/"))).code, "interne");
  assert.equal((await destinationAutorisee(new URL("http://169.254.169.254/latest/meta-data/"))).code, "interne");
  assert.equal((await destinationAutorisee(new URL("http://[::1]/"))).code, "interne");
  assert.equal((await destinationAutorisee(new URL("http://service.internal/"))).code, "interne");
  assert.equal((await destinationAutorisee(new URL("http://localhost:3000/"))).code, "interne");
  assert.equal((await destinationAutorisee(new URL("http://8.8.8.8/"))).ok, true);
});
