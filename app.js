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

const SORT_OPTIONS = [
  { value: "recent", label: "Recent activity" },
  { value: "discussion", label: "Most discussed" },
  { value: "public_input", label: "Most public input" },
  { value: "funding", label: "Largest funding" },
];

const state = {
  allProjects: [],
  visibleProjects: [],
  selectedProjectId: null,
  searchTerm: "",
  governingBody: "",
  latestYear: "",
  filters: {
    category: "all",
    status: "all",
    trackingClass: "all",
    hasPublicInput: false,
    hasOpenQuestions: false,
    fundingAttached: false,
    hasSplitVote: false,
  },
  sortBy: "recent",
};

const sidebarScroll = document.getElementById("sidebar-scroll");
const detailPanel = document.getElementById("detail-panel");
const searchInput = document.getElementById("project-search");
const governingBodyEl = document.getElementById("governing-body");
const sidebarSubtitleEl = document.getElementById("sidebar-subtitle");
const heroStatsEl = document.getElementById("hero-stats");
const categoryFilterEl = document.getElementById("category-filter");
const statusFilterEl = document.getElementById("status-filter");
const trackingFilterEl = document.getElementById("tracking-filter");
const sortFilterEl = document.getElementById("sort-filter");
const quickFiltersEl = document.getElementById("quick-filters");

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
    return "0 min";
  }

  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 1) {
    return "<1 min";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function titleCaseWord(word) {
  if (!word) {
    return "";
  }

  if (ACRONYMS.has(word)) {
    return ACRONYMS.get(word);
  }

  if (/^\d+$/.test(word) || /^\d{4}s$/.test(word) || /^\d{4}$/.test(word)) {
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

function getStatusLabel(status) {
  if (status === "no_formal_action") {
    return "No action";
  }

  return status.replace(/_/g, " ");
}

function formatTrackingClass(trackingClass) {
  return trackingClass.replace(/_/g, " ");
}

function getPrimaryMoney(project) {
  return project.money_latest_adopted || project.money_adopted_total || project.money_discussed_total || 0;
}

function getListBadges(project) {
  const badges = [];

  if ((project.public_comment_count || 0) > 0 || project.public_input_summary) {
    badges.push("Public input");
  }

  if ((project.top_unresolved_questions || []).length > 0) {
    badges.push("Open questions");
  }

  if ((project.split_vote_count || 0) > 0) {
    badges.push("Split vote");
  }

  if (project.is_named_city_program_or_plan) {
    badges.push("Program / Plan");
  }

  return badges;
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
    ...((project.notable_quotes || []).flatMap((item) => [item.quote, item.speaker])),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildProjects(rawProjects) {
  return rawProjects.map((project) => {
    const title = formatProjectTitle(project.project_id);
    return {
      ...project,
      title,
      listBadges: getListBadges(project),
      primaryMoney: getPrimaryMoney(project),
      searchText: buildSearchText({ ...project, title }),
    };
  });
}

function buildOptionMarkup(options, selectedValue) {
  return options
    .map((option) => `<option value="${option.value}"${option.value === selectedValue ? " selected" : ""}>${option.label}</option>`)
    .join("");
}

function updateFilterControls() {
  const categories = [...new Set(state.allProjects.map((project) => project.category))]
    .sort((a, b) => a.localeCompare(b))
    .map((category) => ({ value: category, label: category }));

  const statuses = [...new Set(state.allProjects.map((project) => project.status_label))]
    .sort((a, b) => getStatusLabel(a).localeCompare(getStatusLabel(b)))
    .map((status) => ({ value: status, label: getStatusLabel(status) }));

  const trackingClasses = [...new Set(state.allProjects.map((project) => project.tracking_class))]
    .sort((a, b) => formatTrackingClass(a).localeCompare(formatTrackingClass(b)))
    .map((trackingClass) => ({ value: trackingClass, label: formatTrackingClass(trackingClass) }));

  categoryFilterEl.innerHTML = buildOptionMarkup(
    [{ value: "all", label: "All categories" }, ...categories],
    state.filters.category
  );
  statusFilterEl.innerHTML = buildOptionMarkup(
    [{ value: "all", label: "All statuses" }, ...statuses],
    state.filters.status
  );
  trackingFilterEl.innerHTML = buildOptionMarkup(
    [{ value: "all", label: "All project types" }, ...trackingClasses],
    state.filters.trackingClass
  );
  sortFilterEl.innerHTML = buildOptionMarkup(SORT_OPTIONS, state.sortBy);

  const toggles = [
    { key: "hasPublicInput", label: "Has public input" },
    { key: "hasOpenQuestions", label: "Open questions" },
    { key: "fundingAttached", label: "Funding attached" },
    { key: "hasSplitVote", label: "Split vote" },
  ];

  quickFiltersEl.innerHTML = toggles
    .map(
      (toggle) => `
        <button
          class="filter-chip${state.filters[toggle.key] ? " active" : ""}"
          type="button"
          data-toggle-filter="${toggle.key}"
          aria-pressed="${state.filters[toggle.key] ? "true" : "false"}"
        >
          ${toggle.label}
        </button>
      `
    )
    .join("");
}

function sortProjects(projects) {
  const items = [...projects];

  items.sort((a, b) => {
    let primaryDiff = 0;

    if (state.sortBy === "discussion") {
      primaryDiff = (b.total_time_spent_this_term_seconds || 0) - (a.total_time_spent_this_term_seconds || 0);
    } else if (state.sortBy === "public_input") {
      primaryDiff = (b.public_comment_count || 0) - (a.public_comment_count || 0);
      if (!primaryDiff) {
        primaryDiff = Number(Boolean(b.public_input_summary)) - Number(Boolean(a.public_input_summary));
      }
    } else if (state.sortBy === "funding") {
      primaryDiff = (b.primaryMoney || 0) - (a.primaryMoney || 0);
    } else {
      primaryDiff = (b.last_action_date || "").localeCompare(a.last_action_date || "");
    }

    if (primaryDiff) {
      return primaryDiff;
    }

    if ((b.last_action_date || "") !== (a.last_action_date || "")) {
      return (b.last_action_date || "").localeCompare(a.last_action_date || "");
    }

    return a.title.localeCompare(b.title);
  });

  return items;
}

function filterAndSortProjects() {
  const term = state.searchTerm.trim().toLowerCase();

  const filtered = state.allProjects.filter((project) => {
    if (term && !project.searchText.includes(term)) {
      return false;
    }

    if (state.filters.category !== "all" && project.category !== state.filters.category) {
      return false;
    }

    if (state.filters.status !== "all" && project.status_label !== state.filters.status) {
      return false;
    }

    if (state.filters.trackingClass !== "all" && project.tracking_class !== state.filters.trackingClass) {
      return false;
    }

    if (state.filters.hasPublicInput && !((project.public_comment_count || 0) > 0 || project.public_input_summary)) {
      return false;
    }

    if (state.filters.hasOpenQuestions && !(project.top_unresolved_questions || []).length) {
      return false;
    }

    if (state.filters.fundingAttached && !(project.primaryMoney > 0)) {
      return false;
    }

    if (state.filters.hasSplitVote && !((project.split_vote_count || 0) > 0)) {
      return false;
    }

    return true;
  });

  state.visibleProjects = sortProjects(filtered);

  if (!state.visibleProjects.some((project) => project.project_id === state.selectedProjectId)) {
    state.selectedProjectId = state.visibleProjects[0]?.project_id || null;
    updateHash(state.selectedProjectId);
  }
}

function renderSidebar() {
  if (!state.visibleProjects.length) {
    sidebarScroll.innerHTML = `
      <div class="empty-message">
        <div>
          <div class="empty-title">No matches</div>
          <div class="empty-sub">Try relaxing a filter or broadening the search to see more tracked projects.</div>
        </div>
      </div>
    `;
    return;
  }

  sidebarScroll.innerHTML = `
    <div class="results-summary">
      <div class="results-title">${state.visibleProjects.length} tracked ${state.visibleProjects.length === 1 ? "project" : "projects"}</div>
      <div class="results-sub">Sorted by ${SORT_OPTIONS.find((option) => option.value === state.sortBy)?.label.toLowerCase() || "recent activity"}</div>
    </div>
    <div class="project-list project-list-flat">
      ${state.visibleProjects
        .map((project) => {
          const badgesMarkup = project.listBadges.length
            ? `<div class="row-badges">${project.listBadges.map((badge) => `<span class="mini-chip">${badge}</span>`).join("")}</div>`
            : "";

          return `
            <button
              class="project-row${project.project_id === state.selectedProjectId ? " active" : ""}"
              type="button"
              data-project-id="${project.project_id}"
              style="--category-color:${CATEGORY_COLORS[project.category] || "#2f6fb0"}"
            >
              <span class="proj-topline">
                <span class="proj-category">${project.category}</span>
                <span class="status-pill status-${project.status_label}">${getStatusLabel(project.status_label)}</span>
              </span>
              <span class="proj-title">${project.title}</span>
              <span class="proj-summary proj-current-status">${project.current_status || project.one_sentence_summary}</span>
              <span class="proj-meta-line">
                <span>${formatDate(project.last_action_date)}</span>
                <span>${formatTrackingClass(project.tracking_class)}</span>
              </span>
              <span class="proj-metrics">
                <span class="metric-chip">${formatDuration(project.total_time_spent_this_term_seconds || 0)} discussion</span>
                <span class="metric-chip">${project.vote_count || 0} ${project.vote_count === 1 ? "vote" : "votes"}</span>
                <span class="metric-chip">${project.public_comment_count || 0} public comments</span>
                ${project.primaryMoney > 0 ? `<span class="metric-chip">${formatCurrency(project.primaryMoney)}</span>` : ""}
              </span>
              ${badgesMarkup}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function createMetric(label, value, accent = false) {
  return `
    <div class="metric${accent ? " metric-accent" : ""}">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value}</div>
    </div>
  `;
}

function createDetailSection(label, bodyMarkup, extraClass = "") {
  return `
    <section class="section-card${extraClass ? ` ${extraClass}` : ""}">
      <p class="section-label">${label}</p>
      ${bodyMarkup}
    </section>
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
          <div class="main-empty-title">No project selected</div>
          <div class="main-empty-sub">
            Pick a project from the left to open a tracking brief with status, context, money, discussion, and timeline.
          </div>
        </div>
      </div>
    `;
    return;
  }

  const categoryColor = CATEGORY_COLORS[project.category] || "#2f6fb0";
  const metrics = [
    createMetric("Funding", formatLongCurrency(project.primaryMoney), project.primaryMoney > 0),
    createMetric("Votes", `${project.vote_count || 0}`),
    createMetric("Public comments", `${project.public_comment_count || 0}`),
    createMetric("Discussion time", formatDuration(project.total_time_spent_this_term_seconds || 0)),
    createMetric("Open questions", `${(project.top_unresolved_questions || []).length}`),
    createMetric("Split votes", `${project.split_vote_count || 0}`),
  ].join("");

  const evidenceCards = [];

  if (project.council_discussion_summary) {
    evidenceCards.push(
      createDetailSection(
        "Council Discussion",
        `<p class="body-text">${project.council_discussion_summary}</p>`
      )
    );
  }

  if (project.public_input_summary) {
    evidenceCards.push(
      createDetailSection(
        "Public Input",
        `<p class="body-text">${project.public_input_summary}</p>`
      )
    );
  }

  if ((project.top_unresolved_questions || []).length > 0) {
    evidenceCards.push(
      createDetailSection(
        "Open Questions",
        `
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
      )
    );
  }

  if ((project.notable_quotes || []).length > 0) {
    evidenceCards.push(
      createDetailSection(
        "Notable Quotes",
        `
          <div class="quote-list">
            ${project.notable_quotes
              .slice(0, 3)
              .map(
                (item) => `
                  <figure class="quote-card">
                    <blockquote class="quote-text">"${item.quote}"</blockquote>
                    <figcaption class="quote-meta">
                      <span>${item.speaker || "Unknown speaker"}</span>
                      <span>${formatDate(item.meeting_date)}</span>
                      ${item.timestamp ? `<span>${item.timestamp}</span>` : ""}
                    </figcaption>
                  </figure>
                `
              )
              .join("")}
          </div>
        `,
        "section-card-wide"
      )
    );
  }

  const timelineMarkup = (project.recent_timeline || []).length
    ? `
      <div class="timeline-list">
        ${project.recent_timeline
          .map(
            (item) => `
              <div class="timeline-item">
                <div class="timeline-marker"></div>
                <div class="timeline-date">${formatDate(item.date)}</div>
                <div class="timeline-text">${item.summary}</div>
              </div>
            `
          )
          .join("")}
      </div>
    `
    : `<p class="body-text">No timeline entries are available yet for this project.</p>`;

  detailPanel.innerHTML = `
    <div class="detail-shell" style="--category-color:${categoryColor}">
      <div class="detail-main detail-main-full">
        <header class="detail-header">
          <div class="detail-tag-row">
            <div class="detail-tag">
              <span class="cat-dot" style="background:${categoryColor}"></span>
              ${project.category}
            </div>
            <div class="detail-metadata">
              <span class="meta-chip">${formatTrackingClass(project.tracking_class)}</span>
              ${project.is_named_city_program_or_plan ? `<span class="meta-chip">Program / Plan</span>` : ""}
            </div>
          </div>
          <div class="detail-status-row">
            <span class="status-pill status-${project.status_label}">${getStatusLabel(project.status_label)}</span>
            <span>Last action: ${formatDate(project.last_action_date)}</span>
          </div>
          <h2 class="detail-title">${project.title}</h2>
          <div class="detail-current-status">${project.current_status || project.one_sentence_summary}</div>
          <p class="detail-summary">${project.one_sentence_summary}</p>
        </header>

        <div class="content-grid">
          ${project.why_this_matters_locally
            ? createDetailSection(
                "Why It Matters",
                `<p class="matters-text">${project.why_this_matters_locally}</p>`
              )
            : ""}

          ${createDetailSection("Key Metrics", `<div class="metrics">${metrics}</div>`)}

          ${evidenceCards.join("")}

          ${createDetailSection("Timeline", timelineMarkup, "section-card-wide")}
        </div>
      </div>
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

function applyFiltersAndRender() {
  filterAndSortProjects();
  renderSidebar();
  renderDetail();
}

function bindSidebarEvents() {
  sidebarScroll.addEventListener("click", (event) => {
    const projectButton = event.target.closest("[data-project-id]");
    if (!projectButton) {
      return;
    }

    const projectId = projectButton.dataset.projectId;
    state.selectedProjectId = projectId;
    updateHash(projectId);
    renderSidebar();
    renderDetail();
  });
}

function bindControlEvents() {
  categoryFilterEl.addEventListener("change", (event) => {
    state.filters.category = event.target.value;
    applyFiltersAndRender();
  });

  statusFilterEl.addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    applyFiltersAndRender();
  });

  trackingFilterEl.addEventListener("change", (event) => {
    state.filters.trackingClass = event.target.value;
    applyFiltersAndRender();
  });

  sortFilterEl.addEventListener("change", (event) => {
    state.sortBy = event.target.value;
    applyFiltersAndRender();
  });

  quickFiltersEl.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-toggle-filter]");
    if (!chip) {
      return;
    }

    const key = chip.dataset.toggleFilter;
    state.filters[key] = !state.filters[key];
    updateFilterControls();
    applyFiltersAndRender();
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
    ? `Tracking desk · ${state.latestYear}`
    : "Tracking desk";
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
  updateFilterControls();

  syncSelectionFromHash();
  applyFiltersAndRender();
}

function updateHeroStats() {
  const projects = state.allProjects;
  const totalFunding = projects.reduce((sum, project) => sum + (project.money_adopted_total || 0), 0);
  const activeCount = projects.filter((project) => ["active", "introduced"].includes(project.status_label)).length;
  const discussedCount = projects.filter((project) => (project.total_time_spent_this_term_seconds || 0) >= 300).length;
  const watchlistCount = projects.filter(
    (project) => (project.top_unresolved_questions || []).length > 0 || project.public_input_summary
  ).length;

  heroStatsEl.innerHTML = `
    <div class="hero-card">
      <span class="hero-card-value">${projects.length}</span>
      <span class="hero-card-label">Projects in the current prototype dataset</span>
    </div>
    <div class="hero-card">
      <span class="hero-card-value">${formatCurrency(totalFunding)}</span>
      <span class="hero-card-label">Adopted funding tied to tracked decisions and initiatives</span>
    </div>
    <div class="hero-card">
      <span class="hero-card-value">${activeCount}</span>
      <span class="hero-card-label">Items still active or newly introduced</span>
    </div>
    <div class="hero-card">
      <span class="hero-card-value">${watchlistCount + discussedCount}</span>
      <span class="hero-card-label">Projects with heat: debate, input, or unresolved questions</span>
    </div>
  `;
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
  applyFiltersAndRender();
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
bindControlEvents();
loadProjects().catch(showLoadError);
