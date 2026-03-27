import { OPTION_NAMES } from './src/lib/bakerySeedData.js';
import { normalizeText } from './src/lib/bakeryMatcher.js';

const normalized = normalizeText('잠봉뵈르 샌드위치');
for (const name of OPTION_NAMES) {
  const normalizedOption = normalizeText(name);
  if (normalizedOption === normalized || normalized.endsWith(normalizedOption)) {
    console.log("MATCHED:", name, "normalizedOption:", normalizedOption);
  }
}
