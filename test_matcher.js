import { buildBakeryComputation } from './src/lib/bakeryMatcher.js';
const items = [{name: '마늘빵', qty: 1, amount: 4500, isOption: true}];
const result = buildBakeryComputation(items).items;
console.log(JSON.stringify(result, null, 2));
