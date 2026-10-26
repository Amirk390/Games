"use strict";

const CATEGORY_HE = {
  All: "הכל",
  Grammar: "דקדוק",
  Vocabulary: "אוצר מילים",
  Reading: "קריאה",
  Quiz: "בוחן"
};

const state = {
  query: "",
  category: "All",
  catalog: { categories: [], games: [] },
  source: "pending"
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function safeRel(value) {
  if (typeof value !== "string") return "";
  const path = value.trim();
  if (!path || path.includes("..") || path.includes("\\") || path.includes(":") || path.startsWith("/")) return "";
  return path;
}

function isGame(game) {
  return !!game && typeof game.id === "string" && game.id.trim() && typeof game.title === "string" && game.title.trim();
}

function normalize(data) {
  const source = Array.isArray(data) ? { categories: [], games: data } : (data || {});
  const categories = Array.isArray(source.categories)
    ? source.categories.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : [];
  const games = Array.isArray(source.games) ? source.games.filter(isGame) : [];
  return { categories, games };
}

function readFallback() {
  try {
    return normalize(JSON.parse(document.getElementById("games-fallback").textContent));
  } catch (err) {
    return { categories: [], games: [] };
  }
}

function initial(title) {
  const ch = String(title || "?").trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

function categoryList() {
  const names = ["All"];
  const add = (name) => {
    if (typeof name !== "string") return;
    const clean = name.trim();
    if (clean && !names.includes(clean)) names.push(clean);
  };
  state.catalog.categories.forEach(add);
  state.catalog.games.forEach((game) => add(game.category || ""));
  return names;
}

function matches(game) {
  if (state.category !== "All" && (game.category || "Other") !== state.category) return false;
  const query = state.query.trim().toLowerCase();
  if (!query) return true;
  const tags = Array.isArray(game.tags) ? game.tags : [];
  const haystack = [game.title, game.subtitleHe, game.description, game.level, game.category, ...tags]
    .join("\n")
    .toLowerCase();
  return haystack.includes(query);
}

function badge(game) {
  const bits = [];
  if (game.category) bits.push(`<span class="badge">${esc(game.category)}</span>`);
  if (game.level) bits.push(`<span class="level">${esc(game.level)}</span>`);
  return bits.join("");
}

function tagsHTML(tags, limit) {
  const list = Array.isArray(tags) ? tags : [];
  const shown = typeof limit === "number" ? list.slice(0, limit) : list;
  if (!shown.length) return "";
  return `<ul class="tags">${shown.map((tag) => `<li>${esc(tag)}</li>`).join("")}</ul>`;
}

function coverHTML(game, alt) {
  const src = safeRel(game.thumbnail);
  if (!src) return `<div class="ph" aria-hidden="true"><span>${esc(initial(game.title))}</span></div>`;
  return `<img src="${esc(src)}" alt="${esc(alt || "")}" width="1280" height="720">`;
}

function heroHTML(game) {
  const id = encodeURIComponent(game.id);
  return `
    <section class="hero">
      <a class="hero-media" href="#/game/${id}" aria-label="${esc(game.title)}, open details">
        ${coverHTML(game, "")}
      </a>
      <div class="hero-copy">
        <p class="kicker"><span>Featured</span> <span class="kicker-he" lang="he" dir="rtl">מומלץ</span></p>
        <h2>${esc(game.title)}</h2>
        ${game.subtitleHe ? `<p class="he" lang="he" dir="rtl">${esc(game.subtitleHe)}</p>` : ""}
        <p class="lede">${esc(game.description || "")}</p>
        <p class="meta">${badge(game)}</p>
        ${tagsHTML(game.tags, 4)}
        <div class="actions">
          <a class="play" href="#/game/${id}/play" aria-label="Play ${esc(game.title)}">Play</a>
          <a class="ghost" href="#/game/${id}">Details</a>
        </div>
      </div>
    </section>`;
}

function cardHTML(game) {
  const id = encodeURIComponent(game.id);
  return `
    <article class="card">
      <a class="card-media" href="#/game/${id}" aria-label="${esc(game.title)}, open details">${coverHTML(game, "")}</a>
      <div class="card-body">
        <p class="meta">${badge(game)}</p>
        <h3><a href="#/game/${id}">${esc(game.title)}</a></h3>
        ${game.subtitleHe ? `<p class="he" lang="he" dir="rtl">${esc(game.subtitleHe)}</p>` : ""}
        <p class="desc">${esc(game.description || "")}</p>
        ${tagsHTML(game.tags, 4)}
        <a class="play" href="#/game/${id}/play" aria-label="Play ${esc(game.title)}">Play</a>
      </div>
    </article>`;
}

function soonHTML(message) {
  return `
    <article class="card soon">
      <div class="soon-art" aria-hidden="true"></div>
      <div class="card-body">
        <p class="meta"><span class="badge">Englishia</span></p>
        <h3>More games coming soon</h3>
        <p class="he" lang="he" dir="rtl">עוד משחקים בדרך</p>
        <p class="desc">${esc(message)}</p>
      </div>
    </article>`;
}

function stageHTML(game, playing) {
  const exit = `<button type="button" class="exit-full" data-exit-full>Exit full screen</button>`;
  if (playing) {
    const src = safeRel(game.path);
    if (!src) return `<div class="stage live" id="stage"><p class="stage-msg">This game has no page to open.</p></div>`;
    return `<div class="stage live" id="stage">${exit}<iframe id="gameFrame" title="${esc(game.title)}" src="${esc(src)}" allowfullscreen allow="fullscreen; autoplay"></iframe></div>`;
  }
  return `
    <div class="stage" id="stage">
      ${coverHTML(game, "")}
      <a class="stage-play" href="#/game/${encodeURIComponent(game.id)}/play" aria-label="Play ${esc(game.title)}">Play</a>
    </div>`;
}

function detailHTML(game, playing) {
  const id = encodeURIComponent(game.id);
  return `
    <article class="detail">
      <div class="stage-wrap">
        ${stageHTML(game, playing)}
        ${playing ? `<div class="stage-bar"><button type="button" class="ghost" data-fullscreen data-game="${esc(game.id)}">Full screen</button></div>` : ""}
      </div>
      <div class="detail-copy">
        <a class="back" href="#/">← All games</a>
        <p class="kicker"><span>${esc(game.category || "Game")}</span></p>
        <h2>${esc(game.title)}</h2>
        ${game.subtitleHe ? `<p class="he he-lg" lang="he" dir="rtl">${esc(game.subtitleHe)}</p>` : ""}
        <p class="meta">${badge(game)}</p>
        <p class="lede">${esc(game.description || "")}</p>
        ${tagsHTML(game.tags)}
        <div class="actions">
          <a class="play" href="#/game/${id}/play" aria-label="Play ${esc(game.title)}">Play</a>
          <button type="button" class="ghost" data-fullscreen data-game="${esc(game.id)}">Full screen</button>
        </div>
        <p class="tip tip-tight">Full screen fills the board. Inside the game, F does the same. <span lang="he" dir="rtl">באייפון: הוספה למסך הבית.</span></p>
      </div>
    </article>`;
}

function missingHTML() {
  return `
    <article class="detail">
      <div class="detail-copy">
        <a class="back" href="#/">← All games</a>
        <h2>That game is not in the library</h2>
        <p class="lede">It may have been renamed. Pick another game from the list.</p>
      </div>
    </article>
    <div class="grid" style="margin-top:18px">${soonHTML("More games coming soon.")}</div>`;
}

function noticeHTML() {
  if (state.source !== "fallback") return "";
  return `<p class="notice">Showing the saved game list. games.json did not load.</p>`;
}

function homeHTML() {
  const games = state.catalog.games;
  const featured = games.find((game) => game.featured) || games[0];
  const showHero = !!(featured && state.category === "All" && !state.query.trim());
  const list = games.filter(matches);
  const query = state.query.trim();
  let note = "";
  let cards = list.map(cardHTML).join("");
  if (!query) {
    const message = list.length
      ? "Vocabulary, reading, and quiz games will appear here when they are added."
      : (state.category === "All"
        ? "Vocabulary, reading, and quiz games will appear here when they are added."
        : `No ${state.category} games yet.`);
    cards += soonHTML(message);
  } else if (!list.length) {
    note = `<p class="empty-note">No games match “${esc(query)}”.</p>`;
    cards = soonHTML("Try another word, or clear the search.");
  }
  const count = list.length === 1 ? "1 game" : `${list.length} games`;
  const heading = state.category === "All" ? "Games" : state.category;
  return `
    ${noticeHTML()}
    ${showHero ? heroHTML(featured) : ""}
    <div class="section-head">
      <h2>${esc(heading)}</h2>
      <p class="count">${count}</p>
    </div>
    ${note}
    <div class="grid">${cards}</div>`;
}

function parseRoute() {
  let raw = (location.hash || "").replace(/^#/, "");
  if (!raw.startsWith("/")) raw = `/${raw}`;
  let parts = [];
  try {
    parts = raw.split("/").filter(Boolean).map(decodeURIComponent);
  } catch (err) {
    parts = [];
  }
  if (parts[0] === "game" && parts[1]) {
    return { name: "game", id: parts[1], play: parts[2] === "play" };
  }
  return { name: "home" };
}

function renderChips() {
  const names = categoryList();
  if (!names.includes(state.category)) state.category = "All";
  document.getElementById("chips").innerHTML = names.map((name) => {
    const he = CATEGORY_HE[name];
    const pressed = name === state.category ? "true" : "false";
    return `<button type="button" class="chip" data-category="${esc(name)}" aria-pressed="${pressed}"><span>${esc(name)}</span>${he ? `<span class="chip-he" lang="he" dir="rtl">${he}</span>` : ""}</button>`;
  }).join("");
}

function render() {
  const route = parseRoute();
  renderChips();
  const main = document.getElementById("main");
  if (route.name === "game") {
    const game = state.catalog.games.find((item) => item.id === route.id);
    document.body.dataset.view = route.play && game ? "play" : "game";
    document.title = game ? `${game.title} · Englishia` : "Englishia";
    main.innerHTML = `${noticeHTML()}${game ? detailHTML(game, route.play) : missingHTML()}`;
    return;
  }
  document.body.dataset.view = "home";
  document.title = "Englishia";
  main.innerHTML = homeHTML();
}

function goFull(el) {
  if (!el) return;
  const request = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!request) {
    el.classList.add("is-full");
    document.body.classList.add("locked");
    return;
  }
  try {
    const pending = request.call(el);
    if (pending && typeof pending.catch === "function") {
      pending.catch(() => {
        el.classList.add("is-full");
        document.body.classList.add("locked");
      });
    }
  } catch (err) {
    el.classList.add("is-full");
    document.body.classList.add("locked");
  }
}

function leaveFull() {
  const stage = document.getElementById("stage");
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  if (stage) stage.classList.remove("is-full");
  document.body.classList.remove("locked");
}

async function loadCatalog() {
  try {
    const response = await fetch("games.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(String(response.status));
    state.catalog = normalize(await response.json());
    state.source = "live";
  } catch (err) {
    state.catalog = readFallback();
    state.source = "fallback";
  }
  render();
}

document.getElementById("searchForm").addEventListener("submit", (event) => event.preventDefault());
document.getElementById("q").addEventListener("input", (event) => {
  state.query = event.target.value;
  if (parseRoute().name !== "home") location.hash = "#/";
  else render();
});

document.body.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-category]");
  if (chip) {
    state.category = chip.getAttribute("data-category") || "All";
    if (parseRoute().name !== "home") location.hash = "#/";
    else render();
    return;
  }
  const fullscreen = event.target.closest("[data-fullscreen]");
  if (fullscreen) {
    const id = fullscreen.getAttribute("data-game") || "";
    const target = `#/game/${encodeURIComponent(id)}/play`;
    if (location.hash !== target) location.hash = target;
    goFull(document.getElementById("stage"));
    return;
  }
  if (event.target.closest("[data-exit-full]")) leaveFull();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const stage = document.getElementById("stage");
  if (stage && stage.classList.contains("is-full")) leaveFull();
});

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) document.body.classList.remove("locked");
});

window.addEventListener("hashchange", render);

state.catalog = readFallback();
render();
loadCatalog();
