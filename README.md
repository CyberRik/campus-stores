# Campus Stores

Campus Stores is a Product Engineer work sample set at a fictional campus media equipment desk. Work through a club’s screening, from equipment pickup to a partial return and the next morning’s handover. Open **Candidate brief** in the app for the assignment.

---

## For reviewers

[![Tests](https://github.com/CyberRik/campus-stores/actions/workflows/tests.yml/badge.svg)](https://github.com/CyberRik/campus-stores/actions/workflows/tests.yml) · **[Try it live](https://cyberrik.github.io/campus-stores/)**

![The shift with the change: partial return, handover check, recording who has the adapter, the wrong tag refused, the right slip closed](docs/walkthrough/shift.gif)

**My decision:** keep the issue side as it is. Change one thing on the return side: the record of who has a unit stays **on its slip**. That record carries from the partial return, through the handover, to the next shift, and the slip only closes against the tag on the unit in hand.

To try it, open the [live demo](https://cyberrik.github.io/campus-stores/) or `index.html`, and play the shift with the time button: pickup → *Move to return time* → *Move to next morning*. The change is in **Loan register**.

### A moment the product handles well: issuing at 3:45 pm

While issuing Kabir's kit, I tried to add the Photo Circle's camera (CA-03) to the Film Society's request RQ-214. The register refused: *“This equipment type is outside the approved request.”* I also tried a second speaker (SP-05) on the same request and got *“The approved quantity of this equipment type is already on loan.”* The projector that's in the workshop (PR-06) never appears as a choice.

The approved request decides what can go out, and every physical unit gets its own slip: L-402 PR-04, L-403 SP-02, L-404 AD-12. I didn't change any of this. My change depends on it, because one slip per tagged unit is what makes a tag lookup possible.

### A moment I would change: recording Leela at 7:30 pm

Kabir returned the projector and speaker and said Leela had the adapter and would bring it at 9 am. I went to record that on L-404 and couldn't. The slip only offers *Record return*. It kept saying *Kabir Sen · Due Fri 8 pm*. The only place for "Leela has it, back Sat 9 am" was a free-text Desk book note, on another screen.

The next morning shows why this matters. The new person on shift sees L-404 under Kabir's name, due last night, with no sign that it's late. Then Leela, whose name isn't on any slip, hands over "an adapter". Two identical adapters (AD-12 and AD-15) share bin C4, and *Record return* closes a slip in one click without asking which unit is on the counter.

### The change

1. **Who has it, on the slip.** After each check-in, the register lists anything from the same request that's still out, with a button such as *Record who has AD-12*. Every open row also has *Change holder*. You record the new holder, the new due time and, optionally, what you were told. The slip then reads *With Leela Das (collected by Kabir Sen) · Due Sat 9 am* and keeps a dated history line. The same line is posted to the Desk book.
2. **Close by tag.** *Take a return* asks for the tag on the unit in your hand and finds that unit's slip. A row's *Return…* button opens the same panel, already expecting that unit, and still asks for the tag. If you enter a tag that isn't on loan (AD-15), it's refused. The error names the open slip and who has it, not the tag. The register list still shows tags, though, so this only works if the label gets read. See Limits.
3. **A check before handover.** If part of a kit came back during the shift and nobody recorded who has the rest, *Move to next morning* stops once and shows *Before you hand over: RQ-214 came back in part. L-404 · AD-12 still lists Kabir Sen, due Fri 8 pm.* The two buttons are *Record who has AD-12* and *Hand over anyway*.
4. **Start of shift.** For the person taking over, the register opens with what needs attention now, what's due within the hour, and what changed since the last shift. All of it is built from the slips, so the morning shift doesn't have to read the Desk book first.

So the morning shift can see what's late, slips are also flagged against desk time (*Overdue*, *Due now*, *Due within 1 h*). Small extras: the last return can be undone, and the Requests list shows how much of each kit is out.

### Walkthrough: the same job with the change

**Fri 3:45 pm.** Pickup is unchanged: three slips to Kabir, due Fri 8 pm.

![Register after pickup](docs/walkthrough/1-pickup-register.png)

**Fri 7:30 pm.** I opened *Take a return*, read PR-04 and closed L-402, then read SP-02 and closed L-403. The panel then showed what was still out from RQ-214:

![Kit remainder](docs/walkthrough/3-kit-remainder.png)

If I had skipped that step and tried to end the shift, the register would have asked first:

![Before you hand over](docs/walkthrough/5-handover-check.png)

I clicked *Record who has AD-12*, chose Leela Das and Sat 9 am, and added what Kabir said. Saving it also posts the line to the [Desk book](docs/walkthrough/10-deskbook.png).

![Recording who has it](docs/walkthrough/4-custody-form.png)

**Sat 9:00 am.** I've just taken over. Start of shift tells me L-404 is with Leela and due now, that Tara's microphone is due within the hour, and that last night Kabir handed the adapter to Leela and the projector and speaker came back.

![Morning register](docs/walkthrough/6-morning-register.png)

Leela hands over an adapter. If the tag reads AD-15, the register refuses it:

![Wrong tag](docs/walkthrough/7-wrong-tag.png)

When the tag reads AD-12, the register shows L-404 with its history, and I close it:

![Right tag](docs/walkthrough/8-right-tag-history.png)

![Kit closed](docs/walkthrough/9-kit-closed.png)

### What I'd keep

- The approved-request and quantity checks.
- Units in repair can't be issued.
- One slip per physical unit.
- The Desk book as the place clubs and shifts write to each other.
- The single-file app that runs offline.

I left the issue form alone. Picking the same four fields three times for one kit is slow, but nothing gets lost there.

### What I considered and rejected

- **Block time from moving forward until the missing unit is recorded.** A desk can't stop a shift ending. Instead the register asks once, at handover, and lets you go on.
- **Reassign the slip to Leela.** This loses the fact that Kabir collected the unit. If something goes wrong later, the desk needs both names.
- **Close Kabir's slip and open a new one for Leela.** The unit never came back to the desk, so a new slip would record a pickup that never happened. It would also split one loan's history across two slips.
- **Choose the returned unit from a dropdown.** That's the same guess as clicking a row, just in a different control. Only the label on the unit says which adapter it is.

### Limits

The tag check helps only if the person on shift reads the label. Typing a tag is weaker than scanning one. A USB barcode scanner types into the same field, which would close that gap. Recording who has a unit is asked for at handover, not enforced. *Hand over anyway* is there because the counter, not the software, knows when the shift ends.

### One observation at a real counter

> When someone returns a unit for a borrower who isn't named on the slip, does the person on shift look at the unit's label before typing or scanning the tag?

If they type from memory or copy it from the screen instead, the change hasn't helped.

### If this were a ward equipment pool

A 2021 study of about 18,000 shared infusion pumps across 27 hospitals in British Columbia found two problems:
- About 4% of the fleet was consistently misplaced across sites.
- About 5% hadn't been seen on the network for over three months.

The main cause was pumps moving with patients and not being sent back ([Cesconetto & Rose, CMBES 2021](https://proceedings.cmbes.ca/index.php/proceedings/article/download/968/877/2028)). That's the adapter problem: the unit moved and the record didn't.

So the core of this change would carry over to a ward pool:
- who has a unit, recorded on the slip
- closing by tag
- the handover check
- the start-of-shift view

These things would need to be different:

- Scanning the tag would be the only way to close or transfer a record. A campus desk can live with typed tags; a ward can't.
- The receiving ward or person would confirm a handover, not just the sender recording it.
- A returned unit would go to "awaiting cleaning" and only become available once it's marked clean and ready for the next patient.
- A unit past its maintenance or calibration date would be blocked from issue, the same way a unit in repair is excluded now.
- Location would be ward and bed, with the person second.

Before building any of this, I'd spend time in the biomedical engineering store and on a ward at shift change to see how equipment actually moves today.

### Tests

`tests/` plays the whole shift in a headless browser and checks it. It also runs axe-core accessibility checks on each screen and checks text contrast in both themes. CI runs it on every push. Run `cd tests && npm install && npm test`. The app itself still needs no install.

---

## Run the app

Open `index.html` in a modern browser. The app includes its scripts, styles, and icons and can run offline.

To serve it over local HTTP, run this from the repository folder and visit `http://localhost:8000`.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Each browser stores its own sample shift locally when browser storage is available. **Restart sample shift** restores the fictional starting records.

## Source

- `index.html` contains the desk layout, candidate brief, and bundled icons.
- `app.js` contains the sample records and interactions.
- `styles.css` defines the desktop and mobile layouts.
- `docs/walkthrough/` holds the screenshots used above.
- `tests/` holds the optional end-to-end test suite.

Icon license notices are in [third-party/lucide-LICENSE.txt](third-party/lucide-LICENSE.txt).


## Submit your work

1. [Fork Campus Stores](https://github.com/virinchi-healthcare/campus-stores/fork) into your GitHub account. Complete the candidate brief and push your changes to your public fork. In your README, point reviewers to your work and explain the decision you made.
2. In your fork, open **Commits**, select the final commit you want reviewed, and copy the page URL. It should look like `https://github.com/YOUR-USERNAME/campus-stores/commit/COMMIT-SHA`.
3. [Submit your work through the Google Form](https://docs.google.com/forms/d/e/1FAIpQLScvzoh1R4WS-SkiwAVBQbMvniieJYSoOEfLMyVo5CyjOvYUgQ/viewform). Your **roll number**, **email ID**, and **final commit link from your public fork** are required. Enter your roll number and email ID in the form only.
