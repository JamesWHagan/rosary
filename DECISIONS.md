# Decisions

A record of choices made for Decade4U, so contributors know what was decided and why.

## 2026-10-13

- **Name:** Decade4U, because each person prays one decade for another person (renamed from Rosary2U)
- **First language:** English. Italian and Sinhala are planned later.
- **Rosary structure:**
  - Opening: Sign of the Cross, Apostles' Creed, Our Father, three Hail Marys, Glory Be
  - Each decade: announce the mystery and the intention, Our Father, ten Hail Marys, Glory Be, **Fatima prayer**
  - Closing: **Hail Holy Queen**, then the **closing prayer** ("O God, whose only begotten Son…"), Sign of the Cross
  - Mysteries follow the traditional weekday: Joyful on Monday and Saturday, Sorrowful on Tuesday and Friday, Glorious on Wednesday and Sunday, Luminous on Thursday
- **Licence:** GNU AGPL-3.0, so every version of the project stays open
- **Hosting:** Netlify, deploying automatically from the `main` branch
- **Look:** calm and warm. White beads with a soft yellow glow on the active bead, a serif heading font (Cormorant Garamond), and a light or dark theme that follows the phone's own setting
- **Bead direction:** beads are counted clockwise, going up the right-hand side from the medal
- **Two ways to pray:** "Bead by bead" (every prayer on screen, 80 steps; tap the card or Next) and "With my own rosary" (one screen per decade, 7 steps) for people praying on a physical rosary
- **Choosing decades:** people pray 1–5 decades, and each decade is assigned one other person's intention. Fewer than 5 decades uses the short version (just the Sign of the Cross before and after); 5 decades uses the full opening and closing prayers. Partial rosaries start from the first mystery of the day.
- **Finish screen:** shows each intention prayed for, with that person's thank-you message (or a warm default)

## 2026-10-14

- **Hide prayers:** a switch on the prayer screen hides the prayer texts. The rosary then fills the screen, the current prayer and count show inside the loop, and the intention stays visible in a strip below. The choice is remembered.
- **Touching the rosary:** in bead-by-bead mode, tapping the rosary or the prayer moves to the next bead, with a soft ripple and a light vibration on phones that support it (stronger at the end of a decade). Swipe left for next and right for back, anywhere on the prayer screen, in both modes. While the prayers are hidden, the Back and Next buttons are hidden too, and a one-line hint explains the gestures until the person has moved on a few times.
- **Partial rosaries:** beads of decades not being prayed are faded.
- **Decade panel:** on every bead of a decade, a panel under the rosary shows the mystery being meditated on and the intention being prayed for, with the prayers hidden or shown. (With prayers shown, the panel is skipped on the mystery screen itself, which already shows both.)
- **"People you have prayed for" counter:** a golden ring with a circling arc, on the home page and the finish screen. It counts finished decades on the person's own phone (each decade is one person). A decade counts only when its last prayer is passed, never twice. The ring is hidden until the first decade, so no one sees a zero.
- **Planned (Phase 4):** a "My intentions" page with the number of people who prayed for each intention, plus a second golden ring for the total prayed for you. Waiting intentions say "Waiting to be prayed for" instead of 0. About 3 active intentions per person.
- **Planned (Phase 6):** "Someone is praying for you", shown on the site and as an optional notification that people can turn off. Batched (for example at most one per few hours) so it stays special, and it never names who prayed.
- **Wording:** the site says an intention has been **prayed for**, never **answered**. How a prayer is answered is up to God, so we only promise what we can: that people prayed.
- **Keeping every intention prayed for (planned):** least-prayed intentions go first; after submitting, people are invited (never required) to pray one decade for someone else; the admin page shows the balance (intentions waiting, decades prayed today, oldest waiting) so a backlog is visible early; if one builds, the home page says how many intentions are waiting.
