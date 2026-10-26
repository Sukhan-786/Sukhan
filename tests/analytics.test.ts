import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyticsHostEnabled,
  analyticsPathEnabled,
  googleTagManagerId,
  googleTagManagerBootstrap,
} from "../src/lib/analytics";
test("the supplied GTM container only loads on Sukhan production hosts", () => {
  assert.equal(googleTagManagerId, "GTM-MWXQC8X9");
  for (const host of [
    "sukhan.co.in",
    "www.sukhan.co.in",
    "sukhan-blush.vercel.app",
  ])
    assert.equal(analyticsHostEnabled(host), true);
  for (const host of [
    "localhost:3100",
    "127.0.0.1",
    "thenajaf.vercel.app",
    "sukhan.co.in.attacker.test",
    "preview.vercel.app",
  ])
    assert.equal(analyticsHostEnabled(host), false);
  assert.match(googleTagManagerBootstrap, /GTM-MWXQC8X9/);
  assert.match(googleTagManagerBootstrap, /gtm\.js\?id=/);
});
test("GTM excludes protected paths and preserves ordinary public routes", () => {
  for (const path of [
    "/admin",
    "/admin/kalam/new",
    "/login",
    "/auth/callback",
    "/account",
    "/profile",
    "/set-password",
  ])
    assert.equal(analyticsPathEnabled(path), false);
  for (const path of [
    "/",
    "/catalogue",
    "/kalam/a-poem",
    "/dictionary",
    "/artists/ghalib",
  ])
    assert.equal(analyticsPathEnabled(path), true);
});
