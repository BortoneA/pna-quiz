const fs = require('fs');
const path = require('path');

const targetFilePath = path.join(__dirname, '..', 'banco_questoes_pna_recategorizado_4a_edicao.json');
const backupFilePath = path.join(__dirname, '..', 'banco_questoes_pna_recategorizado_4a_edicao.pass1.backup.json');

console.log('--- Second-Pass Orthographic & Structural Review Tool ---');
console.log('Target file:', targetFilePath);

if (!fs.existsSync(backupFilePath)) {
  console.log('Creating pass-1 backup at:', backupFilePath);
  fs.copyFileSync(targetFilePath, backupFilePath);
}

const data = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));

// ==========================================
// 1. UNCOUPLE PNA 2021 CASCADE (Indices 450 to 599)
// ==========================================
console.log('\n[1/4] Uncoupling PNA 2021 cascade concatenation...');

const VIGNETTE_START = /\s+(?=(?:Um|Uma|O|A|Os|As|Num|Numa|No|Na|Nos|Nas|Durante|Após|Em|Face|Perante|Considerando|Qual)\s+(?:homem|mulher|recém-nascido|criança|rapaz|rapariga|menino|menina|lactente|adolescente|jovem|idoso|idosa|bebé|doente|paciente|senhor|senhora|bombeir|médic|estudante|estagiári|enfermeir|grávida|primigesta|multípara|ano|anos|mês|meses|semana|semanas|dia|dias|de|da|do|dos|das|com|que|é|foi|vem|recorre|apresenta|encontra|está|observad|trazid|assistid|internad|admitid|consult|urgênci|internamento|sala|parto|exame|avaliação|acidente))/i;

let uncoupledCount = 0;

for (let i = 450; i < 599; i++) {
  if (i === 524) {
    // Q75: end of Parte I. Clean alternative E.
    data.questoes[i].alternativas.E = data.questoes[i].alternativas.E
      .replace(/\s*A\.\s*2021\s*$/i, '')
      .trim();
    continue;
  }

  const cur = data.questoes[i];
  const next = data.questoes[i + 1];

  const text = cur.alternativas.E;
  const match = text.match(VIGNETTE_START);

  if (match) {
    const splitIndex = match.index;
    const realAltE = text.slice(0, splitIndex).trim();
    const realNextEnunciado = text.slice(splitIndex).trim();

    cur.alternativas.E = realAltE;
    next.enunciado = realNextEnunciado;
    uncoupledCount++;
  } else {
    console.warn(`Warning: Could not uncouple Q${cur.numero} at index ${i}`);
  }
}

// Clean Q150 alternative E
if (data.questoes[599] && data.questoes[599].alternativas && data.questoes[599].alternativas.E) {
  data.questoes[599].alternativas.E = data.questoes[599].alternativas.E
    .replace(/\s*A\.\s*2021\s*$/i, '')
    .trim();
}

console.log(`  -> Uncoupled ${uncoupledCount} questions successfully in PNA 2021.`);

// ==========================================
// 2. FIX SPECIFIC ANOMALOUS TAXONOMY ENTRIES
// ==========================================
console.log('\n[2/4] Sanitizing anomalous taxonomy topics...');
data.questoes.forEach(q => {
  if (q.id === 'PNA2021-101' || q.doenca_ou_conjunto_de_doencas === '6') {
    q.doenca_ou_conjunto_de_doencas = 'Índice de Apgar e Reanimação Neonatal';
  }
  if (q.id === 'PNA2022-106' || q.doenca_ou_conjunto_de_doencas === '7') {
    q.doenca_ou_conjunto_de_doencas = 'Escala de Coma de Glasgow e Traumatismo Cranioencefálico (TCE)';
  }
  if (q.id === 'PNA2024-030' || q.doenca_ou_conjunto_de_doencas === 'Aplicar estrogénio vaginal') {
    q.doenca_ou_conjunto_de_doencas = 'Infeções Urinárias Recorrentes e Síndrome Geniturinária da Menopausa';
  }
});

// ==========================================
// 3. DETAILED TEXT SANITIZER & SPELL CHECKER
// ==========================================
console.log('\n[3/4] Applying typographical, glyph, and spelling corrections...');

function sanitizeText(str) {
  if (!str) return str;
  let t = str;

  // Private Use Area / Symbol font glyphs:
  t = t.replace(/\uF067/g, 'γ'); // Greek small gamma
  t = t.replace(/\uF0B0/g, '°'); // Degree sign
  t = t.replace(/\uF0E0/g, '→'); // Right arrow

  // Floating acute accents and broken words:
  t = t.replace(/\bap´os\b/gi, 'após');
  t = t.replace(/\bEu ´que\b/gi, 'Eu é que');
  t = t.replace(/\binflamato´oios\b/gi, 'inflamatórios');
  t = t.replace(/\bSSRI´s\b/g, 'SSRIs');
  t = t.replace(/\bSNRI´s\b/g, 'SNRIs');
  t = t.replace(/\bAINE´s\b/g, 'AINEs');
  t = t.replace(/\bNOC´s\b/g, 'NOCs');
  t = t.replace(/\bmédium´s\b/gi, 'médiuns');

  // OCR question marks in medical units and words:
  t = t.replace(/\(\?CIN2\+\)/g, '(≥CIN2+)');
  t = t.replace(/\?g\/dL/g, 'μg/dL');
  t = t.replace(/\?U\/mL/g, 'μU/mL');
  t = t.replace(/\/\?L/g, '/μL');
  t = t.replace(/\bhemito\?races\b/gi, 'hemitóraces');
  t = t.replace(/\bpro\?ximo\b/gi, 'próximo');
  t = t.replace(/\bgesta\?o\b/gi, 'gestão');
  t = t.replace(/\be\? o pro\?ximo\b/gi, 'é o próximo');
  t = t.replace(/\bassociada\?Tendo\b/g, 'associada? Tendo');

  // Typos with repeated characters / numbers:
  t = t.replace(/\b3m5g\/24h\b/g, '3,5 g/24h');
  t = t.replace(/\btesticular4mL\b/g, 'testicular > 4 mL');
  t = t.replace(/T3Sem adenopatias: N0Sem metástases: M0Assim/g, 'T3 Sem adenopatias: N0 Sem metástases: M0 Assim');
  t = t.replace(/\bdepresssão\b/gi, (m) => m[0] === 'D' ? 'Depressão' : 'depressão');
  t = t.replace(/\brepercusssão\b/gi, 'repercussão');
  t = t.replace(/\bossseo\b/gi, (m) => m[0] === 'O' ? 'Ósseo' : 'ósseo');
  t = t.replace(/\bhemorrragia\b/gi, 'hemorragia');
  t = t.replace(/\bstreptococccus\b/gi, 'streptococcus');
  t = t.replace(/\bhiperrreflexia\b/gi, 'hiperreflexia');
  t = t.replace(/\brepreeencher\b/gi, 'repreencher');
  t = t.replace(/\bexcessso\b/gi, 'excesso');
  t = t.replace(/\bhierrratividade\b/gi, 'hiperreatividade');
  t = t.replace(/\bcorrreta\b/gi, 'correta');
  t = t.replace(/\bincorrreta\b/gi, 'incorreta');
  t = t.replace(/\bogttt\b/gi, 'OGTT');
  t = t.replace(/\bmmmol\b/gi, 'mmol');
  t = t.replace(/\bsub,trocantéricas\b/gi, 'subtrocantéricas');
  t = t.replace(/\bencontra\.se\b/g, 'encontra-se');
  t = t.replace(/\bsentir\.se\b/g, 'sentir-se');
  t = t.replace(/\bác\.clavulânico\b/gi, 'ác. clavulânico');
  t = t.replace(/\bSIQIIITIII\b/g, 'S1Q3T3');

  // Double punctuation:
  t = t.replace(/,,+/g, ',');
  t = t.replace(/(?<!\.)\.\.(?!\.)/g, '.');

  // Missing space after sentence periods: e.g. "refeições.Ao exame" -> "refeições. Ao exame"
  t = t.replace(/([\p{L}]{2,})\.([A-ZÀ-Ý][\p{L}]+)/gu, '$1. $2');

  // Comma without space: e.g. "progressivo,acompanhada" -> "progressivo, acompanhada"
  t = t.replace(/([\p{L}]{2,}),([\p{L}]{2,})/gu, '$1, $2');

  // Normalize multiple spaces into a single space (preserving newlines)
  t = t.replace(/[ \t]{2,}/g, ' ');

  return t.trim();
}

let modifiedEnunciados = 0;
let modifiedExplicacoes = 0;
let modifiedAlternativas = 0;
let modifiedQuestions = 0;

data.questoes.forEach(q => {
  let changed = false;

  if (q.enunciado) {
    const after = sanitizeText(q.enunciado);
    if (after !== q.enunciado) {
      q.enunciado = after;
      modifiedEnunciados++;
      changed = true;
    }
  }

  if (q.explicacao) {
    const after = sanitizeText(q.explicacao);
    if (after !== q.explicacao) {
      q.explicacao = after;
      modifiedExplicacoes++;
      changed = true;
    }
  }

  if (q.doenca_ou_conjunto_de_doencas) {
    const after = sanitizeText(q.doenca_ou_conjunto_de_doencas);
    if (after !== q.doenca_ou_conjunto_de_doencas) {
      q.doenca_ou_conjunto_de_doencas = after;
      changed = true;
    }
  }

  if (q.alternativas) {
    for (const [k, v] of Object.entries(q.alternativas)) {
      const after = sanitizeText(v);
      if (after !== v) {
        q.alternativas[k] = after;
        modifiedAlternativas++;
        changed = true;
      }
    }
  }

  if (changed) modifiedQuestions++;
});

console.log('\n--- Pass 2 Modification Statistics ---');
console.log(`Questions modified: ${modifiedQuestions}`);
console.log(`Enunciados modified: ${modifiedEnunciados}`);
console.log(`Explicações modified: ${modifiedExplicacoes}`);
console.log(`Alternativas modified: ${modifiedAlternativas}`);

// ==========================================
// 4. SAVE AND VERIFY
// ==========================================
console.log('\n[4/4] Saving updated dataset to file...');
fs.writeFileSync(targetFilePath, JSON.stringify(data, null, 2), 'utf8');

// Synchronize snapshot file as well
const syncSnapshotPath = path.join(__dirname, '..', 'banco_questoes_pna_sync_1787792260576.json');
fs.copyFileSync(targetFilePath, syncSnapshotPath);
console.log('Snapshot sync file updated.');

// Run deep verification
const reloaded = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));
console.log(`\nVerification on reloaded file (${reloaded.questoes.length} questions):`);

let countPrivateUse = 0;
let countDoubleDot = 0;
let countDoubleComma = 0;
let countQuestionMarkInWord = 0;
let countCascadeRemain = 0;

for (let i = 0; i < reloaded.questoes.length - 1; i++) {
  const cur = reloaded.questoes[i];
  const next = reloaded.questoes[i + 1];

  const full = JSON.stringify(cur);
  if (/[\uF000-\uF8FF]/.test(full)) countPrivateUse++;
  if (/(?<!\.)\.\.(?!\.)/.test(full)) countDoubleDot++;
  if (/,,/.test(full)) countDoubleComma++;
  if (/[\p{L}]\?[\p{L}]/u.test(full)) countQuestionMarkInWord++;

  if (cur.ano_da_prova === 2021 && next.ano_da_prova === 2021) {
    if (cur.alternativas && cur.alternativas.E) {
      const nextSnip = next.enunciado.slice(0, 30);
      if (cur.alternativas.E.includes(nextSnip) && nextSnip.length > 10) {
        countCascadeRemain++;
      }
    }
  }
}

console.log(`- Private Use Area glyphs remaining: ${countPrivateUse}`);
console.log(`- Double dots (..) remaining: ${countDoubleDot}`);
console.log(`- Double commas (,,) remaining: ${countDoubleComma}`);
console.log(`- Question mark in words remaining: ${countQuestionMarkInWord}`);
console.log(`- PNA 2021 cascade concatenation remaining: ${countCascadeRemain}`);

console.log('\nSUCCESS: Second-pass review completed!');
