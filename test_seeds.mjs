import { DEFAULT_PRODUCT_SEEDS } from './src/lib/bakerySeedData.js';

const target1 = DEFAULT_PRODUCT_SEEDS.find(s => s.name === '잠봉뵈르 샌드위치');
const target2 = DEFAULT_PRODUCT_SEEDS.find(s => s.name === '호두 크랜베리 깜빠뉴');
const target3 = DEFAULT_PRODUCT_SEEDS.find(s => s.name === '이지드립');

console.log('잠봉뵈르:', JSON.stringify(target1, null, 2));
console.log('호두:', JSON.stringify(target2, null, 2));
console.log('이지드립:', JSON.stringify(target3, null, 2));
