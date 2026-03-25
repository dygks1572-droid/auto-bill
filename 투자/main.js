import {
  baseCompanies,
  detailTabs,
  mapLayout,
  relationPalette,
  sectorFilters,
  sectorPresets,
} from "./data/companies.js";
import {
  fetchBatchQuotes,
  fetchDailyEodChart,
  fetchTranscript,
  fetchTranscriptDates,
} from "./services/fmp.js";
import { buildTranscriptInsights } from "./lib/transcriptInsights.js";

const STORAGE_KEYS = {
  customCompanies: "investor-intel-custom-companies",
  pinnedCompanies: "investor-intel-pinned-companies",
  compareCompanies: "investor-intel-compare-companies",
  fmpApiKey: "investor-intel-fmp-api-key",
};

const DEMO_REFRESH_MS = 2600;
const LIVE_REFRESH_MS = 45000;
const CHART_CACHE_MS = 1000 * 60 * 10;
const TRANSCRIPT_CACHE_MS = 1000 * 60 * 60 * 6;

const state = {
  companies: [],
  activeCompanyId: null,
  activeSector: "All",
  activeView: "grid",
  activeChartRange: "1M",
  search: "",
  activeTab: "overview",
  activeSegmentId: null,
  pinnedIds: [],
  compareIds: [],
  showCompareTray: true,
  live: createDefaultLiveState(),
};

const runtime = {
  loopId: null,
};

const elements = {
  sidebar: document.querySelector("#sidebar"),
  header: document.querySelector("#workspace-header"),
  content: document.querySelector("#workspace-content"),
  detail: document.querySelector("#workspace-detail"),
};

const SECTOR_LABELS = {
  All: "전체",
  "AI Infra": "AI 인프라",
  Cloud: "클라우드",
  Consumer: "소비자 플랫폼",
  Foundry: "파운드리",
  Software: "소프트웨어",
};

const TAB_LABELS = {
  overview: "개요",
  earnings: "실적 콜",
  relationships: "관계 맵",
  capital: "자금 흐름",
  projects: "프로젝트",
};

const RELATION_LABELS = {
  Customer: "고객",
  Supplier: "공급사",
  Partner: "파트너",
  Competitor: "경쟁사",
  Platform: "플랫폼",
  Peer: "비교 기업",
};

const QUOTE_SOURCE_LABELS = {
  "batch-quote": "배치 시세",
  "quote fallback": "개별 시세 폴백",
  none: "없음",
  unknown: "알 수 없음",
};

const LOCALIZATION_EXCLUDED_KEYS = new Set(["id", "ticker", "targetId", "sector", "type"]);

const TEXT_TRANSLATIONS = {
  "Custom": "사용자 정의",
  "User watchlist": "사용자 관심종목",
  "Custom profile": "사용자 프로필",
  "Setup": "초기 설정",
  "User-defined": "사용자 정의",
  "Theme": "테마",
  "Status": "상태",
  "Needs live feed": "실시간 데이터 필요",
  "Focus": "집중 포인트",
  "Primary": "핵심",
  "Secondary": "보조",
  "Optionality": "선택지",
  "Custom template": "사용자 템플릿",
  "Needs review": "검토 필요",
  "Demand": "수요",
  "Margin": "마진",
  "Capacity": "생산능력",
  "Guidance": "가이던스",
  "What mattered": "핵심 포인트",
  "Model impact": "모델 영향",
  "Open question": "남은 질문",
  "Track top holders": "상위 보유자 추적",
  "Capital watch": "자금 흐름 관찰",
  "Strategic partners": "전략 파트너",
  "Signal source": "신호 소스",
  "User notes": "사용자 메모",
  "Manual intelligence": "수동 인텔리전스",
  "Core execution track": "핵심 실행 과제",
  "To define": "정의 필요",
  "Revenue unlock": "매출 레버리지",
  "Longer-term option": "장기 선택지",
  "Leader": "선도 기업",
  "Platform": "플랫폼",
  "Mega-cap bellwether": "메가캡 대표주",
  "Platform compounder": "플랫폼 복리 성장주",
  "Operating leverage story": "운영 레버리지 스토리",
  "AI transition incumbent": "AI 전환 기존 강자",
  "Attention + AI monetizer": "관심도 + AI 수익화",
  "Critical supplier": "핵심 공급사",
  "Manufacturing keystone": "제조 핵심축",
  "Challenger": "도전자",
  "Share gain candidate": "점유율 확대 후보",
  "AI software lever": "AI 소프트웨어 레버리지",
  "Narrative-sensitive compounder": "서사 민감형 복리 성장주",
  "Call tone": "콜 톤",
  "Key driver": "핵심 동력",
  "Dependency": "의존 요소",
  "AI lens": "AI 관점",
  "Key link": "핵심 연결고리",
  "Confident": "강한 자신감",
  "Constructive": "우호적",
  "Balanced": "균형적",
  "Measured": "신중함",
  "Aggressive": "공세적",
  "Firm": "견조함",
  "Improving": "개선 중",
  "Sales-led": "영업 중심",
  "Hyperscaler capex": "하이퍼스케일러 설비투자",
  "TSMC / packaging": "TSMC / 패키징",
  "Azure + Copilot": "애저 + 코파일럿",
  "NVIDIA demand": "엔비디아 수요",
  "AWS monetization": "AWS 수익화",
  "Ad + cloud mix": "광고 + 클라우드 믹스",
  "Search defense": "검색 방어",
  "Cloud utilization": "클라우드 활용률",
  "Ads + open source": "광고 + 오픈소스",
  "Engagement gains": "참여도 개선",
  "Node + packaging": "공정 + 패키징",
  "Lead-time power": "리드타임 주도권",
  "Second source": "대체 공급원",
  "Software maturity": "소프트웨어 성숙도",
  "Workflow adoption": "워크플로 도입",
  "Commercial traction": "상업 부문 확산",
  "Data Center": "데이터 센터",
  "Gaming": "게이밍",
  "Networking & Software": "네트워킹·소프트웨어",
  "Narrative strength": "서사 강도",
  "Dominant": "지배적",
  "Signal": "신호",
  "Stabilizing": "안정화 중",
  "Strategic role": "전략적 역할",
  "Moat builder": "해자 강화",
  "Bullish": "강세",
  "Inference": "추론",
  "Software": "소프트웨어",
  "Sovereign AI": "국가 주도 AI",
  "Core holder": "핵심 보유자",
  "Momentum capital": "모멘텀 자금",
  "In progress": "진행 중",
  "Scaling": "확대 중",
  "Expanding": "확장 중",
  "Azure & Infrastructure": "애저·인프라",
  "Pull": "견인력",
  "Accelerating": "가속 중",
  "Productivity & Copilot": "생산성·코파일럿",
  "Monetization": "수익화",
  "Emerging": "부상 중",
  "Security & Data Platform": "보안·데이터 플랫폼",
  "Defensibility": "방어력",
  "High": "높음",
  "AWS": "AWS",
  "Ads": "광고",
  "Retail & Fulfillment": "리테일·물류",
  "Profit role": "이익 기여도",
  "High quality": "고품질",
  "Execution": "실행력",
  "Re-accelerating": "재가속",
  "Search & Ads": "검색·광고",
  "Under watch": "주시 필요",
  "Google Cloud": "구글 클라우드",
  "Improving mix": "믹스 개선",
  "YouTube & Subscriptions": "유튜브·구독",
  "Stability": "안정성",
  "Strong": "강함",
  "Live rollout": "실사용 확장",
  "Core Ads": "핵심 광고",
  "Engine": "엔진",
  "Very strong": "매우 강함",
  "Reels & Messaging": "릴스·메시징",
  "Flywheel": "플라이휠",
  "Strengthening": "강화 중",
  "Reality Labs": "리얼리티 랩스",
  "Risk": "리스크",
  "Persistent": "지속적",
  "Compounding": "누적 개선",
  "Exploratory": "탐색 단계",
  "Leading Edge Nodes": "선단 공정",
  "Role": "역할",
  "Core bottleneck": "핵심 병목",
  "Advanced Packaging": "첨단 패키징",
  "Constraint": "제약",
  "Edge / Automotive": "엣지·자동차",
  "Diversifier": "분산 축",
  "Steady": "안정적",
  "Executing": "실행 중",
  "Data Center": "데이터 센터",
  "Share gain watch": "점유율 확대 관찰",
  "Client": "클라이언트",
  "Cycle": "사이클",
  "Recovering": "회복 중",
  "Embedded & Gaming": "임베디드·게이밍",
  "Buffer": "완충축",
  "Mixed": "혼합",
  "Stabilizing": "안정화 중",
  "Upside capital": "상승 기대 자금",
  "Signal investors": "신호 투자자",
  "Commercial": "상업 부문",
  "Proof point": "검증 포인트",
  "Most important": "가장 중요",
  "Government": "정부 부문",
  "Foundation": "기반",
  "Sticky": "고착적",
  "AIP Platform": "AIP 플랫폼",
  "Narrative": "서사",
  "Bootcamps": "부트캠프",
  "Deployment": "배포",
  "Volatility source": "변동성 원천",
  "Theme holder": "테마 보유자",
  "Stable": "안정",
  "The main message is that AI factory demand remains broadening rather than peaking, with inference and sovereign build-outs supporting the next leg.": "핵심 메시지는 AI 팩토리 수요가 정점을 찍기보다 더 넓어지고 있으며, 추론 수요와 국가 단위 구축이 다음 성장 구간을 지지하고 있다는 점입니다.",
  "Hyperscaler capex and inference demand make this the cleanest AI infrastructure demand read-through.": "하이퍼스케일러 설비투자와 추론 수요를 가장 직접적으로 읽을 수 있는 대표적인 AI 인프라 종목입니다.",
  "Management still frames demand as capacity constrained before demand constrained.": "경영진은 여전히 수요 부족보다 생산능력 제약이 먼저라고 보고 있습니다.",
  "Gaming is no longer the main story, but it matters for margin mix and inventory health.": "게이밍은 더 이상 핵심 서사는 아니지만, 마진 믹스와 재고 건전성에는 여전히 중요합니다.",
  "Networking, CUDA, and enterprise software deepen switching costs around accelerators.": "네트워킹, CUDA, 기업용 소프트웨어는 가속기 주변의 전환 비용을 더 높여 줍니다.",
  "Microsoft remains one of the most important downstream demand proxies for NVIDIA.": "마이크로소프트는 엔비디아 하류 수요를 읽는 가장 중요한 지표 중 하나입니다.",
  "Amazon still depends on external accelerator supply while scaling internal silicon.": "아마존은 자체 실리콘을 키우는 동안에도 외부 가속기 공급에 계속 의존합니다.",
  "Meta remains a meaningful infrastructure customer as it expands AI model training and inference.": "메타는 AI 모델 학습과 추론을 확대하면서 여전히 의미 있는 인프라 고객입니다.",
  "Advanced node and packaging capacity remain mission critical to the roadmap.": "첨단 공정과 패키징 생산능력은 로드맵 실행에 핵심입니다.",
  "AMD competes for AI accelerator budget and software mindshare.": "AMD는 AI 가속기 예산과 소프트웨어 생태계 주도권을 놓고 경쟁합니다.",
  "The key execution topic is converting backlog into installed clusters without margin slippage.": "핵심 실행 과제는 마진 훼손 없이 수주 잔고를 실제 설치 클러스터로 전환하는 것입니다.",
  "Software monetization is becoming an important durability lever beyond hardware cycles.": "소프트웨어 수익화는 하드웨어 사이클을 넘어서는 지속성 레버로 중요해지고 있습니다.",
  "These projects broaden the customer base beyond US hyperscalers.": "이 프로젝트들은 미국 하이퍼스케일러를 넘어 고객 기반을 넓혀 줍니다.",
  "The most important question is how much AI demand converts into durable Azure, Copilot, and productivity monetization.": "가장 중요한 질문은 AI 수요가 얼마나 지속 가능한 애저, 코파일럿, 생산성 수익화로 이어지느냐입니다.",
  "Cloud and AI infrastructure utilization trends remain the first thing to monitor.": "클라우드와 AI 인프라 활용률 추세가 가장 먼저 봐야 할 지표입니다.",
  "Copilot attach and paid seat conversion matter more than demo excitement.": "코파일럿 부가판매와 유료 좌석 전환이 데모 화제성보다 훨씬 중요합니다.",
  "Security creates budget stickiness and reinforces enterprise platform consolidation.": "보안은 예산의 고착성을 높이고 기업 플랫폼 통합을 강화합니다.",
  "Management is balancing AI enthusiasm with capacity discipline, stressing that monetization should broaden across cloud, productivity, and data layers.": "경영진은 AI 기대감과 설비 규율 사이의 균형을 강조하며, 수익화가 클라우드·생산성·데이터 전반으로 확장돼야 한다고 말합니다.",
  "AWS, ads, and retail efficiency create a three-engine model where AI can either reinforce margin gains or consume them.": "AWS, 광고, 리테일 효율화가 세 개의 엔진을 이루며, AI는 마진 개선을 강화할 수도 있고 반대로 잠식할 수도 있습니다.",
  "The main read-through is whether AI workloads deepen utilization faster than custom silicon reduces external spend.": "핵심은 AI 워크로드가 자체 칩 도입에 따른 외부 지출 감소보다 더 빠르게 활용률을 끌어올리느냐입니다.",
  "Ads are an underappreciated contributor to operating leverage and cash generation.": "광고는 운영 레버리지와 현금창출에 과소평가된 기여를 하고 있습니다.",
  "Retail matters because disciplined logistics creates room to invest elsewhere.": "리테일은 물류 효율화가 다른 곳에 투자할 여지를 만들어 준다는 점에서 중요합니다.",
  "The call reads as a discipline story: invest where demand is obvious, keep retail efficiency gains, and use ads to support mix quality.": "이번 콜은 규율의 이야기로 읽힙니다. 수요가 명확한 곳에 투자하고, 리테일 효율을 유지하며, 광고로 사업 믹스의 질을 높이는 전략입니다.",
  "The core question is whether Google can defend search economics while turning AI usage into a broader platform advantage.": "핵심 질문은 구글이 검색 경제성을 지키면서 AI 사용을 더 넓은 플랫폼 우위로 전환할 수 있느냐입니다.",
  "Search economics remain the anchor variable in any AI transition scenario.": "검색 경제성은 어떤 AI 전환 시나리오에서도 가장 중요한 축입니다.",
  "Cloud profitability and AI workload adoption matter more than pure revenue growth now.": "이제는 단순 매출 성장보다 클라우드 수익성과 AI 워크로드 도입이 더 중요합니다.",
  "A resilient media layer helps cushion experimentation in search and cloud.": "탄탄한 미디어 계층이 검색과 클라우드의 실험 비용을 완충해 줍니다.",
  "Alphabet sounds increasingly willing to trade near-term AI costs for ecosystem defense, but investors still need proof that search monetization remains durable.": "알파벳은 단기 AI 비용을 감수하며 생태계를 방어하려는 의지가 강해 보이지만, 투자자들은 검색 수익화의 지속성을 여전히 확인하고 싶어 합니다.",
  "Meta is a mix of ad efficiency, open-source AI leverage, and optional upside from new engagement surfaces.": "메타는 광고 효율, 오픈소스 AI 레버리지, 새로운 참여 지면에서 나오는 선택적 업사이드가 결합된 기업입니다.",
  "Ad ranking and targeting gains remain the source of financial oxygen for everything else.": "광고 랭킹과 타기팅 개선은 다른 모든 사업을 지탱하는 현금창출의 핵심입니다.",
  "Higher engagement expands the monetizable inventory base over time.": "참여도가 높아질수록 장기적으로 수익화 가능한 인벤토리가 늘어납니다.",
  "Losses are still a valuation debate even if they buy optionality around the next platform.": "손실이 차세대 플랫폼 선택지를 사준다고 해도, 여전히 밸류에이션 논쟁거리입니다.",
  "Meta is leaning into AI as both an ad efficiency engine and an ecosystem strategy, while asking investors to tolerate elevated capex.": "메타는 AI를 광고 효율 엔진이자 생태계 전략으로 밀고 있으며, 투자자들에게는 높은 설비투자를 감내해 달라고 요구하고 있습니다.",
  "TSMC is the clearest manufacturing bottleneck proxy for advanced AI compute and packaging supply chains.": "TSMC는 첨단 AI 연산과 패키징 공급망 병목을 가장 직접적으로 보여주는 제조 지표입니다.",
  "Node leadership remains the most durable strategic edge in the AI stack.": "공정 리더십은 AI 스택에서 가장 오래 지속될 전략적 우위입니다.",
  "Packaging capacity can shape the revenue timing of multiple customers at once.": "패키징 생산능력은 여러 고객의 매출 인식 시점을 동시에 좌우할 수 있습니다.",
  "Diversified end markets help stabilize utilization across cycles.": "다양한 최종 시장은 사이클 전반의 가동률 안정에 도움을 줍니다.",
  "TSMC sounds like the control tower of the AI hardware stack: customer demand is visible, but timing depends on node and packaging capacity expansion.": "TSMC는 AI 하드웨어 스택의 관제탑처럼 보입니다. 고객 수요는 분명하지만, 실제 타이밍은 공정과 패키징 증설에 달려 있습니다.",
  "AMD is the main challenger read-through on whether customers want a second AI infrastructure stack beyond NVIDIA.": "AMD는 고객들이 엔비디아 외에 두 번째 AI 인프라 스택을 원하느냐를 보여주는 대표적인 도전자입니다.",
  "The data center segment is where AI upside must prove itself commercially.": "데이터 센터 부문이야말로 AI 업사이드가 상업적으로 검증돼야 하는 영역입니다.",
  "PC recovery helps support cash generation while the AI story matures.": "PC 회복은 AI 서사가 성숙해지는 동안 현금창출을 뒷받침합니다.",
  "This base business gives diversification but can blur the pure AI narrative.": "기존 사업은 분산 효과를 주지만, 순수 AI 서사를 흐릴 수도 있습니다.",
  "The story is becoming less about theoretical AI participation and more about whether AMD can earn real wallet share with a credible software and platform motion.": "이제 이야기는 이론적 AI 참여보다, AMD가 신뢰할 수 있는 소프트웨어·플랫폼 전략으로 실제 지갑 점유율을 가져올 수 있느냐에 더 가까워지고 있습니다.",
  "Palantir is a useful software-layer read-through for whether AI spending moves from experimentation into operational deployment.": "팔란티어는 AI 지출이 실험 단계에서 실제 운영 배포 단계로 넘어가는지를 보여주는 소프트웨어 계층 지표입니다.",
  "Commercial momentum is what proves the business is broadening beyond a niche government niche.": "상업 부문 모멘텀이야말로 이 사업이 정부 특화 영역을 넘어 확장되고 있음을 증명합니다.",
  "Government remains a stabilizing base but is not enough on its own to justify premium AI expectations.": "정부 부문은 안정적 기반이지만, 그것만으로는 높은 AI 프리미엄을 정당화하기 어렵습니다.",
  "AIP is the bridge between AI excitement and actual deployment economics.": "AIP는 AI 기대감과 실제 배포 경제성을 잇는 다리입니다.",
  "Palantir's calls matter most when management can connect AI enthusiasm to concrete deployment, procurement, and expansion metrics.": "팔란티어의 실적 콜은 경영진이 AI 기대를 실제 배포, 조달, 확장 지표와 연결할 때 가장 의미가 큽니다.",
  "Latest call template": "최근 실적 콜 템플릿",
  "Inference demand is becoming a second growth engine rather than a replacement for training.": "추론 수요는 학습 수요를 대체하는 것이 아니라 두 번째 성장 엔진이 되고 있습니다.",
  "Large customers are preparing multi-generation roadmaps, not one-off cluster purchases.": "대형 고객들은 일회성 클러스터 구매가 아니라 다세대 로드맵을 준비하고 있습니다.",
  "Software and networking are increasingly used to defend system-level gross margins.": "소프트웨어와 네트워킹은 점점 시스템 단위의 매출총이익률을 방어하는 수단이 되고 있습니다.",
  "Packaging and power delivery still matter as bottlenecks.": "패키징과 전력 공급은 여전히 병목 요소입니다.",
  "A few hyperscalers drive a meaningful share of demand concentration.": "소수의 하이퍼스케일러가 수요 집중의 상당 부분을 차지합니다.",
  "Any digestion signal at cloud customers can quickly affect sentiment.": "클라우드 고객의 소화 구간 신호는 심리에 빠르게 영향을 줄 수 있습니다.",
  "Management sounded more focused on system availability, deployment velocity, and customer ROI than on unit shipments alone.": "경영진은 단순 출하량보다 시스템 가용성, 배포 속도, 고객 ROI에 더 초점을 맞춘 모습이었습니다.",
  "Bull cases should track customer deployment cadence and attach rates from networking and software, not just accelerator revenue.": "강세 시나리오는 가속기 매출뿐 아니라 고객 배포 속도와 네트워킹·소프트웨어 부가판매율까지 함께 추적해야 합니다.",
  "How much of the next wave is durable inference demand versus front-loaded infrastructure stocking?": "다음 수요 파동은 지속 가능한 추론 수요인가, 아니면 선행 인프라 재고 축적인가?",
  "Azure demand remains supply-constrained in parts of the footprint.": "애저 수요는 일부 영역에서 여전히 공급 제약을 받고 있습니다.",
  "Copilot messaging is shifting from experimentation to workflow adoption and measurable ROI.": "코파일럿 메시지는 실험 단계에서 실제 워크플로 도입과 측정 가능한 ROI 중심으로 옮겨가고 있습니다.",
  "The platform narrative remains stronger when security and data are included with AI.": "AI에 보안과 데이터를 함께 묶어 설명할 때 플랫폼 서사가 더 강해집니다.",
  "Capex efficiency and payback period are becoming central investor questions.": "설비투자 효율과 회수 기간은 투자자들의 핵심 질문이 되고 있습니다.",
  "Copilot seat conversion needs to keep validating the pricing architecture.": "코파일럿 유료 좌석 전환은 가격 체계를 계속 검증해줘야 합니다.",
  "Any moderation in Azure backlog commentary could reset expectations.": "애저 수주잔고 관련 코멘트가 둔화되면 기대치가 다시 낮아질 수 있습니다.",
  "The strongest part of the call is that AI is not isolated; it is being sold as part of a broader platform bundle.": "이번 콜의 가장 강한 지점은 AI가 고립된 제품이 아니라 더 넓은 플랫폼 번들 안에서 판매되고 있다는 점입니다.",
  "Watch Azure backlog, enterprise AI attach, and implied capex productivity together instead of in isolation.": "애저 수주잔고, 기업 AI 부가판매, 설비투자 생산성을 따로 보지 말고 함께 봐야 합니다.",
  "How quickly can Microsoft move from AI demand capture to visible margin normalization?": "마이크로소프트는 AI 수요 확보에서 실제 마진 정상화로 얼마나 빨리 넘어갈 수 있을까요?",
  "AWS commentary matters most when paired with disclosed capex and custom silicon direction.": "AWS 관련 코멘트는 공개된 설비투자와 자체 실리콘 방향성과 함께 볼 때 가장 중요합니다.",
  "Ads continue to improve the quality of the business mix.": "광고는 계속해서 사업 믹스의 질을 높여주고 있습니다.",
  "Retail execution is now a margin enabler rather than a permanent drag.": "리테일 실행력은 이제 상시 부담이 아니라 마진 개선 요인입니다.",
  "How much AI demand lands on AWS versus customer-specific deployments elsewhere?": "AI 수요가 AWS에 얼마나 안착하고, 얼마나 고객 맞춤형 배포로 빠지는가?",
  "Custom silicon may change dependency on third-party accelerators over time.": "자체 실리콘은 시간이 지나며 외부 가속기 의존도를 바꿀 수 있습니다.",
  "Consumer softness can still offset cloud optimism in the short run.": "단기적으로는 소비 둔화가 클라우드 기대를 상쇄할 수 있습니다.",
  "Amazon sounds most attractive when retail discipline and AWS re-acceleration show up together.": "아마존은 리테일 규율과 AWS 재가속이 함께 나타날 때 가장 매력적으로 보입니다.",
  "Separate the AWS workload growth story from the retail margin story so the thesis does not become too dependent on one segment.": "투자 논리가 한 사업부에 과도하게 의존하지 않도록 AWS 워크로드 성장과 리테일 마진 스토리를 분리해서 봐야 합니다.",
  "Will custom silicon improve AWS economics enough to change how investors value the cloud AI opportunity?": "자체 실리콘이 AWS 경제성을 충분히 개선해 투자자들의 클라우드 AI 가치평가 방식을 바꿀 수 있을까요?",
  "Search remains healthy enough to fund AI experimentation.": "검색 사업은 AI 실험을 감당할 만큼 충분히 견조합니다.",
  "Cloud is becoming a clearer second pillar rather than an optional story.": "클라우드는 선택적 스토리가 아니라 더 분명한 두 번째 축이 되고 있습니다.",
  "Product integration speed matters almost as much as model quality.": "제품 통합 속도는 모델 품질만큼이나 중요합니다.",
  "Any deterioration in search monetization could overwhelm other positives.": "검색 수익화가 약해지면 다른 긍정 요소를 모두 덮어버릴 수 있습니다.",
  "Cloud margins need to keep improving if AI spend remains elevated.": "AI 지출이 높은 수준을 유지한다면 클라우드 마진도 계속 개선돼야 합니다.",
  "Regulatory and default distribution issues stay on the board.": "규제와 기본 배포 채널 문제는 여전히 남아 있습니다.",
  "The business is strongest when search, cloud, and YouTube all contribute to financing the AI transition at once.": "검색, 클라우드, 유튜브가 함께 AI 전환 비용을 감당할 때 사업은 가장 강해집니다.",
  "Track search monetization quality separately from AI product excitement so the thesis stays grounded.": "투자 논리가 흔들리지 않도록 검색 수익화의 질을 AI 제품 화제성과 분리해 추적해야 합니다.",
  "Can Google create a visibly better AI product experience without damaging the economics of its incumbent channels?": "구글은 기존 채널의 경제성을 해치지 않으면서 눈에 띄게 더 나은 AI 경험을 만들 수 있을까요?",
  "Recommendation quality and ad conversion remain the most important proof points.": "추천 품질과 광고 전환율은 여전히 가장 중요한 검증 지표입니다.",
  "Open-source positioning aims to attract developers while preserving product agility.": "오픈소스 전략은 제품 민첩성을 유지하면서 개발자를 끌어들이려는 의도입니다.",
  "Heavy infrastructure spend is justified as foundational rather than optional.": "대규모 인프라 지출은 선택이 아니라 기반 투자로 정당화되고 있습니다.",
  "Capex escalation can become the headline if monetization lags.": "수익화가 늦어지면 설비투자 확대 자체가 핵심 논쟁이 될 수 있습니다.",
  "Reality Labs still creates a valuation discount for some investors.": "리얼리티 랩스는 여전히 일부 투자자에게 밸류에이션 할인 요인입니다.",
  "User engagement gains must keep translating into monetization efficiency.": "사용자 참여도 개선은 계속해서 수익화 효율로 이어져야 합니다.",
  "Meta sounds strongest when AI is discussed as a core ad-ranking and user retention driver instead of a side bet.": "메타는 AI가 부가 옵션이 아니라 핵심 광고 랭킹·리텐션 동력으로 설명될 때 가장 강해 보입니다.",
  "Watch ad efficiency gains and capex intensity together to avoid missing the margin trade-off.": "마진 상충 관계를 놓치지 않으려면 광고 효율 개선과 설비투자 강도를 함께 봐야 합니다.",
  "How much optional upside from open-source model leadership will ever show up in direct monetization?": "오픈소스 모델 리더십의 선택적 업사이드가 실제 직접 수익화로 얼마나 이어질까요?",
  "Advanced node and packaging demand remain structurally stronger than broad semiconductor demand.": "첨단 공정과 패키징 수요는 전체 반도체 수요보다 구조적으로 더 강합니다.",
  "Customer concentration is real, but so is the visibility around next-generation roadmaps.": "고객 집중도는 현실이지만, 차세대 로드맵 가시성도 그만큼 높습니다.",
  "Geographic diversification is still an execution topic rather than a solved one.": "지역 다변화는 이미 끝난 문제가 아니라 여전히 실행 과제입니다.",
  "Packaging capacity could remain the gating factor for customer product ramps.": "패키징 생산능력은 고객 제품 출시 확대의 결정적 제약으로 남을 수 있습니다.",
  "Geopolitical headlines can dominate valuation even when fundamentals are strong.": "기초 체력이 강해도 지정학 이슈가 밸류에이션을 좌우할 수 있습니다.",
  "Smartphone and consumer softness still affect mixed-utilization perceptions.": "스마트폰과 소비자 수요 부진은 여전히 혼합 가동률 인식에 영향을 줍니다.",
  "Packaging capacity expansion may matter nearly as much as node leadership for near-term upside.": "단기 업사이드를 위해서는 공정 리더십만큼 패키징 증설도 중요할 수 있습니다.",
  "Track customer roadmap commentary together with packaging capacity additions and mix shifts.": "고객 로드맵 코멘트와 패키징 증설, 제품 믹스 변화를 함께 추적해야 합니다.",
  "How much pricing power can TSMC sustain if AI demand stays concentrated in the most advanced stack?": "AI 수요가 최첨단 스택에 집중된 채 유지된다면, TSMC는 얼마나 가격 결정력을 유지할 수 있을까요?",
  "Customer appetite for a second supplier remains an important theme.": "두 번째 공급사를 원하려는 고객 수요는 여전히 중요한 주제입니다.",
  "Management is increasingly emphasizing system solutions rather than just chip specs.": "경영진은 단순 칩 사양보다 시스템 솔루션을 점점 더 강조하고 있습니다.",
  "The broader product portfolio helps fund the AI push but can cloud the narrative.": "넓은 제품 포트폴리오는 AI 확장을 뒷받침하지만, 서사를 흐릴 수도 있습니다.",
  "Software readiness remains the key gap versus the category leader.": "소프트웨어 준비도는 여전히 업계 선도업체 대비 가장 큰 격차입니다.",
  "Supply access at TSMC is a shared dependency with competitors.": "TSMC 공급 접근성은 경쟁사들과 공유하는 공통 의존 요소입니다.",
  "Investors need proof of sustained deployment, not just pilot announcements.": "투자자들은 파일럿 발표가 아니라 지속적인 배포의 증거를 원합니다.",
  "The strongest case is not just product performance, but customer desire for supply-chain and pricing diversification.": "가장 강한 투자 포인트는 제품 성능뿐 아니라 고객들의 공급망·가격 다변화 욕구입니다.",
  "Watch deployment scale, customer references, and software ecosystem traction together.": "배포 규모, 고객 레퍼런스, 소프트웨어 생태계 확산을 함께 봐야 합니다.",
  "Can AMD become a durable second platform, or does it remain a cyclical trade on occasional share gains?": "AMD는 지속 가능한 2위 플랫폼이 될 수 있을까요, 아니면 간헐적 점유율 확대에 기대는 순환주로 남을까요?",
  "Commercial conversion speed is the main proof point for AI demand durability.": "상업 부문 전환 속도는 AI 수요 지속성을 보여주는 핵심 지표입니다.",
  "Government remains useful as a base, but commercial adoption has to carry the multiple.": "정부 부문은 기반으로 유용하지만, 높은 밸류에이션은 결국 상업 부문 도입이 지탱해야 합니다.",
  "Management's language often emphasizes platform standardization and operational urgency.": "경영진의 표현은 종종 플랫폼 표준화와 운영 긴급성을 강조합니다.",
  "Valuation is highly sensitive to any slowdown in commercial momentum.": "밸류에이션은 상업 부문 모멘텀 둔화에 매우 민감합니다.",
  "The AI narrative can outrun near-term financial delivery.": "AI 서사는 단기 실적 전달 속도를 앞질러 갈 수 있습니다.",
  "Large-deal concentration can create lumpy optics.": "대형 계약 집중은 실적 흐름을 들쑥날쑥하게 보이게 할 수 있습니다.",
  "The market wants evidence that Palantir is moving from demos to standard operating deployments.": "시장은 팔란티어가 데모 단계에서 표준 운영 배포 단계로 넘어가고 있다는 증거를 원합니다.",
  "Track commercial customer count, expansion motion, and deployment speed more than top-line excitement.": "외형 성장의 화제성보다 상업 고객 수, 확장 흐름, 배포 속도를 더 중시해 봐야 합니다.",
  "How durable is the current AI demand wave once early enthusiasm normalizes into procurement cycles?": "초기 열기가 조달 사이클로 정상화된 뒤에도 현재 AI 수요 파동은 얼마나 지속될까요?",
  "AI infrastructure build-out": "AI 인프라 확장",
  "Copilot monetization": "코파일럿 수익화",
  "Security platform consolidation": "보안 플랫폼 통합",
  "Custom silicon roadmap": "자체 실리콘 로드맵",
  "Fulfillment efficiency": "물류 효율화",
  "Ads monetization surface expansion": "광고 수익화 지면 확대",
  "Search AI integration": "검색 AI 통합",
  "Cloud profitability improvement": "클라우드 수익성 개선",
  "Gemini product expansion": "제미니 제품 확장",
  "Open-source model ecosystem": "오픈소스 모델 생태계",
  "Ad ranking AI improvements": "광고 랭킹 AI 개선",
  "Wearables and next platform bets": "웨어러블·차세대 플랫폼 베팅",
  "2nm node readiness": "2나노 공정 준비",
  "Advanced packaging expansion": "첨단 패키징 확장",
  "Geographic manufacturing footprint": "지역별 생산 거점",
  "AI accelerator platform push": "AI 가속기 플랫폼 확대",
  "Software ecosystem strengthening": "소프트웨어 생태계 강화",
  "Client recovery support": "클라이언트 회복 지원",
  "AIP deployment expansion": "AIP 배포 확대",
  "Commercial vertical penetration": "상업 부문 침투 확대",
  "Government base reinforcement": "정부 부문 기반 강화",
  "Narrative capital": "서사 자금",
  "Operating capital proxy": "운영 자금 지표",
  "Swing capital": "변동 자금",
  "Stability capital": "안정 자금",
  "High-conviction capital": "고확신 자금",
  "Upside capital": "상승 기대 자금",
  "Volatility source": "변동성 원천",
  "Theme holder": "테마 보유자",
};

function translateText(value) {
  if (typeof value !== "string") return value;
  return TEXT_TRANSLATIONS[value] ?? value;
}

function localizeData(value, key = "") {
  if (Array.isArray(value)) {
    return value.map((item) => localizeData(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        LOCALIZATION_EXCLUDED_KEYS.has(entryKey)
          ? entryValue
          : localizeData(entryValue, entryKey),
      ])
    );
  }

  if (typeof value === "string" && !LOCALIZATION_EXCLUDED_KEYS.has(key)) {
    return translateText(value);
  }

  return value;
}

function formatSectorLabel(sector) {
  return SECTOR_LABELS[sector] ?? sector;
}

function formatTabLabel(tabId, fallback) {
  return TAB_LABELS[tabId] ?? fallback;
}

function formatRelationLabel(type) {
  return RELATION_LABELS[type] ?? type;
}

function formatQuoteSource(source) {
  return QUOTE_SOURCE_LABELS[source] ?? source ?? "알 수 없음";
}

function createLiveChannel(status, message, syncedAt = null) {
  return { status, message, syncedAt };
}

function createDefaultLiveState(apiKey = "") {
  const enabled = Boolean(apiKey.trim());

  return {
    apiKey,
    market: createLiveChannel(
      enabled ? "idle" : "demo",
      enabled
        ? "실시간 시세 연결을 시작할 준비가 되어 있습니다."
        : "API 키를 넣으면 실시간 시세와 일봉 OHLC 차트로 전환됩니다."
    ),
    chart: createLiveChannel(
      enabled ? "idle" : "demo",
      enabled
        ? "활성 기업의 일봉 OHLC 차트를 불러올 준비가 되어 있습니다."
        : "활성 기업 차트는 데모 일봉 시계열을 사용 중입니다."
    ),
    transcript: createLiveChannel(
      enabled ? "idle" : "demo",
      enabled
        ? "실적 콜 탭에서 최신 컨퍼런스 콜 원문을 분석합니다."
        : "실적 콜 원문 분석은 API 키를 넣으면 활성화됩니다."
    ),
    capital: createLiveChannel(
      "static",
      "투자자/13F/기관 보유 실시간 연결은 다음 단계로 열어 둘 수 있습니다."
    ),
  };
}

function bootstrap() {
  const storedCustomCompanies = readStorage(STORAGE_KEYS.customCompanies, []);
  state.pinnedIds = readStorage(STORAGE_KEYS.pinnedCompanies, ["nvda", "msft"]);
  state.compareIds = readStorage(STORAGE_KEYS.compareCompanies, ["nvda", "msft"]);
  state.live = createDefaultLiveState(readStorage(STORAGE_KEYS.fmpApiKey, ""));
  state.companies = hydrateCompanies(storedCustomCompanies);
  state.activeCompanyId = state.companies[0]?.id ?? null;
  state.activeSegmentId = getActiveCompany()?.segments?.[0]?.id ?? null;

  bindEvents();
  renderApp();
  startDataLoop();
}

function hydrateCompanies(customCompanies) {
  const clonedBase = structuredClone(baseCompanies).map((company) =>
    prepareCompany({
      ...company,
      isCustom: false,
    })
  );

  const clonedCustom = customCompanies.map((company) =>
    prepareCompany({
      ...company,
      isCustom: true,
    })
  );

  return [...clonedBase, ...clonedCustom];
}

function prepareCompany(company) {
  company = localizeData(company);

  if (!company.price) return company;

  if (!company.price.candles?.length) {
    company.price.candles = buildCandlesFromSeries(
      company.price.series ?? [],
      `${company.id}-${company.ticker}`,
      company.price.volatility ?? 0.8
    );
  }

  return company;
}

function rehydrateCompanyState() {
  const activeId = state.activeCompanyId;
  const activeSegmentId = state.activeSegmentId;

  state.companies = hydrateCompanies(getStoredCustomCompanies());

  if (!state.companies.some((company) => company.id === activeId)) {
    state.activeCompanyId = state.companies[0]?.id ?? null;
  }

  const activeCompany = getActiveCompany();
  state.activeSegmentId =
    activeCompany?.segments.some((segment) => segment.id === activeSegmentId)
      ? activeSegmentId
      : activeCompany?.segments[0]?.id ?? null;
}

function readStorage(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function bindEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("submit", handleSubmit);
}

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const { action, id, tab, segment, view, sector } = target.dataset;

  if (action === "select-company" && id) {
    state.activeCompanyId = id;
    state.activeTab = "overview";
    state.activeSegmentId = getCompanyById(id)?.segments?.[0]?.id ?? null;
    renderApp();
    maybeFetchActiveCompanyLiveData({ force: false, includeTranscript: false });
  }

  if (action === "toggle-pin" && id) {
    state.pinnedIds = toggleOrderedId(state.pinnedIds, id, 8);
    writeStorage(STORAGE_KEYS.pinnedCompanies, state.pinnedIds);
    renderApp();
  }

  if (action === "toggle-compare" && id) {
    state.compareIds = toggleOrderedId(state.compareIds, id, 3);
    writeStorage(STORAGE_KEYS.compareCompanies, state.compareIds);
    renderApp();
  }

  if (action === "set-tab" && tab) {
    state.activeTab = tab;
    renderDetail();
    if (tab === "earnings") {
      maybeFetchActiveCompanyLiveData({ force: false, includeTranscript: true });
    }
  }

  if (action === "set-segment" && segment) {
    state.activeSegmentId = segment;
    renderDetail();
  }

  if (action === "set-view" && view) {
    state.activeView = view;
    renderHeader();
    renderContent();
  }

  if (action === "set-chart-range" && view) {
    state.activeChartRange = view;
    renderDetail();
  }

  if (action === "set-sector" && sector) {
    state.activeSector = sector;
    renderHeader();
    renderContent();
  }

  if (action === "toggle-compare-tray") {
    state.showCompareTray = !state.showCompareTray;
    renderHeader();
    renderContent();
  }

  if (action === "remove-company" && id) {
    removeCustomCompany(id);
  }

  if (action === "sync-live") {
    syncLiveData({ force: true, includeTranscript: state.activeTab === "earnings" });
  }

  if (action === "clear-live-key") {
    clearLiveConfiguration();
  }
}

function handleInput(event) {
  if (event.target.matches("[data-role='search-input']")) {
    state.search = event.target.value.trim();
    renderContent();
  }
}

function handleSubmit(event) {
  if (event.target.matches("[data-role='api-form']")) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const apiKey = String(formData.get("apiKey") ?? "").trim();
    state.live = createDefaultLiveState(apiKey);
    writeStorage(STORAGE_KEYS.fmpApiKey, apiKey);
    rehydrateCompanyState();
    renderApp();
    startDataLoop();
    return;
  }

  if (!event.target.matches("[data-role='company-form']")) return;
  event.preventDefault();

  const formData = new FormData(event.target);
  const name = sanitizeUserText(formData.get("name"));
  const ticker = sanitizeTicker(formData.get("ticker"));
  const sector = sanitizeUserText(formData.get("sector")) || "AI Infra";
  const thesis = sanitizeUserText(formData.get("thesis"));

  if (!name || !ticker || !thesis) return;

  const newCompany = createCustomCompany({
    name,
    ticker,
    sector,
    thesis,
  });

  const storedCustomCompanies = getStoredCustomCompanies();
  storedCustomCompanies.unshift(newCompany);
  writeStorage(STORAGE_KEYS.customCompanies, storedCustomCompanies);

  state.companies = hydrateCompanies(storedCustomCompanies);
  state.activeCompanyId = newCompany.id;
  state.activeSegmentId = newCompany.segments[0].id;
  state.pinnedIds = toggleOrderedId(state.pinnedIds, newCompany.id, 8);
  writeStorage(STORAGE_KEYS.pinnedCompanies, state.pinnedIds);
  event.target.reset();
  renderApp();

  if (hasLiveApiKey()) {
    syncMarketData({ force: true, silent: false });
    syncActiveCompanyChart({ force: true, silent: false });
  }
}

function sanitizeUserText(value) {
  return String(value ?? "").trim().replace(/[<>]/g, "");
}

function sanitizeTicker(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.\-]/g, "")
    .slice(0, 10);
}

function clearLiveConfiguration() {
  localStorage.removeItem(STORAGE_KEYS.fmpApiKey);
  state.live = createDefaultLiveState("");
  rehydrateCompanyState();
  renderApp();
  startDataLoop();
}

function removeCustomCompany(id) {
  const storedCustomCompanies = getStoredCustomCompanies().filter(
    (company) => company.id !== id
  );
  writeStorage(STORAGE_KEYS.customCompanies, storedCustomCompanies);

  state.pinnedIds = state.pinnedIds.filter((entry) => entry !== id);
  state.compareIds = state.compareIds.filter((entry) => entry !== id);
  writeStorage(STORAGE_KEYS.pinnedCompanies, state.pinnedIds);
  writeStorage(STORAGE_KEYS.compareCompanies, state.compareIds);

  state.companies = hydrateCompanies(storedCustomCompanies);
  const fallbackId = state.companies[0]?.id ?? null;
  if (state.activeCompanyId === id) {
    state.activeCompanyId = fallbackId;
    state.activeSegmentId = getActiveCompany()?.segments?.[0]?.id ?? null;
  }

  renderApp();
  maybeFetchActiveCompanyLiveData({ force: false, includeTranscript: false });
}

function getStoredCustomCompanies() {
  return readStorage(STORAGE_KEYS.customCompanies, []);
}

function createCustomCompany({ name, ticker, sector, thesis }) {
  const preset = sectorPresets[sector] ?? sectorPresets["AI Infra"];
  const id = `${ticker.toLowerCase()}-${Date.now().toString(36)}`;
  const seed = hashString(`${name}${ticker}${sector}`);
  const current = Number((48 + (seed % 140) + ((seed % 17) / 10)).toFixed(1));
  const baseStart = current - 6.3;
  const priceSeries = Array.from({ length: 14 }, (_, index) => {
    const wave = Math.sin((index + (seed % 7)) / 2.4) * 1.1;
    const value = Number((baseStart + index * 0.45 + wave).toFixed(1));
    return {
      label: [
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
      ][index],
      value,
    };
  });

  const peers = state.companies.filter((company) => company.sector === sector).slice(0, 3);

  return prepareCompany({
    id,
    name,
    ticker,
    country: "사용자 정의",
    sector,
    maturity: "사용자 관심종목",
    marketCapLabel: "사용자 프로필",
    thesis,
    price: {
      current,
      drift: 0.12 + (seed % 8) / 100,
      volatility: 0.6 + (seed % 6) / 10,
      series: priceSeries,
    },
    summaryMetrics: [
      { label: "초기 설정", value: "사용자 정의" },
      { label: "Theme", value: preset.headline },
      { label: "상태", value: "실시간 데이터 필요" },
    ],
    segments: preset.segments.map((segmentName, index) => ({
      id: `${id}-segment-${index + 1}`,
      name: segmentName,
      metricLabel: "집중 포인트",
      metricValue:
        index === 0 ? "핵심" : index === 1 ? "보조" : "선택지",
      note:
        index === 0
          ? `${name}에서 가장 먼저 추적할 축입니다.`
          : index === 1
            ? `${name}의 실행력과 수익화 속도를 확인하기 좋은 축입니다.`
            : `${name}의 장기 선택지를 정리하는 축입니다.`,
      series: Array.from({ length: 8 }, (_, pointIndex) => ({
        label: ["Q1", "Q2", "Q3", "Q4", "Q1", "Q2", "Q3", "Q4"][pointIndex],
        value: Number(
          (
            12 +
            index * 6 +
            pointIndex * (1.5 + index) +
            Math.sin((seed + pointIndex) / 3) * 1.4
          ).toFixed(1)
        ),
      })),
    })),
    earnings: {
      period: "사용자 템플릿",
      tone: "검토 필요",
      summary:
        `${name}의 최근 실적 콜 핵심 메시지를 넣으면 여기에서 요약, 리스크, 가이던스 해석을 한 번에 볼 수 있게 설계되어 있습니다.`,
      highlights: [
        `${name}의 최근 매출/수요 포인트를 정리하세요.`,
        "가이던스 상향 또는 보수적 스탠스를 기록하세요.",
        "시장 기대와 실제 발언의 차이를 메모하세요.",
      ],
      watchItems: [
        "실적 콜 원문 연결 필요",
        "세그먼트별 KPI 연결 필요",
        "가이던스 대비 시장 컨센서스 비교 필요",
      ],
      keywordHeat: [
        { label: "수요", value: 52 },
        { label: "마진", value: 41 },
        { label: "생산능력", value: 38 },
        { label: "가이던스", value: 47 },
      ],
      panelNotes: [
        {
          title: "핵심 포인트",
          body: `${name}에서 가장 중요한 발언을 2~3줄로 요약하도록 비워 둔 자리입니다.`,
        },
        {
          title: "모델 영향",
          body: "EPS, 매출, 멀티플 중 어디에 가장 큰 영향을 주는지 적어두면 좋습니다.",
        },
        {
          title: "남은 질문",
          body: "다음 분기까지 꼭 확인할 질문을 남겨두세요.",
        },
      ],
    },
    relationships: peers.map((peer, index) => ({
      targetId: peer.id,
      type: index === 0 ? "Peer" : index === 1 ? "Partner" : "Competitor",
      strength: 44 + index * 11,
      note:
        index === 0
          ? `${peer.name}와 같은 섹터 비교 대상으로 자동 연결되었습니다.`
          : `${peer.name}와의 공급망/고객/경쟁 관계를 여기에 구체화하면 됩니다.`,
    })),
    investors: [
      {
        name: "상위 보유자 추적",
        role: "자금 흐름 관찰",
        note: "13F, 기관 보유, ETF 비중을 연결하면 됩니다.",
      },
      {
        name: "전략 파트너",
        role: "신호 소스",
        note: "투자자가 아니라도 수요/고객/파트너가 더 중요한 경우가 많습니다.",
      },
      {
        name: "사용자 메모",
        role: "수동 인텔리전스",
        note: "중요 투자자나 펀드, 창업자 매도/매수 흐름을 여기에 적을 수 있습니다.",
      },
    ],
    initiatives: [
      {
        title: "핵심 실행 과제",
        stage: "정의 필요",
        part: preset.segments[0],
        detail: "가장 중요한 신제품/고객사/공장/플랫폼 로드맵을 여기에 기록하세요.",
      },
      {
        title: "매출 레버리지",
        stage: "정의 필요",
        part: preset.segments[1],
        detail: "실적에 영향을 줄 신규 계약, 가격 정책, 파트너십을 추적하세요.",
      },
      {
        title: "장기 선택지",
        stage: "정의 필요",
        part: preset.segments[2],
        detail: "장기적으로 valuation re-rate를 만들 수 있는 선택지를 정리하세요.",
      },
    ],
  });
}

function hashString(value) {
  return value.split("").reduce((acc, character) => acc + character.charCodeAt(0), 0);
}

function toggleOrderedId(entries, id, limit) {
  if (entries.includes(id)) {
    return entries.filter((entry) => entry !== id);
  }

  const next = [...entries, id];
  return next.slice(-limit);
}

function hasLiveApiKey() {
  return Boolean(state.live.apiKey.trim());
}

function startDataLoop() {
  stopDataLoop();

  if (hasLiveApiKey()) {
    runtime.loopId = window.setInterval(() => {
      syncMarketData({ force: false, silent: true });
      syncActiveCompanyChart({ force: false, silent: true });
    }, LIVE_REFRESH_MS);

    syncLiveData({ force: true, includeTranscript: state.activeTab === "earnings" });
    return;
  }

  state.live = createDefaultLiveState("");
  runtime.loopId = window.setInterval(() => {
    state.companies.forEach((company) => {
      tickCompanyPrice(company);
    });
    renderContent();
    renderDetail();
  }, DEMO_REFRESH_MS);
}

function stopDataLoop() {
  if (runtime.loopId) {
    window.clearInterval(runtime.loopId);
    runtime.loopId = null;
  }
}

function tickCompanyPrice(company) {
  const series = company.price.series;
  const last = series.at(-1)?.value ?? company.price.current;
  const drift = company.price.drift ?? 0.1;
  const volatility = company.price.volatility ?? 0.8;
  const wobble =
    Math.sin(Date.now() / 6000 + hashString(company.id)) * (volatility / 2.8);
  const direction = drift * (0.8 + Math.random() * 0.5);
  const nextValue = Number(
    Math.max(1, last + wobble * 0.2 + direction * 0.3 - volatility * 0.04).toFixed(1)
  );
  const nextLabel = nextIntradayLabel(series.at(-1)?.label ?? "16:00");
  series.push({ label: nextLabel, value: nextValue });
  if (series.length > 14) series.shift();
  company.price.current = nextValue;
  company.price.candles = buildCandlesFromSeries(
    series,
    `${company.id}-${company.ticker}`,
    company.price.volatility ?? 0.8
  );
}

function nextIntradayLabel(label) {
  const hour = Number(label.split(":")[0]);
  const minute = Number(label.split(":")[1]);
  const nextMinute = minute + 30;
  const computedHour = hour + Math.floor(nextMinute / 60);
  const computedMinute = nextMinute % 60;

  return `${String(
    computedHour > 16 ? 9 + ((computedHour - 17) % 8) : computedHour
  ).padStart(2, "0")}:${String(computedMinute).padStart(2, "0")}`;
}

function updateLiveChannel(channel, status, message, syncedAt = null) {
  state.live[channel] = createLiveChannel(status, message, syncedAt);
}

function safeRenderHeader() {
  if (document.activeElement?.matches?.("[data-role='search-input']")) return;
  renderHeader();
}

function maybeFetchActiveCompanyLiveData({
  force = false,
  includeTranscript = false,
} = {}) {
  if (!hasLiveApiKey()) return;

  syncActiveCompanyChart({ force, silent: false });

  if (includeTranscript) {
    syncActiveCompanyTranscript({ force, silent: false });
  }
}

async function syncLiveData({ force = false, includeTranscript = false } = {}) {
  await syncMarketData({ force, silent: false });
  await syncActiveCompanyChart({ force, silent: false });

  if (includeTranscript) {
    await syncActiveCompanyTranscript({ force, silent: false });
  }
}

async function syncMarketData({ force = false, silent = false } = {}) {
  if (!hasLiveApiKey()) return;

  const symbols = state.companies.map((company) => company.ticker).filter(Boolean);
  if (!symbols.length) return;

  if (!silent || force) {
    updateLiveChannel("market", "loading", "FMP 시세 데이터를 동기화하고 있습니다.");
    renderSidebar();
  }

  try {
    const { quotes, source } = await fetchBatchQuotes(symbols, state.live.apiKey);

    if (!quotes.length) {
      throw new Error("시세 응답이 비어 있습니다.");
    }

    const now = new Date().toISOString();
    const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));

    state.companies.forEach((company) => {
      const quote = quoteMap.get(company.ticker.toUpperCase());
      if (!quote) return;
      applyLiveQuote(company, quote, now, source);
    });

    updateLiveChannel(
      "market",
      "live",
      `${quotes.length}/${symbols.length}개 종목을 실시간 시세로 동기화했습니다. 소스: ${formatQuoteSource(source)}.`,
      now
    );

    renderSidebar();
    safeRenderHeader();
    renderContent();
    renderDetail();
  } catch (error) {
    updateLiveChannel(
      "market",
      "error",
      `시세 연결 실패: ${resolveErrorMessage(error)}`
    );
    renderSidebar();
  }
}

function applyLiveQuote(company, quote, syncedAt, source = "unknown") {
  company.liveQuote = {
    ...quote,
    source,
    syncedAt,
  };

  if (Number.isFinite(quote.price) && quote.price > 0) {
    company.price.current = quote.price;

    if (!company.liveChart?.series?.length) {
      company.price.series = injectLivePricePoint(company.price.series, quote.price);
      company.price.candles = buildCandlesFromSeries(
        company.price.series,
        `${company.id}-${company.ticker}`,
        company.price.volatility ?? 0.8
      );
    }
  }
}

function injectLivePricePoint(series, price) {
  const trimmed = series.slice(-13).map((point) => ({ ...point }));
  trimmed.push({
    label: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/New_York",
    }),
    value: Number(price.toFixed(2)),
  });
  return trimmed;
}

async function syncActiveCompanyChart({ force = false, silent = false } = {}) {
  if (!hasLiveApiKey()) return;

  const company = getActiveCompany();
  if (!company) return;

  const previousSync = company.liveChart?.syncedAt
    ? new Date(company.liveChart.syncedAt).getTime()
    : 0;
  const isFresh = previousSync && Date.now() - previousSync < CHART_CACHE_MS;

  if (!force && isFresh) return;

  if (!silent || force) {
    updateLiveChannel(
      "chart",
      "loading",
      `${company.ticker} 일봉 OHLC 차트를 불러오는 중입니다.`
    );
    renderSidebar();
    renderDetail();
  }

  try {
    const chartSeries = await fetchDailyEodChart(company.ticker, state.live.apiKey, 220);

    if (!chartSeries.length) {
      throw new Error("일봉 차트 응답이 비어 있습니다.");
    }

    const now = new Date().toISOString();
    const normalizedCandles = chartSeries.map((point) => ({ ...point }));
    const quote = company.liveQuote;

    if (quote && normalizedCandles.length) {
      const lastIndex = normalizedCandles.length - 1;
      const lastBar = normalizedCandles[lastIndex];
      const latestLabel = formatLatestDailyLabel();
      normalizedCandles[lastIndex] = {
        ...lastBar,
        date: getTodayNyDate(),
        label: latestLabel,
        open: quote.open > 0 ? Number(quote.open.toFixed(2)) : lastBar.open,
        high: quote.dayHigh > 0 ? Number(quote.dayHigh.toFixed(2)) : lastBar.high,
        low: quote.dayLow > 0 ? Number(quote.dayLow.toFixed(2)) : lastBar.low,
        close: quote.price > 0 ? Number(quote.price.toFixed(2)) : lastBar.close,
        value: quote.price > 0 ? Number(quote.price.toFixed(2)) : lastBar.value,
        volume: quote.volume > 0 ? quote.volume : lastBar.volume,
      };
    }

    company.liveChart = {
      series: normalizedCandles,
      syncedAt: now,
      source: "FMP 일봉 OHLC",
    };
    company.price.series = normalizedCandles.map((point) => ({
      label: point.label,
      value: point.close,
    }));
    company.price.candles = normalizedCandles.map((point) => ({
      label: point.label,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
      date: point.date,
    }));
    company.price.current =
      company.liveQuote?.price ??
      normalizedCandles.at(-1)?.value ??
      company.price.current;

    updateLiveChannel(
      "chart",
      "live",
      `${company.ticker} 일봉 OHLC 차트를 동기화했습니다.`,
      now
    );

    renderSidebar();
    renderContent();
    renderDetail();
  } catch (error) {
    updateLiveChannel(
      "chart",
      "error",
      `차트 연결 실패: ${resolveErrorMessage(error)}`
    );
    renderSidebar();
    renderDetail();
  }
}

async function syncActiveCompanyTranscript({ force = false, silent = false } = {}) {
  if (!hasLiveApiKey()) return;

  const company = getActiveCompany();
  if (!company) return;

  const previousAnalysis = company.liveEarnings?.transcriptMeta?.analyzedAt
    ? new Date(company.liveEarnings.transcriptMeta.analyzedAt).getTime()
    : 0;
  const isFresh = previousAnalysis && Date.now() - previousAnalysis < TRANSCRIPT_CACHE_MS;

  if (!force && isFresh) return;

  if (!silent || force) {
    updateLiveChannel(
      "transcript",
      "loading",
      `${company.ticker} 실적 콜 원문을 분석하고 있습니다.`
    );
    renderSidebar();
    renderDetail();
  }

  try {
    const transcriptDates = await fetchTranscriptDates(company.ticker, state.live.apiKey);
    const latest = pickLatestTranscriptDate(transcriptDates);

    if (!latest) {
      throw new Error("사용 가능한 실적 콜 원문이 없습니다.");
    }

    const transcript = await fetchTranscript(
      company.ticker,
      latest.year,
      latest.quarter,
      state.live.apiKey
    );

    if (!transcript?.content) {
      throw new Error("실적 콜 원문이 비어 있습니다.");
    }

    const analyzed = buildTranscriptInsights(transcript, company);
    company.liveEarnings = analyzed;

    updateLiveChannel(
      "transcript",
      "live",
      `${company.ticker} ${latest.year}년 ${latest.quarter}분기 원문 분석을 완료했습니다.`,
      analyzed.transcriptMeta.analyzedAt
    );

    renderSidebar();
    renderDetail();
  } catch (error) {
    updateLiveChannel(
      "transcript",
      "error",
      `실적 콜 연결 실패: ${resolveErrorMessage(error)}`
    );
    renderSidebar();
    renderDetail();
  }
}

function pickLatestTranscriptDate(entries) {
  return [...entries].sort((left, right) => {
    const leftScore = new Date(left.date || 0).getTime() || left.year * 10 + left.quarter;
    const rightScore =
      new Date(right.date || 0).getTime() || right.year * 10 + right.quarter;
    return rightScore - leftScore;
  })[0];
}

function resolveErrorMessage(error) {
  return error instanceof Error ? error.message : "알 수 없는 오류";
}

function getActiveCompany() {
  return getCompanyById(state.activeCompanyId);
}

function getCompanyById(id) {
  return state.companies.find((company) => company.id === id);
}

function getVisibleCompanies() {
  const search = state.search.toLowerCase();
  return state.companies.filter((company) => {
    const matchesSector =
      state.activeSector === "All" || company.sector === state.activeSector;
    const matchesSearch =
      !search ||
      `${company.name} ${company.ticker} ${company.sector} ${company.thesis}`
        .toLowerCase()
        .includes(search);
    return matchesSector && matchesSearch;
  });
}

function getDisplayEarnings(company) {
  return company.liveEarnings ?? company.earnings;
}

function renderApp() {
  const activeCompany = getActiveCompany();

  if (!activeCompany && state.companies.length) {
    state.activeCompanyId = state.companies[0].id;
    state.activeSegmentId = state.companies[0].segments[0].id;
  }

  if (
    activeCompany &&
    !activeCompany.segments.some((segment) => segment.id === state.activeSegmentId)
  ) {
    state.activeSegmentId = activeCompany.segments[0].id;
  }

  renderSidebar();
  renderHeader();
  renderContent();
  renderDetail();
}

function renderSidebar() {
  const pinnedCompanies = state.pinnedIds
    .map((id) => getCompanyById(id))
    .filter(Boolean);
  const compareCompanies = state.compareIds
    .map((id) => getCompanyById(id))
    .filter(Boolean);

  elements.sidebar.innerHTML = `
    <div class="panel intro-panel">
      <div class="eyebrow">투자 인텔리전스 맵</div>
      <h1>실시간 시세와 실적 콜이 붙는 주식 맵</h1>
      <p class="muted">
        지금은 ${
          hasLiveApiKey() ? "FMP 실시간 모드" : "데모 모드"
        } 입니다. 시세는 공식 시세 엔드포인트, 차트는 일봉 OHLC 엔드포인트, 실적 분석은 실적 콜 원문 엔드포인트를 사용하도록 연결했습니다.
      </p>
      <div class="status-grid">
        ${renderStatus(
          "시세 피드",
          getStatusLabel(state.live.market.status),
          buildStatusDescription(state.live.market),
          state.live.market.status
        )}
        ${renderStatus(
          "상세 차트",
          getStatusLabel(state.live.chart.status),
          buildStatusDescription(state.live.chart),
          state.live.chart.status
        )}
        ${renderStatus(
          "실적 분석",
          getStatusLabel(state.live.transcript.status),
          buildStatusDescription(state.live.transcript),
          state.live.transcript.status
        )}
        ${renderStatus(
          "자금 흐름",
          getStatusLabel(state.live.capital.status),
          buildStatusDescription(state.live.capital),
          state.live.capital.status
        )}
      </div>
    </div>

    <div class="panel api-panel">
      <div class="section-heading">
        <h2>실시간 데이터 설정</h2>
        <span class="pill ${hasLiveApiKey() ? "" : "subtle"}">${
          hasLiveApiKey() ? "FMP 연결됨" : "데모 모드"
        }</span>
      </div>
      <p class="muted">
        브라우저에서 바로 동작하도록 Financial Modeling Prep 공식 API를 연결했습니다. 키는 이 브라우저의 localStorage에만 저장됩니다.
      </p>
      <form data-role="api-form" class="company-form api-form">
        <label>
          <span>FMP API 키</span>
          <input
            name="apiKey"
            type="password"
            placeholder="apikey를 입력하세요"
            value="${escapeAttribute(state.live.apiKey)}"
            autocomplete="off"
          />
        </label>
        <div class="api-actions">
          <button type="submit" class="primary-button">저장하고 연결</button>
          <button type="button" class="ghost-button" data-action="sync-live">지금 동기화</button>
          <button type="button" class="ghost-button danger" data-action="clear-live-key">키 제거</button>
        </div>
      </form>
      <div class="api-helper">
        사용 endpoint:
        <code>batch-quote</code>,
        <code>historical-price-eod/full</code>,
        <code>earning-call-transcript-dates</code>,
        <code>earning-call-transcript</code>
      </div>
    </div>

    <div class="panel form-panel">
      <div class="section-heading">
        <h2>기업 추가</h2>
        <span class="pill subtle">사용자 정의</span>
      </div>
      <p class="muted">회사명, 티커, 섹터, 핵심 투자 포인트만 넣으면 맵에 바로 올라갑니다.</p>
      <form data-role="company-form" class="company-form">
        <label>
          <span>기업명</span>
          <input name="name" type="text" placeholder="예: Broadcom" required />
        </label>
        <label>
          <span>티커</span>
          <input name="ticker" type="text" placeholder="AVGO" maxlength="10" required />
        </label>
        <label>
          <span>섹터</span>
          <select name="sector">
            ${sectorFilters
              .filter((sector) => sector !== "All")
              .map((sector) => `<option value="${sector}">${formatSectorLabel(sector)}</option>`)
              .join("")}
          </select>
        </label>
        <label>
          <span>투자 포인트</span>
          <textarea
            name="thesis"
            rows="4"
            placeholder="왜 이 회사를 추적하는지, 무엇을 확인하고 싶은지 적어주세요."
            required
          ></textarea>
        </label>
        <button type="submit" class="primary-button">맵에 추가</button>
      </form>
    </div>

    <div class="panel watchlist-panel">
      <div class="section-heading">
        <h2>핀한 기업</h2>
        <span class="pill">${pinnedCompanies.length}</span>
      </div>
      <div class="chip-cloud">
        ${
          pinnedCompanies.length
            ? pinnedCompanies
                .map(
                  (company) => `
                    <button class="ticker-chip" data-action="select-company" data-id="${company.id}">
                      <strong>${company.ticker}</strong>
                      <span>${company.name}</span>
                    </button>
                  `
                )
                .join("")
            : `<div class="empty-state">카드의 고정 버튼으로 기업을 상단에 고정할 수 있어요.</div>`
        }
      </div>
    </div>

    <div class="panel compare-panel">
      <div class="section-heading">
        <h2>비교 바구니</h2>
        <span class="pill">${compareCompanies.length}/3</span>
      </div>
      ${
        compareCompanies.length
          ? compareCompanies
              .map(
                (company) => `
                  <div class="compare-row">
                    <button data-action="select-company" data-id="${company.id}">
                      <strong>${company.name}</strong>
                      <span>${company.summaryMetrics[1].value}</span>
                    </button>
                    <button class="ghost-button" data-action="toggle-compare" data-id="${company.id}">
                      제거
                    </button>
                  </div>
                `
              )
              .join("")
          : `<div class="empty-state">카드의 비교 버튼으로 최대 3개 기업을 담을 수 있습니다.</div>`
      }
    </div>
  `;
}

function renderHeader() {
  const visibleCompanies = getVisibleCompanies();
  const marketSummary = hasLiveApiKey()
    ? state.live.market.syncedAt
      ? `${visibleCompanies.length}개 기업 표시 중. 마지막 시세 동기화 ${formatSyncTime(
          state.live.market.syncedAt
        )}.`
      : `${visibleCompanies.length}개 기업 표시 중. 실시간 시세 연결을 준비 중입니다.`
    : `${visibleCompanies.length}개 기업 표시 중. 현재는 데모 가격 스트림이 자동 업데이트됩니다.`;

  elements.header.innerHTML = `
    <div class="panel header-panel">
      <div class="header-top">
        <div>
          <div class="eyebrow">대시보드</div>
          <h2>주식 맵 작업공간</h2>
          <p class="muted">${marketSummary}</p>
        </div>
        <div class="header-actions">
          <div class="view-toggle">
            <button class="${state.activeView === "grid" ? "active" : ""}" data-action="set-view" data-view="grid">카드</button>
            <button class="${state.activeView === "map" ? "active" : ""}" data-action="set-view" data-view="map">맵</button>
          </div>
          <button class="secondary-button" data-action="toggle-compare-tray">
            ${state.showCompareTray ? "비교 숨기기" : "비교 보기"}
          </button>
        </div>
      </div>
      <div class="toolbar">
        <label class="search-field">
          <span>검색</span>
          <input
            data-role="search-input"
            type="search"
            placeholder="기업명, 티커, 섹터 검색"
            value="${escapeAttribute(state.search)}"
          />
        </label>
        <div class="filter-row">
          ${sectorFilters
            .map(
              (sector) => `
                <button
                  class="filter-pill ${state.activeSector === sector ? "active" : ""}"
                  data-action="set-sector"
                  data-sector="${sector}"
                >
                  ${formatSectorLabel(sector)}
                </button>
              `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderContent() {
  const visibleCompanies = getVisibleCompanies();

  elements.content.innerHTML = `
    ${state.showCompareTray ? renderCompareTray() : ""}
    ${
      state.activeView === "grid"
        ? renderCardGrid(visibleCompanies)
        : renderNetworkWorkspace(visibleCompanies)
    }
  `;
}

function renderCompareTray() {
  const compareCompanies = state.compareIds
    .map((id) => getCompanyById(id))
    .filter(Boolean);

  if (!compareCompanies.length) {
    return `
      <div class="panel compare-tray">
        <div class="tray-empty">아직 비교 대상이 없습니다. 카드의 비교 버튼을 눌러 최대 3개까지 담아보세요.</div>
      </div>
    `;
  }

  return `
    <div class="panel compare-tray">
      <div class="section-heading">
        <h3>빠른 비교</h3>
        <span class="pill">${compareCompanies.length}</span>
      </div>
      <div class="compare-grid">
        ${compareCompanies
          .map((company) => {
            const priceDelta = getPriceDelta(company);
            return `
              <article class="compare-card">
                <header>
                  <button data-action="select-company" data-id="${company.id}">
                    <strong>${company.name}</strong>
                    <span>${company.ticker}</span>
                  </button>
                  <button class="ghost-button small" data-action="toggle-compare" data-id="${company.id}">제거</button>
                </header>
                <div class="compare-price-row">
                  <div class="price-tag">${formatDisplayPrice(company.price.current, { live: Boolean(company.liveQuote) })}</div>
                  <div class="delta-tag ${priceDelta >= 0 ? "positive" : "negative"}">
                    ${formatPercentValue(priceDelta)}
                  </div>
                </div>
                <div class="compare-metric-list">
                  ${company.summaryMetrics
                    .map(
                      (metric) => `
                        <div class="mini-metric">
                          <span>${metric.label}</span>
                          <strong>${metric.value}</strong>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderCardGrid(companies) {
  if (!companies.length) {
    return `
      <div class="panel empty-board">
        <h3>검색 결과가 없습니다.</h3>
        <p class="muted">검색어를 바꾸거나 왼쪽 폼으로 직접 기업을 추가해보세요.</p>
      </div>
    `;
  }

  return `
    <div class="card-grid">
      ${companies
        .map((company, index) => {
          const priceDelta = getPriceDelta(company);
          const isPinned = state.pinnedIds.includes(company.id);
          const isCompared = state.compareIds.includes(company.id);
          const isActive = state.activeCompanyId === company.id;
          const sourceLabel = company.liveQuote ? "실시간" : "데모";

          return `
            <article class="panel company-card ${isActive ? "active" : ""}">
              <div class="card-top">
                <div class="card-rank">#${index + 1}</div>
                <div class="card-pill-row">
                  <div class="pill subtle">${formatSectorLabel(company.sector)}</div>
                  <div class="pill ${company.liveQuote ? "" : "subtle"}">${sourceLabel}</div>
                </div>
              </div>
              <button class="card-company" data-action="select-company" data-id="${company.id}">
                <div class="card-heading">
                  <div>
                    <h3>${company.name}</h3>
                    <div class="ticker-line">${company.ticker} · ${company.marketCapLabel}</div>
                  </div>
                  <div class="price-cluster">
                    <strong>${formatDisplayPrice(company.price.current, { live: Boolean(company.liveQuote) })}</strong>
                    <span class="${priceDelta >= 0 ? "positive" : "negative"}">
                      ${formatPercentValue(priceDelta)}
                    </span>
                  </div>
                </div>
                <p class="card-thesis">${company.thesis}</p>
                <div class="sparkline">
                  ${renderLineChart(company.price.series, { compact: true, stroke: "#3dd9a5" })}
                </div>
              </button>
              <div class="metric-stack">
                ${company.summaryMetrics
                  .map(
                    (metric) => `
                      <div class="metric-row">
                        <span>${metric.label}</span>
                        <strong>${metric.value}</strong>
                      </div>
                    `
                  )
                  .join("")}
              </div>
              <div class="card-actions">
                <button class="ghost-button" data-action="toggle-pin" data-id="${company.id}">
                  ${isPinned ? "고정 해제" : "고정"}
                </button>
                <button class="ghost-button" data-action="toggle-compare" data-id="${company.id}">
                  ${isCompared ? "비교 중" : "비교"}
                </button>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderNetworkWorkspace(companies) {
  if (!companies.length) {
    return `
      <div class="panel empty-board">
        <h3>맵에 표시할 기업이 없습니다.</h3>
        <p class="muted">필터를 바꾸거나 검색어를 초기화해보세요.</p>
      </div>
    `;
  }

  const positions = buildVisibleMapPositions(companies);
  const links = buildVisibleLinks(companies);

  return `
    <div class="panel map-panel">
      <div class="section-heading">
        <h3>관계 맵</h3>
        <span class="pill">${companies.length}개 노드</span>
      </div>
      <p class="muted">
        관계 맵은 아직 정적 데이터 중심이지만, 실시간 시세는 카드와 상세 패널에 바로 반영됩니다.
      </p>
      <div class="map-canvas">
        <svg viewBox="0 0 1000 620" role="img" aria-label="기업 관계 맵">
          <defs>
            <linearGradient id="mapEdge" x1="0%" x2="100%">
              <stop offset="0%" stop-color="#2dd49c" stop-opacity="0.65"></stop>
              <stop offset="100%" stop-color="#0fb0ff" stop-opacity="0.25"></stop>
            </linearGradient>
          </defs>
          ${links
            .map((link) => {
              const source = positions[link.sourceId];
              const target = positions[link.targetId];
              return `
                <line
                  x1="${source.x}"
                  y1="${source.y}"
                  x2="${target.x}"
                  y2="${target.y}"
                  stroke="${relationPalette[link.type] ?? "url(#mapEdge)"}"
                  stroke-width="${1 + link.strength / 32}"
                  stroke-opacity="0.42"
                />
              `;
            })
            .join("")}
          ${companies
            .map((company) => {
              const node = positions[company.id];
              const isActive = company.id === state.activeCompanyId;
              return `
                <g class="map-node-group ${isActive ? "is-active" : ""}">
                  <circle
                    cx="${node.x}"
                    cy="${node.y}"
                    r="${isActive ? 48 : 38}"
                    fill="${isActive ? "rgba(54, 223, 163, 0.24)" : "rgba(14, 21, 23, 0.82)"}"
                    stroke="${isActive ? "#44e6af" : "rgba(255,255,255,0.1)"}"
                    stroke-width="${isActive ? 2 : 1.2}"
                  ></circle>
                  <text x="${node.x}" y="${node.y - 6}" text-anchor="middle" class="map-node-title">${company.ticker}</text>
                  <text x="${node.x}" y="${node.y + 16}" text-anchor="middle" class="map-node-subtitle">${formatSectorLabel(company.sector)}</text>
                  <foreignObject x="${node.x - 55}" y="${node.y - 55}" width="110" height="110">
                    <button class="map-node-button" data-action="select-company" data-id="${company.id}" aria-label="${company.name} 선택"></button>
                  </foreignObject>
                </g>
              `;
            })
            .join("")}
        </svg>
      </div>
      <div class="legend-row">
        ${Object.entries(relationPalette)
          .map(
            ([label, color]) => `
              <div class="legend-item">
                <span class="legend-dot" style="background:${color}"></span>
                <span>${formatRelationLabel(label)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderDetail() {
  const company = getActiveCompany();
  if (!company) {
    elements.detail.innerHTML = "";
    return;
  }

  const activeSegment =
    company.segments.find((segment) => segment.id === state.activeSegmentId) ??
    company.segments[0];
  const priceDelta = getPriceDelta(company);
  const displayCandles = getDisplayCandles(company, state.activeChartRange);
  const chartSource = company.liveChart
    ? "FMP 일봉 OHLC 차트"
    : company.liveQuote
      ? "실시간 시세 폴백"
      : "데모 시세";

  elements.detail.innerHTML = `
    <div class="panel detail-shell">
      <div class="detail-top">
        <div>
          <div class="eyebrow">기업 상세</div>
          <h2>${company.name}</h2>
          <p class="muted">${company.ticker} · ${formatSectorLabel(company.sector)} · ${company.maturity}</p>
        </div>
        <div class="detail-actions">
          <button class="ghost-button" data-action="toggle-pin" data-id="${company.id}">
            ${state.pinnedIds.includes(company.id) ? "고정 해제" : "고정"}
          </button>
          <button class="ghost-button" data-action="toggle-compare" data-id="${company.id}">
            ${state.compareIds.includes(company.id) ? "비교 중" : "비교"}
          </button>
          <button class="ghost-button" data-action="sync-live">
            지금 동기화
          </button>
          ${
            company.isCustom
              ? `<button class="ghost-button danger" data-action="remove-company" data-id="${company.id}">삭제</button>`
              : ""
          }
        </div>
      </div>

      <div class="detail-hero">
        <article class="hero-chart-card">
          <div class="hero-price-line">
            <div>
              <div class="eyebrow">${chartSource}</div>
              <div class="hero-price">${formatDisplayPrice(company.price.current, { live: Boolean(company.liveQuote) })}</div>
            </div>
            <div class="delta-tag ${priceDelta >= 0 ? "positive" : "negative"}">
              ${formatPercentValue(priceDelta)}
            </div>
          </div>
          <div class="candle-toolbar">
            <div class="candle-toolbar-left">
              <div class="candle-symbol-pill">${company.ticker}</div>
              <div class="moving-average-legend">
                <span>이동평균</span>
                <strong class="ma ma-5">5</strong>
                <strong class="ma ma-20">20</strong>
                <strong class="ma ma-60">60</strong>
                <strong class="ma ma-120">120</strong>
              </div>
            </div>
            <div class="candle-range-tabs">
              ${[
                { id: "1D", label: "1D" },
                { id: "1W", label: "1W" },
                { id: "1M", label: "1M" },
                { id: "3M", label: "3M" },
                { id: "ALL", label: "ALL" },
              ]
                .map(
                  (range) => `
                    <button
                      class="candle-range-button ${state.activeChartRange === range.id ? "active" : ""}"
                      data-action="set-chart-range"
                      data-view="${range.id}"
                    >
                      ${range.label}
                    </button>
                  `
                )
                .join("")}
            </div>
          </div>
          <div class="chart-frame">
            ${renderCandlestickChart(displayCandles, company)}
          </div>
          <p class="muted">
            ${
              company.liveChart
                ? `${company.ticker} 캔들 차트가 동기화되었습니다. ${
                    company.liveChart.syncedAt
                      ? `마지막 업데이트 ${formatSyncTime(company.liveChart.syncedAt)}.`
                      : ""
                  }`
                : hasLiveApiKey()
                  ? "실시간 시세와 OHLC 데이터를 이용해 캔들, 이동평균, 거래량 패널을 함께 표시합니다."
                  : "API 키를 넣으면 현재 데모 캔들 차트 자리에 실시간 OHLC / 거래량 데이터가 들어옵니다."
            }
          </p>
        </article>

        <aside class="hero-side">
          <article class="info-card">
            <div class="eyebrow">투자 포인트</div>
            <p>${company.thesis}</p>
          </article>
          <article class="info-card">
            <div class="eyebrow">실시간 스냅샷</div>
            ${renderLiveSnapshot(company)}
          </article>
          <article class="info-card">
            <div class="eyebrow">빠른 요약</div>
            ${company.summaryMetrics
              .map(
                (metric) => `
                  <div class="metric-row">
                    <span>${metric.label}</span>
                    <strong>${metric.value}</strong>
                  </div>
                `
              )
              .join("")}
          </article>
        </aside>
      </div>

      <div class="tab-row">
        ${detailTabs
          .map(
            (tab) => `
              <button
                class="tab-button ${state.activeTab === tab.id ? "active" : ""}"
                data-action="set-tab"
                data-tab="${tab.id}"
              >
                ${formatTabLabel(tab.id, tab.label)}
              </button>
            `
          )
          .join("")}
      </div>

      <div class="tab-content">
        ${renderTabContent(company, activeSegment)}
      </div>
    </div>
  `;
}

function renderLiveSnapshot(company) {
  if (!company.liveQuote) {
    return `<p class="muted">실시간 시세가 아직 연결되지 않았습니다. API 키를 저장하고 지금 동기화를 누르면 이 영역이 채워집니다.</p>`;
  }

  return `
    <div class="metric-row">
      <span>시세 소스</span>
      <strong>${formatQuoteSource(company.liveQuote.source)}</strong>
    </div>
    <div class="metric-row">
      <span>당일 범위</span>
      <strong>${formatMoneyValue(company.liveQuote.dayLow, { live: true })} - ${formatMoneyValue(company.liveQuote.dayHigh, { live: true })}</strong>
    </div>
    <div class="metric-row">
      <span>시가</span>
      <strong>${formatMoneyValue(company.liveQuote.open, { live: true })}</strong>
    </div>
    <div class="metric-row">
      <span>거래량</span>
      <strong>${formatCompactNumber(company.liveQuote.volume)}</strong>
    </div>
    <div class="metric-row">
      <span>시가총액</span>
      <strong>${company.liveQuote.marketCap ? `$${formatCompactNumber(company.liveQuote.marketCap)}` : "없음"}</strong>
    </div>
    <div class="metric-row">
      <span>동기화 시각</span>
      <strong>${formatSyncTime(company.liveQuote.syncedAt)}</strong>
    </div>
  `;
}

function renderTabContent(company, activeSegment) {
  const earnings = getDisplayEarnings(company);

  if (state.activeTab === "overview") {
    return `
      <div class="section-heading">
        <h3>파트별 분석</h3>
        <span class="pill">${company.segments.length}개 파트</span>
      </div>
      <div class="segment-chip-row">
        ${company.segments
          .map(
            (segment) => `
              <button
                class="segment-chip ${segment.id === activeSegment.id ? "active" : ""}"
                data-action="set-segment"
                data-segment="${segment.id}"
              >
                ${segment.name}
              </button>
            `
          )
          .join("")}
      </div>
      <div class="overview-grid">
        <article class="panel-inner segment-focus-card">
          <div class="section-heading">
            <h4>${activeSegment.name}</h4>
            <span class="pill subtle">${activeSegment.metricValue}</span>
          </div>
          <p class="muted">${activeSegment.note}</p>
          <div class="chart-frame slim">
            ${renderLineChart(activeSegment.series, { compact: false, stroke: "#f0b45f" })}
          </div>
        </article>
        <article class="panel-inner">
          <div class="section-heading">
            <h4>현재 해석</h4>
            <span class="pill subtle">${earnings.tone}</span>
          </div>
          <div class="bullet-stack">
            ${earnings.highlights
              .slice(0, 3)
              .map((item) => `<div class="bullet-item">${item}</div>`)
              .join("")}
          </div>
        </article>
      </div>
      <div class="segment-grid">
        ${company.segments
          .map(
            (segment) => `
              <article class="panel-inner segment-card ${segment.id === activeSegment.id ? "active" : ""}">
                <div class="section-heading">
                  <h4>${segment.name}</h4>
                  <span class="pill subtle">${segment.metricLabel}</span>
                </div>
                <p class="muted">${segment.note}</p>
                <div class="mini-chart">${renderLineChart(segment.series, {
                  compact: true,
                  stroke: segment.id === activeSegment.id ? "#f0b45f" : "#63c2ff",
                })}</div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  if (state.activeTab === "earnings") {
    return `
      ${renderTranscriptBanner(company)}
      <div class="call-summary">
        <article class="panel-inner">
          <div class="section-heading">
            <h3>${earnings.period}</h3>
            <span class="pill">${earnings.tone}</span>
          </div>
          <p>${earnings.summary}</p>
        </article>
        <article class="panel-inner">
          <div class="section-heading">
            <h3>키워드 강도</h3>
            <span class="pill subtle">콜 분석</span>
          </div>
          <div class="heat-list">
            ${earnings.keywordHeat
              .map(
                (keyword) => `
                  <div class="heat-row">
                    <span>${keyword.label}</span>
                    <div class="heat-track">
                      <div class="heat-fill" style="width:${keyword.value}%"></div>
                    </div>
                    <strong>${keyword.value}</strong>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      </div>
      <div class="note-grid">
        ${earnings.panelNotes
          .map(
            (note) => `
              <article class="panel-inner">
                <div class="section-heading">
                  <h4>${note.title}</h4>
                </div>
                <p class="muted">${note.body}</p>
              </article>
            `
          )
          .join("")}
      </div>
      <div class="two-column">
        <article class="panel-inner">
          <div class="section-heading">
            <h4>핵심 요약</h4>
          </div>
          <div class="bullet-stack">
            ${earnings.highlights
              .map((item) => `<div class="bullet-item">${item}</div>`)
              .join("")}
          </div>
        </article>
        <article class="panel-inner">
          <div class="section-heading">
            <h4>체크 포인트</h4>
          </div>
          <div class="bullet-stack danger-stack">
            ${earnings.watchItems
              .map((item) => `<div class="bullet-item">${item}</div>`)
              .join("")}
          </div>
        </article>
      </div>
    `;
  }

  if (state.activeTab === "relationships") {
    const relationCompanies = company.relationships
      .map((relation) => ({
        relation,
        peer: getCompanyById(relation.targetId),
      }))
      .filter(({ peer }) => Boolean(peer));

    return `
      <div class="two-column relationship-layout">
        <article class="panel-inner">
          <div class="section-heading">
            <h3>네트워크</h3>
            <span class="pill">${relationCompanies.length}개 연결</span>
          </div>
          <div class="relationship-map">
            ${renderRelationshipMap(company, relationCompanies)}
          </div>
        </article>
        <article class="panel-inner">
          <div class="section-heading">
            <h3>연결 메모</h3>
            <span class="pill subtle">구조화됨</span>
          </div>
          <div class="relation-list">
            ${relationCompanies
              .map(
                ({ relation, peer }) => `
                  <div class="relation-card">
                    <div class="relation-header">
                      <div>
                        <strong>${peer.name}</strong>
                        <span>${formatRelationLabel(relation.type)}</span>
                      </div>
                      <span class="pill subtle">${relation.strength}</span>
                    </div>
                    <p class="muted">${relation.note}</p>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      </div>
    `;
  }

  if (state.activeTab === "capital") {
    return `
      <div class="live-banner static">
        <strong>자금 흐름</strong>
        <span>현재는 정적 메모 데이터입니다. 다음 단계에서 13F / 기관 보유 API를 붙일 수 있습니다.</span>
      </div>
      <div class="section-heading">
        <h3>누가 투자하고 어떤 자금이 중요한가?</h3>
        <span class="pill">${company.investors.length}개 신호</span>
      </div>
      <div class="capital-grid">
        ${company.investors
          .map(
            (investor) => `
              <article class="panel-inner capital-card">
                <div class="section-heading">
                  <h4>${investor.name}</h4>
                  <span class="pill subtle">${investor.role}</span>
                </div>
                <p class="muted">${investor.note}</p>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  return `
    <div class="section-heading">
      <h3>이 기업은 지금 무엇을 하고 있나?</h3>
      <span class="pill">${company.initiatives.length}개 트랙</span>
    </div>
    <div class="project-grid">
      ${company.initiatives
        .map(
          (initiative) => `
            <article class="panel-inner project-card">
              <div class="section-heading">
                <h4>${initiative.title}</h4>
                <span class="pill subtle">${initiative.stage}</span>
              </div>
              <div class="project-meta">${initiative.part}</div>
              <p class="muted">${initiative.detail}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTranscriptBanner(company) {
  if (company.liveEarnings?.transcriptMeta) {
    return `
      <div class="live-banner live">
        <strong>실시간 원문 분석</strong>
        <span>
          ${
            company.liveEarnings.transcriptMeta.source
          }에서 ${company.liveEarnings.transcriptMeta.year} Q${
            company.liveEarnings.transcriptMeta.quarter
          } 원문을 불러와 키워드 기반으로 요약했습니다.
          ${
            company.liveEarnings.transcriptMeta.analyzedAt
              ? `분석 시각 ${formatSyncTime(company.liveEarnings.transcriptMeta.analyzedAt)}.`
              : ""
          }
        </span>
      </div>
    `;
  }

  if (!hasLiveApiKey()) {
    return `
      <div class="live-banner demo">
        <strong>데모 실적 분석</strong>
        <span>API 키를 넣으면 최신 실적 콜 원문을 불러와 이 영역을 자동 요약으로 채웁니다.</span>
      </div>
    `;
  }

  if (state.live.transcript.status === "loading") {
    return `
      <div class="live-banner loading">
        <strong>원문 동기화 중</strong>
        <span>${state.live.transcript.message}</span>
      </div>
    `;
  }

  if (state.live.transcript.status === "error") {
    return `
      <div class="live-banner error">
        <strong>원문 동기화 오류</strong>
        <span>${state.live.transcript.message}</span>
      </div>
    `;
  }

  return `
    <div class="live-banner static">
      <strong>원문 분석 준비됨</strong>
      <span>지금 동기화를 누르거나 실적 콜 탭을 다시 열면 최신 원문 분석을 시도합니다.</span>
    </div>
  `;
}

function renderRelationshipMap(company, relationCompanies) {
  const centerX = 270;
  const centerY = 210;
  const radius = 145;

  return `
    <svg viewBox="0 0 540 420" role="img" aria-label="${company.name} 관계 맵">
      <circle cx="${centerX}" cy="${centerY}" r="72" fill="rgba(61, 217, 165, 0.16)" stroke="#3dd9a5" stroke-width="2"></circle>
      <text x="${centerX}" y="${centerY - 4}" text-anchor="middle" class="map-node-title">${company.ticker}</text>
      <text x="${centerX}" y="${centerY + 18}" text-anchor="middle" class="map-node-subtitle">${company.name}</text>
      ${relationCompanies
        .map(({ relation, peer }, index) => {
          const angle =
            -Math.PI / 2 + (index * (Math.PI * 2)) / Math.max(relationCompanies.length, 1);
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          const color = relationPalette[relation.type] ?? "#79d7cf";
          return `
            <line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="${1.5 + relation.strength / 34}" stroke-opacity="0.72"></line>
            <circle cx="${x}" cy="${y}" r="52" fill="rgba(10, 17, 19, 0.92)" stroke="${color}" stroke-width="1.4"></circle>
            <text x="${x}" y="${y - 4}" text-anchor="middle" class="map-node-title">${peer.ticker}</text>
            <text x="${x}" y="${y + 16}" text-anchor="middle" class="map-node-subtitle">${formatRelationLabel(relation.type)}</text>
          `;
        })
        .join("")}
    </svg>
  `;
}

function buildVisibleMapPositions(companies) {
  const sectorBuckets = {};

  return Object.fromEntries(
    companies.map((company, index) => {
      if (mapLayout[company.id]) {
        const layout = mapLayout[company.id];
        return [company.id, { x: layout.x * 10, y: layout.y * 6.1 }];
      }

      const bucket = sectorBuckets[company.sector] ?? 0;
      sectorBuckets[company.sector] = bucket + 1;
      const sectorIndex =
        ["AI Infra", "Foundry", "Cloud", "Consumer", "Software"].indexOf(
          company.sector
        ) + 1;
      return [
        company.id,
        {
          x: 120 + sectorIndex * 150,
          y: 130 + bucket * 110 + (index % 2) * 25,
        },
      ];
    })
  );
}

function buildVisibleLinks(companies) {
  const visibleIds = new Set(companies.map((company) => company.id));
  const unique = new Map();

  companies.forEach((company) => {
    company.relationships.forEach((relation) => {
      if (!visibleIds.has(relation.targetId)) return;
      const key = [company.id, relation.targetId].sort().join(":");
      const existing = unique.get(key);
      if (!existing || existing.strength < relation.strength) {
        unique.set(key, {
          sourceId: company.id,
          targetId: relation.targetId,
          type: relation.type,
          strength: relation.strength,
        });
      }
    });
  });

  return [...unique.values()];
}

function buildCandlesFromSeries(series, seedKey, volatility = 0.8) {
  if (!series?.length) return [];

  const seed = hashString(seedKey);
  const candles = [];

  series.forEach((point, index) => {
    const previousClose = candles[index - 1]?.close ?? point.value * (0.985 + (seed % 9) / 1000);
    const rawDrift = Math.sin((index + seed) / 2.7) * 0.012;
    const open = Number((previousClose * (1 + rawDrift * 0.7)).toFixed(2));
    const close = Number(point.value.toFixed(2));
    const spanBase =
      Math.max(Math.abs(close - open), close * 0.008) +
      (volatility * (0.28 + ((seed + index) % 7) * 0.05));
    const high = Number((Math.max(open, close) + spanBase * 0.72).toFixed(2));
    const low = Number((Math.max(0.1, Math.min(open, close) - spanBase * 0.68)).toFixed(2));
    const volume = Math.round(
      8_500_000 +
        index * 1_200_000 +
        Math.abs(close - open) * 2_400_000 +
        (((seed * (index + 3)) % 17) * 420_000)
    );

    candles.push({
      label: point.label,
      open,
      high,
      low,
      close,
      volume,
      date: point.label,
    });
  });

  return candles;
}

function getDisplayCandles(company, range) {
  const isLiveMode = hasLiveApiKey();
  const sourceCandles = isLiveMode
    ? company.liveChart?.series?.length
      ? company.liveChart.series
      : []
    : company.price.candles?.length
      ? company.price.candles
      : buildCandlesFromSeries(
          company.price.series ?? [],
          `${company.id}-${company.ticker}`,
          company.price.volatility ?? 0.8
        );

  const rangeMap = {
    "1D": 1,
    "1W": 5,
    "1M": 22,
    "3M": 66,
    ALL: 999,
  };

  const limit = rangeMap[range] ?? 28;
  const sliced = sourceCandles.slice(-limit).map((candle) => ({ ...candle }));

  if (!isLiveMode) return sliced;
  return sliced;
}

function renderCandlestickChart(candles, company) {
  if (!candles?.length) {
    return `<div class="chart-empty">표시할 캔들 차트 데이터가 없습니다.</div>`;
  }

  const width = 900;
  const height = 560;
  const padding = { top: 22, right: 72, bottom: 42, left: 18 };
  const volumeHeight = 118;
  const gapHeight = 18;
  const priceHeight = height - padding.top - padding.bottom - volumeHeight - gapHeight;
  const priceBottom = padding.top + priceHeight;
  const volumeTop = priceBottom + gapHeight;
  const priceValues = candles.flatMap((candle) => [candle.high, candle.low]);
  const maxPrice = Math.max(...priceValues);
  const minPrice = Math.min(...priceValues);
  const priceSpan = maxPrice - minPrice || 1;
  const paddedMax = maxPrice + priceSpan * 0.08;
  const paddedMin = Math.max(0, minPrice - priceSpan * 0.08);
  const maxVolume = Math.max(...candles.map((candle) => candle.volume || 0), 1);
  const innerWidth = width - padding.left - padding.right;
  const slot = innerWidth / Math.max(candles.length, 1);
  const candleWidth = Math.max(8, Math.min(30, slot * 0.58));
  const lastClose = candles.at(-1)?.close ?? company.price.current;
  const highest = candles.reduce(
    (best, candle, index) => (candle.high > best.high ? { ...candle, index } : best),
    { ...candles[0], index: 0 }
  );
  const lowest = candles.reduce(
    (best, candle, index) => (candle.low < best.low ? { ...candle, index } : best),
    { ...candles[0], index: 0 }
  );

  const xAt = (index) => padding.left + slot * index + slot / 2;
  const priceY = (value) =>
    padding.top + ((paddedMax - value) / (paddedMax - paddedMin || 1)) * priceHeight;
  const volumeY = (value) => volumeTop + volumeHeight - (value / maxVolume) * volumeHeight;
  const priceTicks = Array.from({ length: 6 }, (_, index) => {
    const ratio = index / 5;
    const value = paddedMax - (paddedMax - paddedMin) * ratio;
    return {
      y: padding.top + priceHeight * ratio,
      value,
    };
  });
  const volumeTicks = [0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: volumeTop + volumeHeight - volumeHeight * ratio,
    value: maxVolume * ratio,
  }));
  const movingAverageConfigs = [
    { period: 5, className: "ma-5", color: "#50c85b" },
    { period: 20, className: "ma-20", color: "#ff5a5a" },
    { period: 60, className: "ma-60", color: "#ff9d2e" },
    { period: 120, className: "ma-120", color: "#ab6cff" },
  ];
  const movingAverages = movingAverageConfigs.map((config) => ({
    ...config,
    points: buildMovingAveragePoints(candles, config.period, xAt, priceY),
  }));
  const rightTagY = priceY(lastClose);
  const rightTagColor =
    lastClose >= (candles.at(-1)?.open ?? lastClose) ? "#e94444" : "#2a7df6";
  const highDelta = ((lastClose - highest.high) / highest.high) * 100;
  const lowDelta = ((lastClose - lowest.low) / lowest.low) * 100;

  return `
    <div class="candle-chart-shell">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${company.name} candlestick chart">
        <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" rx="18"></rect>
        ${priceTicks
          .map(
            (tick) => `
              <line x1="${padding.left}" y1="${tick.y}" x2="${width - padding.right}" y2="${tick.y}" class="candle-grid-line"></line>
              <text x="${width - padding.right + 12}" y="${tick.y + 4}" class="candle-axis-label">${formatChartPrice(
                tick.value
              )}</text>
            `
          )
          .join("")}
        ${volumeTicks
          .map(
            (tick) => `
              <line x1="${padding.left}" y1="${tick.y}" x2="${width - padding.right}" y2="${tick.y}" class="candle-volume-grid-line"></line>
              <text x="${width - padding.right + 12}" y="${tick.y + 4}" class="candle-axis-label volume">${formatCompactNumber(
                tick.value
              )}</text>
            `
          )
          .join("")}
        ${candles
          .map((candle, index) => {
            const x = xAt(index);
            const openY = priceY(candle.open);
            const closeY = priceY(candle.close);
            const highY = priceY(candle.high);
            const lowY = priceY(candle.low);
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(2.4, Math.abs(openY - closeY));
            const isUp = candle.close >= candle.open;
            const color = isUp ? "#f43434" : "#2179e3";
            const volumeHeightValue = volumeTop + volumeHeight - volumeY(candle.volume || 0);
            return `
              <line x1="${x}" y1="${highY}" x2="${x}" y2="${lowY}" stroke="${color}" stroke-width="1.8"></line>
              <rect x="${x - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" fill="${color}" rx="1.8"></rect>
              <rect
                x="${x - candleWidth / 2}"
                y="${volumeY(candle.volume || 0)}"
                width="${candleWidth}"
                height="${Math.max(4, volumeHeightValue)}"
                fill="${isUp ? "rgba(244,52,52,0.46)" : "rgba(33,121,227,0.46)"}"
              ></rect>
            `;
          })
          .join("")}
        ${movingAverages
          .map((average) =>
            average.points.length
              ? `
                  <path d="${average.points
                    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
                    .join(" ")}" class="candle-moving-average ${average.className}" stroke="${average.color}"></path>
                `
              : ""
          )
          .join("")}
        <line
          x1="${width - padding.right - 18}"
          y1="${rightTagY}"
          x2="${width - padding.right + 6}"
          y2="${rightTagY}"
          stroke="${rightTagColor}"
          stroke-width="2"
        ></line>
        <path
          d="M ${width - padding.right + 10} ${rightTagY} L ${width - padding.right + 28} ${rightTagY - 10} L ${
            width - padding.right + 72
          } ${rightTagY - 10} L ${width - padding.right + 72} ${rightTagY + 10} L ${
            width - padding.right + 28
          } ${rightTagY + 10} Z"
          fill="${rightTagColor}"
        ></path>
        <text x="${width - padding.right + 48}" y="${rightTagY + 4}" text-anchor="middle" class="candle-last-price">${
          formatChartPrice(lastClose)
        }</text>
        <circle cx="${xAt(highest.index)}" cy="${priceY(highest.high)}" r="3.4" fill="#111111"></circle>
        <text x="${xAt(highest.index)}" y="${priceY(highest.high) - 14}" text-anchor="middle" class="candle-annotation">
          최고 ${formatChartPrice(highest.high)} (${formatPercent(highDelta)})
        </text>
        <circle cx="${xAt(lowest.index)}" cy="${priceY(lowest.low)}" r="3.4" fill="#111111"></circle>
        <text x="${xAt(lowest.index)}" y="${priceY(lowest.low) + 22}" text-anchor="middle" class="candle-annotation">
          최저 ${formatChartPrice(lowest.low)} (${formatPercent(lowDelta)})
        </text>
        ${candles
          .map((candle, index) =>
            index % Math.max(1, Math.ceil(candles.length / 6)) === 0 || index === candles.length - 1
              ? `
                  <text x="${xAt(index)}" y="${height - 10}" text-anchor="middle" class="candle-x-label">
                    ${escapeHtml(String(candle.label))}
                  </text>
                `
              : ""
          )
          .join("")}
        <text x="${padding.left}" y="${padding.top - 2}" class="candle-panel-label">가격</text>
        <text x="${padding.left}" y="${volumeTop - 6}" class="candle-panel-label">거래량 ${formatCompactNumber(
          candles.reduce((sum, candle) => sum + (candle.volume || 0), 0)
        )}</text>
        <text x="${width - 18}" y="${padding.top + 12}" text-anchor="end" class="candle-mode-label">선형</text>
      </svg>
    </div>
  `;
}

function buildMovingAveragePoints(candles, period, xAt, yAt) {
  return candles
    .map((_, index) => {
      const start = Math.max(0, index - period + 1);
      const window = candles.slice(start, index + 1);
      if (!window.length) return null;
      const value = window.reduce((sum, candle) => sum + candle.close, 0) / window.length;
      return {
        x: xAt(index),
        y: yAt(value),
      };
    })
    .filter(Boolean);
}

function formatChartPrice(value) {
  return Number(value).toFixed(2);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0.00%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatLatestDailyLabel() {
  return new Date().toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

function getTodayNyDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/New_York",
  })
    .formatToParts(new Date())
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getPriceDelta(company) {
  const liveChange = company.liveQuote?.changesPercentage;
  if (Number.isFinite(liveChange)) {
    return liveChange;
  }

  const first = company.price.series[0]?.value ?? company.price.current;
  const last = company.price.series.at(-1)?.value ?? company.price.current;
  return ((last - first) / first) * 100;
}

function renderStatus(label, stateLabel, description, tone = "static") {
  return `
    <div class="status-card ${tone}">
      <div class="status-top">
        <strong>${label}</strong>
        <span class="pill subtle">${stateLabel}</span>
      </div>
      <p>${description}</p>
    </div>
  `;
}

function getStatusLabel(status) {
  if (status === "live") return "실시간";
  if (status === "loading") return "동기화 중";
  if (status === "error") return "오류";
  if (status === "idle") return "준비됨";
  if (status === "demo") return "데모";
  return "정적";
}

function buildStatusDescription(channel) {
  const timePart = channel.syncedAt ? ` 마지막 업데이트 ${formatSyncTime(channel.syncedAt)}.` : "";
  return `${channel.message}${timePart}`;
}

function renderLineChart(series, options = {}) {
  if (!series?.length) {
    return `<div class="chart-empty">표시할 차트 데이터가 없습니다.</div>`;
  }

  const width = options.compact ? 280 : 700;
  const height = options.compact ? 120 : 280;
  const paddingX = options.compact ? 10 : 24;
  const paddingY = options.compact ? 12 : 24;
  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = series.map((point, index) => {
    const x =
      paddingX +
      (index / Math.max(series.length - 1, 1)) * (width - paddingX * 2);
    const y =
      height -
      paddingY -
      ((point.value - min) / span) * (height - paddingY * 2);
    return { x, y, label: point.label, value: point.value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points.at(-1)?.x ?? 0} ${height - paddingY} L ${
    points[0]?.x ?? 0
  } ${height - paddingY} Z`;

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="chart">
      <defs>
        <linearGradient id="fill-${width}-${height}" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="${options.stroke ?? "#3dd9a5"}" stop-opacity="0.32"></stop>
          <stop offset="100%" stop-color="${options.stroke ?? "#3dd9a5"}" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      ${
        !options.compact
          ? [0, 0.25, 0.5, 0.75, 1]
              .map((ratio) => {
                const y = paddingY + ratio * (height - paddingY * 2);
                return `<line x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" class="chart-grid-line"></line>`;
              })
              .join("")
          : ""
      }
      <path d="${areaPath}" fill="url(#fill-${width}-${height})"></path>
      <path d="${linePath}" fill="none" stroke="${options.stroke ?? "#3dd9a5"}" stroke-width="${options.compact ? 3 : 4}" stroke-linecap="round" stroke-linejoin="round"></path>
      ${points
        .map(
          (point, index) => `
            <circle
              cx="${point.x}"
              cy="${point.y}"
              r="${index === points.length - 1 ? (options.compact ? 4 : 5) : options.compact ? 2.6 : 3.2}"
              fill="${options.stroke ?? "#3dd9a5"}"
            ></circle>
          `
        )
        .join("")}
      ${
        !options.compact
          ? points
              .filter((_, index) => index % 2 === 0 || index === points.length - 1)
              .map(
                (point) => `
                  <text x="${point.x}" y="${height - 6}" text-anchor="middle" class="chart-label">${point.label}</text>
                `
              )
              .join("")
          : ""
      }
    </svg>
  `;
}

function formatDecimal(value, decimals = 1) {
  if (!Number.isFinite(value) || value <= 0) return "N/A";
  return Number(value).toFixed(decimals);
}

function formatMoneyValue(value, { live = false } = {}) {
  const decimal = formatDecimal(value, live ? 4 : 1);
  return decimal === "N/A" ? decimal : `$${decimal}`;
}

function formatDisplayPrice(value, { live = false } = {}) {
  return formatMoneyValue(value, { live });
}

function formatPercentValue(value) {
  if (!Number.isFinite(value)) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatCompactNumber(value) {
  if (!Number.isFinite(value) || value <= 0) return "N/A";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatSyncTime(value) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

bootstrap();
