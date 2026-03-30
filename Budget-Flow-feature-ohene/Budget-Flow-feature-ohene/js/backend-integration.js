(function () {
  const TOKEN_KEYS = ["budgetFlowToken", "authToken"];
  const state = {
    bootstrap: null,
    transactions: [],
    assistant: null
  };
  const REMINDER_STORAGE_KEYS = {
    enabled: "budgetFlowReminderEnabled",
    time: "budgetFlowReminderTime",
    lastSentDay: "budgetFlowReminderLastSentDay"
  };
  const PUSH_MESSAGE_STORAGE_KEY = "budgetFlowPushMessageDraft";
  const DEFAULT_PUSH_MESSAGE = "Budget Flow is ready. Tap to check your dashboard.";
  let reminderTimeoutId = null;
  let pendingTransactionDeleteId = null;

  function stripHash(url) {
    return String(url || "").split("#")[0];
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

  function getRuntimeConfigValue(key) {
    const runtimeConfig = window.BudgetFlowRuntimeConfig || {};
    return String(runtimeConfig[key] || "").trim().replace(/\/+$/, "");
  }

  function resolveFeatureApiBaseUrl() {
    const configuredBaseUrl = getRuntimeConfigValue("featureApiBaseUrl");

    if (configuredBaseUrl) {
      return configuredBaseUrl;
    }

    if (isLocalDevelopment()) {
      return `${getRuntimeProtocol()}//${window.location.hostname || "localhost"}:5002/api`;
    }

    return `${window.location.origin}/api`;
  }

  const FEATURE_API_BASE = resolveFeatureApiBaseUrl();

  function getWorkflowOrigin() {
    if (window.location.protocol === "file:") {
      return "";
    }

    const host = window.location.hostname || "localhost";

    if (host === "localhost" || host === "127.0.0.1") {
      return `${window.location.protocol}//${host}:5500`;
    }

    return window.location.origin;
  }

  function getCanonicalAppUrl() {
    if (window.location.protocol === "file:") {
      return stripHash(window.location.href);
    }

    return `${getWorkflowOrigin()}/app/index.html`;
  }

  function resolveAuthPageUrl() {
    if (window.location.protocol === "file:") {
      const storedUrl = localStorage.getItem("budgetFlowAuthUrl");
      return storedUrl
        ? stripHash(storedUrl)
        : new URL("../../Budget-Flow/pages/auth.html", window.location.href).href;
    }

    return `${getWorkflowOrigin()}/pages/auth.html`;
  }

  function resolveOnboardingPageUrl() {
    if (window.location.protocol === "file:") {
      return new URL("./onboarding.html", window.location.href).href;
    }

    return `${getWorkflowOrigin()}/app/onboarding.html`;
  }

  function rememberWorkflowUrls() {
    localStorage.setItem("budgetFlowAppUrl", getCanonicalAppUrl());
    localStorage.setItem("budgetFlowAuthUrl", resolveAuthPageUrl());
  }

  function setAppLoading(isLoading) {
    document.body.classList.toggle("app-loading", Boolean(isLoading));
  }

  function redirectToCanonicalAppIfNeeded() {
    if (window.location.protocol === "file:") {
      return false;
    }

    const currentBaseUrl = stripHash(window.location.href);
    const canonicalAppUrl = getCanonicalAppUrl();

    if (currentBaseUrl === canonicalAppUrl) {
      return false;
    }

    const targetHash = window.location.hash || "#dashboard";
    window.location.replace(`${canonicalAppUrl}${targetHash}`);
    return true;
  }

  function getToken() {
    for (const key of TOKEN_KEYS) {
      const value = localStorage.getItem(key);
      if (value) {
        return value;
      }
    }

    return "";
  }

  function persistToken(token) {
    TOKEN_KEYS.forEach((key) => localStorage.setItem(key, token));
  }

  function clearSession() {
    TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem("user");
  }

  function redirectToAuth() {
    clearSession();
    window.location.replace(resolveAuthPageUrl());
  }

  function redirectToOnboarding() {
    window.location.replace(resolveOnboardingPageUrl());
  }

  function translate(key, fallback, replacements = {}, language) {
    const activeLanguage = language || localStorage.getItem("budgetFlowLanguage") || "en";
    const translated = window.BudgetFlowI18n?.t?.(key, replacements, activeLanguage);
    return translated && translated !== key ? translated : fallback || key;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatAmount(value) {
    if (window.BudgetFlowUiLanguage?.formatAmount) {
      return window.BudgetFlowUiLanguage.formatAmount(value);
    }

    return `\u20b5${Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  }

  function formatSignedAmount(value) {
    if (window.BudgetFlowUiLanguage?.formatSignedAmount) {
      return window.BudgetFlowUiLanguage.formatSignedAmount(value);
    }

    const amount = Number(value || 0);
    const sign = amount >= 0 ? "+" : "-";
    return `${sign}${formatAmount(Math.abs(amount))}`;
  }

  function toBaseAmount(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return amount;
    }

    if (window.BudgetFlowUiLanguage?.toBaseAmount) {
      return window.BudgetFlowUiLanguage.toBaseAmount(amount);
    }

    return amount;
  }

  function getLocalTheme() {
    return document.body.classList.contains("light-mode") ? "light" : "dark";
  }

  function applyThemeLocally(theme, options = {}) {
    const isLight = theme === "light";
    document.body.classList.toggle("light-mode", isLight);
    localStorage.setItem("theme", isLight ? "light" : "dark");

    const checkbox = document.getElementById("theme-check");
    if (checkbox) {
      checkbox.checked = isLight;
    }

    if (!options.silent && typeof showToast === "function") {
      showToast(
        isLight
          ? translate("toast.lightModeEnabled", "Light mode enabled")
          : translate("toast.darkModeEnabled", "Dark mode enabled")
      );
    }
  }

  function setReminderUi(isEnabled, options = {}) {
    const group = document.getElementById("time-group");
    const checkbox = document.getElementById("budg-remind");

    if (checkbox) {
      checkbox.checked = Boolean(isEnabled);
    }

    if (group) {
      group.style.opacity = isEnabled ? "1" : "0.35";
      group.style.pointerEvents = isEnabled ? "auto" : "none";
    }

    if (!options.silent && typeof showToast === "function") {
      showToast(
        isEnabled
          ? translate("toast.reminderOn", "Budget reminder on")
          : translate("toast.reminderOff", "Budget reminder off")
      );
    }
  }

  function clearReminderSchedule() {
    if (reminderTimeoutId) {
      window.clearTimeout(reminderTimeoutId);
      reminderTimeoutId = null;
    }
  }

  function getLocalDayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseReminderTime(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    return { hours, minutes };
  }

  function getReminderPreferences() {
    const checkbox = document.getElementById("budg-remind");
    const timeInput = document.getElementById("remind-time");

    return {
      enabled: checkbox ? checkbox.checked : localStorage.getItem(REMINDER_STORAGE_KEYS.enabled) === "true",
      reminderTime: String(
        timeInput?.value || localStorage.getItem(REMINDER_STORAGE_KEYS.time) || "18:00"
      ).slice(0, 5)
    };
  }

  function persistReminderPreferences(isEnabled, reminderTime) {
    localStorage.setItem(REMINDER_STORAGE_KEYS.enabled, String(Boolean(isEnabled)));
    localStorage.setItem(REMINDER_STORAGE_KEYS.time, String(reminderTime || "18:00").slice(0, 5));
  }

  function getPushConfig() {
    return state.bootstrap?.meta?.push || {};
  }

  function isPushSupported() {
    return (
      window.location.protocol !== "file:" &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    );
  }

  function urlBase64ToUint8Array(value) {
    const normalized = String(value || "")
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    const base64 = normalized + padding;
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let index = 0; index < rawData.length; index += 1) {
      outputArray[index] = rawData.charCodeAt(index);
    }

    return outputArray;
  }

  function getNotificationAssetUrl() {
    if (window.location.protocol === "file:") {
      return "../assests/budget-flow-icon.svg";
    }

    return `${getWorkflowOrigin()}/assests/budget-flow-icon.svg`;
  }

  async function showAppNotification({ title, body, tag }) {
    const notificationOptions = {
      body,
      tag,
      icon: getNotificationAssetUrl(),
      badge: getNotificationAssetUrl(),
      data: {
        url: `${getCanonicalAppUrl()}#dashboard`
      }
    };

    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration?.showNotification) {
          await registration.showNotification(title, notificationOptions);
          return true;
        }
      } catch (error) {
        // Fall back to a regular Notification below.
      }
    }

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, notificationOptions);
      return true;
    }

    return false;
  }

  async function getPushRegistration() {
    if (!isPushSupported()) {
      return null;
    }

    try {
      return await navigator.serviceWorker.ready;
    } catch (error) {
      return null;
    }
  }

  function getPushMessageDraft() {
    const field = document.getElementById("push-message");
    const nextValue = String(
      field?.value || localStorage.getItem(PUSH_MESSAGE_STORAGE_KEY) || DEFAULT_PUSH_MESSAGE
    ).trim();

    return nextValue || DEFAULT_PUSH_MESSAGE;
  }

  function persistPushMessageDraft(value) {
    localStorage.setItem(PUSH_MESSAGE_STORAGE_KEY, String(value || "").trim() || DEFAULT_PUSH_MESSAGE);
  }

  function setPushUi(isEnabled) {
    const checkbox = document.getElementById("push-remind");
    if (checkbox) {
      checkbox.checked = Boolean(isEnabled);
    }
  }

  function renderPushAvailability(options = {}) {
    const note = document.getElementById("push-note");
    const pushEnabled = document.getElementById("push-remind")?.checked;
    const pushConfig = getPushConfig();

    if (!note) {
      return;
    }

    if (options.error) {
      note.textContent = options.error;
      return;
    }

    if (!pushConfig.enabled || !pushConfig.publicKey) {
      note.textContent = "Push notifications are not configured on the server yet.";
      return;
    }

    if (!isPushSupported()) {
      note.textContent = "This browser does not support push notifications for Budget Flow here.";
      return;
    }

    if ("Notification" in window && Notification.permission === "denied") {
      note.textContent = "Notifications are blocked in this browser. Enable them in browser settings.";
      return;
    }

    if (options.ready) {
      note.textContent = "Push is ready on this device. Use Send Notification to open the app from the alert.";
      return;
    }

    if (pushEnabled) {
      note.textContent = "Save your settings to connect this device for visit reminders.";
      return;
    }

    note.textContent = "Enable push notifications to send a visit-the-app alert to this device.";
  }

  async function ensurePushSubscription(options = {}) {
    const pushConfig = getPushConfig();
    const shouldPrompt = options.prompt !== false;

    if (!pushConfig.enabled || !pushConfig.publicKey) {
      throw new Error("Push notifications are not configured on the server yet.");
    }

    if (!isPushSupported()) {
      throw new Error("Push notifications are not supported on this device/browser.");
    }

    let permission = Notification.permission;

    if (permission !== "granted") {
      if (!shouldPrompt) {
        throw new Error("Allow notifications on this device to finish connecting push alerts.");
      }

      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      throw new Error("Notifications are blocked. Allow them in your browser settings and try again.");
    }

    const registration = await getPushRegistration();
    if (!registration) {
      throw new Error("The app service worker is not ready yet. Refresh and try again.");
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushConfig.publicKey)
      });
    }

    await apiFetch("/push/subscriptions", {
      method: "POST",
      body: {
        subscription: subscription.toJSON()
      }
    });

    return subscription;
  }

  async function removePushSubscription() {
    const registration = await getPushRegistration();
    const subscription = registration ? await registration.pushManager.getSubscription() : null;
    const endpoint = subscription?.endpoint;

    if (endpoint) {
      try {
        await apiFetch("/push/subscriptions", {
          method: "DELETE",
          body: { endpoint }
        });
      } catch (error) {
        // Ignore subscription cleanup failures and continue unsubscribing locally.
      }
    }

    if (subscription) {
      await subscription.unsubscribe().catch(() => {});
    }
  }

  async function syncExistingPushSubscription(notifications = {}) {
    const pushEnabled = Boolean(notifications.pushNotificationsEnabled);
    setPushUi(pushEnabled);
    renderPushAvailability();

    if (!pushEnabled || !isPushSupported()) {
      return;
    }

    const pushConfig = getPushConfig();
    if (!pushConfig.enabled || !pushConfig.publicKey) {
      return;
    }

    const registration = await getPushRegistration();
    if (!registration) {
      return;
    }

    try {
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription && Notification.permission === "granted") {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pushConfig.publicKey)
        });
      }

      if (!subscription) {
        renderPushAvailability();
        return;
      }

      await apiFetch("/push/subscriptions", {
        method: "POST",
        body: {
          subscription: subscription.toJSON()
        }
      });

      renderPushAvailability({ ready: true });
    } catch (error) {
      renderPushAvailability({ error: error.message });
    }
  }

  async function sendBudgetReminder() {
    const todayKey = getLocalDayKey();

    if (localStorage.getItem(REMINDER_STORAGE_KEYS.lastSentDay) === todayKey) {
      return false;
    }

    localStorage.setItem(REMINDER_STORAGE_KEYS.lastSentDay, todayKey);

    const title = translate("reminder.title", "Budget Flow reminder");
    const body = translate(
      "reminder.body",
      "Open Budget Flow and record today's income or expenses."
    );
    const notificationsSupported = "Notification" in window;
    const browserNotificationsAllowed =
      notificationsSupported && Notification.permission === "granted";

    if (browserNotificationsAllowed) {
      try {
        await showAppNotification({
          title,
          body,
          tag: "budget-flow-daily-reminder"
        });
      } catch (error) {
        if (typeof showToast === "function") {
          showToast(body);
        }
      }

      return true;
    }

    if (typeof showToast === "function") {
      showToast(body);
    }

    return true;
  }

  function maybeSendDueReminder() {
    const { enabled, reminderTime } = getReminderPreferences();

    if (!enabled) {
      return false;
    }

    const parsedTime = parseReminderTime(reminderTime);
    if (!parsedTime) {
      return false;
    }

    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);

    if (now.getTime() < scheduledTime.getTime()) {
      return false;
    }

    return sendBudgetReminder();
  }

  function scheduleBudgetReminder() {
    clearReminderSchedule();

    const { enabled, reminderTime } = getReminderPreferences();

    if (!enabled) {
      return;
    }

    const parsedTime = parseReminderTime(reminderTime);
    if (!parsedTime) {
      return;
    }

    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);

    const todayKey = getLocalDayKey(now);
    const alreadySentToday =
      localStorage.getItem(REMINDER_STORAGE_KEYS.lastSentDay) === todayKey;

    let delay = nextRun.getTime() - now.getTime();

    if (delay <= 0 && !alreadySentToday) {
      delay = 1500;
    } else if (delay <= 0) {
      nextRun.setDate(nextRun.getDate() + 1);
      delay = nextRun.getTime() - now.getTime();
    }

    reminderTimeoutId = window.setTimeout(() => {
      maybeSendDueReminder();
      scheduleBudgetReminder();
    }, Math.max(delay, 1000));
  }

  async function getReminderSaveMessage(isEnabled) {
    if (!isEnabled) {
      return translate("toast.notificationsSaved", "Notification settings saved.");
    }

    if (!("Notification" in window)) {
      return translate(
        "toast.notificationsSavedOpenOnly",
        "Notification settings saved. Reminders will appear while the app is open."
      );
    }

    if (Notification.permission === "granted") {
      return translate("toast.notificationsSaved", "Notification settings saved.");
    }

    if (Notification.permission === "denied") {
      return translate(
        "toast.notificationsSavedBlocked",
        "Notification settings saved. Browser notifications are blocked, so reminders will appear while the app is open."
      );
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        return translate("toast.notificationsSaved", "Notification settings saved.");
      }

      if (permission === "denied") {
        return translate(
          "toast.notificationsSavedBlocked",
          "Notification settings saved. Browser notifications are blocked, so reminders will appear while the app is open."
        );
      }
    } catch (error) {
      // Ignore permission errors and fall back to in-app reminders.
    }

    return translate(
      "toast.notificationsSavedOpenOnly",
      "Notification settings saved. Reminders will appear while the app is open."
    );
  }

  function getAssistantStatusLabel(assistant = {}) {
    if (assistant.statusLabel) {
      return assistant.statusLabel;
    }

    switch (assistant.mode) {
      case "groq":
        return "Live Groq AI + finance data";
      case "flowise":
        return "Live AI + finance data";
      case "rules-fallback":
        return "Live AI unavailable - fallback active";
      default:
        return "Data-backed finance mode";
    }
  }

  function renderAssistantStatus(assistant = {}) {
    const status = document.querySelector(".chat-status");
    if (!status) {
      return;
    }

    status.innerHTML = `<span class="sdot"></span> ${escapeHtml(getAssistantStatusLabel(assistant))}`;
  }

  function renderAssistantChips(suggestions = []) {
    const chips = document.getElementById("chips");
    if (!chips) {
      return;
    }

    const nextSuggestions = suggestions.filter(Boolean).slice(0, 4);
    chips.innerHTML = "";

    nextSuggestions.forEach((suggestion) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.textContent = suggestion;
      button.addEventListener("click", () => window.useChip(suggestion));
      chips.appendChild(button);
    });

    chips.style.display =
      nextSuggestions.length && window.isChatComposerOpen?.() ? "flex" : "none";
    window.refreshChatComposer?.();
  }

  function hideAssistantChips() {
    const chips = document.getElementById("chips");
    if (chips) {
      chips.style.display = "none";
    }
    window.refreshChatComposer?.();
  }

  function getCurrentScreenKey() {
    const hash = window.location.hash.replace(/^#/, "");
    return SCREENS[hash] ? hash : "dashboard";
  }

  function installHashNavigation() {
    if (typeof window.show !== "function") {
      return;
    }

    const originalShow = window.show.bind(window);

    window.show = function (key, options) {
      originalShow(key);

      if (!(options && options.updateHash === false)) {
        const nextHash = `#${key}`;
        if (window.location.hash !== nextHash) {
          window.history.replaceState(null, "", nextHash);
        }
      }
    };

    window.addEventListener("hashchange", () => {
      originalShow(getCurrentScreenKey());
    });

    originalShow(getCurrentScreenKey());
  }

  async function apiFetch(path, options = {}) {
    const token = getToken();

    if (!token) {
      redirectToAuth();
      throw new Error("No active session");
    }

    const config = {
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    };

    if (options.body !== undefined) {
      config.headers["Content-Type"] = "application/json";
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${FEATURE_API_BASE}${path}`, config);
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      redirectToAuth();
      throw new Error("Your session has expired");
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  }

  function renderDashboard(dashboard) {
    const statBoxes = document.querySelectorAll("#screen-dashboard .stat-box");

    if (statBoxes.length >= 3) {
      statBoxes[0].querySelector(".stat-box-val").textContent = formatAmount(
        dashboard.totals.expenses
      );
      statBoxes[1].querySelector(".stat-box-val").textContent = formatAmount(
        dashboard.totals.income
      );
      statBoxes[2].querySelector(".stat-box-val").textContent =
        dashboard.budget.total > 0
          ? `${formatAmount(dashboard.budget.spent)} / ${formatAmount(dashboard.budget.total)}`
          : `${formatAmount(0)} / ${formatAmount(0)}`;

      const budgetBar = statBoxes[2].querySelector(".prog-fill");
      if (budgetBar) {
        budgetBar.style.width = `${dashboard.budget.progress || 0}%`;
      }
    }

    const barsRow = document.querySelector("#screen-dashboard .bars-row");
    if (barsRow) {
      const maxAmount = Math.max(0, ...dashboard.weeklySpending.map((item) => item.amount));
      barsRow.innerHTML = dashboard.weeklySpending
        .map((item, index) => {
          const height = maxAmount > 0 ? Math.max((item.amount / maxAmount) * 95, item.amount > 0 ? 8 : 2) : 2;
          const highlightClass = index === 0 ? " hl" : "";
          return `
            <div class="bar-col">
              <span class="bar-amt">${formatAmount(item.amount)}</span>
              <div class="bar-outer"><div class="bar-inner${highlightClass}" style="height:${height}%"></div></div>
              <span class="bar-day${highlightClass}">${escapeHtml(item.label)}</span>
            </div>
          `;
        })
        .join("");
    }

    const categoryGrid = document.querySelector("#screen-dashboard .cat-grid");
    if (!categoryGrid) {
      return;
    }

    const categories = dashboard.budget.categories.length
      ? dashboard.budget.categories
      : dashboard.categoryBreakdown.map((item) => ({
          emoji: item.emoji,
          name: item.category,
          spent: item.amount,
          limit: item.amount,
          progress: 100
        }));

    if (!categories.length) {
      categoryGrid.innerHTML =
        '<div class="empty-state">No tracked spending categories yet.</div>';
      return;
    }

    categoryGrid.innerHTML = categories
      .map((category) => {
        const progress = Math.max(0, Math.min(Number(category.progress || 0), 100));
        return `
          <div class="cat-row">
            <div class="cat-row-top">
              <span class="cat-emoji">${escapeHtml(category.emoji)}</span>
              <span class="cat-name">${escapeHtml(category.name)}</span>
              <span class="cat-ratio">${formatAmount(category.spent)} / ${formatAmount(category.limit)}</span>
            </div>
            <div class="cat-prog">
              <div class="cat-prog-fill" style="width:${progress}%;background:#816DBC;"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderTransactionHistory(items) {
    const tableBody = document.getElementById("tx-history");
    if (!tableBody) {
      return;
    }

    if (!items.length) {
      tableBody.innerHTML =
        '<tr class="tx-row"><td colspan="4" style="text-align:center;color:var(--muted)">No transactions yet.</td></tr>';
      return;
    }

    tableBody.innerHTML = items
      .slice(0, 12)
      .map((item) => {
        return `
          <tr class="tx-row">
            <td>${escapeHtml(item.displayDate)}</td>
            <td>
              <div class="tx-cat-wrap">
                <span class="tx-cat-icon">${escapeHtml(item.emoji)}</span>
                <div>
                  <div class="tx-cat-name">${escapeHtml(item.name)}</div>
                  <div class="tx-cat-sub">${escapeHtml(item.category)}</div>
                </div>
              </div>
            </td>
            <td><span class="tx-amount ${item.type === "income" ? "pos" : "neg"}">${formatSignedAmount(
          item.signedAmount
        )}</span></td>
            <td><button type="button" class="tx-action" onclick="deleteTransaction(${item.id})">Delete</button></td>
          </tr>
        `;
      })
      .join("");
  }

  function renderActivityList(items) {
    const list = document.getElementById("act-list");
    if (!list) {
      return;
    }

    if (!items.length) {
      list.innerHTML = '<div class="empty-state">No transactions found yet.</div>';
      return;
    }

    list.innerHTML = items
      .map((item) => {
        return `
          <div class="act-item" data-type="${escapeHtml(item.type)}" data-name="${escapeHtml(
          item.name.toLowerCase()
        )}">
            <div class="act-icon-wrap">${escapeHtml(item.emoji)}</div>
            <div class="act-info">
              <div class="act-name">${escapeHtml(item.name)}</div>
              <div class="act-cat">${escapeHtml(item.category)}</div>
            </div>
            <span class="act-amt ${item.type === "income" ? "pos" : "neg"}">${formatSignedAmount(
          item.signedAmount
        )}</span>
          </div>
        `;
      })
      .join("");

    if (typeof applyFilters === "function") {
      applyFilters(document.querySelector(".search-bar")?.value || "");
    }
  }

  function buildReportStatRows(items, positive) {
    if (!items.length) {
      return `
        <div class="report-stat">
          <span class="report-stat-label">No data yet</span>
          <span class="report-stat-val ${positive ? "pos" : "neg"}">${positive ? "+" : "-"}${formatAmount(
        0
      )}</span>
        </div>
      `;
    }

    return items
      .map(
        (item) => `
          <div class="report-stat">
            <span class="report-stat-label">${escapeHtml(item.category)}</span>
            <span class="report-stat-val ${positive ? "pos" : "neg"}">${positive ? "+" : "-"}${formatAmount(
          item.amount
        )}</span>
          </div>
        `
      )
      .join("");
  }

  function renderReport(report) {
    const grid = document.querySelector("#screen-report .report-grid");
    if (!grid) {
      return;
    }

    const expenseBars = report.expenseBreakdown.slice(0, 6);
    const maxExpense = Math.max(0, ...expenseBars.map((item) => item.amount));
    const savingsNote =
      report.totalTransactions > 0
        ? `You saved ${report.totals.savingsRate}% of your income this month.`
        : "Add transactions to generate a fuller monthly report.";

    grid.innerHTML = `
      <div class="report-card">
        <div class="report-card-title">Income Sources</div>
        ${buildReportStatRows(report.incomeSources, true)}
        <div class="report-stat" style="border-top: 2px solid var(--border); margin-top: 12px; padding-top: 16px;">
          <span class="report-stat-label" style="font-weight: 600;">Total Income</span>
          <span class="report-stat-val pos" style="font-size: 18px;">+${formatAmount(report.totals.income)}</span>
        </div>
      </div>

      <div class="report-card">
        <div class="report-card-title">Expense Breakdown</div>
        ${buildReportStatRows(report.expenseBreakdown, false)}
        <div class="report-stat" style="border-top: 2px solid var(--border); margin-top: 12px; padding-top: 16px;">
          <span class="report-stat-label" style="font-weight: 600;">Total Expenses</span>
          <span class="report-stat-val neg" style="font-size: 18px;">-${formatAmount(
            report.totals.expenses
          )}</span>
        </div>
      </div>

      <div class="report-card">
        <div class="report-card-title">Spending by Category</div>
        <div class="chart-with-y-axis">
          <div class="chart-y-axis">
            <span>${formatAmount(maxExpense)}</span>
            <span>${formatAmount(maxExpense * 0.6)}</span>
            <span>${formatAmount(maxExpense * 0.2)}</span>
            <span>${formatAmount(0)}</span>
          </div>
          <div class="chart-container">
            ${expenseBars
              .map((item) => {
                const height = maxExpense > 0 ? Math.max((item.amount / maxExpense) * 90, 8) : 8;
                return `<div class="chart-bar" title="${escapeHtml(item.category)}" style="height:${height}%;"></div>`;
              })
              .join("")}
          </div>
        </div>
      </div>

      <div class="report-card">
        <div class="report-card-title">Net Savings</div>
        <div class="report-stat">
          <span class="report-stat-label">Total Income</span>
          <span class="report-stat-val pos">+${formatAmount(report.totals.income)}</span>
        </div>
        <div class="report-stat">
          <span class="report-stat-label">Total Expenses</span>
          <span class="report-stat-val neg">-${formatAmount(report.totals.expenses)}</span>
        </div>
        <div class="report-stat" style="border-top: 2px solid var(--green); margin-top: 12px; padding-top: 16px; background: rgba(0,214,143,0.1); border-radius: 8px; padding: 16px;">
          <span class="report-stat-label" style="font-weight: 600; color: var(--green);">Net Savings</span>
          <span class="report-stat-val pos" style="font-size: 24px;">${report.totals.netSavings >= 0 ? "+" : "-"}${formatAmount(
      Math.abs(report.totals.netSavings)
    )}</span>
        </div>
        <div style="margin-top: 16px; text-align: center; color: var(--muted); font-size: 13px;">
          ${escapeHtml(savingsNote)}
        </div>
      </div>
    `;
  }

  function closeReportMenu() {
    const menu = document.getElementById("report-actions-menu");
    const button = document.getElementById("report-actions-btn");

    if (menu) {
      menu.hidden = true;
    }

    if (button) {
      button.setAttribute("aria-expanded", "false");
    }
  }

  function getCurrentReportData() {
    return state.bootstrap?.report || null;
  }

  function getCurrentLanguage() {
    return localStorage.getItem("budgetFlowLanguage") || "en";
  }

  function getCurrentLocale() {
    return window.BudgetFlowI18n?.localeFor?.(getCurrentLanguage()) || "en-US";
  }

  function formatPositiveAmount(value) {
    return `+${formatAmount(Math.abs(Number(value || 0)))}`;
  }

  function formatNegativeAmount(value) {
    return `-${formatAmount(Math.abs(Number(value || 0)))}`;
  }

  function buildReportExportModel() {
    const report = getCurrentReportData();

    if (!report) {
      return null;
    }

    const generatedOn = new Intl.DateTimeFormat(getCurrentLocale(), {
      dateStyle: "long",
      timeStyle: "short"
    }).format(new Date());
    const savingsNote =
      report.totalTransactions > 0
        ? translate("report.savingsNote", "You saved {rate}% of your income this month.", {
            rate: report.totals.savingsRate
          })
        : translate("report.emptyNote", "Add transactions to generate a fuller monthly report.");
    const expenseBars = (report.expenseBreakdown || []).slice(0, 6);
    const maxExpense = Math.max(0, ...expenseBars.map((item) => Number(item.amount || 0)));
    const chartAxisLabels = [
      formatAmount(maxExpense),
      formatAmount(maxExpense * 0.6),
      formatAmount(maxExpense * 0.2),
      formatAmount(0)
    ];

    return {
      eyebrow: translate("report.eyebrow", "Financial Report"),
      title: translate("report.title", "Monthly Analysis"),
      subtitle: translate("report.sub", "Detailed insights into your spending patterns"),
      generatedOnLabel: translate("report.generatedOn", "Generated on"),
      generatedOn,
      savingsNote,
      expenseBars,
      maxExpense,
      sections: {
        income: {
          title: translate("report.incomeSources", "Income Sources"),
          items: (report.incomeSources || []).map((item) => ({
            label: item.category,
            value: formatPositiveAmount(item.amount)
          })),
          totalLabel: translate("report.totalIncome", "Total Income"),
          totalValue: formatPositiveAmount(report.totals?.income)
        },
        expense: {
          title: translate("report.expenseBreakdown", "Expense Breakdown"),
          items: (report.expenseBreakdown || []).map((item) => ({
            label: item.category,
            value: formatNegativeAmount(item.amount)
          })),
          totalLabel: translate("report.totalExpenses", "Total Expenses"),
          totalValue: formatNegativeAmount(report.totals?.expenses)
        },
        spending: {
          title: translate("report.spendingByCategory", "Spending by Category"),
          axisLabels: chartAxisLabels,
          items: expenseBars.map((item) => ({
            label: item.category,
            shortLabel: String(item.category || "")
              .replace(/[^A-Za-z0-9]/g, "")
              .slice(0, 4)
              .toUpperCase(),
            amount: Number(item.amount || 0),
            value: formatAmount(item.amount),
            height:
              maxExpense > 0 ? Math.max((Number(item.amount || 0) / maxExpense) * 100, 8) : 8
          }))
        },
        net: {
          title: translate("report.netSavings", "Net Savings"),
          incomeLabel: translate("report.totalIncome", "Total Income"),
          incomeValue: formatPositiveAmount(report.totals?.income),
          expenseLabel: translate("report.totalExpenses", "Total Expenses"),
          expenseValue: formatNegativeAmount(report.totals?.expenses),
          netLabel: translate("report.netSavings", "Net Savings"),
          netValue: `${Number(report.totals?.netSavings || 0) >= 0 ? "+" : "-"}${formatAmount(
            Math.abs(Number(report.totals?.netSavings || 0))
          )}`
        }
      }
    };
  }

  function buildReportWindowHtml(model) {
    const incomeRows = model.sections.income.items.length
      ? model.sections.income.items
      : [{ label: translate("report.noData", "No data yet"), value: formatPositiveAmount(0) }];
    const expenseRows = model.sections.expense.items.length
      ? model.sections.expense.items
      : [{ label: translate("report.noData", "No data yet"), value: formatNegativeAmount(0) }];
    const spendingRows = model.sections.spending.items.length
      ? model.sections.spending.items
      : [{ label: translate("report.noData", "No data yet"), shortLabel: "", value: formatAmount(0), height: 8 }];

    return `<!DOCTYPE html>
<html lang="${escapeHtml(getCurrentLanguage())}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(model.eyebrow)} - ${escapeHtml(model.title)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #161944;
      --muted: #62618d;
      --border: #d9d4ef;
      --purple: #8b77d4;
      --purple-soft: rgba(139, 119, 212, 0.14);
      --green: #3fab78;
      --green-soft: rgba(63, 171, 120, 0.16);
      --green-border: rgba(63, 171, 120, 0.45);
      --red: #ff2d2d;
      --page: #ffffff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      color: var(--ink);
      background: var(--page);
      padding: 14px 12px 20px;
    }
    .sheet {
      max-width: 1320px;
      margin: 0 auto;
    }
    .eyebrow {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #6d78aa;
      margin-bottom: 14px;
    }
    h1 {
      margin: 0;
      font-size: 54px;
      line-height: 1.1;
      letter-spacing: -0.03em;
    }
    .sub {
      margin-top: 14px;
      color: var(--muted);
      font-size: 18px;
      line-height: 1.6;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 34px;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 16px 16px 18px;
      break-inside: avoid;
      background: #fff;
    }
    .card-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 18px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
      font-size: 14px;
    }
    .row:last-child {
      border-bottom: none;
    }
    .label {
      color: var(--muted);
      font-size: 13px;
    }
    .value {
      font-family: "Segoe UI", Arial, sans-serif;
      font-weight: 700;
      text-align: right;
      font-size: 18px;
    }
    .value.pos { color: var(--green); }
    .value.neg { color: var(--red); }
    .value.net { color: var(--green); font-size: 34px; }
    .highlight {
      margin-top: 14px;
      border-top: 2px solid var(--border);
      padding-top: 16px;
    }
    .net-box {
      margin-top: 16px;
      padding: 18px 20px;
      border-radius: 14px;
      background: var(--green-soft);
      border: 2px solid var(--green-border);
    }
    .chart-wrap {
      display: grid;
      grid-template-columns: 70px 1fr;
      gap: 10px;
      min-height: 240px;
      align-items: stretch;
    }
    .chart-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 16px 6px 22px 0;
      color: var(--muted);
      font-size: 11px;
    }
    .chart-shell {
      position: relative;
      min-height: 240px;
      padding: 8px 8px 24px;
      border-left: 1px solid transparent;
    }
    .chart-lines {
      position: absolute;
      inset: 8px 8px 24px 8px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .chart-lines span {
      display: block;
      width: 100%;
      border-top: 1px solid rgba(217, 212, 239, 0.5);
    }
    .chart-bars {
      position: relative;
      z-index: 1;
      height: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      gap: 12px;
    }
    .chart-col {
      flex: 1;
      min-width: 28px;
      max-width: 52px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      height: 100%;
    }
    .chart-bar {
      width: 14px;
      min-height: 8px;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(139,119,212,0.32), rgba(139,119,212,0.8));
    }
    .chart-label {
      color: var(--muted);
      font-size: 10px;
      letter-spacing: 0.04em;
    }
    .note {
      margin-top: 18px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
      text-align: center;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { max-width: none; }
      h1 { font-size: 42px; }
    }
    @media (max-width: 860px) {
      .grid {
        grid-template-columns: 1fr;
      }
      h1 {
        font-size: 40px;
      }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <div class="eyebrow">${escapeHtml(model.eyebrow)}</div>
    <h1>${escapeHtml(model.title)}</h1>
    <div class="sub">${escapeHtml(model.subtitle)}</div>

    <section class="grid">
      <article class="card">
        <div class="card-title">${escapeHtml(model.sections.income.title)}</div>
        ${incomeRows
          .map(
            (item) => `
          <div class="row">
            <span class="label">${escapeHtml(item.label)}</span>
            <span class="value pos">${escapeHtml(item.value)}</span>
          </div>
        `
          )
          .join("")}
        <div class="row highlight">
          <span class="label">${escapeHtml(model.sections.income.totalLabel)}</span>
          <span class="value pos">${escapeHtml(model.sections.income.totalValue)}</span>
        </div>
      </article>

      <article class="card">
        <div class="card-title">${escapeHtml(model.sections.expense.title)}</div>
        ${expenseRows
          .map(
            (item) => `
          <div class="row">
            <span class="label">${escapeHtml(item.label)}</span>
            <span class="value neg">${escapeHtml(item.value)}</span>
          </div>
        `
          )
          .join("")}
        <div class="row highlight">
          <span class="label">${escapeHtml(model.sections.expense.totalLabel)}</span>
          <span class="value neg">${escapeHtml(model.sections.expense.totalValue)}</span>
        </div>
      </article>

      <article class="card">
        <div class="card-title">${escapeHtml(model.sections.spending.title)}</div>
        <div class="chart-wrap">
          <div class="chart-axis">
            ${model.sections.spending.axisLabels
              .map((label) => `<span>${escapeHtml(label)}</span>`)
              .join("")}
          </div>
          <div class="chart-shell">
            <div class="chart-lines">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div class="chart-bars">
              ${spendingRows
                .map(
                  (item) => `
                <div class="chart-col">
                  <div class="chart-bar" style="height:${Math.max(
                    8,
                    Math.min(Number(item.height || 8), 100)
                  )}%"></div>
                  <span class="chart-label">${escapeHtml(item.shortLabel || "")}</span>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
      </article>

      <article class="card">
        <div class="card-title">${escapeHtml(model.sections.net.title)}</div>
        <div class="row">
          <span class="label">${escapeHtml(model.sections.net.incomeLabel)}</span>
          <span class="value pos">${escapeHtml(model.sections.net.incomeValue)}</span>
        </div>
        <div class="row">
          <span class="label">${escapeHtml(model.sections.net.expenseLabel)}</span>
          <span class="value neg">${escapeHtml(model.sections.net.expenseValue)}</span>
        </div>
        <div class="net-box">
          <div class="row" style="border-bottom:none;padding:0;">
            <span class="label">${escapeHtml(model.sections.net.netLabel)}</span>
            <span class="value net">${escapeHtml(model.sections.net.netValue)}</span>
          </div>
        </div>
        <div class="note">${escapeHtml(model.savingsNote)}</div>
      </article>
    </section>
  </main>
</body>
</html>`;
  }

  function openReportWindow(options = {}) {
    const model = buildReportExportModel();

    if (!model) {
      if (typeof showToast === "function") {
        showToast(translate("toast.reportUnavailable", "Financial report is not ready yet."));
      }
      return null;
    }

    const reportHtml = buildReportWindowHtml(model);

    if (options.autoPrint) {
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      frame.style.opacity = "0";
      frame.style.pointerEvents = "none";

      const cleanup = () => {
        window.setTimeout(() => {
          frame.remove();
        }, 1200);
      };

      frame.onload = () => {
        const printWindow = frame.contentWindow;
        if (!printWindow) {
          cleanup();
          if (typeof showToast === "function") {
            showToast(translate("toast.printFailed", "Could not open the print dialog."));
          }
          return;
        }

        window.setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch (error) {
            if (typeof showToast === "function") {
              showToast(translate("toast.printFailed", "Could not open the print dialog."));
            }
          } finally {
            cleanup();
          }
        }, 250);
      };

      document.body.appendChild(frame);
      frame.srcdoc = reportHtml;
      return frame;
    }

    const popup = window.open("", "_blank", "noopener,noreferrer,width=1080,height=900");
    if (!popup) {
      if (typeof showToast === "function") {
        showToast(translate("toast.popupBlocked", "Please allow pop-ups to open the printable report."));
      }
      return null;
    }

    popup.document.open();
    popup.document.write(reportHtml);
    popup.document.close();

    return popup;
  }

  function sanitizePdfText(value) {
    const replacements = {
      "\u20b5": "GHS ",
      "\u20ac": "EUR ",
      "\u00a3": "GBP ",
      "\u20a6": "NGN ",
      "\u00a5": "JPY ",
      "\u20b9": "INR ",
      "\u20a9": "KRW ",
      "\u2013": "-",
      "\u2014": "-",
      "\u2018": "'",
      "\u2019": "'",
      "\u201c": '"',
      "\u201d": '"'
    };

    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, (character) => replacements[character] || " ")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\s+/g, " ")
      .trim();
  }

  function wrapPdfText(text, maxChars) {
    const words = sanitizePdfText(text).split(" ").filter(Boolean);

    if (!words.length) {
      return [""];
    }

    const lines = [];
    let currentLine = "";

    words.forEach((word) => {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;
      if (nextLine.length <= maxChars) {
        currentLine = nextLine;
        return;
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      currentLine = word;
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  function buildReportPdfEntries(model) {
    const entries = [
      { text: model.eyebrow, size: 11, bold: true, gapAfter: 6 },
      { text: model.title, size: 20, bold: true, gapAfter: 10 },
      { text: model.subtitle, size: 11, gapAfter: 8 },
      {
        text: `${model.generatedOnLabel}: ${model.generatedOn}`,
        size: 10,
        gapAfter: 14
      }
    ];

    const pushSection = (title, rows, totalLabel, totalValue) => {
      entries.push({ text: title, size: 14, bold: true, gapBefore: 6, gapAfter: 6 });

      if (!rows.length) {
        rows = [{ label: translate("report.noData", "No data yet"), value: formatAmount(0) }];
      }

      rows.forEach((row) => {
        entries.push({ text: `${row.label}: ${row.value}`, size: 11, gapAfter: 2 });
      });

      if (totalLabel && totalValue) {
        entries.push({
          text: `${totalLabel}: ${totalValue}`,
          size: 11,
          bold: true,
          gapBefore: 4,
          gapAfter: 8
        });
      }
    };

    pushSection(
      model.sections.income.title,
      model.sections.income.items,
      model.sections.income.totalLabel,
      model.sections.income.totalValue
    );
    pushSection(
      model.sections.expense.title,
      model.sections.expense.items,
      model.sections.expense.totalLabel,
      model.sections.expense.totalValue
    );
    pushSection(model.sections.spending.title, model.sections.spending.items, "", "");
    pushSection(
      model.sections.net.title,
      [
        { label: model.sections.net.incomeLabel, value: model.sections.net.incomeValue },
        { label: model.sections.net.expenseLabel, value: model.sections.net.expenseValue }
      ],
      model.sections.net.netLabel,
      model.sections.net.netValue
    );

    entries.push({ text: model.savingsNote, size: 11, gapBefore: 4, gapAfter: 0 });

    return entries.flatMap((entry) => {
      const maxChars = entry.size >= 18 ? 58 : entry.size >= 14 ? 72 : 88;
      const wrappedLines = wrapPdfText(entry.text, maxChars);
      return wrappedLines.map((line, index) => ({
        text: line,
        size: entry.size,
        bold: entry.bold,
        gapBefore: index === 0 ? entry.gapBefore || 0 : 0,
        gapAfter:
          index === wrappedLines.length - 1 ? entry.gapAfter || 0 : Math.max(2, Math.round(entry.size * 0.25))
      }));
    });
  }

  function buildPdfBlobFromEntries(entries) {
    const pageWidth = 612;
    const pageHeight = 792;
    const topMargin = 742;
    const bottomMargin = 54;
    const leftMargin = 52;
    const pages = [];
    let currentPage = [];
    let currentY = topMargin;

    entries.forEach((entry) => {
      const lineHeight = Math.round(entry.size * 1.45);
      const gapBefore = entry.gapBefore || 0;
      const gapAfter = entry.gapAfter || 0;
      const requiredSpace = gapBefore + lineHeight + gapAfter;

      if (currentY - requiredSpace < bottomMargin) {
        pages.push(currentPage);
        currentPage = [];
        currentY = topMargin;
      }

      currentY -= gapBefore;
      currentPage.push({
        x: leftMargin,
        y: currentY,
        text: entry.text,
        size: entry.size,
        font: entry.bold ? "F2" : "F1"
      });
      currentY -= lineHeight + gapAfter;
    });

    if (currentPage.length) {
      pages.push(currentPage);
    }

    let nextId = 1;
    const regularFontId = nextId++;
    const boldFontId = nextId++;
    const contentIds = pages.map(() => nextId++);
    const pageIds = pages.map(() => nextId++);
    const pagesId = nextId++;
    const catalogId = nextId++;
    const objects = [];

    objects[regularFontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[boldFontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

    pages.forEach((page, index) => {
      const stream = page
        .map((line) => {
          return `BT /${line.font} ${line.size} Tf 1 0 0 1 ${line.x} ${line.y} Tm (${sanitizePdfText(
            line.text
          )}) Tj ET`;
        })
        .join("\n");

      objects[contentIds[index]] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });

    pages.forEach((_, index) => {
      objects[pageIds[index]] =
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> ` +
        `/Contents ${contentIds[index]} 0 R >>`;
    });

    objects[pagesId] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] >>`;
    objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

    let pdf = "%PDF-1.4\n";
    const offsets = [];

    for (let objectId = 1; objectId <= catalogId; objectId += 1) {
      offsets[objectId] = pdf.length;
      pdf += `${objectId} 0 obj\n${objects[objectId]}\nendobj\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${catalogId + 1}\n`;
    pdf += "0000000000 65535 f \n";

    for (let objectId = 1; objectId <= catalogId; objectId += 1) {
      pdf += `${String(offsets[objectId]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${catalogId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new Blob([pdf], { type: "application/pdf" });
  }

  function buildStyledReportPdfBlob(model) {
    const pageWidth = 842;
    const pageHeight = 595;
    const commands = [];

    const toUnit = (value) => Number(value).toFixed(3).replace(/\.?0+$/, "");
    const topToY = (top) => pageHeight - top;
    const drawRect = (x, top, width, height, options = {}) => {
      const y = pageHeight - top - height;
      const lineWidth = options.lineWidth ?? 1;
      const fill = options.fillColor || null;
      const stroke = options.strokeColor || null;

      commands.push(`${toUnit(lineWidth)} w`);

      if (fill) {
        commands.push(`${toUnit(fill[0])} ${toUnit(fill[1])} ${toUnit(fill[2])} rg`);
      }

      if (stroke) {
        commands.push(`${toUnit(stroke[0])} ${toUnit(stroke[1])} ${toUnit(stroke[2])} RG`);
      }

      commands.push(
        `${toUnit(x)} ${toUnit(y)} ${toUnit(width)} ${toUnit(height)} re ${
          fill && stroke ? "B" : fill ? "f" : "S"
        }`
      );
    };
    const drawLine = (x1, top1, x2, top2, color, lineWidth = 1) => {
      commands.push(`${toUnit(lineWidth)} w`);
      commands.push(`${toUnit(color[0])} ${toUnit(color[1])} ${toUnit(color[2])} RG`);
      commands.push(
        `${toUnit(x1)} ${toUnit(pageHeight - top1)} m ${toUnit(x2)} ${toUnit(pageHeight - top2)} l S`
      );
    };
    const textWidth = (text, size) => sanitizePdfText(text).length * size * 0.52;
    const drawText = (text, x, top, options = {}) => {
      const font = options.bold ? "F2" : "F1";
      const size = options.size || 12;
      const color = options.color || [0.09, 0.10, 0.27];
      commands.push(`${toUnit(color[0])} ${toUnit(color[1])} ${toUnit(color[2])} rg`);
      commands.push(
        `BT /${font} ${toUnit(size)} Tf 1 0 0 1 ${toUnit(x)} ${toUnit(topToY(top))} Tm (${sanitizePdfText(
          text
        )}) Tj ET`
      );
    };
    const drawRightText = (text, rightX, top, options = {}) => {
      const size = options.size || 12;
      drawText(text, rightX - textWidth(text, size), top, options);
    };
    const drawCenterText = (text, centerX, top, options = {}) => {
      const size = options.size || 12;
      drawText(text, centerX - textWidth(text, size) / 2, top, options);
    };
    const wrapLines = (text, maxChars) => wrapPdfText(text, maxChars);

    const ink = [0.09, 0.10, 0.27];
    const muted = [0.39, 0.38, 0.55];
    const border = [0.85, 0.83, 0.94];
    const purple = [0.55, 0.47, 0.83];
    const purpleSoft = [0.89, 0.87, 0.97];
    const green = [0.25, 0.67, 0.47];
    const greenSoft = [0.88, 0.96, 0.93];
    const greenBorder = [0.42, 0.75, 0.58];
    const red = [1, 0.18, 0.18];

    const marginX = 34;
    const gap = 16;
    const cardWidth = (pageWidth - marginX * 2 - gap) / 2;
    const topCardHeight = 150;
    const bottomCardHeight = 214;
    const cardTop = 158;
    const lowerTop = cardTop + topCardHeight + gap;
    const leftX = marginX;
    const rightX = marginX + cardWidth + gap;

    const incomeRows = model.sections.income.items.length
      ? model.sections.income.items
      : [{ label: translate("report.noData", "No data yet"), value: formatPositiveAmount(0) }];
    const expenseRows = model.sections.expense.items.length
      ? model.sections.expense.items
      : [{ label: translate("report.noData", "No data yet"), value: formatNegativeAmount(0) }];
    const spendingRows = model.sections.spending.items.length
      ? model.sections.spending.items
      : [{ label: translate("report.noData", "No data yet"), shortLabel: "", value: formatAmount(0), height: 8 }];

    const drawSummaryCard = (x, top, title, row, totalLabel, totalValue, totalColor) => {
      drawRect(x, top, cardWidth, topCardHeight, { strokeColor: border, fillColor: [1, 1, 1] });
      drawText(title, x + 18, top + 28, { bold: true, size: 17, color: ink });
      drawText(row.label, x + 18, top + 72, { size: 13, color: muted });
      drawRightText(row.value, x + cardWidth - 18, top + 72, {
        bold: true,
        size: 15,
        color: totalColor
      });
      drawLine(x + 18, top + 92, x + cardWidth - 18, top + 92, border, 1);
      drawText(totalLabel, x + 18, top + 126, { bold: true, size: 13, color: muted });
      drawRightText(totalValue, x + cardWidth - 18, top + 126, {
        bold: true,
        size: 17,
        color: totalColor
      });
    };

    commands.push(`${toUnit(1)} ${toUnit(1)} ${toUnit(1)} rg`);
    commands.push(`0 0 ${toUnit(pageWidth)} ${toUnit(pageHeight)} re f`);

    drawText(model.eyebrow, 12, 18, { bold: true, size: 13, color: [0.43, 0.47, 0.67] });
    drawText(model.title, 12, 50, { bold: true, size: 28, color: ink });
    drawText(model.subtitle, 12, 90, { size: 13, color: muted });

    drawSummaryCard(
      leftX,
      cardTop,
      model.sections.income.title,
      incomeRows[0],
      model.sections.income.totalLabel,
      model.sections.income.totalValue,
      green
    );
    drawSummaryCard(
      rightX,
      cardTop,
      model.sections.expense.title,
      expenseRows[0],
      model.sections.expense.totalLabel,
      model.sections.expense.totalValue,
      red
    );

    drawRect(leftX, lowerTop, cardWidth, bottomCardHeight, {
      strokeColor: border,
      fillColor: [1, 1, 1]
    });
    drawText(model.sections.spending.title, leftX + 18, lowerTop + 28, {
      bold: true,
      size: 17,
      color: ink
    });

    const axisTop = lowerTop + 56;
    const chartHeight = 132;
    const chartBottomTop = axisTop + chartHeight;
    const axisX = leftX + 18;
    const chartX = leftX + 74;
    const chartWidth = cardWidth - 100;
    const axisLabels = model.sections.spending.axisLabels || [];

    axisLabels.forEach((label, index) => {
      const ratio = index / Math.max(axisLabels.length - 1, 1);
      const currentTop = axisTop + chartHeight * ratio;
      drawText(label, axisX, currentTop + 4, { size: 10, color: muted });
      drawLine(chartX, currentTop, chartX + chartWidth, currentTop, border, 0.8);
    });

    const barCount = Math.max(spendingRows.length, 1);
    const barGap = 18;
    const availableWidth = chartWidth - barGap * Math.max(barCount - 1, 0);
    const barWidth = Math.min(16, Math.max(10, availableWidth / barCount));

    spendingRows.forEach((item, index) => {
      const height = (chartHeight - 14) * (Math.max(8, Math.min(Number(item.height || 8), 100)) / 100);
      const x =
        chartX + index * (barWidth + barGap) + Math.max((availableWidth / barCount - barWidth) / 2, 0);
      const top = chartBottomTop - height;
      drawRect(x, top, barWidth, height, { fillColor: purple, strokeColor: purple, lineWidth: 0.5 });
      if (item.shortLabel) {
        drawCenterText(item.shortLabel, x + barWidth / 2, chartBottomTop + 20, { size: 9, color: muted });
      }
    });

    drawRect(rightX, lowerTop, cardWidth, bottomCardHeight, {
      strokeColor: border,
      fillColor: [1, 1, 1]
    });
    drawText(model.sections.net.title, rightX + 18, lowerTop + 28, {
      bold: true,
      size: 17,
      color: ink
    });
    drawText(model.sections.net.incomeLabel, rightX + 18, lowerTop + 72, {
      size: 13,
      color: muted
    });
    drawRightText(model.sections.net.incomeValue, rightX + cardWidth - 18, lowerTop + 72, {
      bold: true,
      size: 15,
      color: green
    });
    drawLine(rightX + 18, lowerTop + 92, rightX + cardWidth - 18, lowerTop + 92, border, 1);
    drawText(model.sections.net.expenseLabel, rightX + 18, lowerTop + 112, {
      size: 13,
      color: muted
    });
    drawRightText(model.sections.net.expenseValue, rightX + cardWidth - 18, lowerTop + 112, {
      bold: true,
      size: 15,
      color: red
    });
    drawLine(rightX + 18, lowerTop + 132, rightX + cardWidth - 18, lowerTop + 132, border, 1);
    drawRect(rightX + 18, lowerTop + 148, cardWidth - 36, 74, {
      fillColor: greenSoft,
      strokeColor: greenBorder,
      lineWidth: 1.6
    });
    drawText(model.sections.net.netLabel, rightX + 36, lowerTop + 178, {
      bold: true,
      size: 14,
      color: green
    });
    drawRightText(model.sections.net.netValue, rightX + cardWidth - 34, lowerTop + 184, {
      bold: true,
      size: 24,
      color: green
    });

    const noteLines = wrapLines(model.savingsNote, 42).slice(0, 2);
    noteLines.forEach((line, index) => {
      drawCenterText(line, rightX + cardWidth / 2, lowerTop + 250 + index * 15, {
        size: 11,
        color: muted
      });
    });

    const stream = commands.join("\n");
    const objects = [];
    objects[1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
    objects[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[4] =
      `<< /Type /Page /Parent 5 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 1 0 R /F2 2 0 R >> >> /Contents 3 0 R >>`;
    objects[5] = "<< /Type /Pages /Count 1 /Kids [4 0 R] >>";
    objects[6] = "<< /Type /Catalog /Pages 5 0 R >>";

    let pdf = "%PDF-1.4\n";
    const offsets = [];

    for (let objectId = 1; objectId <= 6; objectId += 1) {
      offsets[objectId] = pdf.length;
      pdf += `${objectId} 0 obj\n${objects[objectId]}\nendobj\n`;
    }

    const xrefOffset = pdf.length;
    pdf += "xref\n0 7\n";
    pdf += "0000000000 65535 f \n";

    for (let objectId = 1; objectId <= 6; objectId += 1) {
      pdf += `${String(offsets[objectId]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size 7 /Root 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new Blob([pdf], { type: "application/pdf" });
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    const objectUrl = URL.createObjectURL(blob);

    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  function getReportPdfFilename() {
    const isoDate = new Date().toISOString().slice(0, 10);
    return `budget-flow-financial-report-${isoDate}.pdf`;
  }

  function hydrateBudgetState(budget) {
    budgetState.budget.month = budget.month || "";
    budgetState.budget.total = Number(budget.total || 0);
    budgetState.categories = (budget.categories || []).map((item) => ({
      id: item.id,
      emoji: item.emoji,
      name: item.name,
      limit: Number(item.limit || 0),
      spent: Number(item.spent || 0)
    }));
    budgetState.nextCatId = budgetState.categories.length
      ? Math.max(...budgetState.categories.map((item) => item.id)) + 1
      : 1;

    document.getElementById("sb-month").value = budget.month || "";
    renderBudgetSummary();
    renderCategories();
  }

  function hydrateSavingsState(snapshot) {
    savingsState.goals = (snapshot.goals || []).map((goal) => ({
      id: goal.id,
      emoji: goal.emoji,
      name: goal.name,
      target: Number(goal.target || 0),
      saved: Number(goal.saved || 0)
    }));
    savingsState.nextGoalId = savingsState.goals.length
      ? Math.max(...savingsState.goals.map((goal) => goal.id)) + 1
      : 1;

    renderSavingsSummary();
    renderSavingsGoals();
  }

  function populateCategoryOptions(categories) {
    const select = document.getElementById("inp-cat");
    if (!select) {
      return;
    }

    const currentValue = select.value;
    select.innerHTML = '<option value="">select category</option>';

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.name;
      option.textContent = category.name;
      select.appendChild(option);
    });

    if ([...select.options].some((option) => option.value === currentValue)) {
      select.value = currentValue;
    }
  }

  function populateCurrencyOptions(currencies, selectedValue) {
    const select = document.getElementById("acc-currency");
    if (!select || !Array.isArray(currencies) || !currencies.length) {
      return;
    }

    select.innerHTML = "";

    currencies.forEach((currency) => {
      const option = document.createElement("option");
      option.value = currency.code;
      option.textContent = `${currency.code} - ${currency.label}${currency.symbol ? ` (${currency.symbol})` : ""}`;
      option.dataset.defaultLabel = option.textContent;
      select.appendChild(option);
    });

    select.value = selectedValue || currencies[0].code;
  }

  function populateLanguageOptions(languages, selectedValue) {
    const select = document.getElementById("app-lang");
    if (!select || !Array.isArray(languages) || !languages.length) {
      return;
    }

    const supportedLanguages = languages.filter((language) => {
      const code = String(language?.code || "").trim().toLowerCase();
      return (window.BudgetFlowI18n?.normalizeLanguage?.(code) || "en") === code;
    });

    if (!supportedLanguages.length) {
      return;
    }

    select.innerHTML = "";

    supportedLanguages.forEach((language) => {
      const option = document.createElement("option");
      option.value = language.code;
      option.textContent = language.label;
      option.dataset.defaultLabel = language.label;
      select.appendChild(option);
    });

    const normalizedSelectedValue =
      window.BudgetFlowI18n?.normalizeLanguage?.(selectedValue || "") || "";
    select.value = [...select.options].some((option) => option.value === normalizedSelectedValue)
      ? normalizedSelectedValue
      : supportedLanguages[0].code;
  }

  function applySettings(settings) {
    const profile = settings.profile || {};
    const preferences = settings.preferences || {};
    const notifications = settings.notifications || {};
    const reminderTime = (notifications.reminderTime || "18:00").slice(0, 5);
    const pushMessageDraft =
      localStorage.getItem(PUSH_MESSAGE_STORAGE_KEY) ||
      document.getElementById("push-message")?.value ||
      DEFAULT_PUSH_MESSAGE;
    const normalizedLanguage =
      window.BudgetFlowI18n?.normalizeLanguage?.(preferences.language || localStorage.getItem("budgetFlowLanguage") || "en") ||
      "en";

    document.getElementById("acc-name").value = profile.name || "";
    document.getElementById("acc-email").value = profile.email || "";
    document.getElementById("acc-currency").value =
      profile.currency || preferences.currency || "GHS";
    document.getElementById("app-lang").value = normalizedLanguage;
    document.getElementById("remind-time").value = reminderTime;
    if (document.getElementById("push-message")) {
      document.getElementById("push-message").value = pushMessageDraft;
    }
    localStorage.setItem(
      "budgetFlowCurrency",
      profile.currency || preferences.currency || localStorage.getItem("budgetFlowCurrency") || "GHS"
    );
    localStorage.setItem(
      "budgetFlowBaseCurrency",
      preferences.baseCurrency ||
        profile.baseCurrency ||
        localStorage.getItem("budgetFlowBaseCurrency") ||
        profile.currency ||
        preferences.currency ||
        "GHS"
    );
    localStorage.setItem(
      "budgetFlowCountryCode",
      preferences.countryCode || profile.countryCode || localStorage.getItem("budgetFlowCountryCode") || ""
    );
    localStorage.setItem(
      "budgetFlowLanguage",
      normalizedLanguage
    );

    window.BudgetFlowUiLanguage?.applyCountryCode(preferences.countryCode || profile.countryCode || "");
    window.BudgetFlowUiLanguage?.applyBaseCurrency(
      preferences.baseCurrency || profile.baseCurrency || profile.currency || preferences.currency || "GHS"
    );
    window.BudgetFlowUiLanguage?.applyCurrency(
      profile.currency || preferences.currency || localStorage.getItem("budgetFlowCurrency") || "GHS"
    );

    applyThemeLocally(preferences.theme || "dark", { silent: true });
    persistReminderPreferences(Boolean(notifications.budgetReminderEnabled), reminderTime);
    persistPushMessageDraft(pushMessageDraft);
    setReminderUi(Boolean(notifications.budgetReminderEnabled), { silent: true });
    setPushUi(Boolean(notifications.pushNotificationsEnabled));
    renderPushAvailability();
    scheduleBudgetReminder();

    localStorage.setItem(
      "user",
      JSON.stringify({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        provider: profile.provider
      })
    );
  }

  async function loadAppData() {
    const bootstrap = await apiFetch("/app/bootstrap");
    const profile = bootstrap.settings?.profile || {};
    const preferences = bootstrap.settings?.preferences || {};
    const hasPendingOnboarding = localStorage.getItem("budgetFlowPendingOnboarding") === "true";
    const onboardingCompleted =
      preferences.onboardingCompleted !== undefined
        ? Boolean(preferences.onboardingCompleted)
        : Boolean(profile.onboardingCompleted);

    if (onboardingCompleted) {
      localStorage.removeItem("budgetFlowPendingOnboarding");
    } else if (hasPendingOnboarding) {
      redirectToOnboarding();
      return;
    }

    const nextCurrency =
      profile.currency ||
      preferences.currency ||
      localStorage.getItem("budgetFlowCurrency") ||
      "GHS";
    const nextBaseCurrency =
      preferences.baseCurrency ||
      profile.baseCurrency ||
      localStorage.getItem("budgetFlowBaseCurrency") ||
      localStorage.getItem("budgetFlowCurrency") ||
      "GHS";
    const nextLanguage =
      window.BudgetFlowI18n?.normalizeLanguage?.(
        preferences.language ||
          localStorage.getItem("budgetFlowLanguage") ||
          document.getElementById("app-lang")?.value ||
          "en"
      ) || "en";

    populateCurrencyOptions(bootstrap.meta?.currencies || [], nextCurrency);
    populateLanguageOptions(bootstrap.meta?.languages || [], nextLanguage);
    window.BudgetFlowUiLanguage?.applyCountryCode(preferences.countryCode || profile.countryCode || "");
    window.BudgetFlowUiLanguage?.applyBaseCurrency(nextBaseCurrency);
    window.BudgetFlowUiLanguage?.applyCurrency(nextCurrency);
    window.BudgetFlowUiLanguage?.apply(nextLanguage);

    const transactionsPayload = await apiFetch("/transactions?limit=100");

    state.bootstrap = bootstrap;
    state.transactions = transactionsPayload.items || [];
    state.assistant = bootstrap.meta?.assistant || null;

    populateCategoryOptions(bootstrap.meta.categories || []);
    renderDashboard(bootstrap.dashboard);
    hydrateBudgetState(bootstrap.budget);
    hydrateSavingsState(bootstrap.savings);
    renderTransactionHistory(state.transactions);
    renderActivityList(state.transactions);
    renderReport(bootstrap.report);
    applySettings(bootstrap.settings);
    renderAssistantStatus(state.assistant || {});
    renderAssistantChips(
      bootstrap.meta?.assistant?.suggestions || bootstrap.meta?.assistantSuggestions || []
    );
    syncExistingPushSubscription(bootstrap.settings?.notifications).catch((error) => {
      renderPushAvailability({ error: error.message });
    });
  }

  async function saveProfile(payload, successMessage) {
    const response = await apiFetch("/settings/profile", {
      method: "PUT",
      body: payload
    });

    if (response.profile) {
      localStorage.setItem("user", JSON.stringify(response.profile));
      if (response.profile.currency) {
        localStorage.setItem("budgetFlowCurrency", response.profile.currency);
        window.BudgetFlowUiLanguage?.applyCurrency(response.profile.currency);
      }
    }

    if (typeof showToast === "function") {
      showToast(successMessage || "Profile updated.");
    }

    await loadAppData();
  }

  window.deleteTransaction = function (id) {
    pendingTransactionDeleteId = id;
    const transaction = state.transactions.find((item) => item.id === id);
    const message = document.getElementById("confirm-transaction-msg");

    if (message) {
      if (transaction) {
        message.innerHTML =
          `You're about to delete <strong>${escapeHtml(transaction.name)}</strong>` +
          ` from <strong>${escapeHtml(transaction.displayDate)}</strong>` +
          ` for <strong>${escapeHtml(formatSignedAmount(transaction.signedAmount))}</strong>.` +
          "<br>This can't be undone.";
      } else {
        message.textContent = "You're about to delete this transaction. This can't be undone.";
      }
    }

    if (typeof openModal === "function") {
      openModal("confirm-transaction");
      return;
    }

    if (window.confirm("Delete this transaction? This can't be undone.")) {
      window.confirmDeleteTransaction();
    }
  };

  window.cancelDeleteTransaction = function () {
    pendingTransactionDeleteId = null;
    if (typeof closeModal === "function") {
      closeModal("modal-confirm-transaction");
    }
  };

  window.confirmDeleteTransaction = async function () {
    if (pendingTransactionDeleteId == null) {
      return;
    }

    try {
      await apiFetch(`/transactions/${pendingTransactionDeleteId}`, { method: "DELETE" });
      if (typeof closeModal === "function") {
        closeModal("modal-confirm-transaction");
      }
      showToast("Transaction deleted.");
      await loadAppData();
    } catch (error) {
      showToast(error.message);
    } finally {
      pendingTransactionDeleteId = null;
    }
  };

  window.saveTransaction = async function () {
    const displayAmount = Number(document.getElementById("inp-amount").value);
    const category = document.getElementById("inp-cat").value.trim();
    const occurredOn = document.getElementById("inp-date").value;
    const note = document.getElementById("inp-desc").value.trim();
    const type = document.getElementById("inp-type").value;

    if (!displayAmount || displayAmount <= 0 || !category || !occurredOn) {
      showToast("Please fill in amount, category, and date.");
      return;
    }

    try {
      const amount = toBaseAmount(displayAmount);
      await apiFetch("/transactions", {
        method: "POST",
        body: {
          amount,
          category,
          occurredOn,
          note,
          type,
          paymentMethod: "momo"
        }
      });

      document.getElementById("inp-amount").value = "";
      document.getElementById("inp-date").valueAsDate = new Date();
      document.getElementById("inp-desc").value = "";
      document.getElementById("inp-cat").value = "";
      document.getElementById("inp-type").value = "expense";

      showToast("Transaction saved.");
      await loadAppData();
    } catch (error) {
      showToast(error.message);
    }
  };

  window.setBudget = async function () {
    const month = document.getElementById("sb-month").value;
    const displayAmount = Number(document.getElementById("sb-amount").value);
    const errorBox = document.getElementById("sb-error");
    errorBox.textContent = "";

    if (!month) {
      errorBox.textContent = "Please select a month.";
      return;
    }

    if (!displayAmount || displayAmount <= 0) {
      errorBox.textContent = "Please enter a valid amount.";
      return;
    }

    try {
      const amount = toBaseAmount(displayAmount);
      await apiFetch("/budgets/current", {
        method: "PUT",
        body: { month, total: amount }
      });

      closeModal("modal-set-budget");
      document.getElementById("sb-amount").value = "";
      showToast("Budget saved.");
      await loadAppData();
    } catch (error) {
      errorBox.textContent = error.message;
    }
  };

  window.addCategory = async function () {
    const name = document.getElementById("ac-name").value.trim();
    const displayLimit = Number(document.getElementById("ac-limit").value);
    const errorBox = document.getElementById("ac-error");
    errorBox.textContent = "";

    if (!name) {
      errorBox.textContent = "Please enter a name.";
      return;
    }

    if (!displayLimit || displayLimit <= 0) {
      errorBox.textContent = "Please enter a valid limit.";
      return;
    }

    try {
      const limit = toBaseAmount(displayLimit);
      await apiFetch("/budgets/categories", {
        method: "POST",
        body: {
          month: budgetState.budget.month || new Date().toISOString().slice(0, 7),
          name,
          emoji: selectedEmoji,
          limit
        }
      });

      closeModal("modal-add-category");
      document.getElementById("ac-name").value = "";
      document.getElementById("ac-limit").value = "";
      showToast("Category added.");
      await loadAppData();
    } catch (error) {
      errorBox.textContent = error.message;
    }
  };

  window.saveEditCategory = async function () {
    const name = document.getElementById("ec-name").value.trim();
    const displayLimit = Number(document.getElementById("ec-limit").value);
    const errorBox = document.getElementById("ec-error");
    errorBox.textContent = "";

    if (!name) {
      errorBox.textContent = "Please enter a name.";
      return;
    }

    if (!displayLimit || displayLimit <= 0) {
      errorBox.textContent = "Please enter a valid limit.";
      return;
    }

    try {
      const limit = toBaseAmount(displayLimit);
      await apiFetch(`/budgets/categories/${editingCatId}`, {
        method: "PUT",
        body: { name, limit }
      });

      closeModal("modal-edit-category");
      showToast("Category updated.");
      await loadAppData();
    } catch (error) {
      errorBox.textContent = error.message;
    }
  };

  window.confirmDeleteCategory = async function () {
    try {
      await apiFetch(`/budgets/categories/${deletingCatId}`, { method: "DELETE" });
      closeModal("modal-confirm-cat");
      showToast("Category deleted.");
      deletingCatId = null;
      await loadAppData();
    } catch (error) {
      showToast(error.message);
    }
  };

  window.logSpend = async function () {
    const displayAmount = Number(document.getElementById("ls-amount").value);
    const errorBox = document.getElementById("ls-error");
    errorBox.textContent = "";

    if (!displayAmount || displayAmount <= 0) {
      errorBox.textContent = "Enter a valid amount.";
      return;
    }

    try {
      const amount = toBaseAmount(displayAmount);
      await apiFetch(`/budgets/categories/${logSpendCatId}/log-spend`, {
        method: "POST",
        body: { amount }
      });

      closeModal("modal-log-spend");
      showToast("Spend logged.");
      await loadAppData();
    } catch (error) {
      errorBox.textContent = error.message;
    }
  };

  window.saveCorrectSpend = async function () {
    const displayAmount = Number(document.getElementById("cs-amount").value);
    const errorBox = document.getElementById("cs-error");
    errorBox.textContent = "";

    if (Number.isNaN(displayAmount) || displayAmount < 0) {
      errorBox.textContent = "Enter a valid amount (0 or more).";
      return;
    }

    try {
      const amount = toBaseAmount(displayAmount);
      await apiFetch(`/budgets/categories/${correctSpendId}/correct-spend`, {
        method: "POST",
        body: { amount }
      });

      closeModal("modal-correct-spend");
      showToast("Spent amount corrected.");
      await loadAppData();
    } catch (error) {
      errorBox.textContent = error.message;
    }
  };

  window.addSavingsGoal = async function () {
    const name = document.getElementById("sg-name").value.trim();
    const displayTarget = Number(document.getElementById("sg-target").value);
    const errorBox = document.getElementById("sg-error");
    errorBox.textContent = "";

    if (!name) {
      errorBox.textContent = "Please enter a goal name.";
      return;
    }

    if (!displayTarget || displayTarget <= 0) {
      errorBox.textContent = "Please enter a valid target amount.";
      return;
    }

    try {
      const target = toBaseAmount(displayTarget);
      await apiFetch("/savings/goals", {
        method: "POST",
        body: {
          name,
          emoji: selectedGoalEmoji,
          target
        }
      });

      closeSavingsModal("modal-add-goal");
      document.getElementById("sg-name").value = "";
      document.getElementById("sg-target").value = "";
      showToast("Savings goal created.");
      await loadAppData();
    } catch (error) {
      errorBox.textContent = error.message;
    }
  };

  window.addSavingsMoney = async function () {
    const displayAmount = Number(document.getElementById("am-amount").value);
    const errorBox = document.getElementById("am-error");
    errorBox.textContent = "";

    if (!displayAmount || displayAmount <= 0) {
      errorBox.textContent = "Enter a valid amount.";
      return;
    }

    try {
      const amount = toBaseAmount(displayAmount);
      await apiFetch(`/savings/goals/${addMoneyGoalId}/deposit`, {
        method: "POST",
        body: { amount }
      });

      closeSavingsModal("modal-add-money");
      showToast("Savings updated.");
      await loadAppData();
    } catch (error) {
      errorBox.textContent = error.message;
    }
  };

  window.withdrawSavings = async function () {
    const displayAmount = Number(document.getElementById("wd-amount").value);
    const errorBox = document.getElementById("wd-error");
    errorBox.textContent = "";

    if (!displayAmount || displayAmount <= 0) {
      errorBox.textContent = "Enter a valid amount.";
      return;
    }

    try {
      const amount = toBaseAmount(displayAmount);
      await apiFetch(`/savings/goals/${withdrawGoalId}/withdraw`, {
        method: "POST",
        body: { amount }
      });

      closeSavingsModal("modal-withdraw");
      showToast("Withdrawal saved.");
      await loadAppData();
    } catch (error) {
      errorBox.textContent = error.message;
    }
  };

  window.saveSavingsGoal = async function () {
    const name = document.getElementById("eg-name").value.trim();
    const displayTarget = Number(document.getElementById("eg-target").value);
    const errorBox = document.getElementById("eg-error");
    errorBox.textContent = "";

    if (!name) {
      errorBox.textContent = "Please enter a goal name.";
      return;
    }

    if (!displayTarget || displayTarget <= 0) {
      errorBox.textContent = "Please enter a valid target amount.";
      return;
    }

    try {
      const target = toBaseAmount(displayTarget);
      await apiFetch(`/savings/goals/${editingGoalId}`, {
        method: "PUT",
        body: { name, target }
      });

      closeSavingsModal("modal-edit-goal");
      showToast("Goal updated.");
      await loadAppData();
    } catch (error) {
      errorBox.textContent = error.message;
    }
  };

  window.confirmDeleteGoal = async function () {
    try {
      await apiFetch(`/savings/goals/${deletingGoalId}`, { method: "DELETE" });
      closeSavingsModal("modal-confirm-goal");
      showToast("Goal deleted.");
      deletingGoalId = null;
      await loadAppData();
    } catch (error) {
      showToast(error.message);
    }
  };

  window.saveAccount = async function () {
    const previousCurrency =
      state.bootstrap?.settings?.profile?.currency ||
      state.bootstrap?.settings?.preferences?.currency ||
      localStorage.getItem("budgetFlowCurrency") ||
      "GHS";
    const nextCurrency = document.getElementById("acc-currency").value;

    window.BudgetFlowUiLanguage?.applyCurrency(nextCurrency);

    try {
      await saveProfile(
        {
          name: document.getElementById("acc-name").value.trim(),
          email: document.getElementById("acc-email").value.trim(),
          currency: nextCurrency
        },
        "Account settings saved."
      );
    } catch (error) {
      window.BudgetFlowUiLanguage?.applyCurrency(previousCurrency);
      document.getElementById("acc-currency").value = previousCurrency;
      showToast(error.message);
    }
  };

  window.updateName = async function () {
    try {
      await saveProfile({ name: document.getElementById("acc-name").value.trim() }, "Name updated.");
    } catch (error) {
      showToast(error.message);
    }
  };

  window.updateEmail = async function () {
    try {
      await saveProfile({ email: document.getElementById("acc-email").value.trim() }, "Email updated.");
    } catch (error) {
      showToast(error.message);
    }
  };

  window.toggleTheme = async function (isLight) {
    const previousTheme = getLocalTheme();
    const nextTheme = isLight ? "light" : "dark";
    applyThemeLocally(nextTheme, { silent: true });

    try {
      await apiFetch("/settings/preferences", {
        method: "PUT",
        body: { theme: nextTheme }
      });
      showToast(
        isLight
          ? translate("toast.lightModeEnabled", "Light mode enabled")
          : translate("toast.darkModeEnabled", "Dark mode enabled")
      );
    } catch (error) {
      applyThemeLocally(previousTheme, { silent: true });
      showToast(error.message);
    }
  };

  window.toggleReminder = function (isEnabled) {
    setReminderUi(isEnabled);
  };

  window.saveNotif = async function () {
    const isEnabled = document.getElementById("budg-remind").checked;
    const pushEnabled = document.getElementById("push-remind")?.checked;
    const reminderTime = document.getElementById("remind-time").value || "18:00";
    const saveMessagePromise = getReminderSaveMessage(isEnabled);

    try {
      await apiFetch("/settings/notifications", {
        method: "PUT",
        body: {
          budgetReminderEnabled: isEnabled,
          reminderTime,
          pushNotificationsEnabled: Boolean(pushEnabled)
        }
      });

      let pushMessage = "";

      if (pushEnabled) {
        try {
          await ensurePushSubscription({ prompt: true });
          renderPushAvailability({ ready: true });
          pushMessage = " Push alerts are ready on this device.";
        } catch (error) {
          document.getElementById("push-remind").checked = false;
          renderPushAvailability({ error: error.message });
          await apiFetch("/settings/notifications", {
            method: "PUT",
            body: {
              pushNotificationsEnabled: false
            }
          }).catch(() => {});
          pushMessage = ` ${error.message}`;
        }
      } else {
        await removePushSubscription();
        renderPushAvailability();
      }

      persistReminderPreferences(isEnabled, reminderTime);
      persistPushMessageDraft(getPushMessageDraft());
      scheduleBudgetReminder();
      showToast(`${await saveMessagePromise}${pushMessage}`);
      await loadAppData();
    } catch (error) {
      showToast(error.message);
    }
  };

  window.sendTestNotification = async function () {
    const message = getPushMessageDraft();

    persistPushMessageDraft(message);

    try {
      const response = await apiFetch("/push/test", {
        method: "POST",
        body: {
          title: "Budget Flow reminder",
          message
        }
      });

      const delivered = Number(response.delivered || 0);
      if (delivered > 0) {
        showToast(
          delivered === 1
            ? "Notification sent to this device."
            : `Notification sent to ${delivered} devices.`
        );
        return;
      }

      showToast("No connected devices yet. Turn on push notifications on this device first.");
    } catch (error) {
      showToast(error.message);
    }
  };

  window.openReportView = function () {
    if (typeof window.show === "function") {
      window.show("report");
    }
  };

  window.printFinancialReport = function () {
    openReportWindow({ autoPrint: true });
  };

  window.downloadFinancialReportPdf = function () {
    const model = buildReportExportModel();

    if (!model) {
      showToast(translate("toast.reportUnavailable", "Financial report is not ready yet."));
      return;
    }

    const pdfBlob = buildStyledReportPdfBlob(model);
    downloadBlob(pdfBlob, getReportPdfFilename());
  };

  window.doDelete = async function () {
    try {
      await apiFetch("/settings/account", { method: "DELETE" });
      closeDelete();
      showToast("Account deleted.");
      redirectToAuth();
    } catch (error) {
      showToast(error.message);
    }
  };

  window.logout = function () {
    redirectToAuth();
  };

  window.buildGoalEmojiPicker = function () {
    const emojis = [
      "\ud83c\udfd6\ufe0f",
      "\ud83d\udcbb",
      "\ud83c\udfe0",
      "\ud83c\udf93",
      "\ud83d\ude97",
      "\ud83d\udc8d",
      "\ud83d\udc76",
      "\ud83d\uded2",
      "\u2708\ufe0f",
      "\ud83c\udfb8",
      "\ud83d\udcf1",
      "\ud83c\udfae",
      "\ud83d\udcb0",
      "\ud83c\udf81",
      "\ud83c\udfcb\ufe0f"
    ];
    const row = document.getElementById("goal-emoji-row");
    if (!row) {
      return;
    }

    row.innerHTML = "";
    selectedGoalEmoji = emojis[0];

    emojis.forEach((emoji, index) => {
      const tile = document.createElement("div");
      tile.className = `emoji-opt${index === 0 ? " selected" : ""}`;
      tile.textContent = emoji;
      tile.onclick = () => {
        row.querySelectorAll(".emoji-opt").forEach((item) => item.classList.remove("selected"));
        tile.classList.add("selected");
        selectedGoalEmoji = emoji;
      };
      row.appendChild(tile);
    });
  };

  window.sendMsg = async function () {
    const input = document.getElementById("chat-in");
    const text = input.value.trim();
    if (!text || busy) {
      return;
    }

    input.value = "";
    input.style.height = "auto";
    hideAssistantChips();
    addUser(text);
    history.push({ role: "user", content: text });
    const typingId = addTyping();
    busy = true;
    document.getElementById("send-btn").disabled = true;

    try {
      const response = await apiFetch("/assistant/chat", {
        method: "POST",
        body: { message: text }
      });

      removeEl(typingId);
      history.push({ role: "assistant", content: response.message });
      addBot(response.message);
      state.assistant = response.assistant || {
        mode: response.mode,
        suggestions: response.suggestions || []
      };
      renderAssistantStatus(state.assistant);
      renderAssistantChips(
        response.assistant?.suggestions ||
          response.suggestions ||
          state.bootstrap?.meta?.assistant?.suggestions ||
          []
      );
    } catch (error) {
      removeEl(typingId);
      addBot(error.message || "Could not reach Budget AI right now.");
      renderAssistantStatus({ mode: "rules-fallback" });
      renderAssistantChips(
        state.assistant?.suggestions ||
          state.bootstrap?.meta?.assistant?.suggestions ||
          state.bootstrap?.meta?.assistantSuggestions ||
          []
      );
    } finally {
      busy = false;
      document.getElementById("send-btn").disabled = false;
      window.toggleChatComposer?.(false);
    }
  };

  document.getElementById("app-lang")?.addEventListener("change", async function (event) {
    const previousValue =
      state.bootstrap?.settings?.preferences?.language || localStorage.getItem("budgetFlowLanguage") || "en";
    const nextValue = event.target.value;

    window.BudgetFlowUiLanguage?.apply(nextValue);

    try {
      await apiFetch("/settings/preferences", {
        method: "PUT",
        body: { language: nextValue }
      });

      localStorage.setItem("budgetFlowLanguage", nextValue);
      if (state.bootstrap?.settings?.preferences) {
        state.bootstrap.settings.preferences.language = nextValue;
      }
      showToast(
        window.BudgetFlowI18n?.t?.("toast.languageSaved", {}, nextValue) ||
          "Language preference saved."
      );
    } catch (error) {
      event.target.value = previousValue;
      window.BudgetFlowUiLanguage?.apply(previousValue);
      showToast(error.message);
    }
  });

  document.getElementById("acc-currency")?.addEventListener("change", function (event) {
    window.BudgetFlowUiLanguage?.applyCurrency(event.target.value || "GHS");
  });

  document.getElementById("push-message")?.addEventListener("input", function (event) {
    persistPushMessageDraft(event.target.value);
  });

  document.addEventListener(
    "wheel",
    function (event) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement &&
        target.type === "number" &&
        document.activeElement === target
      ) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      maybeSendDueReminder();
      scheduleBudgetReminder();
    }
  });

  window.addEventListener("focus", () => {
    maybeSendDueReminder();
    scheduleBudgetReminder();
  });

  if (redirectToCanonicalAppIfNeeded()) {
    return;
  }

  rememberWorkflowUrls();
  installHashNavigation();

  const token = getToken();
  if (!token) {
    redirectToAuth();
    return;
  }

  persistToken(token);
  setAppLoading(true);

  loadAppData()
    .catch((error) => {
      showToast(error.message || "Could not load app data.");
    })
    .finally(() => {
      setAppLoading(false);
    });
})();
