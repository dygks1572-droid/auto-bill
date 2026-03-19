import { BAKERY_MENU, PRODUCT_CATALOG } from '../data/bakeryMenu'

const product = (
  name,
  {
    aliases = [],
    category = 'bakery',
    group = 'default',
    countInBakeryTotal = category === 'bakery',
    reviewNeeded = false,
    optionLike = false,
  } = {},
) => ({
  name,
  aliases,
  category,
  group,
  countInBakeryTotal,
  reviewNeeded,
  optionLike,
  active: true,
})

export const BAKERY_INCLUDED = [
  '구리볼',
  '단짠 소금빵',
  '동물 쿠키',
  '딸기 크림치즈 토스트',
  '뜯어먹는 우유 식빵',
  '레몬케이크',
  '마늘빵',
  '먹물 소금빵',
  '모카 소금빵',
  '미니바게트',
  '미니 초코동글이 쿠키',
  '밤식빵',
  '버터링 쿠키',
  '베이커리 츄러스',
  '블루베리 식빵',
  '소금빵',
  '앙버터',
  '에그타르트',
  '전남친 블루베리 토스트',
  '초코동글이 쿠키',
  '초코링 쿠키',
  '초코 츄러스',
  '치즈 식빵',
  '카스테라',
  '카야버터 소금빵',
  '크로와상',
  '쿠키 세트',
  '플레인 스콘',
  '플레인 치아바타',
  '하트 초코 쿠키',
  '호두 크랜베리 깜빠뉴',
  '휘낭시에',
  '휘낭시에 5종 set(구성변경불가)',
]

export const BAKERY_EXCLUDED = [
  '아메리카노',
  '아이스아메리카노',
  '이즈드립',
  '커피원두',
  '커피원두 (오랑 400g)',
  '콜드브루 원액',
  '콜드브루 원액 1L',
  '라떼',
  '마다가스카르빈 라떼',
  '비건라떼',
]

export const REVIEW_NEEDED = [
  '건강빵 닭가슴살 샌드위치',
  '당근라페 샌드위치 (에그)',
  '당근라페 샌드위치 (잠봉)',
  '생크림',
  '아보카도 샌드위치',
  '오늘의 추억',
  '잠봉뵈르 샌드위치',
]

export const OPTION_NAMES = [
  'ICE',
  'HOT',
  '고소한 맛',
  '디카페인',
  '원두블렌드',
  '원두 블렌드',
  '이웃 블렌드(달콤)',
  '이웃블렌드',
  '플레인',
  '무화과',
  '발로나초코',
  '약과',
  '고르곤졸라크림치즈',
  '고르곤졸라 크림치즈',
]

const BASE_PRODUCT_SEEDS = [
  product('에그타르트', {
    aliases: ['에그 타르트', 'egg tart'],
    group: 'tart',
  }),
  product('레몬케이크', {
    aliases: ['레몬 케이크', '레몬 케익'],
    group: 'cake',
  }),
  product('베이커리 츄러스', {
    aliases: ['베이커리츄러스', '츄러스'],
    group: 'dessert',
  }),
  product('초코 츄러스', {
    aliases: ['초코츄러스'],
    group: 'dessert',
  }),
  product('휘낭시에', {
    aliases: [
      '휘낭시에 플레인',
      '휘낭시에 무화과',
      '휘낭시에 발로나초코',
      '휘낭시에 약과',
      '휘낭시에 고르곤졸라크림치즈',
      '휘낭시에 고르곤졸라 크림치즈',
    ],
    group: 'pastry',
  }),
  product('휘낭시에 5종 set(구성변경불가)', {
    aliases: ['휘낭시에 5종 set', '휘낭시에 세트'],
    group: 'pastry-set',
  }),
  product('동물 쿠키', { group: 'cookie' }),
  product('하트초코쿠키', {
    aliases: ['하트 초코 쿠키'],
    group: 'cookie',
  }),
  product('버터링 쿠키', {
    aliases: ['버터링쿠키'],
    group: 'cookie',
  }),
  product('초코동글이 쿠키', {
    aliases: ['초코동글이쿠키'],
    group: 'cookie',
  }),
  product('미니초코동글이 쿠키', {
    aliases: ['미니 초코동글이 쿠키', '미니초코동글이쿠키'],
    group: 'cookie',
  }),
  product('초코링 쿠키', {
    aliases: ['초코링쿠키'],
    group: 'cookie',
  }),
  product('쿠키 세트', {
    aliases: ['쿠키세트'],
    group: 'cookie-set',
  }),
  product('구리볼', { group: 'bread' }),
  product('블루베리 식빵', {
    aliases: ['블루베리식빵'],
    group: 'bread',
  }),
  product('치즈 식빵', {
    aliases: ['치즈식빵'],
    group: 'bread',
  }),
  product('밤식빵', {
    aliases: ['밤 식빵'],
    group: 'bread',
  }),
  product('뜯어먹는 우유 식빵', {
    aliases: ['뜯어먹는우유식빵'],
    group: 'bread',
  }),
  product('마늘빵', { group: 'bread' }),
  product('소금빵', { group: 'bread' }),
  product('단짠소금빵', {
    aliases: ['단짠 소금빵'],
    group: 'bread',
  }),
  product('먹물 소금빵', {
    aliases: ['먹물소금빵'],
    group: 'bread',
  }),
  product('모카소금빵', {
    aliases: ['모카 소금빵'],
    group: 'bread',
  }),
  product('카야버터 소금빵', {
    aliases: ['카야버터소금빵'],
    group: 'bread',
  }),
  product('크로와상', {
    aliases: ['크루아상', 'croissant'],
    group: 'bread',
  }),
  product('플레인 스콘', {
    aliases: ['플레인스콘', '스콘'],
    group: 'scone',
  }),
  product('플레인 치아바타', {
    aliases: ['플레인치아바타', '치아바타'],
    group: 'bread',
  }),
  product('미니바게트', { group: 'bread' }),
  product('딸기 크림치즈 토스트', {
    aliases: ['딸기크림치즈토스트'],
    group: 'toast',
  }),
  product('전남친 블루베리 토스트', {
    aliases: ['전남친블루베리토스트'],
    group: 'toast',
  }),
  product('카스테라', { group: 'cake' }),
  product('앙버터', { group: 'bread' }),
  product('호두 크랜베리 깜빠뉴', {
    aliases: [
      '호두크랜베리깜빠뉴',
      '호두 그래백리 깜빠뉴',
      '호두그래백리깜빠뉴',
      '호두 그래백리 깜파뉴',
      '호두그래백리깜파뉴',
      '호두 크랜베리 캄파뉴',
      '호두크랜베리캄파뉴',
      '호두 크렌베리 깜빠뉴',
      '호두크렌베리깜빠뉴',
      '호두 크랜배리 깜빠뉴',
      '호두크랜배리깜빠뉴',
      '호두 크랜베리 깜파뉴',
      '호두크랜베리깜파뉴',
      '호두 크랜베리 깜빠뉘',
      '호두크랜베리깜빠뉘',
    ],
    group: 'bread',
  }),
  product('아메리카노', {
    aliases: ['아이스아메리카노', '아이스 아메리카노'],
    category: 'drink',
    group: 'coffee',
    countInBakeryTotal: false,
  }),
  product('라떼', {
    aliases: ['카페라떼', 'latte'],
    category: 'drink',
    group: 'coffee',
    countInBakeryTotal: false,
  }),
  product('비건라떼', {
    aliases: ['비건 라떼', '귀리로 만든 라떼'],
    category: 'drink',
    group: 'coffee',
    countInBakeryTotal: false,
  }),
  product('마다가스카르 바로빈 라떼', {
    aliases: ['마다가스카르바닐라빈라떼', '바닐라빈 라떼'],
    category: 'drink',
    group: 'coffee',
    countInBakeryTotal: false,
  }),
  product('콜드브루 원액 1L', {
    aliases: ['콜드브루 원액', '콜드브루원액1L'],
    category: 'goods',
    group: 'bean',
    countInBakeryTotal: false,
  }),
  product('커피원두 (오랑 400g)', {
    aliases: ['커피원두', '커피원두 오랑 400g', '오랑 400g'],
    category: 'goods',
    group: 'bean',
    countInBakeryTotal: false,
  }),
  product('이즈드립', {
    aliases: ['이즈드랍', '이지드립', '이즈 드립'],
    category: 'drink',
    group: 'coffee',
    countInBakeryTotal: false,
  }),
  product('건강빵 닭가슴살 샌드위치', {
    aliases: ['건강빵닭가슴살샌드위치'],
    category: 'review',
    group: 'sandwich',
    countInBakeryTotal: false,
    reviewNeeded: true,
  }),
  product('당근라페 샌드위치 (에그)', {
    aliases: ['당근라페 샌드위치', '당근라페샌드위치에그'],
    category: 'review',
    group: 'sandwich',
    countInBakeryTotal: false,
    reviewNeeded: true,
  }),
  product('당근라페 샌드위치 (잠봉)', {
    aliases: ['당근라페샌드위치잠봉'],
    category: 'review',
    group: 'sandwich',
    countInBakeryTotal: false,
    reviewNeeded: true,
  }),
  product('생크림', {
    category: 'review',
    group: 'dessert',
    countInBakeryTotal: false,
    reviewNeeded: true,
  }),
  product('아보카도 샌드위치', {
    aliases: ['아보카도샌드위치'],
    category: 'review',
    group: 'sandwich',
    countInBakeryTotal: false,
    reviewNeeded: true,
  }),
  product('오늘의 추억', {
    aliases: ['오늘의샐러드'],
    category: 'review',
    group: 'salad',
    countInBakeryTotal: false,
    reviewNeeded: true,
  }),
  product('잠봉뵈르 샌드위치', {
    aliases: [
      '볼빈 스딩워치',
      '볼빈스딩워치',
      '볼빈 샌드위치',
      '잠봉뵈르',
      '잠봉뵈르샌드위치',
      '잠봉뵈르샌드',
      '잠봉 보에르 샌드위치',
      '잠봉보에르샌드위치',
      '잠봉 베르 샌드위치',
      '잠봉베르샌드위치',
      '잠봉 보엘 샌드위치',
      '잠봉보엘샌드위치',
      '잠봉 브엘 샌드위치',
      '잠봉브엘샌드위치',
      '잠봉 샌드위치',
      '잠봉샌드위치',
      '잠봉 샌드',
      '잠봉샌드',
    ],
    category: 'review',
    group: 'sandwich',
    countInBakeryTotal: false,
    reviewNeeded: true,
  }),
  product('ICE', {
    aliases: ['+ ICE', 'ㄴ ICE'],
    category: 'option',
    group: 'temperature',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('HOT', {
    aliases: ['+ HOT', 'ㄴ HOT'],
    category: 'option',
    group: 'temperature',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('고소한 맛', {
    aliases: ['+ 고소한 맛', 'ㄴ 고소한 맛'],
    category: 'option',
    group: 'flavor',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('디카페인', {
    aliases: ['+ 디카페인', 'ㄴ 디카페인'],
    category: 'option',
    group: 'coffee-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('원두블렌드', {
    aliases: ['원두 블렌드', '+ 원두블렌드', 'ㄴ원두블렌드'],
    category: 'option',
    group: 'bean-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('이웃 블렌드(달콤)', {
    aliases: ['이웃블렌드', '이웃블렌드 승'],
    category: 'option',
    group: 'bean-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('플레인', {
    aliases: ['+ 플레인', 'ㄴ 플레인', '플레인 +0', '+0 플레인', '0 플레인', '휘낭시에 플레인', '휘낭시에옵션 플레인'],
    category: 'option',
    group: 'bakery-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('무화과', {
    aliases: ['+ 무화과', 'ㄴ 무화과', '무화과 +400', '무화과 +400원', '+400 무화과', '400 무화과', '휘낭시에 무화과', '휘낭시에옵션 무화과'],
    category: 'option',
    group: 'bakery-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('발로나초코', {
    aliases: ['+ 발로나초코', 'ㄴ 발로나초코', '발로나초코 +800', '발로나초코 +800원', '+800 발로나초코', '800 발로나초코', '휘낭시에 발로나초코', '휘낭시에옵션 발로나초코'],
    category: 'option',
    group: 'bakery-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('약과', {
    aliases: ['+ 약과', 'ㄴ 약과', '약과 +400', '약과 +400원', '+400 약과', '400 약과', '휘낭시에 약과', '휘낭시에옵션 약과'],
    category: 'option',
    group: 'bakery-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('고르곤졸라크림치즈', {
    aliases: ['고르곤졸라 크림치즈', '+ 고르곤졸라크림치즈', 'ㄴ 고르곤졸라크림치즈', '고르곤졸라크림치즈 +600', '고르곤졸라크림치즈 +600원', '고르곤졸라 크림치즈 +600원', '+600 고르곤졸라크림치즈', '600 고르곤졸라크림치즈', '휘낭시에 고르곤졸라크림치즈', '휘낭시에 고르곤졸라 크림치즈', '휘낭시에옵션 고르곤졸라크림치즈'],
    category: 'option',
    group: 'bakery-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
]

const catalogDerivedSeeds = PRODUCT_CATALOG.map((item) =>
  product(item.name, {
    aliases: item.aliases || [],
    category: item.category || 'bakery',
    group: item.category || 'default',
    countInBakeryTotal: item.countInBakeryTotal !== false,
  }),
)

const bakeryMenuDerivedSeeds = BAKERY_MENU.map((name) =>
  product(name, {
    aliases: [name.replace(/\s+/g, '')].filter((alias) => alias !== name),
    category: 'bakery',
    group: 'legacy-menu',
    countInBakeryTotal: true,
  }),
)

export const DEFAULT_PRODUCT_SEEDS = Array.from(
  [...BASE_PRODUCT_SEEDS, ...catalogDerivedSeeds, ...bakeryMenuDerivedSeeds].reduce(
    (map, item) => {
      const key = item.name.replace(/\s+/g, '').toLowerCase()
      const existing = map.get(key)

      if (!existing) {
        map.set(key, {
          ...item,
          aliases: [...new Set((item.aliases || []).filter(Boolean))],
        })
        return map
      }

      map.set(key, {
        ...existing,
        ...item,
        aliases: [...new Set([...(existing.aliases || []), ...(item.aliases || [])].filter(Boolean))],
        countInBakeryTotal:
          item.countInBakeryTotal !== false || existing.countInBakeryTotal !== false,
        reviewNeeded: existing.reviewNeeded || item.reviewNeeded || false,
        optionLike: existing.optionLike || item.optionLike || false,
      })
      return map
    },
    new Map(),
  ).values(),
)

export function getDefaultProductSeeds() {
  return [...DEFAULT_PRODUCT_SEEDS]
}
