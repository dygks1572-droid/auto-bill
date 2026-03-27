import { isOptionLineName, normalizeText, matchCatalogItem } from './src/lib/bakeryMatcher.js';
import { DEFAULT_PRODUCT_SEEDS } from './src/lib/bakerySeedData.js';

console.log('isOptionLineName:', isOptionLineName('잠봉뵈르 샌드위치'));
const matched1 = matchCatalogItem('잠봉뵈르 샌드위치', DEFAULT_PRODUCT_SEEDS);
console.log('matched?.optionLike for 잠봉뵈르 샌드위치:', matched1?.optionLike);

console.log('isOptionLineName:', isOptionLineName('이지드립'));
const matched2 = matchCatalogItem('이지드립', DEFAULT_PRODUCT_SEEDS);
console.log('matched?.optionLike for 이지드립:', matched2?.optionLike);
