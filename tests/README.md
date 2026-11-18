# Tests (optional)

`shift.test.js` plays the sample shift end to end in jsdom: Friday pickup (approved-items guard, focus), the Friday evening partial return (tag lookup, undo, recording who holds the rest), the Saturday morning shift (wrong-tag catch, pre-scoped returns, closing the right slip), saved state restore, and regressions found in review (corrupt storage, double-open slips, missing fields).

    cd tests && npm install && npm test

It uses Node's built-in test runner (Node 18+) and jsdom as its only dependency. The app itself still needs no install or build: open `index.html` in a browser.
