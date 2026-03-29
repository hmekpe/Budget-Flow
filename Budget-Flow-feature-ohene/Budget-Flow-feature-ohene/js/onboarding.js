(function () {
  const TOKEN_KEYS = ["budgetFlowToken", "authToken"];
  const ONBOARDING_PENDING_KEY = "budgetFlowPendingOnboarding";
  const FALLBACK_COUNTRIES = [
    { code: "GH", label: "Ghana", currency: "GHS", language: "en" },
    { code: "US", label: "United States", currency: "USD", language: "en" },
    { code: "GB", label: "United Kingdom", currency: "GBP", language: "en" },
    { code: "CA", label: "Canada", currency: "CAD", language: "en" },
    { code: "AU", label: "Australia", currency: "AUD", language: "en" },
    { code: "NG", label: "Nigeria", currency: "NGN", language: "en" },
    { code: "KE", label: "Kenya", currency: "KES", language: "sw" },
    { code: "ZA", label: "South Africa", currency: "ZAR", language: "en" },
    { code: "FR", label: "France", currency: "EUR", language: "fr" },
    { code: "ES", label: "Spain", currency: "EUR", language: "es" },
    { code: "PT", label: "Portugal", currency: "EUR", language: "pt" },
    { code: "DE", label: "Germany", currency: "EUR", language: "de" },
    { code: "IT", label: "Italy", currency: "EUR", language: "it" },
    { code: "NL", label: "Netherlands", currency: "EUR", language: "nl" },
    { code: "BR", label: "Brazil", currency: "BRL", language: "pt" },
    { code: "AE", label: "United Arab Emirates", currency: "AED", language: "ar" },
    { code: "SA", label: "Saudi Arabia", currency: "SAR", language: "ar" },
    { code: "IN", label: "India", currency: "INR", language: "hi" },
    { code: "JP", label: "Japan", currency: "JPY", language: "ja" },
    { code: "CN", label: "China", currency: "CNY", language: "zh" },
    { code: "KR", label: "South Korea", currency: "KRW", language: "ko" },
    { code: "MX", label: "Mexico", currency: "MXN", language: "es" },
    { code: "EG", label: "Egypt", currency: "EGP", language: "ar" }
  ];
  const FALLBACK_CURRENCIES = [
    { code: "GHS", label: "Ghanaian Cedi", symbol: "₵" },
    { code: "USD", label: "US Dollar", symbol: "$" },
    { code: "EUR", label: "Euro", symbol: "€" },
    { code: "GBP", label: "British Pound", symbol: "£" },
    { code: "NGN", label: "Nigerian Naira", symbol: "₦" },
    { code: "KES", label: "Kenyan Shilling", symbol: "KSh" },
    { code: "ZAR", label: "South African Rand", symbol: "R" },
    { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
    { code: "AUD", label: "Australian Dollar", symbol: "A$" },
    { code: "JPY", label: "Japanese Yen", symbol: "¥" },
    { code: "INR", label: "Indian Rupee", symbol: "₹" },
    { code: "BRL", label: "Brazilian Real", symbol: "R$" },
    { code: "AED", label: "UAE Dirham", symbol: "AED" },
    { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
    { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
    { code: "SAR", label: "Saudi Riyal", symbol: "SAR" },
    { code: "KRW", label: "South Korean Won", symbol: "₩" },
    { code: "MXN", label: "Mexican Peso", symbol: "MX$" },
    { code: "EGP", label: "Egyptian Pound", symbol: "E£" }
  ];
  const FALLBACK_LANGUAGES = [
    { code: "en", label: "English" },
    { code: "fr", label: "Francais" },
    { code: "es", label: "Espanol" },
    { code: "pt", label: "Portugues" },
    { code: "de", label: "Deutsch" },
    { code: "it", label: "Italiano" },
    { code: "nl", label: "Nederlands" },
    { code: "sw", label: "Kiswahili" },
    { code: "tw", label: "Twi" }
  ];
  const state = {
    countries: [],
    currencies: [],
    languages: []
  };

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

  function resolveAuthPageUrl() {
    if (window.location.protocol === "file:") {
      const storedUrl = localStorage.getItem("budgetFlowAuthUrl");
      return storedUrl
        ? stripHash(storedUrl)
        : new URL("../../Budget-Flow/pages/auth.html", window.location.href).href;
    }

    return `${getWorkflowOrigin()}/pages/auth.html`;
  }

  function resolveAppUrl() {
    if (window.location.protocol === "file:") {
      const storedUrl = localStorage.getItem("budgetFlowAppUrl");
      return storedUrl
        ? `${stripHash(storedUrl)}#dashboard`
        : `${new URL("./index.html", window.location.href).href}#dashboard`;
    }

    return `${getWorkflowOrigin()}/app/index.html#dashboard`;
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

  function redirectToAuth() {
    window.location.replace(resolveAuthPageUrl());
  }

  function redirectToApp() {
    window.location.replace(resolveAppUrl());
  }

  function hasPendingOnboarding() {
    return localStorage.getItem(ONBOARDING_PENDING_KEY) === "true";
  }

  function setPendingOnboarding(isPending) {
    if (isPending) {
      localStorage.setItem(ONBOARDING_PENDING_KEY, "true");
      return;
    }

    localStorage.removeItem(ONBOARDING_PENDING_KEY);
  }

  function setStatus(message, type = "error") {
    const element = document.getElementById("status");
    if (!element) {
      return;
    }

    element.textContent = message || "";
    element.className = type === "success" ? "status success" : "status";
  }

  function setBusy(isBusy) {
    const button = document.getElementById("submit-btn");
    if (!button) {
      return;
    }

    button.disabled = isBusy;
    button.textContent = isBusy ? "Saving your setup..." : "Finish setup";
  }

  function fillSelect(selectId, items, placeholder, selectedValue, getLabel) {
    const select = document.getElementById(selectId);
    if (!select) {
      return;
    }

    const nextValue = selectedValue || select.value || "";
    select.innerHTML = "";

    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);

    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.code;
      option.textContent = getLabel(item);
      select.appendChild(option);
    });

    const supportedValue = items.some((item) => item.code === nextValue) ? nextValue : "";
    select.value = supportedValue;
  }

  function hydrateSelects(selectedCountry, selectedLanguage, selectedCurrency) {
    fillSelect(
      "country",
      state.countries,
      "Select your country",
      selectedCountry,
      (item) => item.label
    );
    fillSelect(
      "language",
      state.languages,
      "Select your language",
      selectedLanguage,
      (item) => item.label
    );
    fillSelect(
      "currency",
      state.currencies,
      "Select your currency",
      selectedCurrency,
      (item) => `${item.code} - ${item.label}${item.symbol ? ` (${item.symbol})` : ""}`
    );
  }

  function updateSelectionNote() {
    const languageCode = document.getElementById("language")?.value || "";
    const currencyCode = document.getElementById("currency")?.value || "";
    const countryCode = document.getElementById("country")?.value || "";
    const note = document.getElementById("selection-note");

    if (!note) {
      return;
    }

    const language = state.languages.find((item) => item.code === languageCode);
    const currency = state.currencies.find((item) => item.code === currencyCode);
    const country = state.countries.find((item) => item.code === countryCode);

    if (!language || !currency || !country) {
      note.innerHTML =
        "Your selected currency will be saved as your account currency for stored amounts. You can switch the display currency later without rewriting your data.";
      return;
    }

    note.innerHTML =
      `<strong>${country.label}</strong> will start in <strong>${language.label}</strong> and store amounts in <strong>${currency.code}</strong>. ` +
      "Later currency changes inside Settings will only change the display view using market rates.";
  }

  function applyCountryDefaults(countryCode) {
    const country = state.countries.find((item) => item.code === countryCode);
    if (!country) {
      updateSelectionNote();
      return;
    }

    const languageSelect = document.getElementById("language");
    const currencySelect = document.getElementById("currency");

    if (languageSelect) {
      const nextLanguage =
        Array.from(languageSelect.options).some((option) => option.value === country.language)
          ? country.language
          : "en";
      languageSelect.value = nextLanguage;
    }

    if (currencySelect) {
      currencySelect.value = country.currency || currencySelect.value;
    }

    updateSelectionNote();
  }

  async function apiFetch(path, options = {}) {
    const token = getToken();

    if (!token) {
      redirectToAuth();
      throw new Error("No active session");
    }

    const response = await fetch(`${resolveFeatureApiBaseUrl()}${path}`, {
      method: options.method || "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {})
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });

    const payload = await response.json().catch(() => ({}));

    if (response.status === 401) {
      redirectToAuth();
      throw new Error("Your session has expired");
    }

    if (!response.ok) {
      throw new Error(payload.message || `Request failed with status ${response.status}`);
    }

    return payload;
  }

  async function loadMeta() {
    const response = await fetch(`${resolveFeatureApiBaseUrl()}/meta`, {
      headers: {
        Accept: "application/json"
      }
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || `Could not load app metadata (${response.status})`);
    }

    return payload;
  }

  function persistSelections({ countryCode, language, currency }) {
    localStorage.setItem("budgetFlowCountryCode", countryCode);
    localStorage.setItem("budgetFlowLanguage", language);
    localStorage.setItem("budgetFlowBaseCurrency", currency);
    localStorage.setItem("budgetFlowCurrency", currency);
  }

  async function loadOnboarding() {
    const token = getToken();
    if (!token) {
      redirectToAuth();
      return;
    }

    setStatus("");
    const isFreshOnboarding = hasPendingOnboarding();
    const selectedCountry = isFreshOnboarding ? "" : localStorage.getItem("budgetFlowCountryCode") || "";
    const selectedLanguage = isFreshOnboarding ? "" : localStorage.getItem("budgetFlowLanguage") || "";
    const selectedCurrency = isFreshOnboarding ? "" : localStorage.getItem("budgetFlowCurrency") || "";

    state.countries = [...FALLBACK_COUNTRIES];
    state.currencies = [...FALLBACK_CURRENCIES];
    state.languages = [...FALLBACK_LANGUAGES];
    hydrateSelects(selectedCountry, selectedLanguage, selectedCurrency);
    updateSelectionNote();

    const settingsPayload = await apiFetch("/settings/bundle");
    const settings = settingsPayload.settings || {};
    const profile = settings.profile || {};
    const preferences = settings.preferences || {};
    const onboardingCompleted =
      preferences.onboardingCompleted !== undefined
        ? Boolean(preferences.onboardingCompleted)
        : Boolean(profile.onboardingCompleted);

    if (onboardingCompleted || !hasPendingOnboarding()) {
      setPendingOnboarding(false);
      redirectToApp();
      return;
    }

    try {
      const meta = await loadMeta();
      state.countries = Array.isArray(meta.countries) && meta.countries.length ? meta.countries : state.countries;
      state.currencies = Array.isArray(meta.currencies) && meta.currencies.length ? meta.currencies : state.currencies;
      if (Array.isArray(meta.languages) && meta.languages.length) {
        const supportedLanguages = meta.languages.filter((language) => {
          const code = String(language?.code || "").trim().toLowerCase();
          return (window.BudgetFlowI18n?.normalizeLanguage?.(code) || "en") === code;
        });
        state.languages = supportedLanguages.length ? supportedLanguages : state.languages;
      }
    } catch (error) {
      console.warn("Could not load live onboarding metadata:", error.message);
    }

    const nextCountry = preferences.countryCode || selectedCountry;
    const nextLanguage = preferences.language || selectedLanguage;
    const nextCurrency = preferences.currency || selectedCurrency;

    hydrateSelects(nextCountry, nextLanguage, nextCurrency);

    if (isFreshOnboarding && nextCountry) {
      applyCountryDefaults(nextCountry);
    } else if (nextCountry && (!nextLanguage || !nextCurrency)) {
      applyCountryDefaults(nextCountry);
    } else {
      updateSelectionNote();
    }

    setBusy(false);
  }

  document.getElementById("country")?.addEventListener("change", (event) => {
    applyCountryDefaults(event.target.value);
  });

  document.getElementById("language")?.addEventListener("change", updateSelectionNote);
  document.getElementById("currency")?.addEventListener("change", updateSelectionNote);

  document.getElementById("onboarding-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");

    const countryCode = document.getElementById("country")?.value || "";
    const language = document.getElementById("language")?.value || "";
    const currency = document.getElementById("currency")?.value || "";

    if (!countryCode || !language || !currency) {
      setStatus("Please choose your country, language, and currency to continue.");
      return;
    }

    setBusy(true);

    try {
      await apiFetch("/settings/onboarding", {
        method: "POST",
        body: {
          countryCode,
          language,
          currency,
          baseCurrency: currency
        }
      });

      persistSelections({ countryCode, language, currency });
      setPendingOnboarding(false);
      setStatus("Your account is ready. Opening Budget Flow...", "success");

      window.setTimeout(() => {
        redirectToApp();
      }, 500);
    } catch (error) {
      setStatus(error.message || "Could not finish onboarding.");
      setBusy(false);
    }
  });

  setBusy(true);
  loadOnboarding().catch((error) => {
    setBusy(false);
    setStatus(error.message || "Could not load your setup.");
  });
})();
