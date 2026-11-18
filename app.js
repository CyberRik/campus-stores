(() => {
  const storageKey = "campus-stores.shift.v2";
  const root = document.getElementById("campus-stores");
  const q = (selector) => root.querySelector(selector);
  const requests = [
    {
      id: "RQ-214",
      club: "Film Society",
      event: "Courtyard screening",
      owner: "Isha Rao",
      due: "Fri 8 pm",
      items: ["HDMI projector", "Portable speaker", "USB-C → HDMI adapter"],
      note: "Playback is from a USB-C-only laptop. The host will collect at 4 pm.",
    },
    {
      id: "RQ-209",
      club: "Debate Union",
      event: "Finals rehearsal",
      owner: "Tara Shah",
      due: "Sat 10 am",
      items: ["Wireless microphone"],
      note: "Rehearsal runs into the evening.",
    },
    {
      id: "RQ-217",
      club: "Photo Circle",
      event: "Street portrait walk",
      owner: "Dev Menon",
      due: "Sat noon",
      items: ["Digital camera"],
      note: "Collection on Saturday morning.",
    },
  ];
  const assets = [
    { id: "PR-04", type: "HDMI projector", model: "BenQ MH550", bin: "A2" },
    {
      id: "PR-06",
      type: "HDMI projector",
      model: "Epson EB-X49",
      bin: "Workshop",
      repair: true,
    },
    { id: "SP-02", type: "Portable speaker", model: "JBL Eon One", bin: "B1" },
    { id: "SP-05", type: "Portable speaker", model: "Bose S1", bin: "B2" },
    {
      id: "AD-12",
      type: "USB-C → HDMI adapter",
      model: "Belkin AVC002",
      bin: "C4",
    },
    {
      id: "AD-15",
      type: "USB-C → HDMI adapter",
      model: "Anker A8312",
      bin: "C4",
    },
    { id: "MI-09", type: "Wireless microphone", model: "Shure BLX", bin: "B3" },
    { id: "CA-03", type: "Digital camera", model: "Sony A6400", bin: "D2" },
  ];
  const people = [
    "Isha Rao",
    "Kabir Sen",
    "Leela Das",
    "Tara Shah",
    "Dev Menon",
  ];
  const shifts = [
    {
      time: "Friday · 3:45 pm",
      short: "Fri 3:45 pm",
      title: "Pickup at the counter",
      text: "Kabir is here for the Film Society screening. The film starts at four. Can he leave with everything he needs?",
      next: "Move to return time",
    },
    {
      time: "Friday · 7:30 pm",
      short: "Fri 7:30 pm",
      title: "The kit comes back in pieces",
      text: "Kabir has brought back the projector and speaker. “Leela still has the adapter. She’ll drop it off tomorrow at nine.” Take the return and hand over to the morning shift.",
      next: "Move to next morning",
    },
    {
      time: "Saturday · 9:00 am",
      short: "Sat 9:00 am",
      title: "Morning shift",
      text: "You’ve just taken over. Leela walks in with an adapter. Work out what was outstanding from the screening and close the loan for the right item.",
    },
  ];
  // Desk time and return-by times as minutes from Friday 00:00, so the
  // register can tell the counter what is late instead of leaving it to memory.
  const deskMinutes = [945, 1170, 1980];
  const dueMinutes = {
    "Fri 8 pm": 1200,
    "Sat 9 am": 1980,
    "Sat 10 am": 2040,
    "Sat noon": 2160,
  };
  const dueOptions = Object.keys(dueMinutes);
  const modes = ["", "issue", "return", "custody"];
  const pages = [
    ["Requests", "clipboard-list"],
    ["Inventory", "package"],
    ["Loan register", "book-open"],
    ["Desk book", "messages-square"],
  ];
  const filters = ["All items", "On shelf", "On loan", "In repair"];
  const original = () => ({
    version: 2,
    tab: "Requests",
    phase: 0,
    selected: "",
    filter: "All items",
    loans: [
      {
        num: 401,
        req: "RQ-209",
        asset: "MI-09",
        who: "Tara Shah",
        holder: "Tara Shah",
        due: "Sat 10 am",
        back: false,
        log: [],
      },
    ],
    notes: [],
    mode: "",
    custody: 0,
    expect: 0,
    tag: "",
    found: 0,
    findMsg: "",
    after: "",
    lastReturn: 0,
    onlyOpen: true,
    handover: false,
    notice: "Sample shift · All records are fictional.",
  });
  let s = original();
  // Where keyboard focus should land after the next repaint.
  let focusSel = "";
  const getAsset = (id) => assets.find((x) => x.id === id);
  const getReq = (id) => requests.find((x) => x.id === id);
  const getLoan = (num) => s.loans.find((l) => l.num === Number(num));
  const out = (id) => s.loans.find((l) => l.asset === id && !l.back);
  const openFor = (req) => s.loans.filter((l) => l.req === req && !l.back);
  const holder = (l) => l.holder || l.who;
  const isPhase = (p) => Number.isInteger(p) && p >= 0 && p < shifts.length;
  const esc = (x) =>
    String(x).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const opts = (list, selected = "") =>
    list
      .map(
        ([v, t]) =>
          '<option value="' +
          esc(v) +
          '"' +
          (v === selected ? " selected" : "") +
          ">" +
          esc(t) +
          "</option>",
      )
      .join("");
  const btn = (label, act, val = "", style = "", aria = "") =>
    '<button type="button" data-action="' +
    act +
    '" data-val="' +
    esc(val) +
    '" class="' +
    style +
    '"' +
    (aria ? ' aria-label="' + esc(aria) + '"' : "") +
    ">" +
    esc(label) +
    "</button>";
  const head = (title, sub, control = "") =>
    '<div class="sectionhead"><div><h2>' +
    title +
    "</h2><small>" +
    sub +
    "</small></div>" +
    control +
    "</div>";
  const row = (label, sub, right, flagHtml = "") =>
    '<div class="row"><div><strong>' +
    esc(label) +
    "</strong>" +
    flagHtml +
    "<small>" +
    esc(sub) +
    '</small></div><div class="actions">' +
    right +
    "</div></div>";
  const badge = (t, kind = "") =>
    '<span class="tag' +
    (kind === true ? " good" : kind ? " " + kind : "") +
    '">' +
    esc(t) +
    "</span>";
  const select = (label, key, options, selected = "") =>
    "<label><span>" +
    label +
    '</span><select name="' +
    key +
    '" required><option value="">Select…</option>' +
    opts(options, selected) +
    "</select></label>";

  // How late a slip is against desk time: overdue, due now, or due soon.
  function timing(l) {
    const left = dueMinutes[l.due] - deskMinutes[s.phase];
    if (left < 0) return ["Overdue", "late"];
    if (left === 0) return ["Due now", "late"];
    if (left <= 60) return ["Due within 1 h", "soon"];
    return null;
  }
  const flag = (l) => {
    const t = timing(l);
    return t ? badge(t[0], t[1]) : "";
  };
  // "With Leela Das (collected by Kabir Sen)" keeps both names on the record.
  const custodyText = (l) =>
    "With " +
    holder(l) +
    (holder(l) === l.who ? "" : " (collected by " + l.who + ")") +
    " · Due " +
    l.due;
  const slipLine = (l) => {
    const r = getReq(l.req);
    return r.id + " · " + r.club + " · " + custodyText(l);
  };
  // A slip goes stale when part of its kit came back this shift but nobody
  // recorded who still has it. Checked once, softly, before the handover.
  const stale = () =>
    s.loans.filter(
      (l) =>
        !l.back &&
        !l.log.some((e) => e.phase === s.phase) &&
        s.loans.some(
          (o) => o.req === l.req && o.back && o.backPhase === s.phase,
        ),
    );
  function handoverCheck(list) {
    const reqs = [...new Set(list.map((l) => l.req))];
    return (
      '<div role="alert"><b>Before you hand over</b><p>' +
      reqs
        .map(
          (r) =>
            esc(r) +
            " came back in part. " +
            list
              .filter((l) => l.req === r)
              .map((l) =>
                esc(
                  "L-" + l.num + " · " + l.asset + " still lists " +
                    holder(l) + ", due " + l.due + ".",
                ),
              )
              .join(" "),
        )
        .join(" ") +
      '</p></div><div class="buttons">' +
      list
        .map((l) => btn("Record who has " + l.asset, "custody", String(l.num)))
        .join("") +
      btn("Hand over anyway", "handover") +
      "</div>"
    );
  }
  const returnBtnSel = (num) =>
    '[data-action="checkin"][data-val="' + num + '"]';

  function requestPage() {
    let html = head(
      "Approved requests",
      "Student Activities Office · 3 approved forms",
    );
    if (s.selected) {
      const r = getReq(s.selected);
      const slips = s.loans.filter((l) => l.req === r.id);
      html +=
        btn("Back to list", "close", r.id) +
        '<div class="record"><small>' +
        r.id +
        " · Approved</small><h3>" +
        r.event +
        "</h3><p>" +
        r.club +
        " · Filed by " +
        r.owner +
        "</p><p><b>Return by</b> " +
        r.due +
        "</p><p><b>Approved equipment</b></p><ul>" +
        r.items
          .map((type) => {
            const l = slips
              .filter((x) => getAsset(x.asset).type === type)
              .sort((a, b) => a.back - b.back || b.num - a.num)[0];
            const where = !l
              ? "not issued"
              : l.back
                ? l.asset + " back at the desk " + shifts[l.backPhase].short
                : l.asset + " out · " + custodyText(l);
            return "<li>" + esc(type) + " — <i>" + esc(where) + "</i></li>";
          })
          .join("") +
        "</ul><p>" +
        r.note +
        "</p></div>";
    } else
      html += requests
        .map((r) => {
          const outNow = openFor(r.id).length;
          const issuedTypes = new Set(
            s.loans
              .filter((l) => l.req === r.id)
              .map((l) => getAsset(l.asset).type),
          ).size;
          const state = !issuedTypes
            ? badge("Not issued")
            : outNow
              ? badge(outNow + " of " + r.items.length + " out")
              : issuedTypes < r.items.length
                ? badge(
                    "Back · " +
                      (r.items.length - issuedTypes) +
                      " never issued",
                  )
                : badge("All back", true);
          return row(
            r.event,
            r.id + " · " + r.club,
            state + btn("View form", "request", r.id),
          );
        })
        .join("");
    return html;
  }
  function inventory() {
    let html = head(
      "Inventory",
      "Physical units · home shelf and current availability",
    );
    html +=
      '<div class="buttons"><label>Show <select data-filter>' +
      opts(filters.map((f) => [f, f])) +
      "</select></label></div>";
    for (const a of assets) {
      const l = out(a.id);
      const status = a.repair ? "In repair" : l ? "On loan" : "On shelf";
      if (s.filter !== "All items" && s.filter !== status) continue;
      html += row(
        a.id + " · " + a.type,
        a.model + " · " + a.bin + (l ? " · " + custodyText(l) : ""),
        badge(status, status === "On shelf"),
        l ? flag(l) : "",
      );
    }
    return html;
  }

  // Take a return: the counter reads the tag on the unit in hand, and the
  // register finds the slip. A slip is never closed by picking a row.
  function returnPanel() {
    const expected = s.expect && getLoan(s.expect);
    let html =
      '<div class="panel"><div><h3>Take a return</h3><small>Scan or type the tag printed on the unit in your hand.</small></div>';
    if (expected && !expected.back && !s.found)
      html +=
        '<p class="expect">Expecting <b>' +
        esc(expected.asset) +
        "</b> for slip L-" +
        expected.num +
        " (" +
        esc(custodyText(expected)) +
        "). Read the tag to confirm.</p>";
    html +=
      '<form data-find class="inline"><label><span>Tag on the unit</span><input name="tag" autocomplete="off" spellcheck="false" placeholder="e.g. PR-04" value="' +
      esc(s.tag) +
      '"' +
      (s.findMsg ? ' aria-invalid="true" aria-describedby="find-msg"' : "") +
      ' required></label><button type="submit">Find slip</button></form>';
    if (s.findMsg) {
      const [lead, ...more] = s.findMsg.split("\n");
      html +=
        '<p class="warn" id="find-msg" role="alert">' +
        esc(lead) +
        more.map((m) => "<span>" + esc(m) + "</span>").join("") +
        "</p>";
    }
    const l = s.found && getLoan(s.found);
    const last = s.lastReturn && getLoan(s.lastReturn);
    const undo =
      last && last.back
        ? btn("Undo return of " + last.asset, "undo")
        : "";
    if (l && !l.back) {
      const a = getAsset(l.asset);
      html +=
        '<div class="record"><small>Slip L-' +
        l.num +
        " · " +
        esc(l.req) +
        " · " +
        esc(getReq(l.req).club) +
        "</small><h3>" +
        esc(a.id + " · " + a.type + " · " + a.model) +
        "</h3><p>" +
        esc(custodyText(l)) +
        " " +
        flag(l) +
        "</p>" +
        (l.log.length
          ? '<ul class="log">' +
            l.log
              .map(
                (e) =>
                  "<li><small>" +
                  esc(shifts[e.phase].short) +
                  "</small> " +
                  esc(e.text) +
                  "</li>",
              )
              .join("") +
            "</ul>"
          : "") +
        '<div class="buttons">' +
        btn(
          "Check in " + l.asset + " · close L-" + l.num,
          "close-slip",
          String(l.num),
          "primary",
        ) +
        btn("Wrong unit, read again", "clear-find") +
        "</div></div>";
    } else if (s.after) {
      const r = getReq(s.after);
      const rest = openFor(r.id);
      html += rest.length
        ? '<div class="record pending"><small>' +
          esc(r.id + " · " + r.club + " · " + r.event) +
          "</small><h3>" +
          (rest.length === 1
            ? "1 unit from this kit is still out"
            : rest.length + " units from this kit are still out") +
          "</h3><ul>" +
          rest
            .map(
              (x) =>
                "<li><b>" +
                esc(x.asset) +
                "</b> · " +
                esc(getAsset(x.asset).type) +
                " — " +
                esc(custodyText(x)) +
                "</li>",
            )
            .join("") +
          "</ul><p>If it’s on the counter, read its tag above. If not, record who has it and when it’s due before you move on.</p><div class=\"buttons\">" +
          rest
            .map((x) => btn("Record who has " + x.asset, "custody", x.num))
            .join("") +
          undo +
          "</div></div>"
        : '<div class="okmsg"><span>' +
          esc(r.id + " · " + r.club) +
          " is fully back. Nothing from this kit is outstanding.</span>" +
          undo +
          "</div>";
    }
    return html + "</div>";
  }
  function custodyPanel(l) {
    const a = getAsset(l.asset);
    return (
      '<form data-custody class="panel"><div><h3>Who has ' +
      esc(l.asset) +
      " now?</h3><small>" +
      esc(a.type + " · " + slipLine(l)) +
      ". Saving updates slip L-" +
      l.num +
      " and posts a line to the Desk book for the next shift.</small></div>" +
      '<input type="hidden" name="num" value="' +
      l.num +
      '"><div class="form">' +
      select(
        "Now held by",
        "holder",
        people.map((p) => [p, p]),
        holder(l),
      ) +
      select(
        "Expected back",
        "due",
        dueOptions.map((d) => [d, d]),
        l.due,
      ) +
      '<label class="full"><span>What you were told <i>(optional)</i></span><textarea name="said" rows="2" maxlength="300" placeholder="e.g. She’ll drop it at the counter at 9 am."></textarea></label></div>' +
      '<div class="buttons"><button type="submit" class="primary">Save to slip L-' +
      l.num +
      "</button>" +
      btn("Cancel", "cancel", String(l.num)) +
      "</div></form>"
    );
  }
  function register() {
    const open = s.loans.filter((l) => !l.back);
    const late = open.filter((l) => (timing(l) || [])[1] === "late").length;
    let html = head(
      "Loan register",
      "One slip per physical unit · " +
        open.length +
        " out" +
        (late ? " · " + late + " overdue or due now" : ""),
      s.mode
        ? btn("Back to register", "cancel")
        : '<div class="buttons">' +
            btn("Take a return", "checkin") +
            btn("New issue slip", "new", "", "primary") +
            "</div>",
    );
    if (s.mode === "issue") {
      const available = assets.filter((a) => !a.repair && !out(a.id));
      return (
        html +
        '<form data-issue><div class="form">' +
        select(
          "Approved request",
          "req",
          requests.map((r) => [r.id, r.id + " · " + r.club]),
        ) +
        select(
          "Unit leaving the desk",
          "asset",
          available.map((a) => [a.id, a.id + " · " + a.type]),
        ) +
        select(
          "Collected by",
          "who",
          people.map((p) => [p, p]),
        ) +
        select(
          "Return by",
          "due",
          dueOptions.map((d) => [d, d]),
        ) +
        '</div><button type="submit" class="primary">Save issue slip</button></form>'
      );
    }
    if (s.mode === "return") html += returnPanel();
    if (s.mode === "custody") {
      const l = getLoan(s.custody);
      if (l && !l.back) return html + custodyPanel(l);
    }
    html +=
      '<div class="buttons">' +
      ["Outstanding", "All slips"]
        .map(
          (v, i) =>
            '<button type="button" data-action="scope" data-val="' +
            i +
            '" aria-pressed="' +
            (s.onlyOpen === (i === 0)) +
            '">' +
            v +
            "</button>",
        )
        .join("") +
      "</div>";
    const shown = s.loans
      .filter((l) => !s.onlyOpen || !l.back)
      .slice()
      .reverse();
    if (!shown.length) html += "<p>No outstanding slips.</p>";
    for (const l of shown) {
      const name = l.asset + " (L-" + l.num + ")";
      html += row(
        "L-" + l.num + " · " + l.asset + " · " + getAsset(l.asset).type,
        slipLine(l),
        l.back
          ? badge("Returned " + shifts[l.backPhase].short)
          : btn(
              "Change holder",
              "custody",
              String(l.num),
              "",
              "Change holder of " + name,
            ) +
              btn(
                "Return…",
                "checkin",
                String(l.num),
                "",
                "Take return of " + name,
              ),
        l.back ? "" : flag(l),
      );
    }
    return html;
  }
  function deskbook() {
    let html = head(
      "Desk book",
      "Messages from clubs and notes for the next shift",
    );
    const entries = [
      [
        "Friday · 3:20 pm",
        "Isha Rao · Film Society",
        "Kabir Sen is picking up our whole screening kit. Please issue it in his name. I’m setting up in the courtyard.",
      ],
      [
        "Friday · 3:30 pm",
        "Tara Shah · Debate Union",
        "Our microphone stays with me overnight. I’ll return it by 10 am Saturday.",
      ],
    ];
    if (s.phase >= 1)
      entries.push([
        "Friday · 7:30 pm",
        "Kabir Sen · Film Society",
        "I brought the projector and speaker. Leela Das has our adapter. She’ll be at the counter at 9 am tomorrow.",
      ]);
    for (const n of s.notes)
      entries.push([
        shifts[n.phase].time,
        n.by || "Counter handover",
        n.text,
      ]);
    for (const [t, author, body] of entries.slice().reverse())
      html +=
        '<article class="record"><small>' +
        esc(t) +
        "</small><h3>" +
        esc(author) +
        "</h3><p>" +
        esc(body) +
        "</p></article>";
    return (
      html +
      '<form data-note><div class="form"><label class="full"><span>Note for the next shift</span><textarea name="note" rows="2" maxlength="400" required></textarea></label></div><button type="submit">Add handover note</button></form>'
    );
  }
  const screens = {
    Requests: requestPage,
    Inventory: inventory,
    "Loan register": register,
    "Desk book": deskbook,
  };
  function paint() {
    const phase = shifts[s.phase];
    q("[data-clock]").textContent = phase.time;
    q("[data-shift-title]").textContent = phase.title;
    q("[data-shift]").textContent = phase.text;
    const advance = q('[data-action="advance"]');
    const stuck = stale();
    if (!stuck.length) s.handover = false;
    advance.hidden = !phase.next || s.handover;
    advance.textContent = phase.next || "";
    let check = q("[data-handover]");
    if (!check) {
      check = document.createElement("div");
      check.className = "handover";
      check.dataset.handover = "";
      advance.before(check);
    }
    check.hidden = !s.handover;
    // Rewrite only on change so the alert isn't re-announced on every repaint.
    const checkHtml = s.handover ? handoverCheck(stuck) : "";
    if (check.dataset.html !== checkHtml) {
      check.innerHTML = checkHtml;
      check.dataset.html = checkHtml;
    }
    q("[data-nav]").innerHTML = pages
      .map(
        ([n, icon]) =>
          '<button type="button" data-action="tab" data-val="' +
          n +
          '" aria-pressed="' +
          (s.tab === n) +
          '"><svg aria-hidden="true" class="store-icon"><use href="#icon-' +
          icon +
          '"></use></svg>' +
          n +
          "</button>",
      )
      .join("");
    q("[data-page]").innerHTML = screens[s.tab]();
    if (q("[data-filter]")) q("[data-filter]").value = s.filter;
    // Only touch the live region when the message changes, so screen
    // readers don't re-announce it on every repaint.
    const status = q("[data-status]");
    if (status.textContent !== s.notice) status.textContent = s.notice;
    // The status-bar undo covers returns made outside the panel; when the
    // panel shows its own undo next to the result, don't show it twice.
    const undo = q('.statusbar [data-action="undo"]');
    const last = s.lastReturn && getLoan(s.lastReturn);
    undo.hidden =
      !(last && last.back) || !!q('[data-page] [data-action="undo"]');
    undo.textContent = last ? "Undo return of " + last.asset : "Undo";
    const target = focusSel && q(focusSel);
    if (target) target.focus();
    focusSel = "";
  }
  function commit(msg) {
    if (msg) s.notice = msg;
    paint();
    try {
      localStorage.setItem(storageKey, JSON.stringify(s));
    } catch {
      q("[data-status]").textContent +=
        " Browser storage is unavailable. Progress lasts for this visit.";
    }
  }
  const tagInput = "[data-find] input";
  const openReturn = (expect = 0) => {
    s.mode = "return";
    s.expect = expect;
    s.tag = "";
    s.found = 0;
    s.findMsg = "";
    s.after = "";
    focusSel = tagInput;
  };
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const v = b.dataset.val;
    const a = b.dataset.action;
    // By default, keep focus on the same control after the repaint.
    focusSel =
      '[data-action="' +
      a +
      '"]' +
      (v ? '[data-val="' + v + '"]' : "");
    switch (a) {
      case "restart":
        s = original();
        break;
      case "advance":
        if (!s.handover && stale().length) {
          s.handover = true;
          s.notice = "";
          focusSel = "[data-handover] button";
          break;
        }
      // falls through
      case "handover":
        s.handover = false;
        if (s.phase < 2) s.phase++;
        s.mode = "";
        s.lastReturn = 0;
        s.notice = "Shift time updated.";
        focusSel = '[data-nav] [aria-pressed="true"]';
        break;
      case "tab":
        s.tab = v;
        s.mode = "";
        s.notice = "";
        break;
      case "close":
        s.selected = "";
        focusSel = '[data-action="request"][data-val="' + v + '"]';
        break;
      case "request":
        s.selected = v;
        focusSel = '[data-action="close"]';
        break;
      case "new":
        s.mode = "issue";
        focusSel = '[name="req"]';
        break;
      case "cancel":
        s.mode = "";
        focusSel = v ? returnBtnSel(v) : '[data-action="checkin"]';
        break;
      case "scope":
        s.onlyOpen = v === "0";
        break;
      case "checkin": {
        const l = v && getLoan(v);
        openReturn(l && !l.back ? l.num : 0);
        break;
      }
      case "clear-find":
        s.found = 0;
        s.tag = "";
        s.findMsg = "";
        focusSel = tagInput;
        break;
      case "custody": {
        const l = getLoan(v);
        if (!l || l.back) return;
        s.tab = "Loan register";
        s.mode = "custody";
        s.custody = l.num;
        focusSel = '[name="holder"]';
        break;
      }
      case "close-slip": {
        const l = getLoan(v);
        if (!l || l.back) return;
        l.back = true;
        l.backPhase = s.phase;
        s.lastReturn = l.num;
        s.found = 0;
        s.expect = 0;
        s.tag = "";
        s.findMsg = "";
        s.after = l.req;
        focusSel = tagInput;
        s.notice =
          l.asset +
          " checked in from " +
          holder(l) +
          ". Slip L-" +
          l.num +
          " closed.";
        break;
      }
      case "undo": {
        const l = getLoan(s.lastReturn);
        if (!l || !l.back) return;
        s.lastReturn = 0;
        if (out(l.asset)) {
          s.notice =
            l.asset +
            " is already out on a newer slip, so this return can’t be undone.";
          break;
        }
        l.back = false;
        delete l.backPhase;
        s.after = "";
        s.notice =
          "Return undone. Slip L-" + l.num + " for " + l.asset + " is open again.";
        focusSel =
          s.mode === "return"
            ? tagInput
            : s.tab === "Loan register"
              ? returnBtnSel(l.num)
              : '[data-nav] [aria-pressed="true"]';
        break;
      }
    }
    commit();
  });
  root.addEventListener("change", (e) => {
    if (e.target.matches("[data-filter]")) {
      s.filter = e.target.value;
      focusSel = "[data-filter]";
      commit();
    }
  });
  root.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const form = new FormData(f);
    if (f.matches("[data-note]")) {
      const text = String(form.get("note")).trim();
      if (!text) return;
      s.notes.push({ phase: s.phase, text });
      commit("Handover note saved.");
      return;
    }
    if (f.matches("[data-find]")) {
      const tag = String(form.get("tag") || "")
        .toUpperCase()
        .replace(/\s+/g, "");
      const expected = s.expect && getLoan(s.expect);
      const expecting = expected && !expected.back;
      s.tag = tag;
      s.found = 0;
      s.findMsg = "";
      s.after = "";
      focusSel = tagInput;
      const a = getAsset(tag);
      const l = a && out(tag);
      if (!tag) s.findMsg = "Enter the tag printed on the unit.";
      else if (!a)
        s.findMsg =
          "No unit is tagged “" +
          tag +
          "”.\nCheck the label on the unit and read it again.";
      else if (l) {
        s.found = l.num;
        if (expecting && expected.num !== l.num)
          s.findMsg =
            "You read " +
            tag +
            ", not " +
            expected.asset +
            ".\nShowing slip L-" +
            l.num +
            " for " +
            tag +
            " instead. L-" +
            expected.num +
            " stays open.";
        s.expect = 0;
        focusSel = '[data-action="close-slip"]';
      } else {
        const same = s.loans.filter(
          (x) => !x.back && getAsset(x.asset).type === a.type,
        );
        // Don't print the other unit's tag here: the counter should read it
        // off the label, not copy it from the screen.
        s.findMsg = [
          expecting
            ? "You read " +
              tag +
              ", but slip L-" +
              expected.num +
              " is for " +
              expected.asset +
              "."
            : "",
          tag +
            " isn’t on loan. " +
            (a.repair
              ? "It’s booked into the repair workshop."
              : "Its home is shelf " + a.bin + "."),
          same.length && !expecting
            ? same.length +
              " " +
              a.type +
              (same.length === 1 ? " is" : "s are") +
              " out: " +
              same.map((x) => "L-" + x.num + " with " + holder(x)).join(", ") +
              "."
            : "",
          "Read the label again. Only close a slip whose tag matches the unit in your hand.",
        ]
          .filter(Boolean)
          .join("\n");
      }
      commit();
      return;
    }
    if (f.matches("[data-custody]")) {
      const l = getLoan(form.get("num"));
      const who = String(form.get("holder"));
      const due = String(form.get("due"));
      const said = String(form.get("said") || "").trim();
      if (!l || l.back || !people.includes(who) || !dueOptions.includes(due))
        return;
      s.mode = "";
      focusSel = returnBtnSel(l.num);
      const changes = [];
      if (who !== holder(l)) changes.push(holder(l) + " → " + who);
      if (due !== l.due) changes.push("due " + l.due + " → " + due);
      if (!changes.length && !said) {
        commit("Nothing changed on slip L-" + l.num + ".");
        return;
      }
      l.holder = who;
      l.due = due;
      l.log.push({
        phase: s.phase,
        text:
          (changes.join(" · ") || "Note") + (said ? " · “" + said + "”" : ""),
      });
      s.notes.push({
        phase: s.phase,
        by: "Loan register · Slip L-" + l.num,
        text:
          l.asset +
          " (" +
          getReq(l.req).club +
          ") still out: now with " +
          who +
          (who === l.who ? "" : ", collected by " + l.who) +
          ". Due back " +
          due +
          "." +
          (said ? " " + said : ""),
      });
      commit(
        "Slip L-" +
          l.num +
          " updated: with " +
          who +
          ", due " +
          due +
          ". Line posted to the Desk book.",
      );
      return;
    }
    if (!f.matches("[data-issue]")) return;
    const [req, asset, who, due] = ["req", "asset", "who", "due"].map((k) =>
      String(form.get(k) || ""),
    );
    const unit = getAsset(asset),
      r = getReq(req);
    const fail = (msg) => {
      q("[data-status]").textContent = msg;
    };
    if (!r || !unit || !people.includes(who) || !dueOptions.includes(due))
      return fail("Fill in every field before saving the slip.");
    if (unit.repair || out(asset))
      return fail(asset + " isn’t available to issue.");
    if (!r.items.includes(unit.type))
      return fail(
        "This equipment type is outside the approved request. Choose an approved unit.",
      );
    if (
      s.loans.some(
        (l) => l.req === req && !l.back && getAsset(l.asset).type === unit.type,
      )
    )
      return fail(
        "The approved quantity of this equipment type is already on loan.",
      );
    const num = Math.max(...s.loans.map((l) => l.num)) + 1;
    s.loans.push({
      num,
      req,
      asset,
      who,
      holder: who,
      due,
      back: false,
      log: [],
    });
    s.mode = "";
    s.lastReturn = 0;
    focusSel = '[data-action="new"]';
    commit("Issued " + asset + " to " + who + " on slip L-" + num + ".");
  });
  function valid(d) {
    const str = (x) => x === undefined || typeof x === "string";
    const int = (x) => x === undefined || Number.isInteger(x);
    if (
      !d ||
      d.version !== 2 ||
      !Object.hasOwn(screens, d.tab) ||
      !isPhase(d.phase) ||
      !modes.includes(d.mode) ||
      !filters.includes(d.filter) ||
      !str(d.selected) ||
      (d.selected && !getReq(d.selected)) ||
      !str(d.after) ||
      ![undefined, true, false].includes(d.handover) ||
      (d.after && !getReq(d.after)) ||
      ![d.tag, d.findMsg, d.notice].every(str) ||
      ![d.custody, d.expect, d.found, d.lastReturn].every(int) ||
      !Array.isArray(d.notes) ||
      !d.notes.every(
        (n) =>
          n && isPhase(n.phase) && typeof n.text === "string" && str(n.by),
      ) ||
      !Array.isArray(d.loans) ||
      !d.loans.length
    )
      return false;
    const nums = new Set();
    const openAssets = new Set();
    for (const l of d.loans) {
      if (
        !l ||
        !getReq(l.req) ||
        !getAsset(l.asset) ||
        !Number.isInteger(l.num) ||
        nums.has(l.num) ||
        !people.includes(l.who) ||
        !people.includes(l.holder) ||
        !Object.hasOwn(dueMinutes, l.due) ||
        typeof l.back !== "boolean" ||
        (l.back && !isPhase(l.backPhase)) ||
        (!l.back && openAssets.has(l.asset)) ||
        !Array.isArray(l.log) ||
        !l.log.every(
          (e) => e && isPhase(e.phase) && typeof e.text === "string",
        )
      )
        return false;
      nums.add(l.num);
      if (!l.back) openAssets.add(l.asset);
    }
    return true;
  }
  function restore(d) {
    if (!valid(d)) return;
    const prev = s;
    s = {
      ...original(),
      ...d,
      // The handover check is a prompt for this moment, not saved state:
      // don't re-announce it on reload.
      handover: false,
      loans: d.loans.map((l) => ({ ...l, log: l.log.map((e) => ({ ...e })) })),
      notes: d.notes.map((n) => ({ ...n })),
    };
    try {
      paint();
    } catch {
      s = prev;
      paint();
    }
  }
  paint();
  try {
    restore(JSON.parse(localStorage.getItem(storageKey)));
  } catch {
    // Keep the fresh shift when storage is unavailable or the saved data is invalid.
  }
})();
