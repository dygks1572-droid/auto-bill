import { 
  isOptionLineName, 
  matchCatalogItem, 
  buildBakeryComputation 
} from './src/lib/bakeryMatcher.js';

const raw = { name: "잠봉블르 샌드위치", qty: 1, amount: 6900, isOption: false, optionCharge: 0 };
const items = buildBakeryComputation([raw]);

console.log("Result:", JSON.stringify(items.items, null, 2));

const lookupName = "잠봉뵈르 샌드위치"; // since correction transforms it
console.log("optionLine:", isOptionLineName(lookupName));
const matched = matchCatalogItem(lookupName);
console.log("matched?.optionLike:", matched?.optionLike);
