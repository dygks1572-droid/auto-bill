const intradayLabels = [
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
];

const quarterLabels = [
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "Q1",
  "Q2",
  "Q3",
  "Q4",
];

const toSeries = (labels, values) =>
  values.map((value, index) => ({
    label: labels[index] ?? `P${index + 1}`,
    value,
  }));

export const sectorFilters = [
  "All",
  "AI Infra",
  "Cloud",
  "Consumer",
  "Foundry",
  "Software",
];

export const detailTabs = [
  { id: "overview", label: "Overview" },
  { id: "earnings", label: "Earnings Call" },
  { id: "relationships", label: "Relationship Map" },
  { id: "capital", label: "Capital Lens" },
  { id: "projects", label: "Projects" },
];

export const relationPalette = {
  Customer: "#3dd9a5",
  Supplier: "#63c2ff",
  Partner: "#f0b45f",
  Competitor: "#ff7676",
  Platform: "#c8a2ff",
  Peer: "#79d7cf",
};

export const sectorPresets = {
  "AI Infra": {
    segments: ["Accelerators", "Platform", "Ecosystem"],
    headline: "AI capacity and model deployment leverage",
  },
  Cloud: {
    segments: ["Cloud", "Monetization", "Platform"],
    headline: "Cloud usage, AI attach, and enterprise monetization",
  },
  Consumer: {
    segments: ["Core Ads", "Engagement", "New Bets"],
    headline: "Consumer attention, monetization, and new surfaces",
  },
  Foundry: {
    segments: ["Leading Edge", "Packaging", "Edge / Auto"],
    headline: "Node leadership, packaging, and utilization",
  },
  Software: {
    segments: ["Commercial", "Government", "Platform"],
    headline: "Seat expansion, contract flow, and platform pull-through",
  },
};

export const mapLayout = {
  nvda: { x: 20, y: 18 },
  amd: { x: 18, y: 68 },
  tsm: { x: 39, y: 42 },
  msft: { x: 57, y: 16 },
  amzn: { x: 56, y: 49 },
  goog: { x: 74, y: 24 },
  meta: { x: 75, y: 71 },
  pltr: { x: 90, y: 50 },
};

export const baseCompanies = [
  {
    id: "nvda",
    name: "NVIDIA",
    ticker: "NVDA",
    country: "US",
    sector: "AI Infra",
    maturity: "Leader",
    marketCapLabel: "Mega-cap bellwether",
    thesis:
      "Hyperscaler capex and inference demand make this the cleanest AI infrastructure demand read-through.",
    price: {
      current: 129.4,
      drift: 0.32,
      volatility: 1.2,
      series: toSeries(
        intradayLabels,
        [122.6, 123.8, 124.1, 124.9, 125.6, 126.3, 126.9, 127.2, 127.8, 128.1, 128.4, 128.8, 129.1, 129.4]
      ),
    },
    summaryMetrics: [
      { label: "Call tone", value: "Confident" },
      { label: "Key driver", value: "Hyperscaler capex" },
      { label: "Dependency", value: "TSMC / packaging" },
    ],
    segments: [
      {
        id: "datacenter",
        name: "Data Center",
        metricLabel: "Narrative strength",
        metricValue: "Dominant",
        note: "Management still frames demand as capacity constrained before demand constrained.",
        series: toSeries(quarterLabels, [42, 46, 53, 67, 91, 118, 154, 188]),
      },
      {
        id: "gaming",
        name: "Gaming",
        metricLabel: "Signal",
        metricValue: "Stabilizing",
        note: "Gaming is no longer the main story, but it matters for margin mix and inventory health.",
        series: toSeries(quarterLabels, [10.2, 11.8, 12.4, 11.1, 10.5, 10.9, 11.8, 13.6]),
      },
      {
        id: "ecosystem",
        name: "Networking & Software",
        metricLabel: "Strategic role",
        metricValue: "Moat builder",
        note: "Networking, CUDA, and enterprise software deepen switching costs around accelerators.",
        series: toSeries(quarterLabels, [6.2, 6.7, 7.1, 7.8, 8.6, 9.4, 10.6, 12.3]),
      },
    ],
    earnings: {
      period: "Latest call template",
      tone: "Bullish",
      summary:
        "The main message is that AI factory demand remains broadening rather than peaking, with inference and sovereign build-outs supporting the next leg.",
      highlights: [
        "Inference demand is becoming a second growth engine rather than a replacement for training.",
        "Large customers are preparing multi-generation roadmaps, not one-off cluster purchases.",
        "Software and networking are increasingly used to defend system-level gross margins.",
      ],
      watchItems: [
        "Packaging and power delivery still matter as bottlenecks.",
        "A few hyperscalers drive a meaningful share of demand concentration.",
        "Any digestion signal at cloud customers can quickly affect sentiment.",
      ],
      keywordHeat: [
        { label: "Inference", value: 89 },
        { label: "Capacity", value: 76 },
        { label: "Software", value: 61 },
        { label: "Sovereign AI", value: 48 },
      ],
      panelNotes: [
        {
          title: "What mattered",
          body: "Management sounded more focused on system availability, deployment velocity, and customer ROI than on unit shipments alone.",
        },
        {
          title: "Model impact",
          body: "Bull cases should track customer deployment cadence and attach rates from networking and software, not just accelerator revenue.",
        },
        {
          title: "Open question",
          body: "How much of the next wave is durable inference demand versus front-loaded infrastructure stocking?",
        },
      ],
    },
    relationships: [
      {
        targetId: "msft",
        type: "Customer",
        strength: 95,
        note: "Azure build-outs make Microsoft one of the highest-signal demand indicators.",
      },
      {
        targetId: "amzn",
        type: "Customer",
        strength: 91,
        note: "AWS accelerator fleet and model hosting directly affect accelerator demand.",
      },
      {
        targetId: "meta",
        type: "Customer",
        strength: 88,
        note: "Meta's open-source model push translates into sustained training and inference demand.",
      },
      {
        targetId: "tsm",
        type: "Supplier",
        strength: 97,
        note: "Advanced node and packaging capacity remain mission critical to the roadmap.",
      },
      {
        targetId: "amd",
        type: "Competitor",
        strength: 72,
        note: "AMD competes for AI accelerator budget and software mindshare.",
      },
    ],
    investors: [
      {
        name: "Vanguard",
        role: "Core holder",
        note: "Useful as a proxy for passive and long-only capital support.",
      },
      {
        name: "BlackRock",
        role: "Core holder",
        note: "Large index presence can amplify trend-following flows.",
      },
      {
        name: "Growth funds",
        role: "Momentum capital",
        note: "Watch concentration and positioning risk into major product ramps.",
      },
    ],
    initiatives: [
      {
        title: "Blackwell ramp",
        stage: "In progress",
        part: "Data Center",
        detail: "The key execution topic is converting backlog into installed clusters without margin slippage.",
      },
      {
        title: "Enterprise AI software motion",
        stage: "Scaling",
        part: "Networking & Software",
        detail: "Software monetization is becoming an important durability lever beyond hardware cycles.",
      },
      {
        title: "Regional sovereign AI partnerships",
        stage: "Expanding",
        part: "Data Center",
        detail: "These projects broaden the customer base beyond US hyperscalers.",
      },
    ],
  },
  {
    id: "msft",
    name: "Microsoft",
    ticker: "MSFT",
    country: "US",
    sector: "Cloud",
    maturity: "Platform",
    marketCapLabel: "Platform compounder",
    thesis:
      "The most important question is how much AI demand converts into durable Azure, Copilot, and productivity monetization.",
    price: {
      current: 436.8,
      drift: 0.28,
      volatility: 1.6,
      series: toSeries(
        intradayLabels,
        [429.1, 430.5, 431.4, 432.7, 432.2, 433.6, 434.1, 434.8, 435.3, 435.9, 436.2, 436.6, 436.4, 436.8]
      ),
    },
    summaryMetrics: [
      { label: "Call tone", value: "Constructive" },
      { label: "AI lens", value: "Azure + Copilot" },
      { label: "Key link", value: "NVIDIA demand" },
    ],
    segments: [
      {
        id: "azure",
        name: "Azure & Infrastructure",
        metricLabel: "Pull",
        metricValue: "Accelerating",
        note: "Cloud and AI infrastructure utilization trends remain the first thing to monitor.",
        series: toSeries(quarterLabels, [30, 31, 32, 34, 36, 39, 42, 45]),
      },
      {
        id: "productivity",
        name: "Productivity & Copilot",
        metricLabel: "Monetization",
        metricValue: "Emerging",
        note: "Copilot attach and paid seat conversion matter more than demo excitement.",
        series: toSeries(quarterLabels, [18, 18.4, 18.8, 19.2, 20.1, 21.3, 22.5, 24]),
      },
      {
        id: "security",
        name: "Security & Data Platform",
        metricLabel: "Defensibility",
        metricValue: "High",
        note: "Security creates budget stickiness and reinforces enterprise platform consolidation.",
        series: toSeries(quarterLabels, [12.6, 13.1, 13.6, 14.2, 14.9, 15.7, 16.4, 17.2]),
      },
    ],
    earnings: {
      period: "Latest call template",
      tone: "Constructive",
      summary:
        "Management is balancing AI enthusiasm with capacity discipline, stressing that monetization should broaden across cloud, productivity, and data layers.",
      highlights: [
        "Azure demand remains supply-constrained in parts of the footprint.",
        "Copilot messaging is shifting from experimentation to workflow adoption and measurable ROI.",
        "The platform narrative remains stronger when security and data are included with AI.",
      ],
      watchItems: [
        "Capex efficiency and payback period are becoming central investor questions.",
        "Copilot seat conversion needs to keep validating the pricing architecture.",
        "Any moderation in Azure backlog commentary could reset expectations.",
      ],
      keywordHeat: [
        { label: "Azure", value: 86 },
        { label: "Copilot", value: 72 },
        { label: "Capacity", value: 58 },
        { label: "Security", value: 44 },
      ],
      panelNotes: [
        {
          title: "What mattered",
          body: "The strongest part of the call is that AI is not isolated; it is being sold as part of a broader platform bundle.",
        },
        {
          title: "Model impact",
          body: "Watch Azure backlog, enterprise AI attach, and implied capex productivity together instead of in isolation.",
        },
        {
          title: "Open question",
          body: "How quickly can Microsoft move from AI demand capture to visible margin normalization?",
        },
      ],
    },
    relationships: [
      {
        targetId: "nvda",
        type: "Partner",
        strength: 94,
        note: "Microsoft remains one of the most important downstream demand proxies for NVIDIA.",
      },
      {
        targetId: "amzn",
        type: "Competitor",
        strength: 79,
        note: "Azure and AWS continue to compete for enterprise AI workloads.",
      },
      {
        targetId: "goog",
        type: "Competitor",
        strength: 82,
        note: "Cloud, productivity, and search-adjacent AI products are converging.",
      },
      {
        targetId: "pltr",
        type: "Partner",
        strength: 52,
        note: "Government and enterprise AI deployments often overlap around data infrastructure.",
      },
    ],
    investors: [
      {
        name: "Vanguard",
        role: "Core holder",
        note: "Useful base capital but less informative than Azure demand data.",
      },
      {
        name: "BlackRock",
        role: "Core holder",
        note: "Massive passive ownership makes execution the bigger variable than ownership shifts.",
      },
      {
        name: "Enterprise CIO budgets",
        role: "Operating capital proxy",
        note: "Spend behavior matters almost as much as shareholding changes.",
      },
    ],
    initiatives: [
      {
        title: "AI infrastructure build-out",
        stage: "Scaling",
        part: "Azure & Infrastructure",
        detail: "The central question is whether capacity additions stay ahead of demand without destroying returns.",
      },
      {
        title: "Copilot monetization",
        stage: "Expanding",
        part: "Productivity & Copilot",
        detail: "Seat conversion and workflow depth matter more than trial counts.",
      },
      {
        title: "Security platform consolidation",
        stage: "Compounding",
        part: "Security & Data Platform",
        detail: "Security helps justify a broader enterprise spend envelope around AI.",
      },
    ],
  },
  {
    id: "amzn",
    name: "Amazon",
    ticker: "AMZN",
    country: "US",
    sector: "Cloud",
    maturity: "Platform",
    marketCapLabel: "Operating leverage story",
    thesis:
      "AWS, ads, and retail efficiency create a three-engine model where AI can either reinforce margin gains or consume them.",
    price: {
      current: 192.7,
      drift: 0.24,
      volatility: 1.3,
      series: toSeries(
        intradayLabels,
        [186.2, 186.9, 187.6, 188.1, 188.7, 189.4, 189.1, 190.1, 190.9, 191.3, 191.8, 192.4, 192.2, 192.7]
      ),
    },
    summaryMetrics: [
      { label: "Call tone", value: "Balanced" },
      { label: "AI lens", value: "AWS monetization" },
      { label: "Key link", value: "Ad + cloud mix" },
    ],
    segments: [
      {
        id: "aws",
        name: "AWS",
        metricLabel: "Signal",
        metricValue: "Re-accelerating",
        note: "The main read-through is whether AI workloads deepen utilization faster than custom silicon reduces external spend.",
        series: toSeries(quarterLabels, [24, 24.7, 25.3, 26.1, 27.4, 28.8, 30.4, 32.2]),
      },
      {
        id: "ads",
        name: "Ads",
        metricLabel: "Profit role",
        metricValue: "High quality",
        note: "Ads are an underappreciated contributor to operating leverage and cash generation.",
        series: toSeries(quarterLabels, [12.2, 12.7, 13.1, 13.9, 14.8, 15.6, 16.4, 17.8]),
      },
      {
        id: "retail",
        name: "Retail & Fulfillment",
        metricLabel: "Execution",
        metricValue: "Improving",
        note: "Retail matters because disciplined logistics creates room to invest elsewhere.",
        series: toSeries(quarterLabels, [116, 118, 121, 124, 127, 131, 136, 141]),
      },
    ],
    earnings: {
      period: "Latest call template",
      tone: "Balanced",
      summary:
        "The call reads as a discipline story: invest where demand is obvious, keep retail efficiency gains, and use ads to support mix quality.",
      highlights: [
        "AWS commentary matters most when paired with disclosed capex and custom silicon direction.",
        "Ads continue to improve the quality of the business mix.",
        "Retail execution is now a margin enabler rather than a permanent drag.",
      ],
      watchItems: [
        "How much AI demand lands on AWS versus customer-specific deployments elsewhere?",
        "Custom silicon may change dependency on third-party accelerators over time.",
        "Consumer softness can still offset cloud optimism in the short run.",
      ],
      keywordHeat: [
        { label: "AWS", value: 81 },
        { label: "Efficiency", value: 69 },
        { label: "Ads", value: 57 },
        { label: "Custom silicon", value: 40 },
      ],
      panelNotes: [
        {
          title: "What mattered",
          body: "Amazon sounds most attractive when retail discipline and AWS re-acceleration show up together.",
        },
        {
          title: "Model impact",
          body: "Separate the AWS workload growth story from the retail margin story so the thesis does not become too dependent on one segment.",
        },
        {
          title: "Open question",
          body: "Will custom silicon improve AWS economics enough to change how investors value the cloud AI opportunity?",
        },
      ],
    },
    relationships: [
      {
        targetId: "nvda",
        type: "Partner",
        strength: 88,
        note: "Amazon still depends on external accelerator supply while scaling internal silicon.",
      },
      {
        targetId: "msft",
        type: "Competitor",
        strength: 79,
        note: "Cloud competition is central to how both companies monetize AI demand.",
      },
      {
        targetId: "goog",
        type: "Competitor",
        strength: 67,
        note: "Cloud and advertising increasingly overlap through AI search and commerce tooling.",
      },
      {
        targetId: "meta",
        type: "Platform",
        strength: 44,
        note: "Advertising budgets and ecommerce demand create an indirect read-through.",
      },
    ],
    investors: [
      {
        name: "Vanguard",
        role: "Core holder",
        note: "Index ownership is large, but margin execution matters more than holder churn.",
      },
      {
        name: "BlackRock",
        role: "Core holder",
        note: "Useful baseline for passive capital persistence.",
      },
      {
        name: "Consumer discretionary funds",
        role: "Swing capital",
        note: "Retail narrative shifts can move ownership framing faster than AWS alone.",
      },
    ],
    initiatives: [
      {
        title: "Custom silicon roadmap",
        stage: "Scaling",
        part: "AWS",
        detail: "The roadmap matters because it can improve cloud economics and reduce supplier dependence.",
      },
      {
        title: "Fulfillment efficiency",
        stage: "Compounding",
        part: "Retail & Fulfillment",
        detail: "Network optimization is funding broader strategic investments.",
      },
      {
        title: "Ads monetization surface expansion",
        stage: "Expanding",
        part: "Ads",
        detail: "This adds a high-margin engine alongside cloud and commerce.",
      },
    ],
  },
  {
    id: "goog",
    name: "Alphabet",
    ticker: "GOOGL",
    country: "US",
    sector: "Cloud",
    maturity: "Platform",
    marketCapLabel: "AI transition incumbent",
    thesis:
      "The core question is whether Google can defend search economics while turning AI usage into a broader platform advantage.",
    price: {
      current: 176.5,
      drift: 0.2,
      volatility: 1.1,
      series: toSeries(
        intradayLabels,
        [171.8, 172.6, 172.4, 173.1, 173.6, 174.2, 174.7, 175.1, 175.4, 175.8, 176.2, 176.1, 176.3, 176.5]
      ),
    },
    summaryMetrics: [
      { label: "Call tone", value: "Measured" },
      { label: "AI lens", value: "Search defense" },
      { label: "Key link", value: "Cloud utilization" },
    ],
    segments: [
      {
        id: "search",
        name: "Search & Ads",
        metricLabel: "Defensibility",
        metricValue: "Under watch",
        note: "Search economics remain the anchor variable in any AI transition scenario.",
        series: toSeries(quarterLabels, [48, 49, 50, 50.4, 51.1, 52.6, 53.4, 54.1]),
      },
      {
        id: "cloud",
        name: "Google Cloud",
        metricLabel: "Signal",
        metricValue: "Improving mix",
        note: "Cloud profitability and AI workload adoption matter more than pure revenue growth now.",
        series: toSeries(quarterLabels, [8.1, 8.4, 8.9, 9.5, 10.2, 11.1, 12.1, 13.3]),
      },
      {
        id: "youtube",
        name: "YouTube & Subscriptions",
        metricLabel: "Stability",
        metricValue: "Strong",
        note: "A resilient media layer helps cushion experimentation in search and cloud.",
        series: toSeries(quarterLabels, [10.7, 11.3, 11.6, 12.1, 12.8, 13.4, 14.1, 15.2]),
      },
    ],
    earnings: {
      period: "Latest call template",
      tone: "Measured",
      summary:
        "Alphabet sounds increasingly willing to trade near-term AI costs for ecosystem defense, but investors still need proof that search monetization remains durable.",
      highlights: [
        "Search remains healthy enough to fund AI experimentation.",
        "Cloud is becoming a clearer second pillar rather than an optional story.",
        "Product integration speed matters almost as much as model quality.",
      ],
      watchItems: [
        "Any deterioration in search monetization could overwhelm other positives.",
        "Cloud margins need to keep improving if AI spend remains elevated.",
        "Regulatory and default distribution issues stay on the board.",
      ],
      keywordHeat: [
        { label: "Search", value: 83 },
        { label: "Gemini", value: 68 },
        { label: "Cloud", value: 62 },
        { label: "Monetization", value: 51 },
      ],
      panelNotes: [
        {
          title: "What mattered",
          body: "The business is strongest when search, cloud, and YouTube all contribute to financing the AI transition at once.",
        },
        {
          title: "Model impact",
          body: "Track search monetization quality separately from AI product excitement so the thesis stays grounded.",
        },
        {
          title: "Open question",
          body: "Can Google create a visibly better AI product experience without damaging the economics of its incumbent channels?",
        },
      ],
    },
    relationships: [
      {
        targetId: "msft",
        type: "Competitor",
        strength: 83,
        note: "Search, cloud, and workplace AI are all converging into the same battleground.",
      },
      {
        targetId: "amzn",
        type: "Competitor",
        strength: 66,
        note: "Cloud AI workloads and ads stack competition create overlap.",
      },
      {
        targetId: "nvda",
        type: "Partner",
        strength: 71,
        note: "External accelerator supply still matters while internal TPU strategy scales.",
      },
      {
        targetId: "meta",
        type: "Competitor",
        strength: 64,
        note: "Digital advertising budgets and AI discovery surfaces overlap.",
      },
    ],
    investors: [
      {
        name: "Vanguard",
        role: "Core holder",
        note: "Baseline institutional ownership remains stable.",
      },
      {
        name: "BlackRock",
        role: "Core holder",
        note: "Index ownership provides inertia but does not answer transition quality.",
      },
      {
        name: "Communication services funds",
        role: "Narrative capital",
        note: "These holders tend to react strongly to search disruption signals.",
      },
    ],
    initiatives: [
      {
        title: "Search AI integration",
        stage: "Live rollout",
        part: "Search & Ads",
        detail: "The investment case depends on defending user behavior and monetization together.",
      },
      {
        title: "Cloud profitability improvement",
        stage: "Compounding",
        part: "Google Cloud",
        detail: "Better mix and usage efficiency are needed to support heavier AI investment.",
      },
      {
        title: "Gemini product expansion",
        stage: "Scaling",
        part: "YouTube & Subscriptions",
        detail: "Product depth matters if Google wants to widen AI usage across its surfaces.",
      },
    ],
  },
  {
    id: "meta",
    name: "Meta",
    ticker: "META",
    country: "US",
    sector: "Consumer",
    maturity: "Platform",
    marketCapLabel: "Attention + AI monetizer",
    thesis:
      "Meta is a mix of ad efficiency, open-source AI leverage, and optional upside from new engagement surfaces.",
    price: {
      current: 514.2,
      drift: 0.31,
      volatility: 1.9,
      series: toSeries(
        intradayLabels,
        [501.3, 502.8, 504.6, 505.4, 507.1, 508.5, 509.8, 510.9, 511.7, 512.4, 513.1, 513.8, 514.4, 514.2]
      ),
    },
    summaryMetrics: [
      { label: "Call tone", value: "Aggressive" },
      { label: "AI lens", value: "Ads + open source" },
      { label: "Key link", value: "Engagement gains" },
    ],
    segments: [
      {
        id: "ads",
        name: "Core Ads",
        metricLabel: "Engine",
        metricValue: "Very strong",
        note: "Ad ranking and targeting gains remain the source of financial oxygen for everything else.",
        series: toSeries(quarterLabels, [34, 35, 36.2, 38.4, 40.1, 42.6, 44.3, 46.8]),
      },
      {
        id: "engagement",
        name: "Reels & Messaging",
        metricLabel: "Flywheel",
        metricValue: "Strengthening",
        note: "Higher engagement expands the monetizable inventory base over time.",
        series: toSeries(quarterLabels, [18.1, 18.6, 19.4, 20.3, 21.7, 22.9, 24.1, 25.3]),
      },
      {
        id: "labs",
        name: "Reality Labs",
        metricLabel: "Risk",
        metricValue: "Persistent",
        note: "Losses are still a valuation debate even if they buy optionality around the next platform.",
        series: toSeries(quarterLabels, [-4.3, -4.2, -4.5, -4.6, -4.8, -4.9, -5.1, -5.2]),
      },
    ],
    earnings: {
      period: "Latest call template",
      tone: "Aggressive",
      summary:
        "Meta is leaning into AI as both an ad efficiency engine and an ecosystem strategy, while asking investors to tolerate elevated capex.",
      highlights: [
        "Recommendation quality and ad conversion remain the most important proof points.",
        "Open-source positioning aims to attract developers while preserving product agility.",
        "Heavy infrastructure spend is justified as foundational rather than optional.",
      ],
      watchItems: [
        "Capex escalation can become the headline if monetization lags.",
        "Reality Labs still creates a valuation discount for some investors.",
        "User engagement gains must keep translating into monetization efficiency.",
      ],
      keywordHeat: [
        { label: "Reels", value: 72 },
        { label: "Llama", value: 81 },
        { label: "Capex", value: 67 },
        { label: "Ads", value: 78 },
      ],
      panelNotes: [
        {
          title: "What mattered",
          body: "Meta sounds strongest when AI is discussed as a core ad-ranking and user retention driver instead of a side bet.",
        },
        {
          title: "Model impact",
          body: "Watch ad efficiency gains and capex intensity together to avoid missing the margin trade-off.",
        },
        {
          title: "Open question",
          body: "How much optional upside from open-source model leadership will ever show up in direct monetization?",
        },
      ],
    },
    relationships: [
      {
        targetId: "nvda",
        type: "Partner",
        strength: 86,
        note: "Meta remains a meaningful infrastructure customer as it expands AI model training and inference.",
      },
      {
        targetId: "goog",
        type: "Competitor",
        strength: 64,
        note: "Meta and Google still compete for digital ad budgets and AI discovery surfaces.",
      },
      {
        targetId: "amzn",
        type: "Platform",
        strength: 43,
        note: "Consumer demand and ad budgets create indirect signal crossover.",
      },
      {
        targetId: "pltr",
        type: "Peer",
        strength: 32,
        note: "Both are read through lenses of AI platform leverage, but with very different customer sets.",
      },
    ],
    investors: [
      {
        name: "Vanguard",
        role: "Core holder",
        note: "Large long-only support, but capex discipline drives sentiment swings.",
      },
      {
        name: "BlackRock",
        role: "Core holder",
        note: "Passive ownership matters less than the capex narrative.",
      },
      {
        name: "Growth and communication funds",
        role: "Narrative capital",
        note: "These holders tend to be sensitive to ad-cycle and AI margin debates.",
      },
    ],
    initiatives: [
      {
        title: "Open-source model ecosystem",
        stage: "Scaling",
        part: "Reels & Messaging",
        detail: "Meta wants developer mindshare and product improvement to reinforce each other.",
      },
      {
        title: "Ad ranking AI improvements",
        stage: "Compounding",
        part: "Core Ads",
        detail: "This remains the clearest direct monetization path for AI investments.",
      },
      {
        title: "Wearables and next platform bets",
        stage: "Exploratory",
        part: "Reality Labs",
        detail: "These bets add optionality but keep the capital allocation debate alive.",
      },
    ],
  },
  {
    id: "tsm",
    name: "TSMC",
    ticker: "TSM",
    country: "Taiwan",
    sector: "Foundry",
    maturity: "Critical supplier",
    marketCapLabel: "Manufacturing keystone",
    thesis:
      "TSMC is the clearest manufacturing bottleneck proxy for advanced AI compute and packaging supply chains.",
    price: {
      current: 162.9,
      drift: 0.19,
      volatility: 0.9,
      series: toSeries(
        intradayLabels,
        [158.6, 159.1, 159.7, 160.2, 160.4, 160.9, 161.3, 161.8, 162.1, 162.4, 162.6, 162.8, 162.7, 162.9]
      ),
    },
    summaryMetrics: [
      { label: "Call tone", value: "Firm" },
      { label: "AI lens", value: "Node + packaging" },
      { label: "Key link", value: "Lead-time power" },
    ],
    segments: [
      {
        id: "leadingedge",
        name: "Leading Edge Nodes",
        metricLabel: "Role",
        metricValue: "Core bottleneck",
        note: "Node leadership remains the most durable strategic edge in the AI stack.",
        series: toSeries(quarterLabels, [56, 57, 58, 60, 63, 66, 69, 72]),
      },
      {
        id: "packaging",
        name: "Advanced Packaging",
        metricLabel: "Constraint",
        metricValue: "High",
        note: "Packaging capacity can shape the revenue timing of multiple customers at once.",
        series: toSeries(quarterLabels, [8.2, 8.8, 9.5, 10.9, 12.4, 14.2, 16.1, 18.3]),
      },
      {
        id: "edge",
        name: "Edge / Automotive",
        metricLabel: "Diversifier",
        metricValue: "Steady",
        note: "Diversified end markets help stabilize utilization across cycles.",
        series: toSeries(quarterLabels, [15.1, 15.4, 15.6, 15.2, 15.5, 15.8, 16.2, 16.7]),
      },
    ],
    earnings: {
      period: "Latest call template",
      tone: "Firm",
      summary:
        "TSMC sounds like the control tower of the AI hardware stack: customer demand is visible, but timing depends on node and packaging capacity expansion.",
      highlights: [
        "Advanced node and packaging demand remain structurally stronger than broad semiconductor demand.",
        "Customer concentration is real, but so is the visibility around next-generation roadmaps.",
        "Geographic diversification is still an execution topic rather than a solved one.",
      ],
      watchItems: [
        "Packaging capacity could remain the gating factor for customer product ramps.",
        "Geopolitical headlines can dominate valuation even when fundamentals are strong.",
        "Smartphone and consumer softness still affect mixed-utilization perceptions.",
      ],
      keywordHeat: [
        { label: "3nm / 2nm", value: 74 },
        { label: "Packaging", value: 82 },
        { label: "Utilization", value: 57 },
        { label: "Geography", value: 44 },
      ],
      panelNotes: [
        {
          title: "What mattered",
          body: "Packaging capacity expansion may matter nearly as much as node leadership for near-term upside.",
        },
        {
          title: "Model impact",
          body: "Track customer roadmap commentary together with packaging capacity additions and mix shifts.",
        },
        {
          title: "Open question",
          body: "How much pricing power can TSMC sustain if AI demand stays concentrated in the most advanced stack?",
        },
      ],
    },
    relationships: [
      {
        targetId: "nvda",
        type: "Supplier",
        strength: 98,
        note: "NVIDIA's roadmap execution heavily depends on TSMC node and packaging throughput.",
      },
      {
        targetId: "amd",
        type: "Supplier",
        strength: 92,
        note: "AMD also depends on TSMC for advanced products, creating shared supply risk.",
      },
      {
        targetId: "msft",
        type: "Platform",
        strength: 38,
        note: "Microsoft is an indirect beneficiary or victim of any supply constraints through infrastructure availability.",
      },
      {
        targetId: "amzn",
        type: "Platform",
        strength: 35,
        note: "Cloud customers feel TSMC constraints through server roadmap timing and cost.",
      },
    ],
    investors: [
      {
        name: "Sovereign and pension capital",
        role: "Stability capital",
        note: "Long-duration investors tend to care most about node leadership persistence.",
      },
      {
        name: "Vanguard",
        role: "Core holder",
        note: "Passive support is meaningful, but geopolitical discount is the bigger variable.",
      },
      {
        name: "Semiconductor specialists",
        role: "High-conviction capital",
        note: "These investors often focus on cycle turns and mix evolution around leading-edge demand.",
      },
    ],
    initiatives: [
      {
        title: "2nm node readiness",
        stage: "In progress",
        part: "Leading Edge Nodes",
        detail: "A successful transition keeps the technology and pricing moat intact.",
      },
      {
        title: "Advanced packaging expansion",
        stage: "Scaling",
        part: "Advanced Packaging",
        detail: "This is one of the highest-signal capacity projects in the AI supply chain.",
      },
      {
        title: "Geographic manufacturing footprint",
        stage: "Executing",
        part: "Leading Edge Nodes",
        detail: "Diversification is strategic but comes with ramp and cost complexity.",
      },
    ],
  },
  {
    id: "amd",
    name: "AMD",
    ticker: "AMD",
    country: "US",
    sector: "AI Infra",
    maturity: "Challenger",
    marketCapLabel: "Share gain candidate",
    thesis:
      "AMD is the main challenger read-through on whether customers want a second AI infrastructure stack beyond NVIDIA.",
    price: {
      current: 184.6,
      drift: 0.27,
      volatility: 1.5,
      series: toSeries(
        intradayLabels,
        [178.4, 179.1, 179.8, 180.6, 181.2, 181.7, 182.4, 183.1, 183.4, 183.9, 184.2, 184.5, 184.4, 184.6]
      ),
    },
    summaryMetrics: [
      { label: "Call tone", value: "Improving" },
      { label: "AI lens", value: "Second source" },
      { label: "Key link", value: "Software maturity" },
    ],
    segments: [
      {
        id: "dc",
        name: "Data Center",
        metricLabel: "Role",
        metricValue: "Share gain watch",
        note: "The data center segment is where AI upside must prove itself commercially.",
        series: toSeries(quarterLabels, [6.4, 6.7, 7.1, 7.9, 8.8, 10.5, 12.4, 14.8]),
      },
      {
        id: "client",
        name: "Client",
        metricLabel: "Cycle",
        metricValue: "Recovering",
        note: "PC recovery helps support cash generation while the AI story matures.",
        series: toSeries(quarterLabels, [2.1, 2.4, 2.8, 3.1, 3.5, 3.9, 4.3, 4.8]),
      },
      {
        id: "embedded",
        name: "Embedded & Gaming",
        metricLabel: "Buffer",
        metricValue: "Mixed",
        note: "This base business gives diversification but can blur the pure AI narrative.",
        series: toSeries(quarterLabels, [4.6, 4.3, 4.1, 3.9, 3.8, 4.0, 4.2, 4.4]),
      },
    ],
    earnings: {
      period: "Latest call template",
      tone: "Improving",
      summary:
        "The story is becoming less about theoretical AI participation and more about whether AMD can earn real wallet share with a credible software and platform motion.",
      highlights: [
        "Customer appetite for a second supplier remains an important theme.",
        "Management is increasingly emphasizing system solutions rather than just chip specs.",
        "The broader product portfolio helps fund the AI push but can cloud the narrative.",
      ],
      watchItems: [
        "Software readiness remains the key gap versus the category leader.",
        "Supply access at TSMC is a shared dependency with competitors.",
        "Investors need proof of sustained deployment, not just pilot announcements.",
      ],
      keywordHeat: [
        { label: "MI300 / AI", value: 84 },
        { label: "Software", value: 69 },
        { label: "Data Center", value: 74 },
        { label: "Share gain", value: 58 },
      ],
      panelNotes: [
        {
          title: "What mattered",
          body: "The strongest case is not just product performance, but customer desire for supply-chain and pricing diversification.",
        },
        {
          title: "Model impact",
          body: "Watch deployment scale, customer references, and software ecosystem traction together.",
        },
        {
          title: "Open question",
          body: "Can AMD become a durable second platform, or does it remain a cyclical trade on occasional share gains?",
        },
      ],
    },
    relationships: [
      {
        targetId: "tsm",
        type: "Supplier",
        strength: 91,
        note: "TSMC capacity and packaging availability shape AI product timing.",
      },
      {
        targetId: "nvda",
        type: "Competitor",
        strength: 76,
        note: "AMD's upside case depends on taking some budget and deployment share from NVIDIA.",
      },
      {
        targetId: "msft",
        type: "Partner",
        strength: 46,
        note: "Cloud validation can help prove AMD as a credible second source.",
      },
      {
        targetId: "meta",
        type: "Partner",
        strength: 41,
        note: "Large-scale deployments at Meta or other major buyers would materially strengthen the story.",
      },
    ],
    investors: [
      {
        name: "Growth funds",
        role: "Upside capital",
        note: "Ownership tends to rise when the market believes in credible AI share gains.",
      },
      {
        name: "Vanguard",
        role: "Core holder",
        note: "Passive capital provides baseline support.",
      },
      {
        name: "Semiconductor specialists",
        role: "Signal investors",
        note: "Specialists are likely to move first on real deployment evidence.",
      },
    ],
    initiatives: [
      {
        title: "AI accelerator platform push",
        stage: "Scaling",
        part: "Data Center",
        detail: "The question is whether pilots convert into repeatable production deployments.",
      },
      {
        title: "Software ecosystem strengthening",
        stage: "Executing",
        part: "Data Center",
        detail: "Software maturity will determine how durable any share gains become.",
      },
      {
        title: "Client recovery support",
        stage: "Stabilizing",
        part: "Client",
        detail: "PC recovery provides a cushion while the AI opportunity builds out.",
      },
    ],
  },
  {
    id: "pltr",
    name: "Palantir",
    ticker: "PLTR",
    country: "US",
    sector: "Software",
    maturity: "AI software lever",
    marketCapLabel: "Narrative-sensitive compounder",
    thesis:
      "Palantir is a useful software-layer read-through for whether AI spending moves from experimentation into operational deployment.",
    price: {
      current: 28.7,
      drift: 0.14,
      volatility: 0.7,
      series: toSeries(
        intradayLabels,
        [27.1, 27.3, 27.4, 27.6, 27.8, 28.0, 28.1, 28.3, 28.4, 28.5, 28.6, 28.7, 28.6, 28.7]
      ),
    },
    summaryMetrics: [
      { label: "Call tone", value: "Sales-led" },
      { label: "AI lens", value: "Workflow adoption" },
      { label: "Key link", value: "Commercial traction" },
    ],
    segments: [
      {
        id: "commercial",
        name: "Commercial",
        metricLabel: "Proof point",
        metricValue: "Most important",
        note: "Commercial momentum is what proves the business is broadening beyond a niche government niche.",
        series: toSeries(quarterLabels, [15, 16.1, 17.5, 18.9, 20.2, 22.4, 24.8, 27.1]),
      },
      {
        id: "government",
        name: "Government",
        metricLabel: "Foundation",
        metricValue: "Sticky",
        note: "Government remains a stabilizing base but is not enough on its own to justify premium AI expectations.",
        series: toSeries(quarterLabels, [20.8, 21.1, 21.4, 21.9, 22.3, 22.8, 23.5, 24.1]),
      },
      {
        id: "platform",
        name: "AIP Platform",
        metricLabel: "Narrative",
        metricValue: "High",
        note: "AIP is the bridge between AI excitement and actual deployment economics.",
        series: toSeries(quarterLabels, [5.1, 5.9, 6.8, 7.6, 8.9, 10.4, 12.2, 14.6]),
      },
    ],
    earnings: {
      period: "Latest call template",
      tone: "Sales-led",
      summary:
        "Palantir's calls matter most when management can connect AI enthusiasm to concrete deployment, procurement, and expansion metrics.",
      highlights: [
        "Commercial conversion speed is the main proof point for AI demand durability.",
        "Government remains useful as a base, but commercial adoption has to carry the multiple.",
        "Management's language often emphasizes platform standardization and operational urgency.",
      ],
      watchItems: [
        "Valuation is highly sensitive to any slowdown in commercial momentum.",
        "The AI narrative can outrun near-term financial delivery.",
        "Large-deal concentration can create lumpy optics.",
      ],
      keywordHeat: [
        { label: "AIP", value: 87 },
        { label: "Commercial", value: 79 },
        { label: "Bootcamps", value: 53 },
        { label: "Deployment", value: 68 },
      ],
      panelNotes: [
        {
          title: "What mattered",
          body: "The market wants evidence that Palantir is moving from demos to standard operating deployments.",
        },
        {
          title: "Model impact",
          body: "Track commercial customer count, expansion motion, and deployment speed more than top-line excitement.",
        },
        {
          title: "Open question",
          body: "How durable is the current AI demand wave once early enthusiasm normalizes into procurement cycles?",
        },
      ],
    },
    relationships: [
      {
        targetId: "msft",
        type: "Partner",
        strength: 54,
        note: "Enterprise and government deployments can overlap with Microsoft's infrastructure and tooling layers.",
      },
      {
        targetId: "meta",
        type: "Peer",
        strength: 31,
        note: "Both are read as AI software beneficiaries, though customer bases differ sharply.",
      },
      {
        targetId: "nvda",
        type: "Platform",
        strength: 47,
        note: "Palantir benefits if AI infrastructure spending converts into workflow deployment demand.",
      },
      {
        targetId: "goog",
        type: "Peer",
        strength: 26,
        note: "Google's enterprise AI tools and Palantir's workflow layer may overlap in some accounts.",
      },
    ],
    investors: [
      {
        name: "Retail growth investors",
        role: "Volatility source",
        note: "Retail enthusiasm can amplify both upside and downside moves.",
      },
      {
        name: "Growth funds",
        role: "Narrative capital",
        note: "These investors focus heavily on commercial conversion signals.",
      },
      {
        name: "Thematic AI funds",
        role: "Theme holder",
        note: "Theme ownership can be sticky if deployment wins remain visible.",
      },
    ],
    initiatives: [
      {
        title: "AIP deployment expansion",
        stage: "Scaling",
        part: "AIP Platform",
        detail: "The key question is how fast workshops convert into durable production contracts.",
      },
      {
        title: "Commercial vertical penetration",
        stage: "Expanding",
        part: "Commercial",
        detail: "Commercial breadth is essential if the AI thesis is to stay credible.",
      },
      {
        title: "Government base reinforcement",
        stage: "Stable",
        part: "Government",
        detail: "The installed government base provides resilience while commercial ramps build.",
      },
    ],
  },
];
