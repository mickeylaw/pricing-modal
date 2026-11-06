const overlay = document.getElementById("overlay");
const openBtn = document.getElementById("open-modal");
const closeBtn = document.getElementById("close-modal");
const tilesScrollEl = document.getElementById("tiles-scroll");
const tilesEl = document.getElementById("tiles");
const panelEl = document.getElementById("panel");
const bodyEl = document.querySelector(".body");
const searchInput = document.getElementById("country-search");
const searchWrap = document.getElementById("search-wrap");
const suggestEl = document.getElementById("suggest");
const hintEl = document.getElementById("hint");

const state = {
  selectedPlanId: null,
  query: "",
  chosenCountry: null,
  suggestIndex: -1,
};

function allCountries() {
  const set = new Set();
  PLANS.forEach((plan) => {
    plan.zones.forEach((zone) => zone.countries.forEach((c) => set.add(c)));
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}

const COUNTRIES = allCountries();

function matchesForCountry(country) {
  const hits = [];
  PLANS.forEach((plan) => {
    plan.zones.forEach((zone) => {
      if (zone.countries.includes(country)) {
        hits.push({ plan, zone });
      }
    });
  });
  return hits;
}

function findCountry(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return COUNTRIES.find((c) => c.toLowerCase() === q) || null;
}

function suggestions(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return COUNTRIES.filter((c) => c.toLowerCase().startsWith(q)).slice(0, 8);
}

function splitColumns(list) {
  const mid = Math.ceil(list.length / 2);
  return [list.slice(0, mid), list.slice(mid)];
}

function coveringPlanIds(country) {
  return new Set(matchesForCountry(country).map((h) => h.plan.id));
}

function visiblePlans() {
  if (!state.chosenCountry) return PLANS;
  const ids = coveringPlanIds(state.chosenCountry);
  if (!ids.size) return PLANS;
  return PLANS.filter((p) => ids.has(p.id));
}

function panelPlan() {
  return PLANS.find((p) => p.id === state.selectedPlanId) || null;
}

function coverageMessage(country, hits) {
  if (!hits.length) return "";
  if (hits.length === 1) {
    return `${country} is located in ${hits[0].zone.name} region of ${hits[0].plan.name}.`;
  }
  const sameZone = hits.every((h) => h.zone.name === hits[0].zone.name);
  const plans = hits.map((h) => h.plan.name).join(" and ");
  if (sameZone) {
    return `${country} is located in ${hits[0].zone.name} region of ${plans}.`;
  }
  const first = hits[0];
  const rest = hits
    .slice(1)
    .map((h) => `${h.zone.name} of ${h.plan.name}`)
    .join(" and ");
  return `${country} is located in ${first.zone.name} region of ${first.plan.name} and ${rest}.`;
}

function renderTiles() {
  const plans = visiblePlans();
  const hits = state.chosenCountry ? matchesForCountry(state.chosenCountry) : [];
  const hitPlanIds = new Set(hits.map((h) => h.plan.id));

  tilesEl.innerHTML = plans
    .map((plan) => {
      const selected = state.selectedPlanId === plan.id;
      const matched = Boolean(state.chosenCountry) && hitPlanIds.has(plan.id);
      const hitZones = new Set(
        hits.filter((h) => h.plan.id === plan.id).map((h) => h.zone.id)
      );
      return `
        <button type="button" class="tile${selected ? " is-selected" : ""}${
          matched ? " is-match" : ""
        }" data-plan="${plan.id}">
          <div class="tile-head">
            <div>
              <h2>${plan.name}</h2>
              <p class="sim">${plan.sim}</p>
            </div>
            <img class="check" src="assets/icon-check.svg" width="24" height="24" alt="" />
          </div>
          ${plan.zones
            .map(
              (zone) => `
            <div class="zone-row${hitZones.has(zone.id) ? " is-hit" : ""}">
              <span class="name">${zone.name}</span>
              <span class="price">${zone.price}</span>
            </div>`
            )
            .join("")}
        </button>`;
    })
    .join("");
}

function renderPanel() {
  const plan = panelPlan();
  const open = Boolean(plan);
  bodyEl.classList.toggle("is-panel-open", open);
  panelEl.classList.toggle("is-open", open);
  panelEl.setAttribute("aria-hidden", open ? "false" : "true");
  if (!plan) return;

  const hitCountry = state.chosenCountry;
  panelEl.innerHTML = `
    <div class="panel-inner">
      <h3>${plan.name}</h3>
      ${plan.zones
        .map((zone) => {
          const [left, right] = splitColumns(zone.countries);
          const col = (list) =>
            `<ul>${list
              .map(
                (c) =>
                  `<li class="${c === hitCountry ? "is-hit" : ""}">${c}</li>`
              )
              .join("")}</ul>`;
          return `
            <div class="zone-block">
              <h4>${zone.name}</h4>
              <div class="cols">${col(left)}${right.length ? col(right) : ""}</div>
            </div>`;
        })
        .join("")}
    </div>`;
}

function openSuggestions() {
  const items = suggestions(state.query).filter(
    (c) => c.toLowerCase() !== state.query.trim().toLowerCase()
  );
  return document.activeElement === searchInput && state.query.trim() && items.length > 0
    ? items
    : [];
}

function renderHint() {
  searchWrap.classList.remove("error");
  hintEl.classList.remove("error");
  hintEl.textContent = "";

  const typed = state.query.trim();
  if (!typed || openSuggestions().length) return;

  if (state.chosenCountry) {
    const hits = matchesForCountry(state.chosenCountry);
    if (state.selectedPlanId) {
      const inPlan = hits.filter((h) => h.plan.id === state.selectedPlanId);
      if (!inPlan.length) {
        searchWrap.classList.add("error");
        hintEl.classList.add("error");
        hintEl.textContent = "Sorry, your plan does not provide coverage for this country.";
        return;
      }
      hintEl.textContent = coverageMessage(state.chosenCountry, inPlan);
      return;
    }
    if (!hits.length) {
      searchWrap.classList.add("error");
      hintEl.classList.add("error");
      hintEl.textContent = "Sorry, we don't provide coverage for this country yet";
      return;
    }
    hintEl.textContent = coverageMessage(state.chosenCountry, hits);
  } else {
    searchWrap.classList.add("error");
    hintEl.classList.add("error");
    hintEl.textContent = state.selectedPlanId
      ? "Sorry, your plan does not provide coverage for this country."
      : "Sorry, we don't provide coverage for this country yet";
  }
}

function renderSuggest() {
  const items = openSuggestions();
  const show = items.length > 0;
  searchWrap.classList.toggle("open", show);
  suggestEl.hidden = !show;
  if (!show) {
    state.suggestIndex = -1;
    suggestEl.innerHTML = "";
    return;
  }
  suggestEl.innerHTML = items
    .map(
      (c, i) =>
        `<button type="button" data-country="${c}" class="${
          i === state.suggestIndex ? "active" : ""
        }">${c}</button>`
    )
    .join("");
}

function render() {
  if (state.selectedPlanId && state.chosenCountry) {
    const ids = coveringPlanIds(state.chosenCountry);
    if (ids.size && !ids.has(state.selectedPlanId)) {
      state.selectedPlanId = null;
    }
  }
  renderTiles();
  renderPanel();
  renderHint();
  renderSuggest();
}

function chooseCountry(country) {
  state.chosenCountry = country;
  state.query = country;
  searchInput.value = country;
  suggestEl.hidden = true;
  searchWrap.classList.remove("open");
  render();
  tilesScrollEl.scrollTo({ left: 0 });
}

function openModal() {
  overlay.hidden = false;
  searchInput.focus();
}

function closeModal() {
  overlay.hidden = true;
  state.selectedPlanId = null;
  state.query = "";
  state.chosenCountry = null;
  searchInput.value = "";
  render();
}

openBtn.addEventListener("click", openModal);
closeBtn.addEventListener("click", closeModal);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !overlay.hidden) {
    if (!suggestEl.hidden) {
      suggestEl.hidden = true;
      searchWrap.classList.remove("open");
      return;
    }
    closeModal();
  }
});

const PANEL_WIDTH = 370;

function positionSelectedPlan() {
  const tiles = [...tilesEl.querySelectorAll(".tile")];
  const tile = tiles.find((t) => t.dataset.plan === state.selectedPlanId);
  if (!tile) return;

  const index = tiles.indexOf(tile);
  const scrollerRect = tilesScrollEl.getBoundingClientRect();
  const visibleRight = scrollerRect.right - PANEL_WIDTH;
  const visibleCenter = (scrollerRect.left + visibleRight) / 2;
  const tileRect = tile.getBoundingClientRect();

  let delta = 0;
  if (index === 0) {
    delta = -tilesScrollEl.scrollLeft;
  } else if (index === tiles.length - 1) {
    const searchRight = searchInput.getBoundingClientRect().right;
    delta = tileRect.right - searchRight;
  } else {
    delta = tileRect.left + tileRect.width / 2 - visibleCenter;
  }

  tilesScrollEl.scrollTo({
    left: tilesScrollEl.scrollLeft + delta,
    behavior: "smooth",
  });
}

tilesEl.addEventListener("click", (e) => {
  const tile = e.target.closest(".tile");
  if (!tile) return;
  const id = tile.dataset.plan;
  const opening = state.selectedPlanId !== id;
  state.selectedPlanId = opening ? id : null;
  setTimeout(() => {
    render();
    if (opening) {
      requestAnimationFrame(() => requestAnimationFrame(positionSelectedPlan));
    }
  }, 0);
});

searchInput.addEventListener("input", () => {
  const previousCountry = state.chosenCountry;
  state.query = searchInput.value;
  state.chosenCountry = findCountry(state.query);
  const items = suggestions(state.query);
  state.suggestIndex = items.length ? 0 : -1;
  render();
  if (!state.chosenCountry && previousCountry) {
    tilesScrollEl.scrollTo({ left: 0 });
  }
});

searchInput.addEventListener("focus", () => render());
searchInput.addEventListener("blur", () => {
  setTimeout(() => {
    suggestEl.hidden = true;
    searchWrap.classList.remove("open");
  }, 120);
});

searchInput.addEventListener("keydown", (e) => {
  const items = suggestions(state.query);
  if (e.key === "ArrowDown" && items.length) {
    e.preventDefault();
    state.suggestIndex = Math.min(items.length - 1, state.suggestIndex + 1);
    renderSuggest();
  } else if (e.key === "ArrowUp" && items.length) {
    e.preventDefault();
    state.suggestIndex = Math.max(0, state.suggestIndex - 1);
    renderSuggest();
  } else if (e.key === "Enter") {
    e.preventDefault();
    const pick =
      (state.suggestIndex >= 0 && items[state.suggestIndex]) || findCountry(state.query);
    if (pick) chooseCountry(pick);
    else {
      state.chosenCountry = null;
      render();
    }
  }
});

suggestEl.addEventListener("mousedown", (e) => {
  const btn = e.target.closest("button[data-country]");
  if (!btn) return;
  e.preventDefault();
  chooseCountry(btn.dataset.country);
});

render();
openModal();
