// Automated accessibility checks: axe-core on key screens of the sample shift, plus WCAG
// contrast for the colour tokens used for text. Run with `npm test` from this folder.
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const repo = path.join(__dirname, "..");
// The app script is eval'd below, so drop the tag that would load it from disk.
const html = fs
  .readFileSync(path.join(repo, "index.html"), "utf8")
  .replace(/<script\b[^>]*src="\.\/app\.js"[^>]*><\/script>/, "");
const code = fs.readFileSync(path.join(repo, "app.js"), "utf8");
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const css = fs.readFileSync(path.join(repo, "styles.css"), "utf8");

// Same boot as shift.test.js, with axe-core injected into the page.
function boot() {
  const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/", pretendToBeVisual: true });
  const w = dom.window;
  const d = w.document;
  w.eval(code);
  w.eval(axeSource);
  const $ = (sel) => d.querySelector(sel);
  const $$ = (sel) => [...d.querySelectorAll(sel)];
  const act = (action, val) => {
    const b = $$(`[data-action="${action}"]`).find((x) => val === undefined || x.dataset.val === val);
    if (!b) throw new Error(`no button ${action} ${val ?? ""}`);
    b.click();
  };
  const submit = (sel, fields) => {
    const f = $(sel);
    if (!f) throw new Error("no form " + sel);
    for (const [k, v] of Object.entries(fields)) f.elements[k].value = v;
    f.dispatchEvent(new w.Event("submit", { cancelable: true, bubbles: true }));
  };
  return { w, d, $, act, submit };
}

const issue = (t, asset) => {
  if (!t.$("[data-issue]")) t.act("new");
  t.submit("[data-issue]", { req: "RQ-214", asset, who: "Kabir Sen", due: "Fri 8 pm" });
};
const returnTag = (t, tag, num) => {
  t.submit("[data-find]", { tag });
  t.act("close-slip", num);
};
// Friday evening with PR-04 and SP-02 back and AD-12 still out.
const partial = () => {
  const t = boot();
  t.act("tab", "Loan register");
  for (const a of ["PR-04", "SP-02", "AD-12"]) issue(t, a);
  t.act("advance");
  t.act("tab", "Loan register");
  t.act("checkin", "");
  returnTag(t, "PR-04", "402");
  returnTag(t, "SP-02", "403");
  return t;
};

// jsdom does no layout or painting, so axe cannot compute colours: color-contrast is off here
// and covered by the token checks below. Every other rule (including 'region') stays on.
const axeOptions = { rules: { "color-contrast": { enabled: false } } };

async function check(t) {
  const { violations } = await t.w.axe.run(t.d, axeOptions);
  const report = violations
    .map((v) => `${v.id} (${v.impact}): ${v.help}\n` + v.nodes.map((n) => `    ${n.target.join(" ")}`).join("\n"))
    .join("\n");
  assert.equal(violations.length, 0, "axe violations:\n" + report);
}

const states = {
  "Requests list": () => boot(),
  "request detail": () => {
    const t = boot();
    t.act("request", "RQ-214");
    return t;
  },
  Inventory: () => {
    const t = boot();
    t.act("tab", "Inventory");
    return t;
  },
  "Loan register (Friday)": () => {
    const t = boot();
    t.act("tab", "Loan register");
    return t;
  },
  "issue form open": () => {
    const t = boot();
    t.act("tab", "Loan register");
    t.act("new");
    return t;
  },
  "Take a return with a wrong-tag error": () => {
    const t = boot();
    t.act("tab", "Loan register");
    t.act("checkin", "");
    t.submit("[data-find]", { tag: "AD-15" });
    return t;
  },
  "custody form": () => {
    const t = partial();
    t.act("custody", "404");
    return t;
  },
  "Before you hand over check": () => {
    const t = partial();
    t.act("advance");
    assert.ok(t.$("[data-handover]").textContent.includes("Before you hand over"));
    return t;
  },
  "Desk book": () => {
    const t = boot();
    t.act("tab", "Desk book");
    return t;
  },
};

describe("axe-core: no violations", () => {
  for (const [name, make] of Object.entries(states)) it(name, () => check(make()));
});

// ---- Contrast of the light-dark() token pairs used for text ----
const tokens = {};
for (const m of css.matchAll(/(--[\w-]+):\s*light-dark\((#[0-9a-f]{3,6}),\s*(#[0-9a-f]{3,6})\)/gi))
  tokens[m[1]] = { light: m[2], dark: m[3] };

const lum = (hex) => {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [text, background, where it is used]
const pairs = [
  ["--ink", "--paper", "body text"],
  ["--ink", "--desk", "text on desk panels"],
  ["--ink", "--nav", "nav tabs"],
  ["--sel", "--paper", "summary"],
  ["--sel", "--desk", "summary in the exam strip"],
  ["--quiet", "--paper", ".muted, small"],
  ["--quiet", "--desk", ".muted on desk panels"],
  ["--memotxt", "--memo", "memo / due-soon tags"],
  ["--mark", "--memo", ".tag.late"],
  ["--mark", "--paper", ".warn"],
  ["--oktxt", "--ok", "back / ok tags"],
  ["--inv", "--sel", "primary buttons, selected tab"],
  ["--inv", "--mark", "handover buttons"],
];

describe("contrast of text tokens (WCAG AA, 4.5:1)", () => {
  for (const [fg, bg, where] of pairs)
    for (const theme of ["light", "dark"])
      it(`${fg} on ${bg} (${theme}) — ${where}`, () => {
        assert.ok(tokens[fg] && tokens[bg], `token missing from styles.css: ${fg} / ${bg}`);
        const r = ratio(tokens[fg][theme], tokens[bg][theme]);
        assert.ok(r >= 4.5, `${fg} ${tokens[fg][theme]} on ${bg} ${tokens[bg][theme]} is ${r.toFixed(2)}:1`);
      });
});
