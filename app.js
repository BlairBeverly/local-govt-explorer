const CATEGORY_META = {
  infrastructure_and_transportation: { label: "Infrastructure", color: "#378ADD", dot: "#85B7EB", emoji: "🛣" },
  housing_and_development: { label: "Housing", color: "#1D9E75", dot: "#5DCAA5", emoji: "🏠" },
  economic_development_and_downtown: { label: "Economic Dev", color: "#BA7517", dot: "#EF9F27", emoji: "🏨" },
  public_safety: { label: "Public Safety", color: "#D85A30", dot: "#F0997B", emoji: "🚨" },
  community_and_social_services: { label: "Community", color: "#7F77DD", dot: "#AFA9EC", emoji: "🤝" },
  governance_and_policy: { label: "Governance", color: "#5F5E5A", dot: "#B4B2A9", emoji: "🏛" },
  city_operations_and_finance: { label: "Governance", color: "#5F5E5A", dot: "#B4B2A9", emoji: "📋" },
  environment_and_sustainability: { label: "Environment", color: "#639922", dot: "#97C459", emoji: "🌿" },
  community_recognition_and_ceremonial: { label: "Community", color: "#7F77DD", dot: "#AFA9EC", emoji: "🎖" },
};

const ATTRIBUTE_FILTERS = [
  { id: "active", label: "Active" },
  { id: "urgent", label: "Time-sensitive" },
  { id: "funding", label: "Has funding" },
  { id: "public_comment", label: "Public comment" },
  { id: "open_questions", label: "Open questions" },
  { id: "long_discussion", label: "Long discussion" },
  { id: "voted", label: "Voted on" },
];

const TITLE_OVERRIDES = {
  proj_champaign_city_council_purchase_of_gas_identification_system_for_fire_department:
    "Fire Department gets hazardous gas scanner",
  proj_champaign_city_council_zoning_map_amendment_for_810_south_staley_road:
    "Staley Road rezoned for office development",
  proj_champaign_city_council_champaign_center_partnership_annual_funding_agreement:
    "Downtown partnership gets another year of funding",
  proj_champaign_city_council_2026_street_patching_project:
    "Street patching contract approved for 2026",
  proj_champaign_city_council_2026_public_works_vehicle_purchase_illini_nissan_inc:
    "Public Works buys three new SUVs",
  proj_champaign_city_council_2026_public_works_vehicle_purchase_landmark_ford_inc:
    "City buys first electric service van",
  proj_champaign_city_council_mattis_avenue_improvements_project_windsor_road_to_curtis_road:
    "Mattis Avenue improvements move into construction",
  proj_champaign_city_council_champaign_township_funding_and_support_for_prosperity_gardens:
    "Township funding questions remain unresolved",
  proj_champaign_township_board_strides_shelter_and_prosperity_gardens_funding_and_operations:
    "Shelter funding crisis heads toward April",
  proj_champaign_city_council_champaign_park_apartments_litigation_settlement:
    "Champaign Park apartments lawsuit nears settlement",
  proj_champaign_city_council_annual_city_insurance_agreements_2026_2027:
    "City insurance contracts approved for 2026-27",
  proj_champaign_city_council_graduate_hotel_downtown_development_agreement:
    "Downtown hotel deal moves forward",
  proj_champaign_city_council_special_use_permit_for_duplex_at_410_west_healey_street:
    "Duplex at 410 W Healey approved",
  proj_champaign_city_council_2026_2027_road_salt_purchase:
    "Road salt purchase approved for winter",
  proj_champaign_city_council_2027_asphalt_streets_improvement_project:
    "Design work advances for 2027 streets",
  proj_champaign_city_council_2026_concrete_street_improvements_project:
    "Concrete street repairs approved for 2026",
  proj_champaign_city_council_community_response_and_engagement_on_gun_violence:
    "Gun violence response after recent shooting",
  proj_champaign_city_council_fy_26_27_annual_action_plan_and_private_activity_bond_cap_strategy:
    "Council sets federal housing funding plan",
};

const ACRONYMS = new Map([
  ["fy", "FY"],
  ["hvac", "HVAC"],
  ["llc", "LLC"],
  ["npdes", "NPDES"],
  ["imrf", "IMRF"],
]);

const state = {
  projects: [],
  visibleProjects: [],
  selectedProjectId: null,
  searchTerm: "",
  activeTopicFilters: new Set(),
  activeAttributeFilters: new Set(),
};

const heroStatsEl = document.getElementById("hero-stats");
const mobileBannerStatsEl = document.getElementById("mobile-banner-stats");
const searchInputEl = document.getElementById("project-search");
const topicChipsEl = document.getElementById("topic-chips");
const attributeChipsEl = document.getElementById("attribute-chips");
const resultCountEl = document.getElementById("result-count");
const cardsGridEl = document.getElementById("cards-grid");
const detailLayerEl = document.getElementById("detail-layer");
const detailPanelEl = document.getElementById("detail-panel");
const detailBackdropEl = document.getElementById("detail-backdrop");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function titleCaseWord(word) {
  if (!word) {
    return "";
  }

  const lower = word.toLowerCase();
  if (ACRONYMS.has(lower)) {
    return ACRONYMS.get(lower);
  }

  if (/^\d+$/.test(word) || /^\d{4}$/.test(word)) {
    return word;
  }

  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatProjectTitle(projectId) {
  return projectId
    .replace(/^proj_/, "")
    .replace(/^champaign_city_council_/, "")
    .split("_")
    .map(titleCaseWord)
    .join(" ")
    .replace(/\bFor\b/g, "for")
    .replace(/\bAnd\b/g, "and")
    .replace(/\bOf\b/g, "of")
    .replace(/\bTo\b/g, "to")
    .replace(/\bWith\b/g, "with");
}

function formatDate(dateString, style = "short") {
  if (!dateString) {
    return "Unknown date";
  }

  return new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", {
    month: style === "short" ? "short" : "long",
    day: "numeric",
    year: style === "short" ? undefined : "numeric",
  });
}

function formatDateRange(dateStrings) {
  const sortedDates = [...new Set(dateStrings.filter(Boolean))].sort();
  if (!sortedDates.length) {
    return "No dates";
  }

  const first = sortedDates[0];
  const last = sortedDates[sortedDates.length - 1];

  if (first === last) {
    return `Since ${formatDate(first)}`;
  }

  return `Since ${formatDate(first)}`;
}

function formatCurrency(amount) {
  if (!amount) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: amount >= 100000 ? "compact" : "standard",
    maximumFractionDigits: amount >= 100000 ? 1 : 0,
  })
    .format(amount)
    .replace(".0", "");
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

function formatMinutes(totalSeconds) {
  if (!totalSeconds) {
    return null;
  }

  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  return `${minutes} min`;
}

function getCategoryMeta(rawCategory) {
  return CATEGORY_META[rawCategory] || {
    label: rawCategory.replace(/_/g, " "),
    color: "#5F5E5A",
    dot: "#B4B2A9",
    emoji: "📌",
  };
}

function getStatusLabel(status) {
  if (status === "no_formal_action") {
    return "no action";
  }

  return status.replace(/_/g, " ");
}

function getDisplayStatusLabel(statusClass) {
  if (statusClass === "urgent") {
    return "time-sensitive";
  }

  if (statusClass === "no_action") {
    return "no action";
  }

  return statusClass.replace(/_/g, " ");
}

function getStatusClass(project) {
  if (project.isUrgent) {
    return "urgent";
  }

  if (project.status_label === "approved" || project.status_label === "complete") {
    return "approved";
  }

  if (project.status_label === "active" || project.status_label === "introduced") {
    return "active";
  }

  return "no_action";
}

function getPrimaryMoney(project) {
  return project.money_latest_adopted || project.money_adopted_total || project.money_discussed_total || 0;
}

function deriveEmoji(project, categoryMeta) {
  const text = `${project.project_id} ${project.one_sentence_summary} ${project.current_status}`.toLowerCase();

  if (text.includes("road salt") || text.includes("winter season")) return "❄️";
  if (text.includes("office") || text.includes("city hall") || text.includes("university")) return "🏢";
  if (text.includes("concrete") || text.includes("street improvements") || text.includes("construction")) return "👷";
  if (text.includes("housing") || text.includes("duplex") || text.includes("zoning")) return "🏠";
  if (text.includes("shelter") || text.includes("homeless")) return "🏚";
  if (text.includes("hotel")) return "🏨";
  if (text.includes("street") || text.includes("road") || text.includes("traffic")) return "🛣";
  if (text.includes("bike")) return "🚴";
  if (text.includes("fire")) return "🚒";
  if (text.includes("gun violence") || text.includes("shooting") || text.includes("police")) return "🚨";
  if (text.includes("stormwater") || text.includes("environment")) return "🌿";

  return categoryMeta.emoji;
}

function splitSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function shortenQuote(text, maxLength = 110) {
  const normalized = String(text || "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const clauses = normalized.split(/(?<=[,.;!?])\s+/);
  let result = "";
  for (const clause of clauses) {
    const candidate = result ? `${result} ${clause}` : clause;
    if (candidate.length > maxLength) {
      break;
    }
    result = candidate;
  }

  return result || normalized.slice(0, maxLength).trim();
}

function shortenForCard(text, maxLength = 190) {
  const normalized = String(text || "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const clauses = normalized.split(/(?<=[,.;!?—])\s+/);
  let result = "";
  for (const clause of clauses) {
    const candidate = result ? `${result} ${clause}` : clause;
    if (candidate.length > maxLength) {
      break;
    }
    result = candidate;
  }

  const useClauseBoundary = result && result.length >= maxLength * 0.72;
  const trimmed = (useClauseBoundary ? result : normalized.slice(0, maxLength))
    .trim()
    .replace(/[.,;:!?—-]+$/, "");
  return `${trimmed}...`;
}

function deriveTitleFromSummary(project) {
  if (TITLE_OVERRIDES[project.project_id]) {
    return TITLE_OVERRIDES[project.project_id];
  }

  if (project.title && project.title.split(/\s+/).length >= 5 && project.title.split(/\s+/).length <= 8) {
    return project.title;
  }

  const text = `${project.project_id} ${project.one_sentence_summary} ${project.current_status}`.toLowerCase();

  if (text.includes("gun violence")) return "Gun violence response after recent shooting";
  if (text.includes("second floor office") || text.includes("201 w. university") || text.includes("201 w university")) {
    return "New office design work at 201 W University";
  }
  if (text.includes("road salt")) return "Road salt purchase for the 2026-27 winter season";
  if (text.includes("concrete street improvements")) return "Concrete street repairs approved for 2026";
  if (text.includes("asphalt streets improvement")) return "Design work moves ahead for 2027 street repairs";
  if (text.includes("graduate hotel")) return "Downtown hotel deal moves forward";
  if (text.includes("duplex") && text.includes("410")) return "Duplex at 410 W Healy gets council approval";
  if (text.includes("prosperity gardens")) return "Township funding questions remain for Prosperity Gardens";
  if (text.includes("shelter")) return "Shelter funding remains unsettled";
  if (text.includes("fire academy")) return "Fire Academy funded for another year";
  if (text.includes("insurance")) return "City insurance contracts approved for 2026-27";
  if (text.includes("bike share")) return "Bike share debate still unresolved";

  const summaryLead = splitSentences(project.current_status || project.one_sentence_summary)[0] || project.title;
  return summaryLead
    .replace(/^on\s+[a-z]+\s+\d{1,2},\s+\d{4},?\s*/i, "")
    .replace(/^as of\s+[a-z]+\s+\d{1,2},\s+\d{4},?\s*/i, "")
    .replace(/^at the most recent meeting on\s+\d{4}-\d{2}-\d{2},?\s*/i, "")
    .replace(/^the\s+champaign\s+city\s+council\s+/i, "")
    .replace(/^council\s+/i, "")
    .replace(/^city council\s+/i, "")
    .replace(/^unanimously\s+/i, "")
    .replace(/^approved\s+/i, "")
    .replace(/^discussed\s+/i, "")
    .replace(/^has discussed\s+/i, "")
    .replace(/^is discussing\s+/i, "")
    .replace(/\.$/, "")
    .trim();
}

function extractVoteResult(project) {
  const text = [
    project.current_status,
    ...(project.recent_timeline || []).map((item) => item.summary),
    project.one_sentence_summary,
  ]
    .filter(Boolean)
    .join(" ");

  const directMatch = text.match(/\b(\d+\s*-\s*\d+)\b/);
  if (directMatch) {
    return directMatch[1].replace(/\s+/g, "");
  }

  if (project.votedOn && project.split_vote_count === 0 && /\bunanimous|unanimously\b/i.test(text)) {
    return "unanimous";
  }

  return null;
}

function getCouncilAction(project) {
  const actionText = [
    project.status_label,
    project.current_status,
    project.one_sentence_summary,
    ...(project.recent_timeline || []).map((item) => item.summary),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (project.split_vote_count > 0) {
    return "Split vote";
  }

  if (
    project.statusClass === "approved" ||
    /(approved|adopted|passed|authorized|awarded|accepted|ratified|settlement approved)/.test(actionText) ||
    (project.money_adopted_total || 0) > 0 ||
    (project.money_latest_adopted || 0) > 0
  ) {
    return "Approved";
  }

  if (project.hasOpenQuestions || project.statusClass === "urgent" || project.statusClass === "active") {
    return "Unresolved";
  }

  if (project.votedOn) {
    return "Approved";
  }

  if (project.discussionLabel || (project.recent_timeline || []).length) {
    return "No vote";
  }

  return "Unresolved";
}

function normalizeSourceLinks(project) {
  const billUrl =
    project.bill_text_url ||
    project.bill_text_link ||
    project.bill_url ||
    project.bill_link ||
    project.legislation_url ||
    project.ordinance_url ||
    "";

  const videoUrl =
    project.meeting_video_url ||
    project.video_url ||
    project.meeting_video_link ||
    project.video_link ||
    project.youtube_url ||
    "";

  const links = [];

  if (billUrl) {
    links.push({ label: "Bill text", value: billUrl, href: billUrl, kind: "link" });
  }

  if (videoUrl) {
    links.push({ label: "Meeting video", value: videoUrl, href: videoUrl, kind: "link" });
  }

  return links;
}

function buildHook(project) {
  if (project.notable_quotes?.length) {
    const shortQuote = shortenQuote(project.notable_quotes[0].quote);
    if (shortQuote && shortQuote.length >= 50 && shortQuote.length <= 110) {
      return `"${shortQuote}"`;
    }
  }

  const whySentences = splitSentences(project.why_this_matters_locally);
  if (whySentences.length) {
    return whySentences[0];
  }

  const currentSentences = splitSentences(project.current_status);
  if (currentSentences.length) {
    return currentSentences[0];
  }

  return project.one_sentence_summary;
}

function buildSearchText(project) {
  return [
    project.title,
    project.hook,
    project.categoryMeta.label,
    project.one_sentence_summary,
    project.current_status,
    project.why_this_matters_locally,
    project.public_input_summary,
    project.council_discussion_summary,
    ...(project.top_unresolved_questions || []),
    ...(project.notable_quotes || []).flatMap((quote) => [quote.quote, quote.speaker]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildProject(rawProject) {
  const categoryMeta = getCategoryMeta(rawProject.category);
  const title = deriveTitleFromSummary({
    ...rawProject,
    title: rawProject.title || formatProjectTitle(rawProject.project_id),
  });
  const primaryMoney = getPrimaryMoney(rawProject);
  const discussionLabel = formatMinutes(rawProject.total_time_spent_this_term_seconds);
  const hasPublicComment = (rawProject.public_comment_count || 0) > 0 || Boolean(rawProject.public_input_summary);
  const hasOpenQuestions = (rawProject.top_unresolved_questions || []).length > 0;
  const votedOn = (rawProject.vote_count || 0) > 0;
  const longDiscussion = (rawProject.total_time_spent_this_term_seconds || 0) >= 12 * 60;
  const urgencyText = `${rawProject.current_status} ${rawProject.why_this_matters_locally} ${rawProject.one_sentence_summary}`.toLowerCase();
  const isUrgent =
    rawProject.status_label === "urgent" ||
    /urgent|weeks|closure|lose shelter|fatal|deadline|crisis|immediately/.test(urgencyText);

  const project = {
    ...rawProject,
    title,
    categoryMeta,
    emoji: rawProject.emoji || deriveEmoji(rawProject, categoryMeta),
    hook: rawProject.hook || buildHook(rawProject),
    cardHook: shortenForCard(rawProject.hook || buildHook(rawProject)),
    primaryMoney,
    discussionLabel,
    hasPublicComment,
    hasOpenQuestions,
    votedOn,
    voteResult: null,
    longDiscussion,
    isUrgent,
  };

  project.statusClass = getStatusClass(project);
  project.voteResult = extractVoteResult(project);
  project.councilAction = getCouncilAction(project);
  project.primarySources = normalizeSourceLinks(project);
  project.searchText = buildSearchText(project);
  return project;
}

function updateHeroStats() {
  const totalFunding = state.projects.reduce((sum, project) => sum + (project.money_adopted_total || 0), 0);
  const activeCount = state.projects.filter(
    (project) => project.status_label === "active" || project.status_label === "introduced"
  ).length;
  const totalPublicComments = state.projects.reduce((sum, project) => sum + (project.public_comment_count || 0), 0);
  const totalVotes = state.projects.reduce((sum, project) => sum + (project.vote_count || 0), 0);
  const coverageDates = state.projects.flatMap((project) =>
    [(project.last_action_date || ""), ...(project.recent_timeline || []).map((item) => item.date)].filter(Boolean)
  );

  heroStatsEl.innerHTML = `
    <div class="stat-card"><span class="stat-num">${state.projects.length}</span><span class="stat-label">projects tracked</span></div>
    <div class="stat-card"><span class="stat-num">${formatCurrency(totalFunding)}</span><span class="stat-label">adopted funding</span></div>
    <div class="stat-card"><span class="stat-num">${activeCount}</span><span class="stat-label">active projects</span></div>
    <div class="stat-card stat-card-optional"><span class="stat-num">${totalPublicComments}</span><span class="stat-label">public comments</span></div>
    <div class="stat-card stat-card-optional"><span class="stat-num">${totalVotes}</span><span class="stat-label">votes recorded</span></div>
    <div class="stat-card stat-card-optional stat-card-optional-wide"><span class="stat-num">${escapeHtml(formatDateRange(coverageDates))}</span><span class="stat-label">meeting coverage</span></div>
  `;

  if (mobileBannerStatsEl) {
    mobileBannerStatsEl.innerHTML = "";
  }
}

function renderTopicChips() {
  const topics = [...new Map(state.projects.map((project) => [project.categoryMeta.label, project.categoryMeta])).entries()];

  topicChipsEl.innerHTML = topics
    .map(([label, meta]) => {
      const active = state.activeTopicFilters.has(label);
      return `
        <button
          class="chip topic-chip${active ? " on" : ""}"
          type="button"
          data-topic-chip="${escapeHtml(label)}"
          style="--chip-color:${meta.color};--chip-dot:${meta.dot}"
          aria-pressed="${active ? "true" : "false"}"
        >
          <span class="chip-dot"></span>
          ${escapeHtml(label)}
        </button>
      `;
    })
    .join("");
}

function renderAttributeChips() {
  attributeChipsEl.innerHTML = ATTRIBUTE_FILTERS
    .map((filter) => {
      const active = state.activeAttributeFilters.has(filter.id);
      return `
        <button
          class="chip attribute-chip${active ? " on" : ""}"
          type="button"
          data-attribute-chip="${filter.id}"
          aria-pressed="${active ? "true" : "false"}"
        >
          ${escapeHtml(filter.label)}
        </button>
      `;
    })
    .join("");
}

function passesFilters(project) {
  if (state.searchTerm && !project.searchText.includes(state.searchTerm)) {
    return false;
  }

  if (state.activeTopicFilters.size && !state.activeTopicFilters.has(project.categoryMeta.label)) {
    return false;
  }

  for (const filter of state.activeAttributeFilters) {
    if (filter === "active" && !["active", "urgent", "no_action"].includes(project.statusClass)) return false;
    if (filter === "urgent" && !project.isUrgent) return false;
    if (filter === "funding" && !(project.primaryMoney > 0)) return false;
    if (filter === "public_comment" && !project.hasPublicComment) return false;
    if (filter === "open_questions" && !project.hasOpenQuestions) return false;
    if (filter === "long_discussion" && !project.longDiscussion) return false;
    if (filter === "voted" && !project.votedOn) return false;
  }

  return true;
}

function sortProjects(projects) {
  return [...projects].sort((a, b) => {
    if (a.last_action_date !== b.last_action_date) {
      return b.last_action_date.localeCompare(a.last_action_date);
    }

    if (a.isUrgent !== b.isUrgent) {
      return Number(b.isUrgent) - Number(a.isUrgent);
    }

    return a.title.localeCompare(b.title);
  });
}

function createBadge(label, tone) {
  return `<span class="badge badge-${tone}">${escapeHtml(label)}</span>`;
}

function buildCardBadges(project) {
  const badges = [];

  if (project.primaryMoney > 0) {
    badges.push(createBadge(formatCurrency(project.primaryMoney), "money"));
  }

  if (project.hasPublicComment) {
    badges.push(createBadge("public input", "pub"));
  }

  if (project.discussionLabel) {
    badges.push(createBadge(project.discussionLabel, "time"));
  }

  if (project.voteResult) {
    badges.push(createBadge(project.voteResult, "vote"));
  }

  return badges.slice(0, 3).join("");
}

function renderCards() {
  state.visibleProjects = sortProjects(state.projects.filter(passesFilters));
  resultCountEl.textContent =
    state.visibleProjects.length === state.projects.length
      ? `${state.projects.length} projects`
      : `${state.visibleProjects.length} of ${state.projects.length} projects`;

  if (!state.visibleProjects.length) {
    cardsGridEl.innerHTML = `<div class="empty-state">No projects match those filters.</div>`;
    return;
  }

  cardsGridEl.innerHTML = state.visibleProjects
    .map((project) => {
      const statusLabel = getDisplayStatusLabel(project.statusClass);

      return `
        <button class="project-card" type="button" data-project-id="${project.project_id}">
          <div class="card-signal-row card-signal-row-top">
            <span class="card-badges">${buildCardBadges(project)}</span>
            <span class="card-status-date">
              <span class="status-pill status-${project.statusClass}">${escapeHtml(statusLabel)}</span>
            </span>
          </div>
          <div class="card-head">
            <span class="card-emoji">${project.emoji}</span>
            <div class="card-title">${escapeHtml(project.title)}</div>
          </div>
          <div class="card-hook">${escapeHtml(project.cardHook || project.hook)}</div>
          <div class="card-foot">
            <span class="card-foot-left card-foot-meta">
              <span class="foot-dot" style="background:${project.categoryMeta.dot}"></span>
              <span>${escapeHtml(project.categoryMeta.label)}</span>
            </span>
            <span class="card-foot-right">
              <span class="foot-date">${escapeHtml(formatDate(project.last_action_date))}</span>
            </span>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderLoadingCards() {
  cardsGridEl.innerHTML = `<div class="empty-state">Loading project feed…</div>`;
}

function createMetricCard(label, value) {
  return `
    <div class="detail-metric">
      <div class="detail-metric-label">${escapeHtml(label)}</div>
      <div class="detail-metric-value">${escapeHtml(value)}</div>
    </div>
  `;
}

function renderDetail(projectId) {
  const project = state.projects.find((item) => item.project_id === projectId);
  if (!project) {
    return;
  }

  state.selectedProjectId = project.project_id;
  const statusLabel = getDisplayStatusLabel(project.statusClass);
  const metrics = [
    createMetricCard("Funding", formatLongCurrency(project.primaryMoney)),
    createMetricCard("Council action", project.councilAction),
    createMetricCard("Public input", `${project.public_comment_count || 0}`),
    createMetricCard("Discussion time", project.discussionLabel || "None"),
    createMetricCard("Open questions", `${(project.top_unresolved_questions || []).length}`),
  ].join("");

  const timelineMarkup = (project.recent_timeline || [])
    .map(
      (item) => `
        <li class="timeline-item">
          <div class="timeline-date">${escapeHtml(formatDate(item.date, "long"))}</div>
          <div class="timeline-copy">${escapeHtml(item.summary)}</div>
        </li>
      `
    )
    .join("");

  const sourceMarkup = (project.primarySources || [])
    .map(
      (source) => `
        <li class="source-item">
          <span class="source-label">${escapeHtml(source.label)}</span>
          ${
            source.href
              ? `<a class="source-link" href="${escapeHtml(source.href)}" target="_blank" rel="noreferrer">${escapeHtml(source.value)}</a>`
              : `<span class="source-id">${escapeHtml(source.value)}</span>`
          }
        </li>
      `
    )
    .join("");

  const quoteMarkup = (project.notable_quotes || []).length
    ? `
      <section class="detail-section">
        <h3 class="detail-section-label">Notable quote</h3>
        ${project.notable_quotes
          .slice(0, 1)
          .map(
            (quote) => `
              <blockquote class="detail-quote">
                “${escapeHtml(quote.quote)}”
                <footer>${escapeHtml(quote.speaker || "Unknown speaker")} · ${escapeHtml(formatDate(quote.meeting_date, "long"))}</footer>
              </blockquote>
            `
          )
          .join("")}
      </section>
    `
    : "";

  detailPanelEl.innerHTML = `
    <div class="detail-panel-inner">
      <div class="detail-panel-header">
        <button class="detail-close detail-close-inline" type="button" data-close-detail>Back to feed</button>
        <button class="detail-close detail-close-icon" type="button" data-close-detail aria-label="Close">×</button>
      </div>

      <div class="detail-scroll">
        <div class="detail-kicker">
          <span class="detail-category-tag" style="--tag-color:${project.categoryMeta.color};--tag-dot:${project.categoryMeta.dot}">${escapeHtml(project.categoryMeta.label)}</span>
          <span class="status-pill status-${project.statusClass}">${escapeHtml(statusLabel)}</span>
        </div>

        <h2 class="detail-title" id="detail-title">${escapeHtml(project.title)}</h2>

        <div class="detail-meta">
          <span>Last action ${escapeHtml(formatDate(project.last_action_date, "long"))}</span>
          <span>${escapeHtml(project.discussionLabel || "No discussion recorded")}</span>
        </div>

        <section class="detail-section detail-section-lead">
          <p class="detail-hook">${escapeHtml(project.hook)}</p>
        </section>

        <section class="detail-section detail-section-briefing">
          <h3 class="detail-section-label">What happened</h3>
          <p class="detail-summary">${escapeHtml(project.current_status || project.one_sentence_summary)}</p>
        </section>

        <section class="detail-section detail-section-briefing">
          <h3 class="detail-section-label">Why this matters</h3>
          <p class="detail-why">${escapeHtml(project.why_this_matters_locally || project.hook)}</p>
        </section>

        <section class="detail-section">
          <h3 class="detail-section-label">Key metrics</h3>
          <div class="detail-metrics-grid">${metrics}</div>
        </section>

        ${(project.top_unresolved_questions || []).length
          ? `
            <section class="detail-section">
              <h3 class="detail-section-label">Open questions</h3>
              <div class="open-question-list">
                ${project.top_unresolved_questions
                  .map((question) => `<div class="open-question">${escapeHtml(question)}</div>`)
                  .join("")}
              </div>
            </section>
          `
          : ""}

        ${project.public_input_summary
          ? `
            <section class="detail-section">
              <h3 class="detail-section-label">Public input</h3>
              <p class="detail-body">${escapeHtml(project.public_input_summary)}</p>
            </section>
          `
          : ""}

        ${project.council_discussion_summary
          ? `
            <section class="detail-section">
              <h3 class="detail-section-label">Council discussion</h3>
              <p class="detail-body">${escapeHtml(project.council_discussion_summary)}</p>
            </section>
          `
          : ""}

        ${quoteMarkup}

        <section class="detail-section detail-section-timeline">
          <h3 class="detail-section-label">Timeline</h3>
          <ol class="timeline-list">${timelineMarkup || `<li class="timeline-item"><div class="timeline-copy">No timeline entries yet.</div></li>`}</ol>
        </section>

        ${sourceMarkup
          ? `
            <section class="detail-section">
              <h3 class="detail-section-label">Primary sources</h3>
              <ul class="source-list">${sourceMarkup}</ul>
            </section>
          `
          : ""}
      </div>
    </div>
  `;

  detailLayerEl.classList.remove("hidden");
  detailLayerEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("detail-open");
}

function closeDetail() {
  state.selectedProjectId = null;
  detailLayerEl.classList.add("hidden");
  detailLayerEl.setAttribute("aria-hidden", "true");
  document.body.classList.remove("detail-open");
}

function bindEvents() {
  searchInputEl.addEventListener("input", (event) => {
    state.searchTerm = event.target.value.trim().toLowerCase();
    renderCards();
  });

  topicChipsEl.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-topic-chip]");
    if (!chip) {
      return;
    }

    const topic = chip.dataset.topicChip;
    if (state.activeTopicFilters.has(topic)) {
      state.activeTopicFilters.delete(topic);
    } else {
      state.activeTopicFilters.add(topic);
    }

    renderTopicChips();
    renderCards();
  });

  attributeChipsEl.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-attribute-chip]");
    if (!chip) {
      return;
    }

    const filter = chip.dataset.attributeChip;
    if (state.activeAttributeFilters.has(filter)) {
      state.activeAttributeFilters.delete(filter);
    } else {
      state.activeAttributeFilters.add(filter);
    }

    renderAttributeChips();
    renderCards();
  });

  cardsGridEl.addEventListener("click", (event) => {
    const card = event.target.closest("[data-project-id]");
    if (!card) {
      return;
    }

    renderDetail(card.dataset.projectId);
  });

  detailBackdropEl.addEventListener("click", closeDetail);

  detailPanelEl.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-detail]")) {
      closeDetail();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !detailLayerEl.classList.contains("hidden")) {
      closeDetail();
    }
  });
}

async function loadProjects() {
  renderLoadingCards();

  const response = await fetch("./data/project_views.jsonl");
  if (!response.ok) {
    throw new Error(`Failed to load dataset (${response.status})`);
  }

  const text = await response.text();
  state.projects = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => buildProject(JSON.parse(line)));

  updateHeroStats();
  renderTopicChips();
  renderAttributeChips();
  renderCards();
}

function showLoadError(error) {
  resultCountEl.textContent = "Could not load projects";
  cardsGridEl.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
}

bindEvents();
loadProjects().catch(showLoadError);
