// Plays the Campus Stores sample shift in jsdom. Run with `npm test` from this folder.
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const repo = path.join(__dirname, "..");
const storageKey = "campus-stores.shift.v2";
// The app script is eval'd below, so drop the tag that would load it from disk.
const html = fs
  .readFileSync(path.join(repo, "index.html"), "utf8")
  .replace(/<script\b[^>]*src="\.\/app\.js"[^>]*><\/script>/, "");
const code = fs.readFileSync(path.join(repo, "app.js"), "utf8");

// A fresh page. `saved` (object or raw string) is put in localStorage before the app starts.
function boot(saved) {
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  const d = w.document;
  if (saved !== undefined)
    w.localStorage.setItem(storageKey, typeof saved === "string" ? saved : JSON.stringify(saved));
  const errors = [];
  w.addEventListener("error", (e) => errors.push(e.message));
  w.eval(code);
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
  const page = () => $("[data-page]").textContent.replace(/\s+/g, " ");
  const status = () => $("[data-status]").textContent;
  const focused = () => d.activeElement;
  const saved_ = () => w.localStorage.getItem(storageKey);
  return { w, d, $, $$, act, submit, page, status, focused, errors, saved: saved_ };
}

const issue = (t, asset, extra = {}) => {
  if (!t.$("[data-issue]")) t.act("new");
  t.submit("[data-issue]", { req: "RQ-214", asset, who: "Kabir Sen", due: "Fri 8 pm", ...extra });
};
const returnTag = (t, tag, num) => {
  t.submit("[data-find]", { tag });
  t.act("close-slip", num);
};

// Story checkpoints, in order. Each test boots fresh and plays up to the point it needs.
const stages = {
  // Fri 3:45 — the three approved units are issued to Kabir (L-402..L-404).
  pickup(t) {
    t.act("tab", "Loan register");
    for (const a of ["PR-04", "SP-02", "AD-12"]) issue(t, a);
  },
  // Fri 7:30 — on the register, nothing returned yet.
  evening(t) {
    t.act("advance");
    t.act("tab", "Loan register");
  },
  // Projector and speaker checked in; adapter still out.
  partial(t) {
    t.act("checkin", "");
    returnTag(t, "PR-04", "402");
    returnTag(t, "SP-02", "403");
  },
  // Custody of AD-12 recorded before handing over.
  custody(t) {
    t.act("custody", "404");
    t.submit("[data-custody]", { holder: "Leela Das", due: "Sat 9 am", said: "She’ll drop it at 9." });
  },
  // Sat 9:00 — morning shift on the register.
  morning(t) {
    t.act("advance");
    t.act("tab", "Loan register");
  },
  // Leela's adapter checked in; kit fully back.
  allBack(t) {
    t.act("checkin", "404");
    returnTag(t, "AD-12", "404");
  },
};
const order = Object.keys(stages);
function playTo(stage) {
  const t = boot();
  for (const name of order.slice(0, order.indexOf(stage) + 1)) stages[name](t);
  return t;
}

describe("Friday 3:45 pm — pickup", () => {
  it("New issue slip focuses the first field", () => {
    const t = boot();
    t.act("tab", "Loan register");
    t.act("new");
    assert.equal(t.focused().name, "req");
  });

  it("refuses a camera that isn't on RQ-214", () => {
    const t = boot();
    t.act("tab", "Loan register");
    issue(t, "CA-03");
    assert.match(t.status(), /outside the approved/);
  });

  it("issues the three approved units: 4 slips out", () => {
    const t = playTo("pickup");
    assert.match(t.page(), /4 out/);
  });

  it("requests list shows kit progress", () => {
    const t = playTo("pickup");
    t.act("tab", "Requests");
    assert.match(t.page(), /3 of 3 out/);
  });

  it("rejects an issue slip with no return-by time", () => {
    const t = boot();
    t.act("tab", "Loan register");
    issue(t, "PR-04", { due: "" });
    assert.match(t.status(), /Fill in every field/);
    assert.doesNotMatch(t.page(), /L-402/);
  });
});

describe("Friday 7:30 pm — partial return", () => {
  it("flags slips due within the hour", () => {
    assert.match(playTo("evening").page(), /Due within 1 h/);
  });

  it("row buttons have unique accessible names", () => {
    const t = playTo("evening");
    assert.equal(
      t.$('[data-action="checkin"][data-val="404"]').getAttribute("aria-label"),
      "Take return of AD-12 (L-404)",
    );
  });

  it("Take a return focuses the tag input", () => {
    const t = playTo("evening");
    t.act("checkin", "");
    assert.equal(t.focused(), t.$("[data-find] input"));
  });

  it("tag lookup tolerates case and spaces, then focuses Close", () => {
    const t = playTo("evening");
    t.act("checkin", "");
    t.submit("[data-find]", { tag: "  pr-04 " });
    assert.match(t.page(), /L-402/);
    assert.equal(t.focused().dataset.action, "close-slip");
  });

  it("after closing one slip, the rest of the kit is shown as still out", () => {
    const t = playTo("evening");
    t.act("checkin", "");
    returnTag(t, "PR-04", "402");
    assert.match(t.page(), /still out/);
  });

  it("inline undo reopens the slip", () => {
    const t = playTo("evening");
    t.act("checkin", "");
    returnTag(t, "PR-04", "402");
    t.act("undo", "");
    assert.match(t.status(), /is open again/);
  });

  it("with projector and speaker back, AD-12 is the one still out", () => {
    const page = playTo("partial").page();
    assert.match(page, /1 unit from this kit is still out/);
    assert.match(page, /AD-12/);
  });

  it("Record who has AD-12 focuses the holder field", () => {
    const t = playTo("partial");
    t.act("custody", "404");
    assert.equal(t.focused().name, "holder");
  });

  it("saving custody shows the new holder and the original collector", () => {
    const t = playTo("custody");
    assert.match(t.page(), /With Leela Das \(collected by Kabir Sen\) · Due Sat 9 am/);
    assert.equal(t.focused(), t.$('[data-action="checkin"][data-val="404"]'));
  });

  it("posts the handover to the Desk book", () => {
    const t = playTo("custody");
    t.act("tab", "Desk book");
    assert.match(t.page(), /Slip L-404/);
    assert.match(t.page(), /now with Leela Das/);
  });
});

describe("Saturday 9:00 am — morning shift", () => {
  it("flags the adapter as due now", () => {
    const page = playTo("morning").page();
    assert.match(page, /Due now/);
    assert.match(page, /1 overdue or due now/);
  });

  it("catches the wrong adapter and names the slip, not the right tag", () => {
    const t = playTo("morning");
    t.act("checkin", "");
    t.submit("[data-find]", { tag: "AD-15" });
    const msg = t.$("#find-msg").textContent;
    assert.match(msg, /AD-15 isn’t on loan/);
    assert.match(msg, /L-404 with Leela Das/);
    assert.doesNotMatch(msg, /AD-12/);
    assert.equal(t.$("[data-find] input").getAttribute("aria-invalid"), "true");
  });

  it("handles a blank tag", () => {
    const t = playTo("morning");
    t.act("checkin", "");
    t.submit("[data-find]", { tag: "   " });
    assert.match(t.page(), /Enter the tag/);
  });

  it("an unknown tag keeps focus on the input", () => {
    const t = playTo("morning");
    t.act("checkin", "");
    t.submit("[data-find]", { tag: "zz-1" });
    assert.equal(t.focused(), t.$("[data-find] input"));
  });

  it("row Return… pre-scopes the panel and explains a mismatch", () => {
    const t = playTo("morning");
    t.act("checkin", "404");
    assert.match(t.page(), /Expecting AD-12 for slip L-404/);
    t.submit("[data-find]", { tag: "AD-15" });
    assert.match(t.page(), /You read AD-15, but slip L-404 is for AD-12/);
  });

  it("the found slip shows its custody history", () => {
    const t = playTo("morning");
    t.act("checkin", "404");
    t.submit("[data-find]", { tag: "AD-12" });
    assert.match(t.page(), /Kabir Sen → Leela Das/);
  });

  it("closing AD-12 brings the kit fully back", () => {
    assert.match(playTo("allBack").page(), /fully back/);
  });

  it("RQ-214 shows All back, with a per-item outcome", () => {
    const t = playTo("allBack");
    t.act("tab", "Requests");
    assert.match(t.page(), /All back/);
    t.act("request", "RQ-214");
    assert.match(t.page(), /AD-12 back at the desk Sat 9:00 am/);
  });

  it("inventory shows the holder of the unit still on loan", () => {
    const t = playTo("allBack");
    t.act("tab", "Inventory");
    assert.match(t.page(), /MI-09.*With Tara Shah/);
  });

  it("the full shift runs with no runtime errors", () => {
    assert.deepEqual(playTo("allBack").errors, []);
  });
});

describe("Handing over the shift", () => {
  const banner = (t) => t.$("[data-handover]");
  const clock = (t) => t.$("[data-clock]").textContent;

  it("asks before handover when part of a kit is unrecorded, and stays on Friday", () => {
    const t = playTo("partial");
    t.act("advance");
    assert.match(clock(t), /Friday · 7:30 pm/);
    assert.match(banner(t).textContent, /Before you hand over/);
    assert.match(banner(t).textContent, /L-404 · AD-12 still lists Kabir Sen, due Fri 8 pm/);
    assert.equal(t.$('[data-action="advance"]').hidden, true);
    assert.equal(t.focused().textContent, "Record who has AD-12");
  });

  it("recording who has it clears the check, then advance goes straight through", () => {
    const t = playTo("partial");
    t.act("advance");
    t.$('[data-handover] [data-action="custody"]').click();
    assert.ok(t.$("[data-custody]"), "custody form opens");
    t.submit("[data-custody]", { holder: "Leela Das", due: "Sat 9 am", said: "" });
    assert.equal(banner(t)?.textContent.trim() || "", "");
    t.act("advance");
    assert.match(clock(t), /Saturday/);
  });

  it("Hand over anyway advances without recording", () => {
    const t = playTo("partial");
    t.act("advance");
    t.act("handover");
    assert.match(clock(t), /Saturday/);
    assert.equal(banner(t)?.textContent.trim() || "", "");
    assert.match(t.$("[data-shift-title]").textContent, /Morning shift/);
  });

  it("does not ask at pickup or when nothing came back in part", () => {
    const t = playTo("pickup");
    t.act("advance");
    assert.match(clock(t), /Friday · 7:30 pm/);
    t.act("advance");
    assert.match(clock(t), /Saturday/);
  });

  it("rejects a malformed saved handover flag", () => {
    const t = playTo("partial");
    const saved = JSON.parse(t.saved());
    assert.match(clock(boot({ ...saved, handover: "yes" })), /Friday · 3:45 pm/);
    assert.match(clock(boot({ ...saved, handover: undefined })), /Friday · 7:30 pm/);
  });

  it("changing an unrelated slip's holder keeps the check up", () => {
    const t = playTo("partial");
    t.act("advance");
    t.$('[data-action="custody"][data-val="401"]').click();
    t.act("cancel", "401");
    assert.match(banner(t).textContent, /AD-12 still lists Kabir Sen/);
  });

  it("does not re-raise the check after a reload", () => {
    const t = playTo("partial");
    t.act("advance");
    const t2 = boot(t.saved());
    assert.equal(banner(t2)?.textContent.trim() || "", "");
    assert.equal(t2.$('[data-action="advance"]').hidden, false);
  });
});

describe("Start of shift", () => {
  const strip = (t) => t.$("section.brief");
  const text = (el) => (el ? el.textContent.replace(/\s+/g, " ") : "");
  const part = (t, key) => text(t.$(`[data-brief-${key}]`));

  it("is hidden at pickup and at return time", () => {
    assert.equal(strip(playTo("pickup")), null);
    assert.equal(strip(playTo("custody")), null);
  });

  it("lists L-404 as needing attention, with a pre-scoped Return…", () => {
    const t = playTo("morning");
    assert.equal(t.$('#brief-title').textContent, "Start of shift");
    assert.equal(strip(t).getAttribute("aria-labelledby"), "brief-title");
    assert.match(
      part(t, "now"),
      /L-404 · AD-12 · USB-C → HDMI adapter — With Leela Das \(collected by Kabir Sen\) · Due Sat 9 am Due now/,
    );
    const b = t.$('[data-brief-now] [data-action="checkin"]');
    assert.equal(b.dataset.val, "404");
    b.click();
    assert.match(t.page(), /Expecting AD-12 for slip L-404/);
  });

  it("shows the custody change and what came back last shift", () => {
    const since = part(playTo("morning"), "since");
    assert.match(since, /L-404 · AD-12: Kabir Sen → Leela Das · due Fri 8 pm → Sat 9 am/);
    assert.match(since, /RQ-214 Film Society: PR-04, SP-02 back Fri 7:30 pm/);
  });

  it("lists MI-09 as due within the hour, not as needing attention", () => {
    const t = playTo("morning");
    assert.match(part(t, "soon"), /L-401 · MI-09: With Tara Shah · Due Sat 10 am/);
    assert.doesNotMatch(part(t, "now"), /MI-09/);
  });

  it("drops L-404 from needs-attention once AD-12 is checked in", () => {
    const t = playTo("allBack");
    assert.ok(strip(t));
    assert.doesNotMatch(part(t, "now"), /L-404/);
    assert.doesNotMatch(text(strip(t)), /Leela Das/);
    assert.match(part(t, "soon"), /MI-09/);
  });

  it("shows one calm line when nothing is due and nothing changed", () => {
    const t = playTo("pickup");
    t.act("checkin", "");
    for (const [tag, num] of [["PR-04", "402"], ["SP-02", "403"], ["AD-12", "404"], ["MI-09", "401"]])
      returnTag(t, tag, num);
    t.act("advance");
    t.act("advance");
    t.act("tab", "Loan register");
    assert.equal(t.$(".brief .calm").textContent, "Nothing overdue and no changes since the last shift.");
    assert.equal(t.$("[data-brief-now], [data-brief-soon], [data-brief-since]"), null);
  });

  it("Got it collapses to a summary that survives a tab change; Show expands", () => {
    const t = playTo("morning");
    t.act("briefed");
    assert.equal(t.focused(), t.$('[data-action="unbrief"]'));
    assert.equal(t.$("[data-brief-now]"), null);
    assert.match(text(strip(t)), /Start of shift ?1 due now · 1 due within 1 h · 1 change since last shift/);
    t.act("tab", "Desk book");
    t.act("tab", "Loan register");
    assert.ok(t.$('[data-action="unbrief"]'));
    assert.ok(boot(t.saved()).$("section.brief.collapsed"), "collapse persists across reload");
    t.act("unbrief");
    assert.ok(t.$("[data-brief-now]"));
    assert.equal(t.focused(), t.$('[data-action="briefed"]'));
  });

  it("Restart clears the acknowledgement", () => {
    const t = playTo("morning");
    t.act("briefed");
    t.act("restart");
    assert.equal(JSON.parse(t.saved()).briefed, null);
  });

  it("rejects a malformed saved briefed value", () => {
    const saved = JSON.parse(playTo("morning").saved());
    const clock = (t) => t.$("[data-clock]").textContent;
    for (const bad of ["2", 7, -1, 1.5, true])
      assert.match(clock(boot({ ...saved, briefed: bad })), /Friday · 3:45 pm/, String(bad));
    assert.match(clock(boot({ ...saved, briefed: 2 })), /Saturday/);
    assert.match(clock(boot({ ...saved, briefed: 0 })), /Saturday/);
  });
});

describe("Saved state", () => {
  it("restores the shift and tab after a reload", () => {
    const t = playTo("allBack");
    t.act("tab", "Inventory");
    const t2 = boot(t.saved());
    assert.match(t2.$("[data-clock]").textContent, /Saturday/);
    assert.match(t2.$('[data-nav] [aria-pressed="true"]').textContent, /Inventory/);
  });

  it("Restart resets to pickup", () => {
    const t = playTo("allBack");
    t.act("restart");
    assert.match(t.$("[data-shift-title]").textContent, /Pickup/);
  });

  it("ignores garbage in storage", () => {
    assert.match(boot("{not json").$("[data-clock]").textContent, /Friday/);
  });
});

describe("Regressions from review", () => {
  it("a new issue clears undo, so a returned slip can't be double-opened", () => {
    const t = boot();
    t.act("tab", "Loan register");
    t.act("checkin", "");
    returnTag(t, "MI-09", "401");
    t.act("cancel", "");
    t.act("new");
    t.submit("[data-issue]", { req: "RQ-209", asset: "MI-09", who: "Tara Shah", due: "Sat 10 am" });
    assert.equal(t.$('[data-action="undo"]').hidden, true);
  });

  describe("rejects corrupt saved state", () => {
    const base = () => {
      const t = playTo("allBack");
      t.act("tab", "Inventory");
      return JSON.parse(t.saved());
    };
    const cases = [
      ["findMsg object", () => ({ mode: "return", tab: "Loan register", findMsg: { a: 1 } })],
      ["phase 'constructor'", () => ({ phase: "constructor" })],
      [
        "duplicate open asset",
        (b) => ({
          loans: [
            ...b.loans.map((l) => ({ ...l, back: false, backPhase: undefined })),
            { ...b.loans[0], num: 999, back: false },
          ],
        }),
      ],
    ];
    for (const [name, patch] of cases)
      it(name, () => {
        const b = base();
        const t = boot({ ...b, ...patch(b) });
        assert.match(t.$("[data-clock]").textContent, /Friday · 3:45 pm/);
        assert.deepEqual(t.errors, []);
      });
  });
});
