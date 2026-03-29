function stripHash(url) {
  return String(url || "").split("#")[0];
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

function getFeatureAppBaseUrl() {
  const storedUrl = stripHash(localStorage.getItem("budgetFlowAppUrl"));

  if (window.location.protocol === "file:") {
    return (
      storedUrl ||
      new URL(
        "../../Budget-Flow-feature-ohene/Budget-Flow-feature-ohene/index.html",
        window.location.href
      ).href
    );
  }

  return `${getWorkflowOrigin()}/app/index.html`;
}

function getFeatureAppUrl(screen = "dashboard") {
  return `${getFeatureAppBaseUrl()}#${screen}`;
}

function getFeatureOnboardingUrl() {
  if (window.location.protocol === "file:") {
    return new URL(
      "../../Budget-Flow-feature-ohene/Budget-Flow-feature-ohene/onboarding.html",
      window.location.href
    ).href;
  }

  return `${getWorkflowOrigin()}/app/onboarding.html`;
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

function resolveAuthApiBaseUrl() {
  const configuredBaseUrl = getRuntimeConfigValue("authApiBaseUrl");

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (isLocalDevelopment()) {
    return `${getRuntimeProtocol()}//${window.location.hostname || "localhost"}:5000/api/auth`;
  }

  return `${window.location.origin}/api/auth`;
}

function getAuthPageUrl() {
  if (window.location.protocol === "file:") {
    return stripHash(window.location.href);
  }

  return `${getWorkflowOrigin()}/pages/auth.html`;
}

function persistWorkflowUrls() {
  localStorage.setItem("budgetFlowAuthUrl", getAuthPageUrl());
  localStorage.setItem("budgetFlowAppUrl", getFeatureAppBaseUrl());
}

function getExistingToken() {
  return localStorage.getItem("budgetFlowToken") || localStorage.getItem("authToken");
}

function persistSession(token, user) {
  localStorage.setItem("budgetFlowToken", token);
  localStorage.setItem("authToken", token);

  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
}

function setPendingOnboarding(isPending) {
  if (isPending) {
    localStorage.setItem("budgetFlowPendingOnboarding", "true");
    localStorage.removeItem("budgetFlowCountryCode");
    localStorage.removeItem("budgetFlowLanguage");
    localStorage.removeItem("budgetFlowBaseCurrency");
    localStorage.removeItem("budgetFlowCurrency");
    return;
  }

  localStorage.removeItem("budgetFlowPendingOnboarding");
}

function redirectToFeatureApp(screen = "dashboard") {
  window.location.href = getFeatureAppUrl(screen);
}

function redirectToOnboarding() {
  window.location.href = getFeatureOnboardingUrl();
}

function redirectAfterAuth(result) {
  if (result?.isNewUser) {
    setPendingOnboarding(true);
    redirectToOnboarding();
    return;
  }

  setPendingOnboarding(false);
  redirectToFeatureApp();
}

persistWorkflowUrls();

const existingToken = getExistingToken();

if (existingToken && window.location.pathname.includes("auth.html")) {
  redirectToFeatureApp();
}

const API_BASE_URL = resolveAuthApiBaseUrl();
const authRuntimeConfig = {
  googleClientId: ""
};

async function loadAuthRuntimeConfig() {
  try {
    const response = await fetch(`${API_BASE_URL}/config`, {
      headers: {
        Accept: "application/json"
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Could not load auth configuration (${response.status})`);
    }

    authRuntimeConfig.googleClientId = String(data.googleClientId || "").trim();
  } catch (error) {
    console.warn("Could not load auth runtime config:", error.message);
  }
}

const authRuntimeConfigPromise = loadAuthRuntimeConfig();

const screens = document.querySelectorAll(".screen");
const screenButtons = document.querySelectorAll("[data-screen]");
const defaultSuccessState = {
  title: "Check your inbox",
  subtitle: "A password reset link has been sent successfully. Please check your email.",
  note: "If local email delivery is unavailable, a direct reset link will appear here so you can continue testing safely."
};

function showScreen(screenId) {
  screens.forEach((screen) => screen.classList.remove("active"));

  const target = document.getElementById(screenId);
  if (target) target.classList.add("active");

  clearMessages();
  resetSuccessScreen();
  clearResetLinkBox();
  window.requestAnimationFrame(() => {
    renderGoogleButtons();
  });
}

screenButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showScreen(button.getAttribute("data-screen"));
  });
});

function clearMessages() {
  document.querySelectorAll(".message").forEach((box) => {
    box.className = "message";
    box.textContent = "";
  });
}

function showMessage(id, text, type) {
  const box = document.getElementById(id);
  box.textContent = text;
  box.className = `message show ${type}`;
}

function resetSuccessScreen() {
  const title = document.getElementById("success-title");
  const subtitle = document.getElementById("success-subtitle");
  const note = document.getElementById("success-note");

  if (title) title.textContent = defaultSuccessState.title;
  if (subtitle) subtitle.textContent = defaultSuccessState.subtitle;
  if (note) note.textContent = defaultSuccessState.note;
}

function clearResetLinkBox() {
  const box = document.getElementById("reset-link-box");
  if (!box) return;

  box.className = "message";
  box.textContent = "";
}

function showResetLink(link) {
  const box = document.getElementById("reset-link-box");
  const title = document.getElementById("success-title");
  const subtitle = document.getElementById("success-subtitle");
  const note = document.getElementById("success-note");

  if (!box || !link) return;

  if (title) title.textContent = "Reset link ready";
  if (subtitle) subtitle.textContent = "Email delivery was unavailable locally, so you can continue using the secure reset link below.";
  if (note) note.textContent = "Use this direct link for local testing only. In production, password reset continues through email.";

  box.className = "message show success";
  box.innerHTML = `
    <strong>Reset link</strong><br />
    <a href="${link}" target="_self" rel="noopener noreferrer">${link}</a>
  `;
}

document.querySelectorAll(".toggle-btn").forEach((button) => {
  button.addEventListener("click", function () {
    const targetId = this.dataset.target;
    const input = document.getElementById(targetId);

    if (!input) return;

    if (input.type === "password") {
      input.type = "text";
      this.textContent = "Hide";
    } else {
      input.type = "password";
      this.textContent = "Show";
    }
  });
});

const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;
    const acceptedTerms = document.getElementById("terms-checkbox").checked;

    if (!name || !email || !password || !confirmPassword) {
      showMessage("signup-message", "Please complete all fields.", "error");
      return;
    }

    if (password.length < 6) {
      showMessage("signup-message", "Password must be at least 6 characters long.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("signup-message", "Passwords do not match.", "error");
      return;
    }

    if (!acceptedTerms) {
      showMessage("signup-message", "You must agree to the terms and policy.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      persistSession(data.token, data.user);
      showMessage("signup-message", "Registration successful. Redirecting...", "success");

      setTimeout(() => {
        redirectAfterAuth(data);
      }, 1200);
    } catch (error) {
      showMessage("signup-message", error.message, "error");
    }
  });
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      showMessage("login-message", "Please enter your email and password.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      persistSession(data.token, data.user);
      showMessage("login-message", "Login successful. Redirecting...", "success");

      setTimeout(() => {
        redirectAfterAuth(data);
      }, 1000);
    } catch (error) {
      showMessage("login-message", error.message, "error");
    }
  });
}

const forgotForm = document.getElementById("forgot-form");
if (forgotForm) {
  forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const email = document.getElementById("forgot-email").value.trim();

    if (!email) {
      showMessage("forgot-message", "Please enter your email address.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Forgot password request failed");
      }

      showMessage("forgot-message", data.message, "success");

      setTimeout(() => {
        showScreen("success-screen");
        if (data.resetLink) {
          showResetLink(data.resetLink);
        }
      }, 1200);
    } catch (error) {
      showMessage("forgot-message", error.message, "error");
    }
  });
}

async function handleGoogleSignIn(idToken, messageId = "login-message") {
  try {
    const response = await fetch(`${API_BASE_URL}/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ idToken })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Google sign-in failed");
    }

    persistSession(data.token, data.user);
    redirectAfterAuth(data);
  } catch (error) {
    showMessage(messageId, error.message, "error");
  }
}

window.handleGoogleSignIn = handleGoogleSignIn;

function getActiveGoogleMessageId() {
  if (document.getElementById("signup-screen")?.classList.contains("active")) {
    return "signup-message";
  }

  return "login-message";
}

function setGoogleButtonFallback(buttonId, text) {
  const host = document.getElementById(buttonId);
  if (!host) return;
  host.innerHTML = `<div class="google-btn-placeholder">${text}</div>`;
}

function waitForGoogleIdentity(timeoutMs = 10000) {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id);
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        window.clearInterval(timer);
        resolve(window.google.accounts.id);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        reject(new Error("Google sign-in library could not load."));
      }
    }, 100);
  });
}

let googleIdentityInstance = null;
let googleIdentityInitialized = false;

async function ensureGoogleIdentityReady() {
  await authRuntimeConfigPromise;

  const googleClientId = authRuntimeConfig.googleClientId;

  if (!googleClientId) {
    throw new Error("Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID on the auth backend.");
  }

  if (!googleIdentityInstance) {
    googleIdentityInstance = await waitForGoogleIdentity();
  }

  if (!googleIdentityInitialized) {
    googleIdentityInstance.initialize({
      client_id: googleClientId,
      callback: (response) => {
        const messageId = getActiveGoogleMessageId();

        if (response?.credential) {
          handleGoogleSignIn(response.credential, messageId);
          return;
        }

        showMessage(messageId, "Google sign-in was cancelled.", "error");
      }
    });
    googleIdentityInitialized = true;
  }

  return googleIdentityInstance;
}

async function renderGoogleButtons() {
  try {
    const googleIdentity = await ensureGoogleIdentityReady();
    const configs = [
      { id: "google-login-btn", text: "continue_with" },
      { id: "google-signup-btn", text: "signup_with" }
    ];

    configs.forEach(({ id, text }) => {
      const host = document.getElementById(id);
      if (!host || host.dataset.googleRendered === "true" || host.offsetParent === null) {
        return;
      }

      const width = Math.max(Math.min(Math.round(host.getBoundingClientRect().width || 320), 400), 220);
      host.innerHTML = "";
      googleIdentity.renderButton(host, {
        theme: "outline",
        size: "large",
        shape: "pill",
        type: "standard",
        text,
        width
      });
      host.dataset.googleRendered = "true";
    });
  } catch (error) {
    console.warn("Google sign-in setup failed:", error.message);
    setGoogleButtonFallback("google-login-btn", "Google sign-in unavailable");
    setGoogleButtonFallback("google-signup-btn", "Google sign-in unavailable");
  }
}

renderGoogleButtons();

async function handleGoogleResponse(response) {
  try {
    clearMessages();

    if (!response || !response.credential) {
      showMessage("login-message", "Google sign-in failed. No credential received.", "error");
      return;
    }

    const res = await fetch(`${API_BASE_URL}/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        idToken: response.credential
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage("login-message", data.message || "Google sign-in failed.", "error");
      return;
    }

    persistSession(data.token, data.user);

    showMessage("login-message", "Google sign-in successful.", "success");

    setTimeout(() => {
      redirectAfterAuth(data);
    }, 1000);
  } catch (error) {
    showMessage(
      "login-message",
      error.message || "Something went wrong during Google sign-in.",
      "error"
    );
  }
}

window.handleGoogleResponse = handleGoogleResponse;

window.addEventListener("resize", () => {
  ["google-login-btn", "google-signup-btn"].forEach((id) => {
    const host = document.getElementById(id);
    if (host) {
      host.dataset.googleRendered = "";
    }
  });

  window.requestAnimationFrame(() => {
    renderGoogleButtons();
  });
});
