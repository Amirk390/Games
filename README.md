# Englishia

אינגלישיה — English games by Mr. Khoury for grades 10–12.

This repository is a static site. GitHub Pages serves it from the `main` branch, root folder.

**Live:** https://amirk390.github.io/Games/

No accounts, no analytics, and no student data.

## Add a game

1. Create a folder under `games/` and put the game in `index.html`. Example: `games/vocab-sprint/index.html`.
2. Add an object to the `games` array in `games.json`.
3. Copy that same object into the fallback list in `index.html` (the `games-fallback` script) so the card still appears if `games.json` cannot be loaded.
4. Commit to `main` and reload the site. The new card shows up in the grid. A new `category` becomes a filter chip on its own.

### Fields

- `id` — short slug, used in the address `#/game/your-id`
- `title` — English name
- `subtitleHe` — short Hebrew subtitle
- `description` — one or two sentences
- `category` — `Grammar`, `Vocabulary`, `Reading`, `Quiz`, or a new label
- `tags` — topic words shown on the card
- `level` — for example `Grades 10–12`
- `path` — path from the site root, such as `games/vocab-sprint/`
- `thumbnail` — optional cover (SVG or PNG), such as `assets/thumbs/vocab-sprint.png`
- `featured` — `true` puts that game in the home banner (the first featured game wins)

`categories` lists the chips that should appear even before a game uses them. Chips for categories that only exist on a game are added automatically.
