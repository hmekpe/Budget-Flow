(function () {
  const i18n = window.BudgetFlowI18n || {};
  const LANGUAGE_STORAGE_KEY = "budgetFlowLanguage";
  const CURRENCY_STORAGE_KEY = "budgetFlowCurrency";
  const BASE_CURRENCY_STORAGE_KEY = "budgetFlowBaseCurrency";
  const COUNTRY_STORAGE_KEY = "budgetFlowCountryCode";
  const CURRENCIES = {
    GHS: { code: "GHS", locale: "en-GH", symbol: "\u20b5" },
    USD: { code: "USD", locale: "en-US", symbol: "$" },
    EUR: { code: "EUR", locale: "de-DE", symbol: "\u20ac" },
    GBP: { code: "GBP", locale: "en-GB", symbol: "\u00a3" },
    NGN: { code: "NGN", locale: "en-NG", symbol: "\u20a6" },
    KES: { code: "KES", locale: "en-KE", symbol: "KSh" },
    ZAR: { code: "ZAR", locale: "en-ZA", symbol: "R" },
    CAD: { code: "CAD", locale: "en-CA", symbol: "C$" },
    AUD: { code: "AUD", locale: "en-AU", symbol: "A$" },
    JPY: { code: "JPY", locale: "ja-JP", symbol: "\u00a5" },
    INR: { code: "INR", locale: "en-IN", symbol: "\u20b9" },
    BRL: { code: "BRL", locale: "pt-BR", symbol: "R$" },
    AED: { code: "AED", locale: "ar-AE", symbol: "AED" },
    CHF: { code: "CHF", locale: "de-CH", symbol: "CHF" },
    CNY: { code: "CNY", locale: "zh-CN", symbol: "\u00a5" },
    SAR: { code: "SAR", locale: "ar-SA", symbol: "SAR" },
    KRW: { code: "KRW", locale: "ko-KR", symbol: "\u20a9" },
    MXN: { code: "MXN", locale: "es-MX", symbol: "MX$" },
    EGP: { code: "EGP", locale: "ar-EG", symbol: "E\u00a3" }
  };
  let currentLanguage = normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en");
  let currentCurrency = normalizeCurrency(localStorage.getItem(CURRENCY_STORAGE_KEY) || "GHS");
  let currentBaseCurrency = normalizeCurrency(
    localStorage.getItem(BASE_CURRENCY_STORAGE_KEY) || localStorage.getItem(CURRENCY_STORAGE_KEY) || "GHS"
  );
  let currentCountryCode = String(localStorage.getItem(COUNTRY_STORAGE_KEY) || "").trim().toUpperCase();
  let currentExchangeRate = currentBaseCurrency === currentCurrency ? 1 : 1;
  let exchangeRateLabel = "";
  let refreshScheduled = false;
  let observerInstalled = false;
  let isRefreshing = false;
  let currencyRefreshTimer = null;
  let exchangeRequestId = 0;

  function normalizeLanguage(language) {
    return typeof i18n.normalizeLanguage === "function"
      ? i18n.normalizeLanguage(language)
      : "en";
  }

  function normalizeCurrency(currency) {
    const normalized = String(currency || "").trim().toUpperCase();
    return Object.prototype.hasOwnProperty.call(CURRENCIES, normalized) ? normalized : "GHS";
  }

  function t(key, replacements = {}) {
    return typeof i18n.t === "function" ? i18n.t(key, replacements, currentLanguage) : key;
  }

  function localizeSuggestion(text) {
    return typeof i18n.localizeAssistantSuggestion === "function"
      ? i18n.localizeAssistantSuggestion(text, currentLanguage)
      : text;
  }

  function getLocale() {
    return typeof i18n.localeFor === "function" ? i18n.localeFor(currentLanguage) : "en-US";
  }

  function getCurrencyMeta(currency = currentCurrency) {
    return CURRENCIES[normalizeCurrency(currency)] || CURRENCIES.GHS;
  }

  function getCurrencySymbol(currency = currentCurrency) {
    return getCurrencyMeta(currency).symbol;
  }

  function isLocalDevelopment() {
    if (window.location.protocol === "file:") {
      return true;
    }

    const host = window.location.hostname || "localhost";
    return host === "localhost" || host === "127.0.0.1";
  }

  function getRuntimeProtocol() {
    return window.location.protocol === "file:" ? "http:" : window.location.protocol;
  }

  function getFeatureApiBaseUrl() {
    if (isLocalDevelopment()) {
      return `${getRuntimeProtocol()}//${window.location.hostname || "localhost"}:5002/api`;
    }

    return `${window.location.origin}/api`;
  }

  async function refreshExchangeRate() {
    currentExchangeRate = 1;
    exchangeRateLabel = "";

    if (!currentBaseCurrency || !currentCurrency || currentBaseCurrency === currentCurrency) {
      return;
    }

    try {
      const response = await fetch(
        `${getFeatureApiBaseUrl()}/meta/exchange-rate?base=${encodeURIComponent(
          currentBaseCurrency
        )}&target=${encodeURIComponent(currentCurrency)}`,
        {
          headers: {
            Accept: "application/json"
          }
        }
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || `Could not load exchange rate (${response.status})`);
      }

      const rate = Number(payload.rate);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error("Invalid exchange rate received");
      }

      currentExchangeRate = rate;
      exchangeRateLabel = payload.asOf || "";
    } catch (error) {
      console.warn("Budget Flow currency conversion fallback:", error.message);
      currentExchangeRate = 1;
      exchangeRateLabel = "";
    }
  }

  function fromBaseAmount(value) {
    return Number(value || 0) * currentExchangeRate;
  }

  function toBaseAmount(value) {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) {
      return amount;
    }

    if (!Number.isFinite(currentExchangeRate) || currentExchangeRate <= 0) {
      return amount;
    }

    return Number((amount / currentExchangeRate).toFixed(2));
  }

  function formatNumber(value) {
    return fromBaseAmount(value).toLocaleString(getLocale(), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function formatAmount(value) {
    return `₵${formatNumber(value)}`;
  }

  function formatMonthYear(value) {
    if (!value) {
      return "";
    }

    const date = new Date(`${value}-01T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(getLocale(), {
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function formatAmount(value) {
    return `${getCurrencySymbol()}${formatNumber(value)}`;
  }

  function formatSignedAmount(value) {
    const amount = Number(value || 0);
    const sign = amount >= 0 ? "+" : "-";
    return `${sign}${formatAmount(Math.abs(amount))}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(selector, key, replacements) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = t(key, replacements);
    }
  }

  function setPlaceholder(selector, key) {
    const element = document.querySelector(selector);
    if (element) {
      element.setAttribute("placeholder", t(key));
    }
  }

  function setAria(selector, key) {
    const element = document.querySelector(selector);
    if (element) {
      element.setAttribute("aria-label", t(key));
    }
  }

  function setButtonLabel(button, text) {
    if (!button) {
      return;
    }

    const icon = button.querySelector("svg");
    if (icon) {
      button.innerHTML = `${icon.outerHTML} ${escapeHtml(text)}`;
      return;
    }

    button.textContent = text;
  }

  function updateLanguageOptions() {
    const select = document.getElementById("app-lang");
    const labels = i18n.optionLabels?.[currentLanguage] || i18n.optionLabels?.en;

    if (!select || !labels) {
      return;
    }

    Array.from(select.options).forEach((option) => {
      option.textContent =
        labels[option.value] || option.dataset.defaultLabel || option.textContent || option.value.toUpperCase();
    });

    select.value = currentLanguage;
  }

  function updateSidebar() {
    setText(".sidebar-logo span", "app.brand");

    const navItems = document.querySelectorAll(".sidebar .nav-item span");
    const keys = [
      "nav.home",
      "nav.budget",
      "nav.addTransaction",
      "nav.activity",
      "nav.report",
      "nav.savings",
      "nav.settings"
    ];

    keys.forEach((key, index) => {
      if (navItems[index]) {
        navItems[index].textContent = t(key);
      }
    });
  }

  function updateDashboard() {
    setText("#screen-dashboard .page-eyebrow", "dashboard.eyebrow");
    setText("#screen-dashboard .page-title", "dashboard.title");
    setText("#screen-dashboard .page-sub", "dashboard.sub");

    const statLabels = document.querySelectorAll("#screen-dashboard .stat-box .stat-box-label");
    const statKeys = ["dashboard.totalExpenses", "dashboard.totalIncome", "dashboard.budget"];
    statKeys.forEach((key, index) => {
      if (statLabels[index]) {
        statLabels[index].textContent = t(key);
      }
    });

    setText("#screen-dashboard .summary-head .title", "dashboard.summary");
    setText("#screen-dashboard .summary-head .sub", "dashboard.thisWeek");
    setText("#screen-dashboard .see-all-s", "common.seeAll");

    const emptyState = document.querySelector("#screen-dashboard .cat-grid .empty-state");
    if (emptyState) {
      emptyState.textContent = t("dashboard.noCategories");
    }
  }

  function updateBudget() {
    setText("#screen-budget .page-eyebrow", "budget.eyebrow");
    setText("#screen-budget .page-title", "budget.title");
    setText("#screen-budget .page-sub", "budget.sub");

    const setBudgetButton = document.querySelector("#screen-budget .summary-card .set-budget-btn");
    if (setBudgetButton) {
      setBudgetButton.textContent = t("budget.setBudget");
    }

    setText("#screen-budget .cat-header .cat-title", "budget.categoriesTitle");

    const addCategoryButton = document.querySelector("#screen-budget .cat-header .add-cat-btn");
    if (addCategoryButton) {
      addCategoryButton.textContent = `+ ${t("budget.addCategory")}`;
    }

    const legendItems = document.querySelectorAll("#screen-budget .legend .legend-item");
    const legendKeys = [
      "budget.legendSafe",
      "budget.legendModerate",
      "budget.legendWarning",
      "budget.legendOver"
    ];

    legendItems.forEach((item, index) => {
      const dot = item.querySelector(".legend-dot");
      if (dot) {
        item.innerHTML = `${dot.outerHTML} ${escapeHtml(t(legendKeys[index]))}`;
      }
    });

    setText("#modal-set-budget .modal-title", "budget.modalSetTitle");
    setText("#modal-set-budget .form-group:nth-of-type(1) label", "common.month");
    setText("#modal-set-budget .form-group:nth-of-type(2) label", "budget.totalAmount", {
      currency: getCurrencySymbol()
    });
    setButtonLabel(
      document.querySelector("#modal-set-budget .modal-submit-btn"),
      t("budget.saveBudget")
    );

    setText("#modal-add-category .modal-title", "budget.modalAddTitle");
    setText("#modal-add-category .form-group:nth-of-type(1) label", "budget.categoryName");
    setText("#modal-add-category .form-group:nth-of-type(2) label", "budget.spendingLimit", {
      currency: getCurrencySymbol()
    });
    setText("#modal-add-category .form-group:nth-of-type(3) label", "budget.chooseEmoji");
    setButtonLabel(
      document.querySelector("#modal-add-category .modal-submit-btn"),
      t("budget.addCategory")
    );

    setText("#modal-edit-category .modal-title", "budget.modalEditTitle");
    setText("#modal-edit-category .form-group:nth-of-type(1) label", "budget.categoryName");
    setText("#modal-edit-category .form-group:nth-of-type(2) label", "budget.spendingLimit", {
      currency: getCurrencySymbol()
    });
    setButtonLabel(
      document.querySelector("#modal-edit-category .modal-submit-btn"),
      t("common.saveChanges")
    );

    setText("#modal-log-spend .modal-title", "budget.modalLogTitle");
    setText("#modal-log-spend .form-group label", "budget.amountSpent", {
      currency: getCurrencySymbol()
    });
    setButtonLabel(
      document.querySelector("#modal-log-spend .modal-submit-btn"),
      t("budget.logSpend")
    );

    setText("#modal-correct-spend .modal-title", "budget.modalCorrectTitle");
    setText("#modal-correct-spend .form-group label", "budget.correctSpentAmount", {
      currency: getCurrencySymbol()
    });
    setButtonLabel(
      document.querySelector("#modal-correct-spend .modal-submit-btn"),
      t("budget.saveCorrection")
    );

    setText("#modal-confirm-cat .confirm-title", "budget.deleteCategoryTitle");
    setButtonLabel(document.querySelector("#modal-confirm-cat .btn-cancel"), t("budget.keepIt"));
    setButtonLabel(
      document.querySelector("#modal-confirm-cat .btn-confirm-del"),
      t("budget.deleteConfirm")
    );

    if (typeof budgetState === "undefined") {
      return;
    }

    const categories = Array.isArray(budgetState.categories) ? budgetState.categories : [];
    const total = Number(budgetState.budget?.total || 0);
    const spent =
      typeof getTotalSpent === "function"
        ? Number(getTotalSpent())
        : categories.reduce((sum, category) => sum + Number(category.spent || 0), 0);
    const isOver = total > 0 && spent > total;

    const monthLabel = document.getElementById("budget-month-label");
    if (monthLabel) {
      monthLabel.textContent = budgetState.budget?.month
        ? t("budget.monthLabel", { month: formatMonthYear(budgetState.budget.month) })
        : t("budget.noBudgetSet");
    }

    const budgetDisplay = document.getElementById("budget-display");
    if (budgetDisplay) {
      budgetDisplay.innerHTML =
        total > 0
          ? `${formatAmount(spent)} <span class="separator">/</span> ${formatAmount(total)}`
          : `${formatAmount(0)} <span class="separator">/</span> ${formatAmount(0)}`;
    }

    const budgetSub = document.getElementById("budget-cats-label");
    if (budgetSub) {
      if (!total) {
        budgetSub.textContent = t("budget.getStarted");
      } else if (isOver) {
        budgetSub.textContent = t("budget.overBudget");
      } else {
        const label = categories.length === 1 ? t("budget.category") : t("budget.categories");
        budgetSub.textContent = t("budget.left", {
          count: categories.length,
          label,
          amount: formatAmount(total - spent)
        });
      }
    }

    const spentLabel = document.getElementById("overall-spent-label");
    if (spentLabel) {
      spentLabel.textContent = t("budget.spent", { amount: formatAmount(spent) });
    }

    const leftLabel = document.getElementById("overall-left-label");
    if (leftLabel) {
      leftLabel.textContent = !total
        ? ""
        : isOver
          ? t("budget.over", { amount: formatAmount(spent - total) })
          : t("budget.remaining", { amount: formatAmount(total - spent) });
    }

    const categoryList = document.getElementById("category-list");
    if (categoryList && categories.length === 0) {
      categoryList.innerHTML = `<div class="empty-state">${t("budget.noCategoriesHtml", {
        action: t("budget.addCategory")
      })}</div>`;
    }

    const rows = document.querySelectorAll("#category-list .category-row");
    rows.forEach((row, index) => {
      const category = categories[index];
      if (!category) {
        return;
      }

      const pct = category.limit > 0 ? Math.min((category.spent / category.limit) * 100, 100) : 0;
      const amounts = row.querySelector(".cat-amounts");
      if (amounts) {
        amounts.textContent = `${formatAmount(category.spent)} / ${formatAmount(category.limit)}`;
      }

      const buttons = row.querySelectorAll(".cat-btn");
      if (buttons[0]) buttons[0].textContent = `+ ${t("budget.spend")}`;
      if (buttons[1]) buttons[1].textContent = t("budget.fix");
      if (buttons[2]) buttons[2].textContent = t("common.edit");
      if (buttons[3]) buttons[3].textContent = t("common.delete");

      const over = row.querySelector(".cat-over");
      if (over) {
        over.textContent = t("budget.overLimitBy", {
          amount: formatAmount(category.spent - category.limit)
        });
      }

      const warning = row.querySelector(".cat-warning");
      if (warning) {
        warning.textContent = t("budget.approachingLimit", { percent: Math.round(pct) });
      }
    });

    if (typeof logSpendCatId !== "undefined") {
      const category = categories.find((item) => item.id === logSpendCatId);
      const hint = document.getElementById("ls-hint");
      if (category && hint) {
        hint.innerHTML = `${escapeHtml(t("budget.loggingSpendFor"))}: <strong>${escapeHtml(
          `${category.emoji} ${category.name}`
        )}</strong><br>${escapeHtml(
          t("budget.currentlyUsed", {
            spent: formatAmount(category.spent),
            limit: formatAmount(category.limit)
          })
        )}`;
      }
    }

    if (typeof correctSpendId !== "undefined") {
      const category = categories.find((item) => item.id === correctSpendId);
      const hint = document.getElementById("cs-hint");
      if (category && hint) {
        hint.innerHTML = `${escapeHtml(t("budget.correctingSpendFor"))} <strong>${escapeHtml(
          `${category.emoji} ${category.name}`
        )}</strong><br>${escapeHtml(
          t("budget.currentlyRecorded", { amount: formatAmount(category.spent) })
        )} ${escapeHtml(t("budget.enterCorrectTotal"))}`;
      }
    }

    if (typeof deletingCatId !== "undefined") {
      const category = categories.find((item) => item.id === deletingCatId);
      const message = document.getElementById("confirm-cat-msg");
      if (category && message) {
        message.innerHTML = `<strong>${escapeHtml(
          `${category.emoji} ${category.name}`
        )}</strong><br>${escapeHtml(
          t("budget.deleteCategoryTracked", { amount: formatAmount(category.spent) })
        )}`;
      }
    }
  }

  function updateAddTransaction() {
    setText("#screen-addtx .page-eyebrow", "addtx.eyebrow");
    setText("#screen-addtx .page-title", "addtx.title");
    setText("#screen-addtx .page-sub", "addtx.sub");
    setText("#screen-addtx .form-card-label", "addtx.formTitle");

    const formLabels = document.querySelectorAll("#screen-addtx .form-row .form-group label");
    const labelKeys = ["common.amount", "common.category", "common.date", "common.type"];
    labelKeys.forEach((key, index) => {
      if (formLabels[index]) {
        formLabels[index].textContent = t(key);
      }
    });

    setText("#screen-addtx .payment-label", "addtx.paymentMethod");
    setButtonLabel(document.querySelector("#screen-addtx .btn-save"), t("addtx.saveTransaction"));
    setText("#screen-addtx .desc-label", "addtx.description");
    setPlaceholder("#inp-desc", "addtx.whatFor");
    const amountPrefix = document.querySelector("#screen-addtx .amount-prefix");
    if (amountPrefix) {
      amountPrefix.textContent = getCurrencySymbol();
    }

    const categorySelect = document.getElementById("inp-cat");
    if (categorySelect && categorySelect.options[0]) {
      categorySelect.options[0].textContent = t("addtx.selectCategory");
    }

    const typeSelect = document.getElementById("inp-type");
    if (typeSelect?.options[0]) {
      typeSelect.options[0].textContent = t("addtx.expense");
    }
    if (typeSelect?.options[1]) {
      typeSelect.options[1].textContent = t("addtx.income");
    }

    setButtonLabel(document.querySelector("#screen-addtx .btn-filter"), t("addtx.filters"));
    setText("#screen-addtx .see-all-link", "common.seeAll");
    setButtonLabel(document.querySelector("#screen-addtx .btn-search-hist"), t("addtx.filterHistory"));

    const headers = document.querySelectorAll("#screen-addtx .tx-table th");
    const headerKeys = ["common.date", "common.category", "common.amount", "addtx.actionHeader"];
    headerKeys.forEach((key, index) => {
      if (headers[index]) {
        headers[index].textContent = t(key);
      }
    });

    const emptyRow = document.querySelector("#tx-history .tx-row td[colspan='4']");
    if (emptyRow) {
      emptyRow.textContent = t("addtx.noTransactions");
    }

    document.querySelectorAll("#tx-history .tx-action").forEach((button) => {
      if (button.tagName === "BUTTON") {
        button.textContent = t("common.delete");
      }
    });
  }

  function updateActivity() {
    setText("#screen-activity .act-title", "activity.title");
    setButtonLabel(document.querySelector("#generate-report-btn"), t("activity.generateReport"));
    setText("#screen-activity [data-report-action='download']", "activity.downloadPdf");
    setText("#screen-activity [data-report-action='print']", "activity.printReport");
    setText("#screen-activity .act-sub", "activity.sub");
    setPlaceholder("#screen-activity .search-bar", "activity.searchPlaceholder");

    const tabs = document.querySelectorAll("#screen-activity .filter-tabs .tab");
    const tabKeys = ["activity.all", "activity.expenses", "activity.income"];
    tabKeys.forEach((key, index) => {
      if (tabs[index]) {
        tabs[index].textContent = t(key);
      }
    });

    setText("#screen-activity .tab-see-all", "common.seeAll");

    const emptyState = document.querySelector("#act-list .empty-state");
    if (emptyState) {
      emptyState.textContent = t("activity.noTransactions");
    }
  }

  function updateReport() {
    setText("#screen-report .page-eyebrow", "report.eyebrow");
    setText("#screen-report .page-title", "report.title");
    setText("#screen-report .page-sub", "report.sub");

    const cards = document.querySelectorAll("#screen-report .report-card");
    if (!cards.length) {
      return;
    }

    const note = cards[3]?.querySelector("div[style*='margin-top: 16px']");
    const noteMatch = note?.textContent.match(/(\d+)%/);

    if (cards[0]) {
      setTextWithin(cards[0], ".report-card-title", "report.incomeSources");
      const labels = cards[0].querySelectorAll(".report-stat-label");
      if (labels.length) {
        labels[labels.length - 1].textContent = t("report.totalIncome");
      }
    }

    if (cards[1]) {
      setTextWithin(cards[1], ".report-card-title", "report.expenseBreakdown");
      const labels = cards[1].querySelectorAll(".report-stat-label");
      if (labels.length) {
        labels[labels.length - 1].textContent = t("report.totalExpenses");
      }
    }

    if (cards[2]) {
      setTextWithin(cards[2], ".report-card-title", "report.spendingByCategory");
    }

    if (cards[3]) {
      setTextWithin(cards[3], ".report-card-title", "report.netSavings");
      const labels = cards[3].querySelectorAll(".report-stat-label");
      if (labels[0]) labels[0].textContent = t("report.totalIncome");
      if (labels[1]) labels[1].textContent = t("report.totalExpenses");
      if (labels[2]) labels[2].textContent = t("report.netSavings");
    }

    if (note) {
      note.textContent = noteMatch
        ? t("report.savingsNote", { rate: noteMatch[1] })
        : t("report.emptyNote");
    }
  }

  function setTextWithin(root, selector, key) {
    const element = root?.querySelector(selector);
    if (element) {
      element.textContent = t(key);
    }
  }

  function updateSavings() {
    setText("#screen-savings .page-eyebrow", "savings.eyebrow");
    setText("#screen-savings .page-title", "savings.title");
    setText("#screen-savings .page-sub", "savings.sub");
    setText("#savings-total-label", "savings.totalSavings");
    setText("#screen-savings .cat-header .cat-title", "savings.goalsTitle");

    const newGoalButton = document.querySelector("#screen-savings .summary-card .set-budget-btn");
    if (newGoalButton) {
      newGoalButton.textContent = t("savings.newGoal");
    }

    const legendItems = document.querySelectorAll("#screen-savings .legend .legend-item");
    const legendKeys = [
      "savings.legendProgress",
      "savings.legendHalfway",
      "savings.legendAlmostDone",
      "savings.legendReached"
    ];

    legendItems.forEach((item, index) => {
      const dot = item.querySelector(".legend-dot");
      if (dot) {
        item.innerHTML = `${dot.outerHTML} ${escapeHtml(t(legendKeys[index]))}`;
      }
    });

    setText("#modal-add-goal .modal-title", "savings.createGoalTitle");
    setText("#modal-add-goal .form-group:nth-of-type(1) label", "savings.goalName");
    setText("#modal-add-goal .form-group:nth-of-type(2) label", "savings.targetAmount", {
      currency: getCurrencySymbol()
    });
    setText("#modal-add-goal .form-group:nth-of-type(3) label", "savings.chooseIcon");
    setButtonLabel(
      document.querySelector("#modal-add-goal .modal-submit-btn"),
      t("savings.createGoal")
    );

    setText("#modal-add-money .modal-title", "savings.addToSavings");
    setText("#modal-add-money .form-group label", "savings.amountToAdd", {
      currency: getCurrencySymbol()
    });
    setButtonLabel(
      document.querySelector("#modal-add-money .modal-submit-btn"),
      t("savings.addMoney")
    );

    setText("#modal-withdraw .modal-title", "savings.withdrawFromSavings");
    setText("#modal-withdraw .form-group label", "savings.amountToWithdraw", {
      currency: getCurrencySymbol()
    });
    setButtonLabel(
      document.querySelector("#modal-withdraw .modal-submit-btn"),
      t("savings.withdraw")
    );

    setText("#modal-edit-goal .modal-title", "savings.editGoal");
    setText("#modal-edit-goal .form-group:nth-of-type(1) label", "savings.goalName");
    setText("#modal-edit-goal .form-group:nth-of-type(2) label", "savings.targetAmount", {
      currency: getCurrencySymbol()
    });
    setButtonLabel(
      document.querySelector("#modal-edit-goal .modal-submit-btn"),
      t("common.saveChanges")
    );

    setText("#modal-confirm-goal .confirm-title", "savings.deleteGoalTitle");
    setButtonLabel(document.querySelector("#modal-confirm-goal .btn-cancel"), t("budget.keepIt"));
    setButtonLabel(
      document.querySelector("#modal-confirm-goal .btn-confirm-del"),
      t("budget.deleteConfirm")
    );

    if (typeof savingsState === "undefined") {
      return;
    }

    const goals = Array.isArray(savingsState.goals) ? savingsState.goals : [];
    const totalSaved =
      typeof getTotalSaved === "function"
        ? Number(getTotalSaved())
        : goals.reduce((sum, goal) => sum + Number(goal.saved || 0), 0);
    const totalTarget =
      typeof getTotalTarget === "function"
        ? Number(getTotalTarget())
        : goals.reduce((sum, goal) => sum + Number(goal.target || 0), 0);

    const goalsLabel = document.getElementById("savings-goals-label");
    if (goalsLabel) {
      goalsLabel.textContent =
        goals.length > 0
          ? t("savings.toGo", {
              count: goals.length,
              label: goals.length === 1 ? t("savings.goal") : t("savings.goals"),
              amount: formatAmount(totalTarget - totalSaved)
            })
          : `0 ${t("savings.goals")} - ${t("savings.startSavingToday")}`;
    }

    const savingsDisplay = document.getElementById("savings-display");
    if (savingsDisplay) {
      savingsDisplay.textContent = formatAmount(totalSaved);
    }

    const currentLabel = document.getElementById("savings-current-label");
    if (currentLabel) {
      currentLabel.textContent = t("savings.saved", { amount: formatAmount(totalSaved) });
    }

    const targetLabel = document.getElementById("savings-target-label");
    if (targetLabel) {
      targetLabel.textContent = totalTarget
        ? t("savings.target", { amount: formatAmount(totalTarget) })
        : "";
    }

    const goalsList = document.getElementById("goals-list");
    if (goalsList && goals.length === 0) {
      goalsList.innerHTML = `<div class="empty-state">${t("savings.noGoalsHtml", {
        action: t("savings.newGoal")
      })}</div>`;
    }

    const rows = document.querySelectorAll("#goals-list .goal-row");
    rows.forEach((row, index) => {
      const goal = goals[index];
      if (!goal) {
        return;
      }

      const amounts = row.querySelector(".goal-amounts");
      if (amounts) {
        amounts.textContent = `${formatAmount(goal.saved)} / ${formatAmount(goal.target)}`;
      }

      const buttons = row.querySelectorAll(".goal-btn");
      if (buttons[0]) buttons[0].textContent = `+ ${t("savings.add")}`;
      if (buttons[1]) buttons[1].textContent = t("savings.withdraw");
      if (buttons[2]) buttons[2].textContent = t("common.edit");
      if (buttons[3]) buttons[3].textContent = t("common.delete");

      const complete = row.querySelector(".goal-complete");
      if (complete) {
        complete.textContent = t("savings.goalReached", {
          amount: formatAmount(goal.saved - goal.target)
        });
      }
    });

    if (typeof addMoneyGoalId !== "undefined") {
      const goal = goals.find((item) => item.id === addMoneyGoalId);
      const hint = document.getElementById("am-hint");
      if (goal && hint) {
        hint.innerHTML = `${escapeHtml(t("savings.addingTo"))}: <strong>${escapeHtml(
          `${goal.emoji} ${goal.name}`
        )}</strong><br>${escapeHtml(t("savings.current"))}: ${escapeHtml(
          `${formatAmount(goal.saved)} / ${formatAmount(goal.target)}`
        )}`;
      }
    }

    if (typeof withdrawGoalId !== "undefined") {
      const goal = goals.find((item) => item.id === withdrawGoalId);
      const hint = document.getElementById("wd-hint");
      if (goal && hint) {
        hint.innerHTML = `${escapeHtml(t("savings.withdrawingFrom"))}: <strong>${escapeHtml(
          `${goal.emoji} ${goal.name}`
        )}</strong><br>${escapeHtml(t("savings.available"))}: ${escapeHtml(
          formatAmount(goal.saved)
        )}`;
      }
    }

    if (typeof deletingGoalId !== "undefined") {
      const goal = goals.find((item) => item.id === deletingGoalId);
      const message = document.getElementById("confirm-goal-msg");
      if (goal && message) {
        message.innerHTML = `<strong>${escapeHtml(
          `${goal.emoji} ${goal.name}`
        )}</strong><br>${escapeHtml(
          t("savings.deleteGoalTracked", { amount: formatAmount(goal.saved) })
        )}`;
      }
    }
  }

  function updateSettings() {
    setText("#screen-settings .act-title", "settings.title");
    setText("#screen-settings .act-sub", "settings.sub");

    const cards = document.querySelectorAll("#screen-settings .card");
    const accountCard = cards[0];
    const appCard = cards[1];
    const notifyCard = cards[2];

    if (accountCard) {
      setTextWithin(accountCard, ".badge", "settings.accountSettings");
      const labels = accountCard.querySelectorAll(".flabel");
      if (labels[0]) labels[0].textContent = t("settings.name");
      if (labels[1]) labels[1].textContent = t("settings.email");
      if (labels[2]) labels[2].textContent = t("settings.currency");
      const currencyNote = accountCard.querySelector(".currency-note-text");
      if (currencyNote) {
        currencyNote.textContent = t("settings.currencyNote");
      }
      const currencyAttribution = accountCard.querySelector(".currency-note-link");
      if (currencyAttribution) {
        currencyAttribution.textContent = t("settings.currencyAttribution");
      }
      const currencySelect = accountCard.querySelector("#acc-currency");
      if (currencySelect) {
        currencySelect.value = currentCurrency;
      }
      const buttons = accountCard.querySelectorAll("button");
      if (buttons[0]) buttons[0].textContent = t("common.update");
      if (buttons[1]) buttons[1].textContent = t("common.update");
      if (buttons[2]) buttons[2].textContent = t("common.save");
    }

    if (appCard) {
      setTextWithin(appCard, ".badge", "settings.appSettings");
      const spans = appCard.querySelectorAll("span");
      if (spans[0]) spans[0].textContent = t("settings.theme");
      if (spans[1]) spans[1].textContent = t("settings.language");
      const buttons = appCard.querySelectorAll("button");
      if (buttons[0]) buttons[0].textContent = t("common.logout");
      if (buttons[1]) buttons[1].textContent = t("settings.deleteAccount");
    }

    if (notifyCard) {
      setTextWithin(notifyCard, ".badge", "settings.notificationSettings");
      const reminderLabel = notifyCard.querySelector("span");
      if (reminderLabel) {
        reminderLabel.textContent = t("settings.budgetReminder");
      }

      const timeLabel = notifyCard.querySelector("#time-group .flabel");
      if (timeLabel) {
        timeLabel.textContent = t("settings.reminderTime");
      }

      const saveButton = notifyCard.querySelector("button");
      if (saveButton) {
        saveButton.textContent = t("settings.saveNotifications");
      }
    }

    setPlaceholder("#acc-name", "settings.namePlaceholder");
    setPlaceholder("#acc-email", "settings.emailPlaceholder");

    const overlay = document.querySelector("#del-overlay > div");
    if (overlay) {
      const children = overlay.children;
      if (children[1]) {
        children[1].textContent = t("settings.deleteAccountTitle");
      }
      if (children[2]) {
        children[2].textContent = t("settings.deleteAccountMessage");
      }
      const buttons = overlay.querySelectorAll("button");
      if (buttons[0]) buttons[0].textContent = t("common.cancel");
      if (buttons[1]) buttons[1].textContent = t("budget.deleteConfirm");
    }
  }

  function updateChat() {
    setAria("#cbtn", "chat.openAssistant");
    setAria("#chat-win", "chat.dialogLabel");
    setAria("#chat-win .chat-x", "chat.closeAssistant");
    setAria("#chips", "chat.suggestionsLabel");
    setAria("#chat-in", "chat.messageLabel");
    setPlaceholder("#chat-in", "chat.placeholder");
    setText("#chat-win .chat-name", "chat.assistantName");

    const status = document.querySelector("#chat-win .chat-status");
    if (status) {
      const rawStatus = String(status.textContent || "").trim();

      if (/Loading assistant status/i.test(rawStatus)) {
        status.dataset.statusKey = "chat.loadingStatus";
      } else if (rawStatus === "Live AI + finance data") {
        status.dataset.statusKey = "chat.statusFlowise";
      } else if (rawStatus === "Live AI unavailable - fallback active") {
        status.dataset.statusKey = "chat.statusFallback";
      } else if (rawStatus === "Data-backed finance mode") {
        status.dataset.statusKey = "chat.statusRules";
      }

      if (status.dataset.statusKey) {
        status.innerHTML = `<span class="sdot"></span> ${escapeHtml(t(status.dataset.statusKey))}`;
      }
    }

    const chips = document.querySelectorAll("#chips .chip");
    chips.forEach((chip) => {
      if (!chip.dataset.originalSuggestion) {
        chip.dataset.originalSuggestion = chip.textContent.trim();
      }
      chip.textContent = localizeSuggestion(chip.dataset.originalSuggestion);
    });
  }

  function installOverrides() {
    window.fmt = function (value) {
      return formatNumber(value);
    };

    window.now = function () {
      return new Date().toLocaleTimeString(getLocale(), {
        hour: "2-digit",
        minute: "2-digit"
      });
    };

    window.toggleChat = function () {
      chatOpen = !chatOpen;
      document.getElementById("chat-win").classList.toggle("open", chatOpen);
      document.getElementById("ico-chat").style.display = chatOpen ? "none" : "block";
      document.getElementById("ico-x").style.display = chatOpen ? "block" : "none";
      document.getElementById("ndot").style.display = "none";

      if (chatOpen) {
        if (!hasShownWelcome) {
          addBot(t("chat.welcome"));
          hasShownWelcome = true;
        }
        setTimeout(() => document.getElementById("chat-in").focus(), 200);
      }
    };
  }

  function refresh() {
    isRefreshing = true;

    try {
      updateLanguageOptions();
      updateSidebar();
      updateDashboard();
      updateBudget();
      updateAddTransaction();
      updateActivity();
      updateReport();
      updateSavings();
      updateSettings();
      updateChat();
    } finally {
      isRefreshing = false;
    }
  }

  function scheduleRefresh() {
    if (refreshScheduled) {
      return;
    }

    refreshScheduled = true;
    window.setTimeout(() => {
      refreshScheduled = false;
      refresh();
    }, 0);
  }

  function installObservers() {
    if (observerInstalled || !document.body) {
      return;
    }

    observerInstalled = true;
    const observer = new MutationObserver(() => {
      if (isRefreshing) {
        return;
      }
      scheduleRefresh();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function refreshCurrencyState() {
    installOverrides();
    installObservers();
    refresh();
    exchangeRequestId += 1;
    const requestId = exchangeRequestId;

    if (currencyRefreshTimer) {
      window.clearTimeout(currencyRefreshTimer);
    }

    currencyRefreshTimer = window.setTimeout(() => {
      refreshExchangeRate().then(() => {
        if (requestId === exchangeRequestId) {
          refresh();
        }
      });
    }, 0);
  }

  function applyLanguage(language) {
    currentLanguage = normalizeLanguage(language || currentLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    document.documentElement.lang = currentLanguage;
    installOverrides();
    installObservers();
    refresh();
    return currentLanguage;
  }

  function applyCurrency(currency) {
    currentCurrency = normalizeCurrency(currency || currentCurrency);
    localStorage.setItem(CURRENCY_STORAGE_KEY, currentCurrency);
    refreshCurrencyState();
    return currentCurrency;
  }

  function applyBaseCurrency(currency) {
    currentBaseCurrency = normalizeCurrency(currency || currentBaseCurrency);
    localStorage.setItem(BASE_CURRENCY_STORAGE_KEY, currentBaseCurrency);
    refreshCurrencyState();
    return currentBaseCurrency;
  }

  function applyCountryCode(countryCode) {
    currentCountryCode = String(countryCode || "").trim().toUpperCase();
    if (currentCountryCode) {
      localStorage.setItem(COUNTRY_STORAGE_KEY, currentCountryCode);
    } else {
      localStorage.removeItem(COUNTRY_STORAGE_KEY);
    }

    return currentCountryCode;
  }

  window.BudgetFlowUiLanguage = {
    apply: applyLanguage,
    applyCurrency,
    applyBaseCurrency,
    applyCountryCode,
    current: function () {
      return currentLanguage;
    },
    currency: function () {
      return currentCurrency;
    },
    baseCurrency: function () {
      return currentBaseCurrency;
    },
    countryCode: function () {
      return currentCountryCode;
    },
    currencyMeta: getCurrencyMeta,
    currencySymbol: getCurrencySymbol,
    exchangeRateInfo: function () {
      return {
        baseCurrency: currentBaseCurrency,
        currency: currentCurrency,
        rate: currentExchangeRate,
        asOf: exchangeRateLabel
      };
    },
    formatAmount,
    formatSignedAmount,
    fromBaseAmount,
    normalizeCurrency,
    normalizeLanguage,
    toBaseAmount
  };

  applyCountryCode(currentCountryCode);
  applyBaseCurrency(currentBaseCurrency);
  applyCurrency(currentCurrency);
  applyLanguage(currentLanguage);
})();
