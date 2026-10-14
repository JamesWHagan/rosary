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
- **Touching the rosary:** in bead-by-bead mode, tapping the rosary or the prayer moves to the next bead, with a soft ripple and a light vibration on phones that support it (stronger at the end of a decade). Swipe left for next and right for back, in both modes.
- **Partial rosaries:** beads of decades not being prayed are faded.
