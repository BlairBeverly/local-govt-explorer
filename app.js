const CATEGORY_COLORS = {
  "Infrastructure & Transportation": "#2f6fb0",
  "Housing & Development": "#28785c",
  "Economic Development & Downtown": "#b86a22",
  "Public Safety": "#c15537",
  "Community & Social Services": "#6657b8",
  "Governance & Policy": "#6d6a63",
  "City Operations & Finance": "#8d6b3f",
  "Environment & Sustainability": "#4d8f57",
  "Community Recognition & Ceremonial": "#c9962a",
};

const ACRONYMS = new Map([
  ["fy", "FY"],
  ["npdes", "NPDES"],
  ["imrf", "IMRF"],
  ["hvac", "HVAC"],
  ["llc", "LLC"],
  ["w", "W"],
  ["s", "S"],
  ["n", "N"],
  ["e", "E"],
]);

const state = {
  allProjects: [],
  filteredCategories: [],
  openCategories: new Set(),
  selectedProjectId: null,
  searchTerm: "",
  governingBody: "",
  latestYear: "",
};

const sidebarScroll = document.getElementById("sidebar-scroll");
const detailPanel = document.getElementById("detail-panel");
const searchInput = document.getElementById("project-search");
const governingBodyEl = document.getElementById("governing-body");
const sidebarSubtitleEl = document.getElementById("sidebar-subtitle");
const heroStatsEl = document.getElementById("hero-stats");

function showLoadingState() {
  detailPanel.innerHTML = `
    <div class="loading-state">
      <div>
        <div class="loading-pulse" aria-hidden="true"></div>
        <div class="loading-title">Loading project briefings</div>
        <div class="loading-sub">Pulling structured city council activity from the local dataset.</div>
      </div>
    </div>
  `;
}

function formatCurrency(amount) {
  if (!amount) {
    return "$0";
  }

  const compact = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: amount >= 100000 ? "compact" : "standard",
    maximumFractionDigits: amount >= 100000 ? 1 : 0,
  });

  return compact.format(amount).replace(".0", "");
}

function formatLongCurrency(amount) {
  if (!amount) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString) {
  if (!dateString) {
    return "Unknown date";
  }

  return new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(totalSeconds) {
  if (!totalSeconds) {
    return "No recorded discussion time";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds} sec of discussion`;
  }

  return `${minutes} min ${seconds} sec of discussion`;
}

function titleCaseWord(word) {
  if (!word) {
    return "";
  }

  if (ACRONYMS.has(word)) {
    return ACRONYMS.get(word);
  }

  if (/^\d+$/.test(word)) {
    return word;
  }

  if (/^\d{4}s$/.test(word)) {
    return word;
  }

  if (/^\d{4}$/.test(word)) {
    return word;
  }

  if (/^\d+\w+$/.test(word)) {
    return word.replace(/^(\d+)([a-z]+)$/i, (_, digits, letters) => `${digits}${titleCaseWord(letters.toLowerCase())}`);
  }

  return word.charAt(0).toUpperCase() + word.slice(1);
}

function formatProjectTitle(projectId) {
  const stripped = projectId
    .replace(/^proj_/, "")
    .replace(/^(champaign_city_council|city_council|city_of_champaign_township|township_board)_/, "")
    .replace(/_in_champaign$/, "");

  return stripped
    .split("_")
    .map((word) => titleCaseWord(word.toLowerCase()))
    .join(" ")
    .replace(/\bFor\b/g, "for")
    .replace(/\bAnd\b/g, "and")
    .replace(/\bOf\b/g, "of")
    .replace(/\bTo\b/g, "to")
    .replace(/\bWith\b/g, "with");
}

function getSignalChips(project) {
  const chips = [];

  if (project.public_input_summary) {
    chips.push({ emoji: "💬", label: "Public input" });
  }

  if ((project.top_unresolved_questions || []).length > 0) {
    chips.push({ emoji: "⚠", label: "Open questions" });
  }

  const moneyValue = Math.max(project.money_adopted_total || 0, project.money_discussed_total || 0);
  if (moneyValue > 0) {
    chips.push({ emoji: "💰", label: formatCurrency(moneyValue) });
  }

  return chips;
}

function getStatusLabel(status) {
  if (status === "no_formal_action") {
    return "No action";
  }

  return status.replace(/_/g, " ");
}

function buildSearchText(project) {
  return [
    project.title,
    project.category,
    project.one_sentence_summary,
    project.why_this_matters_locally,
    project.current_status,
    project.public_input_summary,
    project.council_discussion_summary,
    ...(project.top_unresolved_questions || []),
    ...(project.recent_timeline || []).map((item) => item.summary),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildProjects(rawProjects) {
  return rawProjects
    .map((project) => {
      const title = formatProjectTitle(project.project_id);
      const signals = getSignalChips(project);
      return {
        ...project,
        title,
        signals,
        searchText: buildSearchText({ ...project, title }),
      };
    })
    .sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }

      if (a.last_action_date !== b.last_action_date) {
        return b.last_action_date.localeCompare(a.last_action_date);
      }

      return a.title.localeCompare(b.title);
    });
}

function groupProjects(projects) {
  const byCategory = new Map();

  for (const project of projects) {
    if (!byCategory.has(project.category)) {
      byCategory.set(project.category, []);
    }

    byCategory.get(project.category).push(project);
  }

  return Array.from(byCategory.entries())
    .map(([name, items]) => ({
      name,
      color: CATEGORY_COLORS[name] || "#2f6fb0",
      projects: items.sort((a, b) => b.last_action_date.localeCompare(a.last_action_date) || a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name));
}

function updateHeroStats() {
  const projects = state.allProjects;
  const totalFunding = projects.reduce((sum, project) => sum + (project.money_adopted_total || 0), 0);
  const publicInputCount = projects.filter((project) => project.public_input_summary).length;
  const openQuestionCount = projects.filter((project) => (project.top_unresolved_questions || []).length > 0).length;
  const activeCount = projects.filter((project) => project.status_label === "active" || project.status_label === "introduced").length;

  heroStatsEl.innerHTML = `
    <div class="hero-card">
      <span class="hero-card-value">${projects.length}</span>
      <span class="hero-card-label">Projects in the current prototype dataset</span>
    </div>
    <div class="hero-card">
      <span class="hero-card-value">${formatCurrency(totalFunding)}</span>
      <span class="hero-card-label">Funding discussed or adopted across tracked items</span>
    </div>
    <div class="hero-card">
      <span class="hero-card-value">${activeCount}</span>
      <span class="hero-card-label">Projects still active or newly introduced</span>
    </div>
    <div class="hero-card">
      <span class="hero-card-value">${publicInputCount + openQuestionCount}</span>
      <span class="hero-card-label">Items with public input or unresolved questions</span>
    </div>
  `;
}

function renderSidebar() {
  if (!state.filteredCategories.length) {
    sidebarScroll.innerHTML = `
      <div class="empty-message">
        <div>
          <div class="empty-title">No matches</div>
          <div class="empty-sub">Try a broader search term or clear the search to browse every project.</div>
        </div>
      </div>
    `;
    return;
  }

  sidebarScroll.innerHTML = state.filteredCategories
    .map((category) => {
      const isOpen = state.openCategories.has(category.name);
      const projectList = isOpen
        ? `
          <div class="project-list">
            ${category.projects
              .map((project) => {
                const signalsMarkup = project.signals.length
                  ? `<div class="signals">${project.signals
                      .map((signal) => `<span class="sig">${signal.emoji} ${signal.label}</span>`)
                      .join("")}</div>`
                  : "";

                return `
                  <button
                    class="project-row${project.project_id === state.selectedProjectId ? " active" : ""}"
                    type="button"
                    data-project-id="${project.project_id}"
                    style="--category-color:${category.color}"
                  >
                    <span class="proj-main">
                      <span class="proj-title">${project.title}</span>
                      <span class="proj-summary">${project.one_sentence_summary}</span>
                    </span>
                    <span class="proj-meta">
                      <span class="status-pill status-${project.status_label}">${getStatusLabel(project.status_label)}</span>
                      ${signalsMarkup}
                    </span>
                  </button>
                `;
              })
              .join("")}
          </div>
        `
        : "";

      return `
        <section class="cat-section">
          <button class="cat-header" type="button" data-category-name="${category.name}">
            <span class="cat-left">
              <span class="cat-dot" style="background:${category.color}"></span>
              <span class="cat-name">${category.name}</span>
            </span>
            <span class="cat-right">
              <span class="cat-count">${category.projects.length}</span>
              <span class="chevron${isOpen ? " open" : ""}">▶</span>
            </span>
          </button>
          ${projectList}
        </section>
      `;
    })
    .join("");
}

function createMetric(label, value) {
  return `
    <div class="metric">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value}</div>
    </div>
  `;
}

function renderDetail() {
  const project = state.allProjects.find((item) => item.project_id === state.selectedProjectId);

  if (!project) {
    detailPanel.innerHTML = `
      <div class="main-empty">
        <div>
          <div class="empty-illustration" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="5" y="7" width="38" height="34" rx="6" stroke="currentColor" stroke-width="1.5" />
              <line x1="13" y1="17" x2="35" y2="17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <line x1="13" y1="24" x2="30" y2="24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <line x1="13" y1="31" x2="24" y2="31" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </div>
          <div class="main-empty-title">Select a project</div>
          <div class="main-empty-sub">
            Browse categories on the left and open any project briefing to inspect decisions, money, timeline, and community impact.
          </div>
        </div>
      </div>
    `;
    return;
  }

  const categoryColor = CATEGORY_COLORS[project.category] || "#2f6fb0";
  const metrics = [
    createMetric("Funding", formatLongCurrency(Math.max(project.money_adopted_total || 0, project.money_discussed_total || 0))),
    createMetric("Votes", project.vote_count ? `${project.vote_count} recorded` : "No vote"),
    createMetric("Split votes", project.split_vote_count ? `${project.split_vote_count}` : "None"),
    createMetric("Tracking class", project.tracking_class.replace(/_/g, " ")),
    createMetric("Timeline items", `${(project.recent_timeline || []).length}`),
    createMetric("Segments linked", `${(project.linked_meeting_segments || []).length}`),
  ].join("");

  const timelineMarkup = (project.recent_timeline || [])
    .map(
      (item) => `
        <div class="timeline-item">
          <div class="timeline-marker"></div>
          <div class="timeline-date">${formatDate(item.date)}</div>
          <div class="timeline-text">${item.summary}</div>
        </div>
      `
    )
    .join("");

  const questionMarkup = (project.top_unresolved_questions || []).length
    ? `
      <div class="question-list">
        ${project.top_unresolved_questions
          .map(
            (question) => `
              <div class="question-item">
                <div class="question-icon">?</div>
                <div class="body-text">${question}</div>
              </div>
            `
          )
          .join("")}
      </div>
    `
    : `<p class="body-text">No unresolved questions are surfaced in the current project view.</p>`;

  const signalsMarkup = project.signals.length
    ? `<div class="inline-list">${project.signals
        .map((signal) => `<span class="chip">${signal.emoji} ${signal.label}</span>`)
        .join("")}</div>`
    : `<p class="body-text">No special signals were flagged for this project.</p>`;

  detailPanel.innerHTML = `
    <div class="detail-shell" style="--category-color:${categoryColor}">
      <div class="detail-main">
        <header class="detail-header">
          <div class="detail-tag">
            <span class="cat-dot" style="background:${categoryColor}"></span>
            ${project.category}
          </div>
          <h2 class="detail-title">${project.title}</h2>
          <div class="detail-status-row">
            <span class="status-pill status-${project.status_label}">${getStatusLabel(project.status_label)}</span>
            <span>Last action: ${formatDate(project.last_action_date)}</span>
            <span>${formatDuration(project.total_time_spent_this_term_seconds || 0)}</span>
          </div>
          <div class="detail-current-status">${project.current_status}</div>
        </header>

        <div class="content-grid">
          <section class="section-card">
            <p class="section-label">Summary</p>
            <p class="summary-text">${project.one_sentence_summary}</p>
          </section>

          <section class="section-card">
            <p class="section-label">Why This Matters</p>
            <p class="matters-text">${project.why_this_matters_locally}</p>
          </section>

          <section class="section-card">
            <p class="section-label">Key Metrics</p>
            <div class="metrics">${metrics}</div>
          </section>

          <section class="section-card">
            <p class="section-label">Timeline</p>
            <div class="timeline-list">${timelineMarkup || `<p class="body-text">No recent timeline items are available.</p>`}</div>
          </section>
        </div>
      </div>

      <aside class="detail-rail">
        <section class="rail-card">
          <p class="section-label">Signals</p>
          ${signalsMarkup}
        </section>

        <section class="rail-card">
          <p class="section-label">Open Questions</p>
          ${questionMarkup}
        </section>

        <section class="rail-card">
          <p class="section-label">Council Discussion</p>
          <p class="body-text">${project.council_discussion_summary || "No council discussion summary is available for this project."}</p>
        </section>

        <section class="rail-card">
          <p class="section-label">Public Input</p>
          <p class="body-text">${project.public_input_summary || "No public input summary is available for this project."}</p>
        </section>
      </aside>
    </div>
  `;
}

function syncSelectionFromHash() {
  const hashValue = window.location.hash.replace(/^#project=/, "");
  if (hashValue && state.allProjects.some((project) => project.project_id === hashValue)) {
    state.selectedProjectId = hashValue;
  }
}

function updateHash(projectId) {
  const nextHash = projectId ? `#project=${projectId}` : "";
  if (window.location.hash !== nextHash) {
    history.replaceState(null, "", nextHash || window.location.pathname);
  }
}

function applySearch() {
  const term = state.searchTerm.trim().toLowerCase();
  const filteredProjects = term
    ? state.allProjects.filter((project) => project.searchText.includes(term))
    : state.allProjects;

  state.filteredCategories = groupProjects(filteredProjects);

  if (!state.filteredCategories.some((category) => category.projects.some((project) => project.project_id === state.selectedProjectId))) {
    state.selectedProjectId = null;
    updateHash("");
  }

  if (term) {
    state.openCategories = new Set(state.filteredCategories.map((category) => category.name));
  } else if (!state.openCategories.size && state.filteredCategories[0]) {
    state.openCategories.add(state.filteredCategories[0].name);
  }

  renderSidebar();
  renderDetail();
}

function bindSidebarEvents() {
  sidebarScroll.addEventListener("click", (event) => {
    const categoryButton = event.target.closest("[data-category-name]");
    if (categoryButton) {
      const categoryName = categoryButton.dataset.categoryName;
      if (state.openCategories.has(categoryName)) {
        state.openCategories.delete(categoryName);
      } else {
        state.openCategories.add(categoryName);
      }

      renderSidebar();
      return;
    }

    const projectButton = event.target.closest("[data-project-id]");
    if (projectButton) {
      const projectId = projectButton.dataset.projectId;
      state.selectedProjectId = projectId;
      updateHash(projectId);
      renderSidebar();
      renderDetail();
    }
  });
}

function updateHeader(projects) {
  const years = projects
    .map((project) => project.last_action_date?.slice(0, 4))
    .filter(Boolean)
    .sort();

  state.latestYear = years[years.length - 1] || "";
  state.governingBody = projects[0]?.governing_body || "Local Government Explorer";

  governingBodyEl.textContent = state.governingBody;
  sidebarSubtitleEl.textContent = state.latestYear
    ? `Recent activity · ${state.latestYear}`
    : "Recent activity";
}

async function loadProjects() {
  showLoadingState();

  const response = await fetch("./data/project_views.jsonl");
  if (!response.ok) {
    throw new Error(`Failed to load data (${response.status})`);
  }

  const text = await response.text();
  const rawProjects = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  state.allProjects = buildProjects(rawProjects);
  updateHeader(state.allProjects);
  updateHeroStats();

  syncSelectionFromHash();

  if (!state.selectedProjectId && state.allProjects[0]) {
    state.openCategories.add(state.allProjects[0].category);
  }

  applySearch();
}

function showLoadError(error) {
  detailPanel.innerHTML = `
    <div class="empty-message">
      <div>
        <div class="empty-title">Could not load the dataset</div>
        <div class="empty-sub">${error.message}. Serve the project through a local web server or GitHub Pages so the browser can fetch <code>data/project_views.jsonl</code>.</div>
      </div>
    </div>
  `;
}

searchInput.addEventListener("input", (event) => {
  state.searchTerm = event.target.value;
  applySearch();
});

window.addEventListener("hashchange", () => {
  const previous = state.selectedProjectId;
  syncSelectionFromHash();
  if (previous !== state.selectedProjectId) {
    renderSidebar();
    renderDetail();
  }
});

bindSidebarEvents();
loadProjects().catch(showLoadError);
