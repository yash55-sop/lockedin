import assert from "node:assert/strict";
import test from "node:test";

import { parsePanelCookies } from "../lib/panel-cookies";

test("missing or malformed panel preferences never crash the dashboard", () => {
  const defaults = { defaultLayout: [16, 84], defaultCollapsed: false };
  assert.deepEqual(parsePanelCookies(), defaults);
  for (const malformed of [
    "{",
    "undefined",
    "null",
    '"hello"',
    "{}",
    "[]",
    "[1]",
    "[1,2,3]",
    '["16",84]',
    "[-1,101]",
    "[10,20]",
    "[1e309,0]",
  ]) {
    assert.deepEqual(
      parsePanelCookies(malformed, malformed),
      defaults,
      malformed
    );
  }
});

test("valid layout and collapse preferences restore independently", () => {
  assert.deepEqual(parsePanelCookies("[18,82]", "true"), {
    defaultLayout: [18, 82],
    defaultCollapsed: true,
  });
  assert.deepEqual(parsePanelCookies("invalid", "true"), {
    defaultLayout: [16, 84],
    defaultCollapsed: true,
  });
  assert.deepEqual(parsePanelCookies("[20,80]", "invalid"), {
    defaultLayout: [20, 80],
    defaultCollapsed: false,
  });
  assert.deepEqual(parsePanelCookies("[3,97]", "false"), {
    defaultLayout: [3, 97],
    defaultCollapsed: false,
  });
});
