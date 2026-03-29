const test = require("node:test")
const assert = require("node:assert/strict")

const assistantServicePath = require.resolve("./assistant.service")
const dashboardServicePath = require.resolve("./dashboard.service")
const reportsServicePath = require.resolve("./reports.service")
const savingsServicePath = require.resolve("./savings.service")
const settingsServicePath = require.resolve("./settings.service")
const assistantConfigServicePath = require.resolve("./assistant-config.service")

function createAssistantConfigMock() {
  return {
    getFlowiseConfig() {
      return {
        mode: "rules",
        enabled: false,
        baseUrl: "",
        chatflowId: "",
        apiKey: "",
        timeoutMs: 6000,
        groqEnabled: false,
        groqApiKey: "",
        groqModel: "openai/gpt-oss-20b",
        groqBaseUrl: "https://api.groq.com/openai/v1",
        groqTimeoutMs: 10000
      }
    },
    shouldUseGroq() {
      return false
    },
    shouldUseFlowise(config) {
      return Boolean(config.enabled && config.baseUrl && config.chatflowId)
    },
    getAssistantClientState(config, mode = "rules") {
      return {
        mode,
        liveModelReady: mode === "flowise" || mode === "groq",
        groqConfigured: Boolean(config.groqApiKey),
        flowiseConfigured: Boolean(config.baseUrl && config.chatflowId && config.apiKey),
        suggestions: [
          "How much have I spent this month?",
          "Am I over budget right now?",
          "What is my top spending category?",
          "How are my savings goals doing?"
        ],
        statusLabel: mode
      }
    }
  }
}

function loadAssistantService({
  dashboardSummary,
  report,
  savingsSummary,
  preferences = {
    currency: "GHS",
    baseCurrency: "GHS"
  },
  assistantConfig = createAssistantConfigMock()
}) {
  const originalEntries = new Map(
    [
      dashboardServicePath,
      reportsServicePath,
      savingsServicePath,
      settingsServicePath,
      assistantConfigServicePath,
      assistantServicePath
    ].map((modulePath) => [modulePath, require.cache[modulePath]])
  )

  require.cache[dashboardServicePath] = {
    id: dashboardServicePath,
    filename: dashboardServicePath,
    loaded: true,
    exports: {
      getDashboardSummary: async () => dashboardSummary
    }
  }

  require.cache[reportsServicePath] = {
    id: reportsServicePath,
    filename: reportsServicePath,
    loaded: true,
    exports: {
      getCurrentReport: async () => report
    }
  }

  require.cache[savingsServicePath] = {
    id: savingsServicePath,
    filename: savingsServicePath,
    loaded: true,
    exports: {
      getSavingsSummary: async () => savingsSummary
    }
  }

  require.cache[settingsServicePath] = {
    id: settingsServicePath,
    filename: settingsServicePath,
    loaded: true,
    exports: {
      getPreferences: async () => preferences
    }
  }

  require.cache[assistantConfigServicePath] = {
    id: assistantConfigServicePath,
    filename: assistantConfigServicePath,
    loaded: true,
    exports: assistantConfig
  }

  delete require.cache[assistantServicePath]
  const assistantService = require(assistantServicePath)

  return {
    assistantService,
    restore() {
      delete require.cache[assistantServicePath]

      for (const [modulePath, cachedModule] of originalEntries.entries()) {
        if (cachedModule) {
          require.cache[modulePath] = cachedModule
        } else {
          delete require.cache[modulePath]
        }
      }
    }
  }
}

function createDashboardSummary(overrides = {}) {
  return {
    month: "2026-03",
    monthLabel: "March 2026",
    totals: {
      income: 1500,
      expenses: 650,
      netBalance: 850
    },
    weeklySpending: [],
    categoryBreakdown: [
      { category: "Food & Drinks", emoji: "🍔", amount: 300 },
      { category: "Transport", emoji: "🚗", amount: 150 }
    ],
    recentTransactions: [
      {
        emoji: "🍔",
        category: "Food & Drinks",
        displayDate: "Mar 25, 2026"
      }
    ],
    budget: {
      month: "2026-03",
      monthLabel: "March 2026",
      total: 1000,
      spent: 0,
      remaining: 1000,
      progress: 0,
      isOverBudget: false,
      categoriesCount: 3,
      categories: []
    },
    savings: {
      totalSaved: 400,
      totalTarget: 1000,
      remaining: 600,
      goalsCount: 2,
      progress: 40
    },
    ...overrides
  }
}

function createReport(overrides = {}) {
  return {
    month: "2026-03",
    monthLabel: "March 2026",
    totals: {
      income: 1500,
      expenses: 650,
      netSavings: 850,
      savingsRate: 56.7
    },
    incomeSources: [],
    expenseBreakdown: [
      { category: "Food & Drinks", emoji: "🍔", amount: 300 },
      { category: "Transport", emoji: "🚗", amount: 150 }
    ],
    topSpendingCategory: {
      category: "Food & Drinks",
      emoji: "🍔",
      amount: 300
    },
    totalTransactions: 4,
    trackedBudgetCategories: 3,
    budgetComparison: [],
    ...overrides
  }
}

test("budget answers use recorded expenses instead of stale category spend totals", async () => {
  const { assistantService, restore } = loadAssistantService({
    dashboardSummary: createDashboardSummary(),
    report: createReport(),
    savingsSummary: {
      totalSaved: 400,
      remaining: 600,
      progress: 40
    }
  })

  try {
    const response = await assistantService.chat(
      7,
      { message: "Am I over budget right now?" },
      { month: "2026-03" }
    )

    assert.equal(response.mode, "rules")
    assert.match(response.message, /GHS 650 spent out of GHS 1,000/)
    assert.match(response.message, /GHS 350 is still available/)
    assert.match(response.message, /Budget usage so far: 65%/)
  } finally {
    restore()
  }
})

test("budget answers stay useful when no monthly budget has been set", async () => {
  const { assistantService, restore } = loadAssistantService({
    dashboardSummary: createDashboardSummary({
      budget: {
        month: "2026-03",
        monthLabel: "March 2026",
        total: 0,
        spent: 0,
        remaining: 0,
        progress: 0,
        isOverBudget: false,
        categoriesCount: 0,
        categories: []
      }
    }),
    report: createReport(),
    savingsSummary: {
      totalSaved: 400,
      remaining: 600,
      progress: 40
    }
  })

  try {
    const response = await assistantService.chat(
      7,
      { message: "How much do I have left to spend?" },
      { month: "2026-03" }
    )

    assert.equal(response.mode, "rules")
    assert.match(response.message, /You have not set a monthly budget/)
    assert.match(response.message, /Recorded expenses so far: GHS 650/)
  } finally {
    restore()
  }
})

test("assistant falls back to rules mode when Flowise is unavailable", async () => {
  const originalFetch = global.fetch
  const originalConsoleError = console.error
  global.fetch = async () => {
    throw new Error("connect ECONNREFUSED 127.0.0.1:3001")
  }
  console.error = () => {}

  const assistantConfig = {
    getFlowiseConfig() {
      return {
        mode: "hybrid",
        enabled: true,
        baseUrl: "http://localhost:3001",
        chatflowId: "chatflow-123",
        apiKey: "secret",
        timeoutMs: 6000,
        groqEnabled: false,
        groqApiKey: "",
        groqModel: "openai/gpt-oss-20b",
        groqBaseUrl: "https://api.groq.com/openai/v1",
        groqTimeoutMs: 10000
      }
    },
    shouldUseGroq() {
      return false
    },
    shouldUseFlowise() {
      return true
    },
    getAssistantClientState(config, mode = "flowise") {
      return {
        mode,
        liveModelReady: mode === "flowise",
        flowiseConfigured: true,
        suggestions: ["How much have I spent this month?"],
        statusLabel: mode
      }
    }
  }

  const { assistantService, restore } = loadAssistantService({
    dashboardSummary: createDashboardSummary(),
    report: createReport(),
    savingsSummary: {
      totalSaved: 400,
      remaining: 600,
      progress: 40
    },
    assistantConfig
  })

  try {
    const response = await assistantService.chat(
      7,
      { message: "hello" },
      { month: "2026-03", authToken: "token-123" }
    )

    assert.equal(response.mode, "rules-fallback")
    assert.equal(response.assistant.mode, "rules-fallback")
    assert.match(response.message, /^Budget AI could not reach the live model right now/)
    assert.match(response.message, /I can help with march 2026 budgets/i)
  } finally {
    global.fetch = originalFetch
    console.error = originalConsoleError
    restore()
  }
})

test("assistant uses Groq when it is configured", async () => {
  const originalFetch = global.fetch
  const requests = []

  global.fetch = async (url, options = {}) => {
    requests.push({
      url,
      options
    })

    return {
      ok: true,
      async text() {
        return JSON.stringify({
          choices: [
            {
              message: {
                content: "- You have spent GHS 650 this month.\n- You still have GHS 350 available."
              }
            }
          ]
        })
      }
    }
  }

  const assistantConfig = {
    getFlowiseConfig() {
      return {
        mode: "hybrid",
        enabled: false,
        baseUrl: "",
        chatflowId: "",
        apiKey: "",
        timeoutMs: 6000,
        groqEnabled: true,
        groqApiKey: "groq-secret",
        groqModel: "openai/gpt-oss-20b",
        groqBaseUrl: "https://api.groq.com/openai/v1",
        groqTimeoutMs: 10000
      }
    },
    shouldUseGroq() {
      return true
    },
    shouldUseFlowise() {
      return false
    },
    getAssistantClientState(config, mode = "groq") {
      return {
        mode,
        liveModelReady: true,
        groqConfigured: true,
        flowiseConfigured: false,
        suggestions: ["How much have I spent this month?"],
        statusLabel: mode
      }
    }
  }

  const { assistantService, restore } = loadAssistantService({
    dashboardSummary: createDashboardSummary(),
    report: createReport(),
    savingsSummary: {
      totalSaved: 400,
      remaining: 600,
      progress: 40
    },
    assistantConfig
  })

  try {
    const response = await assistantService.chat(
      7,
      { message: "How much have I spent this month?" },
      { month: "2026-03" }
    )

    assert.equal(response.mode, "groq")
    assert.equal(response.assistant.mode, "groq")
    assert.match(response.message, /spent GHS 650/i)
    assert.equal(requests.length, 1)
    assert.equal(requests[0].url, "https://api.groq.com/openai/v1/chat/completions")

    const requestBody = JSON.parse(requests[0].options.body)
    assert.equal(requestBody.model, "openai/gpt-oss-20b")
    assert.equal(requestBody.messages.at(-1).content, "How much have I spent this month?")
  } finally {
    global.fetch = originalFetch
    restore()
  }
})
