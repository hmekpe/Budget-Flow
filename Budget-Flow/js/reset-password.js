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

const API_BASE_URL = resolveAuthApiBaseUrl();

function clearMessages() {
  const box = document.getElementById("reset-message");
  if (box) {
    box.className = "message";
    box.textContent = "";
  }
}

function showMessage(text, type) {
  const box = document.getElementById("reset-message");
  if (!box) return;
  box.textContent = text;
  box.className = `message show ${type}`;
}

const queryParams = new URLSearchParams(window.location.search);
const resetToken = queryParams.get("token");

if (!resetToken) {
  showMessage("Reset link is invalid or missing a token.", "error");
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

const resetForm = document.getElementById("reset-password-form");

if (resetForm) {
  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    if (!resetToken) {
      showMessage("Reset token is missing or invalid.", "error");
      return;
    }

    const password = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-new-password").value;

    if (!password || !confirmPassword) {
      showMessage("Please fill in both password fields.", "error");
      return;
    }

    if (password.length < 6) {
      showMessage("Password must be at least 6 characters long.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showMessage("Passwords do not match.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token: resetToken, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to reset password");
      }

      showMessage("Password reset successful. Redirecting to login...", "success");

      setTimeout(() => {
        window.location.href = "./auth.html";
      }, 1500);
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}

