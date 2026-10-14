# Decade4U — Pray for One Another

A free website where people share prayer intentions and pray the rosary for each other: **one decade for one person's intention**.

> Status: early development. Live at [decade4u.pages.dev](https://decade4u.pages.dev), praying with sample intentions while the database is being built.

## How it works

1. **Share an intention.** Write what you'd like prayed for, with an optional thank-you message for whoever prays for it.
2. **Pray for others.** Choose a full rosary or any number of decades, and you're given that many intentions from other people.
3. **Pray.** The rosary is shown bead by bead. White beads, the current one glowing yellow, and a Next button for each prayer.
4. **Receive thanks.** When you finish, you see the thank-you messages left by the people you prayed for.

## Principles

- **Free, forever.** No ads, no fees, no paid features. Running costs are covered by the maintainer.
- **Respectful.** Intentions are moderated before anyone prays for them, and anything abusive is removed.
- **Private by default.** Only first names are asked for. No accounts are needed to pray or to submit an intention.

## Technology

- Plain HTML, CSS and JavaScript, with no build step
- [Supabase](https://supabase.com) for the database (coming soon)
- Hosted on [Cloudflare Pages](https://pages.cloudflare.com) (free, unlimited visitors), which redeploys automatically on every push to `main`

To run it locally, open `index.html` in a browser.

## Contributing

Help is welcome, especially with prayer translations, accessibility and design. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

Decade4U is free software under the [GNU Affero General Public License v3.0](LICENSE). You may use, change and share it, but any modified version you run or share must stay open under the same licence.
