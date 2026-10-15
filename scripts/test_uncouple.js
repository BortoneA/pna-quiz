const fs = require('fs');
const path = require('path');

const targetFilePath = path.join(__dirname, '..', 'banco_questoes_pna_recategorizado_4a_edicao.json');
const data = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));

// Regex to find start of next clinical vignette in combined text
// e.g. "RealAltE. Um homem de 38 anos..."
const VIGNETTE_START = /\s+(?=(?:Um|Uma|O|A|Os|As|Num|Numa|No|Na|Nos|Nas|Durante|Após|Em|Face|Perante|Considerando|Qual)\s+(?:homem|mulher|recém-nascido|criança|rapaz|rapariga|menino|menina|lactente|adolescente|jovem|idoso|idosa|bebé|doente|paciente|senhor|senhora|bombeir|médic|estudante|estagiári|enfermeir|grávida|primigesta|multípara|ano|anos|mês|meses|semana|semanas|dia|dias|de|da|do|dos|das|com|que|é|foi|vem|recorre|apresenta|encontra|está|observad|trazid|assistid|internad|admitid|consult|urgênci|internamento|sala|parto|exame|avaliação|acidente))/i;

let failCount = 0;
const results = [];

for (let i = 450; i < 599; i++) {
  if (i === 524) continue; // Boundary between Q75 and Q76

  const cur = data.questoes[i];
  const next = data.questoes[i + 1];

  const text = cur.alternativas.E;
  
  // Find where the clinical question begins
  // It is usually after a sentence ending with '.' and followed by a vignette start
  const match = text.match(VIGNETTE_START);
  if (!match) {
    failCount++;
    console.log(`FAIL at Q${cur.numero} (Index ${i}):`);
    console.log(`  "${text.slice(0, 100)}..."\n`);
  } else {
    const splitIndex = match.index;
    const realAltE = text.slice(0, splitIndex).trim();
    const realNextEnunciado = text.slice(splitIndex).trim();
    results.push({
      qCur: cur.numero,
      qNext: next.numero,
      realAltE,
      nextEnunciadoSnippet: realNextEnunciado.slice(0, 50)
    });
  }
}

console.log(`Total questions processed: ${results.length}`);
console.log(`Total failed: ${failCount}`);
if (results.length > 0) {
  console.log('\nSample results (first 5):');
  console.log(results.slice(0, 5));
  console.log('\nSample results (around Q100-Q105):');
  console.log(results.filter(r => r.qCur >= 99 && r.qCur <= 104));
  console.log('\nSample results (last 5):');
  console.log(results.slice(-5));
}
