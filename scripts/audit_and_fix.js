const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'banco_questoes_pna_recategorizado_4a_edicao.json');
console.log('Reading file:', filePath);
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// 1. Scan OCR artifacts like "Impressão e acabamento", "# Page", "Page \d+"
const ocrFooters = new Set();
const pagePatterns = new Set();

data.questoes.forEach(q => {
  const full = JSON.stringify(q);
  const m1 = full.match(/Impressão e acabamento[^"]*/gi);
  if (m1) m1.forEach(x => ocrFooters.add(x));
  
  const m2 = full.match(/(?:#\s*Page\s*\d+|\d+\s*#\s*Page|#\s*Page)/gi);
  if (m2) m2.forEach(x => pagePatterns.add(x));
});

console.log('--- OCR Footers (Impressão e acabamento) ---');
console.log(Array.from(ocrFooters));

console.log('\n--- Page Patterns sample ---');
console.log(Array.from(pagePatterns).slice(0, 30));
