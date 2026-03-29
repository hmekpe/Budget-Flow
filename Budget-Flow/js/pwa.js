(() => {
  if (window.location.protocol === "file:" || !("serviceWorker" in navigator)) {
    return;
  }

  const registerServiceWorker = async () => {
    try {
      const serviceWorkerUrl = new URL("../service-worker.js", window.location.href);
      await navigator.serviceWorker.register(serviceWorkerUrl.pathname, { scope: "/" });
    } catch (error) {
      console.warn("Budget Flow service worker registration failed.", error);
    }
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.BudgetFlowDeferredInstallPrompt = event;
    window.dispatchEvent(new CustomEvent("budgetflow:install-ready"));
  });

  window.addEventListener("appinstalled", () => {
    window.BudgetFlowDeferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent("budgetflow:installed"));
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", registerServiceWorker, { once: true });
  } else {
    registerServiceWorker();
  }
})();
