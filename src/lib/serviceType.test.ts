import { test } from "node:test";
import { strict as assert } from "node:assert";
import { canTakeNetflixProfile, isNetflixLite } from "./serviceType";

test("Netflix Lite is detected by name", () => {
  assert.equal(isNetflixLite("Netflix Lite"), true);
  assert.equal(isNetflixLite("Netflix Personal"), false);
});

test("A second Lite customer can join a half-filled profile", () => {
  assert.equal(canTakeNetflixProfile({ status: "half", is_vulnerable: false }, true), true);
});

test("Personal cannot join a profile shared by a Lite customer", () => {
  assert.equal(canTakeNetflixProfile({ status: "half", is_vulnerable: false }, false), false);
});

test("Nobody joins a full profile", () => {
  assert.equal(canTakeNetflixProfile({ status: "active", is_vulnerable: false }, true), false);
});
