import { test } from "node:test";
import assert from "node:assert/strict";
import { firstParam, pageNumber } from "../src/lib/query";
test("repeated query values are safe and pagination stays within bounds", () => {
  assert.equal(firstParam(["lamp", "second"]), "lamp");
  assert.equal(firstParam(undefined), "");
  assert.equal(pageNumber("-3"), 1);
  assert.equal(pageNumber("2.5"), 2);
  assert.equal(pageNumber("Infinity"), 10000);
  assert.equal(pageNumber("bad"), 1);
});
