const {
  ASSISTANT_SUGGESTIONS,
  CATEGORY_LIBRARY,
  COUNTRIES,
  CURRENCIES,
  LANGUAGES,
  PAYMENT_METHODS,
  THEMES
} = require("../utils/constants");
const assistantConfigService = require("./assistant-config.service");

function getMeta() {
  return {
    categories: CATEGORY_LIBRARY,
    countries: COUNTRIES,
    paymentMethods: PAYMENT_METHODS,
    currencies: CURRENCIES,
    languages: LANGUAGES,
    themes: THEMES,
    assistantSuggestions: ASSISTANT_SUGGESTIONS,
    assistant: assistantConfigService.getAssistantClientState()
  };
}

module.exports = {
  getMeta
};
