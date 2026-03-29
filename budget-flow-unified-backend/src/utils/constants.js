const CATEGORY_LIBRARY = [
  { name: "Food & Drinks", emoji: "\ud83c\udf54" },
  { name: "Transport", emoji: "\ud83d\ude97" },
  { name: "Entertainment", emoji: "\ud83c\udfac" },
  { name: "Bills", emoji: "\ud83d\udcc4" },
  { name: "Health", emoji: "\ud83d\udc8a" },
  { name: "Education", emoji: "\ud83c\udf93" },
  { name: "Shopping", emoji: "\ud83d\uded2" },
  { name: "Salary", emoji: "\ud83d\udcbc" },
  { name: "Freelance", emoji: "\ud83d\udcbb" },
  { name: "Savings", emoji: "\ud83d\udcb0" },
  { name: "Other", emoji: "\ud83d\udccc" }
];

const PAYMENT_METHODS = ["cash", "momo", "card", "bank"];

const CURRENCIES = [
  { code: "GHS", label: "Ghanaian Cedi", symbol: "\u20b5" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "\u20ac" },
  { code: "GBP", label: "British Pound", symbol: "\u00a3" },
  { code: "NGN", label: "Nigerian Naira", symbol: "\u20a6" },
  { code: "KES", label: "Kenyan Shilling", symbol: "KSh" },
  { code: "ZAR", label: "South African Rand", symbol: "R" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "JPY", label: "Japanese Yen", symbol: "\u00a5" },
  { code: "INR", label: "Indian Rupee", symbol: "\u20b9" },
  { code: "BRL", label: "Brazilian Real", symbol: "R$" },
  { code: "AED", label: "UAE Dirham", symbol: "AED" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", label: "Chinese Yuan", symbol: "\u00a5" },
  { code: "SAR", label: "Saudi Riyal", symbol: "SAR" },
  { code: "KRW", label: "South Korean Won", symbol: "\u20a9" },
  { code: "MXN", label: "Mexican Peso", symbol: "MX$" },
  { code: "EGP", label: "Egyptian Pound", symbol: "E\u00a3" }
];

const LANGUAGES = [
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

const COUNTRIES = [
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

const THEMES = ["dark", "light"];

const ASSISTANT_SUGGESTIONS = [
  "How much have I spent this month?",
  "Am I over budget right now?",
  "What is my top spending category?",
  "How are my savings goals doing?"
];

function getCategoryEmoji(category) {
  const match = CATEGORY_LIBRARY.find(
    (item) => item.name.toLowerCase() === String(category || "").toLowerCase()
  );

  return match ? match.emoji : "\ud83d\udccc";
}

module.exports = {
  ASSISTANT_SUGGESTIONS,
  CATEGORY_LIBRARY,
  COUNTRIES,
  CURRENCIES,
  LANGUAGES,
  PAYMENT_METHODS,
  THEMES,
  getCategoryEmoji
};
