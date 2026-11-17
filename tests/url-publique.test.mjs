// Les liens envoyés par e-mail ouvrent toujours l'app publique (18/11/2026) : lib/urlPublique.js.
import test from "node:test";
import assert from "node:assert/strict";
import { urlPublique, URL_PRODUCTION } from "../src/lib/urlPublique.js";

test("url publique : jamais localhost dans un e-mail", () => {
  assert.equal(urlPublique(undefined), URL_PRODUCTION);
  assert.equal(urlPublique(""), URL_PRODUCTION);
  assert.equal(urlPublique("http://localhost:3000"), URL_PRODUCTION);
  assert.equal(urlPublique("http://127.0.0.1:3000/"), URL_PRODUCTION);
  assert.equal(urlPublique("https://app.onbord.be/"), "https://app.onbord.be");
  assert.equal(urlPublique("https://preprod.onbord.be"), "https://preprod.onbord.be");
});
