const fs = require('fs');
const path = require('path');

const targetFilePath = path.join(__dirname, '..', 'banco_questoes_pna_recategorizado_4a_edicao.json');
const backupFilePath = path.join(__dirname, '..', 'banco_questoes_pna_recategorizado_4a_edicao.backup.json');

console.log('--- Orthographic Code Review & Correction Tool ---');
console.log('Target file:', targetFilePath);

if (!fs.existsSync(backupFilePath)) {
  console.log('Creating backup at:', backupFilePath);
  fs.copyFileSync(targetFilePath, backupFilePath);
} else {
  console.log('Backup already exists at:', backupFilePath);
}

const rawContent = fs.readFileSync(targetFilePath, 'utf8');
const data = JSON.parse(rawContent);

const VALID_STA_TERMS = [
  'prostátic', 'ortostátic', 'metastátic', 'hemostátic', 'peristáltic',
  'citostátic', 'hidrostátic', 'tuberculostátic', 'eustáquio', 'colestátic',
  'citoestátic', 'bacteriostátic'
];

function isLegitSta(token) {
  const lower = token.toLowerCase();
  for (const term of VALID_STA_TERMS) {
    if (lower.includes(term)) return true;
  }
  if (/^está(-se|-me|-te|-nos|-vos|-lo|-la|-los|-las)?$/i.test(lower)) {
    return true;
  }
  return false;
}

function cleanOcrArtifacts(text, isAlternative = false) {
  if (!text) return text;
  let t = text;

  // Clean exam instructions prelude if present
  if (t.includes('As respostas assinaladas com sinais que não os acima indicados')) {
    const cutPos = t.indexOf('sob pena de anulação da respetiva Prova.');
    if (cutPos !== -1) {
      t = t.slice(cutPos + 40)
        .replace(/^\s*(?:PNA\s*—\s*Prova Nacional de Acesso[^\n]*\d{4}|www\.academiapna\.com\s*Simulação\s*APNA)\s*/i, '')
        .trim();
    }
  }

  // Remove printing colophon if present
  t = t.replace(/Impressão e acabamento Imprensa Nacional-Casa da Moeda[^.\n]*\.?/gi, '');

  // Strip website watermark from alternatives or text
  t = t.replace(/\s*www\.academiapna\.com(?:\s*Simulaç[ãa]o\s*APNA)?\s*$/gi, '');
  t = t.replace(/\bwww\.academiapna\.com\b\s*(?:Simulaç[ãa]o\s*APNA)?/gi, '');

  // Hyphenated word broken across page break: "descartam-\n\n# Page 08\n\nse" -> "descartam-se"
  t = t.replace(/([\p{L}]+)-\s*\n*#\s*Page\s*\d*\s*\n*([\p{L}]+)/gu, '$1-$2');

  // OCR Page breaks inside text: "\n\n# Page 02\n\n" -> " "
  t = t.replace(/\s*\n*#\s*Page\s*\d*\s*\n*/gi, ' ');

  // Trailing page markers: e.g. "45 # Page 46 # Page 47 # Page 48" or "3 # Page"
  t = t.replace(/\s*\d*(?:\s*#\s*Page\s*\d*)+.*$/gi, '');
  t = t.replace(/#\s*Page\b/gi, '');

  return t.trim();
}

function fixSpellingAndCorruption(text, isAlternative = false) {
  if (!text) return text;
  let t = cleanOcrArtifacts(text, isAlternative);

  // Specific word corrections
  t = t.replace(/\bmestáástases\b/gi, (m) => m[0] === 'M' ? 'Metástases' : 'metástases');
  t = t.replace(/\bdestáinatéário\b/gi, (m) => m[0] === 'D' ? 'Destinatário' : 'destinatário');
  t = t.replace(/\bpetéquinas\b/gi, 'petéquias');
  t = t.replace(/\bsistémicod\b/gi, 'sistémico');
  t = t.replace(/\bpróstatéra\b/gi, 'próstata');
  t = t.replace(/\bpróstatéa\b/gi, 'próstata');
  t = t.replace(/\bCreaté\b/g, 'Creat');

  // tér / tr corruptions
  t = t.replace(/\bquatéro\b/gi, (m) => m[0] === 'Q' ? 'Quatro' : 'quatro');
  t = t.replace(/\bpatérão\b/gi, (m) => m[0] === 'P' ? 'Patrão' : 'patrão');
  t = t.replace(/atéravés/gi, (m) => m[0] === 'A' ? 'Através' : 'através');
  t = t.replace(/atéravess/gi, (m) => m[0] === 'A' ? 'Atravess' : 'atravess');
  t = t.replace(/psiquiatér/gi, (m) => m[0] === 'P' ? 'Psiquiatr' : 'psiquiatr');
  t = t.replace(/psiquatér/gi, (m) => m[0] === 'P' ? 'Psiquiatr' : 'psiquiatr');
  t = t.replace(/pediatér/gi, (m) => m[0] === 'P' ? 'Pediatr' : 'pediatr');
  t = t.replace(/pedopsiquiatér/gi, (m) => m[0] === 'P' ? 'Pedopsiquiatr' : 'pedopsiquiatr');
  t = t.replace(/neuropediatér/gi, (m) => m[0] === 'N' ? 'Neuropediatr' : 'neuropediatr');
  t = t.replace(/ortogeriatér/gi, (m) => m[0] === 'O' ? 'Ortogeriatr' : 'ortogeriatr');
  t = t.replace(/atér[oó]f/gi, (m) => m[0] === 'A' ? 'Atróf' : 'atróf');
  t = t.replace(/atér[aá]s\b/gi, (m) => m[0] === 'A' ? 'Atrás' : 'atrás');
  t = t.replace(/atéras/gi, (m) => m[0] === 'A' ? 'Atras' : 'atras');
  t = t.replace(/cicatériz/gi, (m) => m[0] === 'C' ? 'Cicatriz' : 'cicatriz');
  t = t.replace(/cicatéric/gi, (m) => m[0] === 'C' ? 'Cicatric' : 'cicatric');
  t = t.replace(/atéribu[ií]/gi, (m) => {
    const cap = m[0] === 'A';
    return (cap ? 'A' : 'a') + (m.includes('í') ? 'tribuí' : 'tribui');
  });
  t = t.replace(/atéropin/gi, (m) => m[0] === 'A' ? 'Atropin' : 'atropin');
  t = t.replace(/atéropel/gi, (m) => m[0] === 'A' ? 'Atropel' : 'atropel');
  t = t.replace(/atér[eé]s/gi, (m) => m[0] === 'A' ? 'Atrês' : 'atrês');
  t = t.replace(/atéresia/gi, (m) => m[0] === 'A' ? 'Atresia' : 'atresia');
  t = t.replace(/atérito/gi, (m) => m[0] === 'A' ? 'Atrito' : 'atrito');
  t = t.replace(/atéraíd/gi, (m) => m[0] === 'A' ? 'Atraíd' : 'atraíd');
  t = t.replace(/atéraç/gi, (m) => m[0] === 'A' ? 'Atraç' : 'atraç');
  t = t.replace(/atéraumátic/gi, (m) => m[0] === 'A' ? 'Atraumátic' : 'atraumátic');
  t = t.replace(/atéralgi/gi, (m) => m[0] === 'A' ? 'Artralgi' : 'artralgi');
  t = t.replace(/\batérial\b/gi, (m) => m[0] === 'A' ? 'Arterial' : 'arterial');
  t = t.replace(/\bartérial\b/gi, (m) => m[0] === 'A' ? 'Arterial' : 'arterial');
  t = t.replace(/atéroplast/gi, (m) => m[0] === 'A' ? 'Artroplast' : 'artroplast');
  t = t.replace(/monoatérit/gi, (m) => m[0] === 'M' ? 'Monoartrit' : 'monoartrit');
  t = t.replace(/atérioventric/gi, (m) => m[0] === 'A' ? 'Atrioventric' : 'atrioventric');
  t = t.replace(/sinoatérial/gi, (m) => m[0] === 'S' ? 'Sinoatrial' : 'sinoatrial');
  t = t.replace(/hiponatérem/gi, 'hiponatrem');
  t = t.replace(/hipernatérem/gi, 'hipernatrem');
  t = t.replace(/hiponatérém/gi, 'hiponatrém');
  t = t.replace(/hipernatérém/gi, 'hipernatrém');
  t = t.replace(/natérem/gi, 'natrem');
  t = t.replace(/natérém/gi, 'natrém');
  t = t.replace(/natériur/gi, 'natriur');
  t = t.replace(/iatérogen/gi, (m) => m[0] === 'I' ? 'Iatrogen' : 'iatrogen');
  t = t.replace(/iatérogén/gi, (m) => m[0] === 'I' ? 'Iatrogén' : 'iatrogén');
  t = t.replace(/iatérogên/gi, (m) => m[0] === 'I' ? 'Iatrogén' : 'iatrogén');
  t = t.replace(/sumatériptan/gi, 'sumatriptan');
  t = t.replace(/ipratérópi/gi, 'ipratrópi');
  t = t.replace(/ipatérópi/gi, 'ipratrópi');
  t = t.replace(/dabigatéran/gi, 'dabigatran');
  t = t.replace(/gonodatéropin/gi, 'gonadotropin');
  t = t.replace(/intratéraque/gi, 'intratraque');
  t = t.replace(/paratéraque/gi, 'paratraque');
  t = t.replace(/contratéransferên/gi, 'contratransferên');
  t = t.replace(/teatéro/gi, (m) => m[0] === 'T' ? 'Teatro' : 'teatro');
  t = t.replace(/anfiteatéro/gi, (m) => m[0] === 'A' ? 'Anfiteatro' : 'anfiteatro');
  t = t.replace(/alcatéroad/gi, (m) => m[0] === 'A' ? 'Alcatroad' : 'alcatroad');
  t = t.replace(/azatérioprin/gi, (m) => m[0] === 'A' ? 'Azatioprin' : 'azatioprin');
  t = t.replace(/policitémi/gi, (m) => m[0] === 'P' ? 'Policitemi' : 'policitemi');
  t = t.replace(/maioriatériamente/gi, 'maioritariamente');

  // at-consonant corruptions
  t = t.replace(/atélet/gi, (m) => m[0] === 'A' ? 'Atlet' : 'atlet');
  t = t.replace(/transatélântic/gi, 'transatlântic');
  t = t.replace(/atélanto/gi, (m) => m[0] === 'A' ? 'Atlanto' : 'atlanto');
  t = t.replace(/triatél/gi, (m) => m[0] === 'T' ? 'Triatl' : 'triatl');
  t = t.replace(/batémotrop/gi, 'batmotrop');

  // English loanwords / eponyms
  t = t.replace(/osgood-schlatéter/gi, 'osgood-schlatter');
  t = t.replace(/schatézki/gi, 'schatzki');
  t = t.replace(/shatézki/gi, 'schatzki');
  t = t.replace(/donatéh-landsteiner/gi, 'donath-landsteiner');
  t = t.replace(/klatéskin/gi, 'klatskin');
  t = t.replace(/fitzpatérick/gi, 'fitzpatrick');
  t = t.replace(/patérick-faber/gi, 'patrick-faber');
  t = t.replace(/trelaté/gi, 'trélat');
  t = t.replace(/life-threaténing/gi, 'life-threatening');
  t = t.replace(/treatément/gi, 'treatment');
  t = t.replace(/breatéhing/gi, 'breathing');
  t = t.replace(/mismatéch/gi, 'mismatch');
  t = t.replace(/batétle/gi, 'battle');
  t = t.replace(/deatéh/gi, 'death');
  t = t.replace(/dip-platéteau/gi, 'dip-plateau');
  t = t.replace(/up-beaté/gi, 'up-beat');
  t = t.replace(/fatéty/gi, 'fatty');
  t = t.replace(/psychiatéry/gi, 'psychiatry');
  t = t.replace(/febuxostaté/gi, 'febuxostate');
  t = t.replace(/orlistaté/gi, 'orlistat');

  // Generic té + vowel
  t = t.replace(/latéência/gi, (m) => m[0] === 'L' ? 'Latência' : 'latência');
  t = t.replace(/patéência/gi, (m) => m[0] === 'P' ? 'Patência' : 'patência');
  t = t.replace(/gutatéta/gi, 'gutata');
  t = t.replace(/membranoproliferatéva/gi, 'membranoproliferativa');
  t = t.replace(/tratémento/gi, (m) => m[0] === 'T' ? 'Tratamento' : 'tratamento');

  // té followed by vowel
  t = t.replace(/té([aeiouáéíóú])/gi, (m, v) => (m[0] === 'T' ? 'T' : 't') + v);

  // stá corruptions
  t = t.replace(/estáá/gi, (m) => m[0] === 'E' ? 'Está' : 'está');
  t = t.replace(/estáádio/gi, (m) => m[0] === 'E' ? 'Estádio' : 'estádio');
  t = t.replace(/estáágio/gi, (m) => m[0] === 'E' ? 'Estágio' : 'estágio');
  t = t.replace(/estáência/gi, (m) => m[0] === 'E' ? 'Estância' : 'estância');
  t = t.replace(/estáéreis/gi, (m) => m[0] === 'E' ? 'Estéreis' : 'estéreis');
  t = t.replace(/estáérico/gi, (m) => m[0] === 'E' ? 'Estérico' : 'estérico');
  t = t.replace(/estáétic/gi, (m) => m[0] === 'E' ? 'Estétic' : 'estétic');
  t = t.replace(/estáúpido/gi, (m) => m[0] === 'E' ? 'Estúpido' : 'estúpido');
  t = t.replace(/estáômago/gi, (m) => m[0] === 'E' ? 'Estômago' : 'estômago');
  t = t.replace(/estáímulo/gi, (m) => m[0] === 'E' ? 'Estímulo' : 'estímulo');
  t = t.replace(/vestáígio/gi, (m) => m[0] === 'V' ? 'Vestígio' : 'vestígio');
  t = t.replace(/testáículo/gi, (m) => m[0] === 'T' ? 'Testículo' : 'testículo');
  t = t.replace(/anestáésic/gi, (m) => m[0] === 'A' ? 'Anestésic' : 'anestésic');
  t = t.replace(/parestáésic/gi, (m) => m[0] === 'P' ? 'Parestésic' : 'parestésic');
  t = t.replace(/cenestáésic/gi, (m) => m[0] === 'C' ? 'Cenestésic' : 'cenestésic');

  // Generic stá replacement for non-legitimate words
  t = t.replace(/[\p{L}\p{M}\-]+/gu, (token) => {
    if (!/stá/i.test(token)) return token;
    if (isLegitSta(token)) return token;

    let fixed = token.replace(/stá([a-zà-ÿ])/gi, (m, letter) => (m[0] === 'S' ? 'St' : 'st') + letter);
    fixed = fixed.replace(/stá$/gi, (m) => m[0] === 'S' ? 'St' : 'st');
    return fixed;
  });

  return t;
}

let modifiedQuestions = 0;
let modifiedEnunciados = 0;
let modifiedExplicacoes = 0;
let modifiedAlternativas = 0;
let modifiedDoencas = 0;

data.questoes.forEach(q => {
  let changed = false;

  if (q.enunciado) {
    const after = fixSpellingAndCorruption(q.enunciado);
    if (after !== q.enunciado) {
      q.enunciado = after;
      modifiedEnunciados++;
      changed = true;
    }
  }

  if (q.explicacao) {
    const after = fixSpellingAndCorruption(q.explicacao);
    if (after !== q.explicacao) {
      q.explicacao = after;
      modifiedExplicacoes++;
      changed = true;
    }
  }

  if (q.doenca_ou_conjunto_de_doencas) {
    const after = fixSpellingAndCorruption(q.doenca_ou_conjunto_de_doencas);
    if (after !== q.doenca_ou_conjunto_de_doencas) {
      q.doenca_ou_conjunto_de_doencas = after;
      modifiedDoencas++;
      changed = true;
    }
  }

  if (q.alternativas) {
    for (const [key, val] of Object.entries(q.alternativas)) {
      const after = fixSpellingAndCorruption(val, true);
      if (after !== val) {
        q.alternativas[key] = after;
        modifiedAlternativas++;
        changed = true;
      }
    }
  }

  if (changed) modifiedQuestions++;
});

console.log('\n--- Modification Statistics ---');
console.log(`Total questions in dataset: ${data.questoes.length}`);
console.log(`Questions modified: ${modifiedQuestions} (${((modifiedQuestions/data.questoes.length)*100).toFixed(2)}%)`);
console.log(`Enunciados modified: ${modifiedEnunciados}`);
console.log(`Explicações modified: ${modifiedExplicacoes}`);
console.log(`Alternativas modified: ${modifiedAlternativas}`);
console.log(`Doenças modified: ${modifiedDoencas}`);

// Write updated JSON
console.log('\nSaving sanitized dataset to:', targetFilePath);
fs.writeFileSync(targetFilePath, JSON.stringify(data, null, 2), 'utf8');

// Verification checks on file
console.log('\n--- Verification on Saved File ---');
const reloaded = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));
console.log(`Reloaded questions count: ${reloaded.questoes.length}`);

let remainingTeVowel = 0;
let remainingNonLegitSta = 0;
let remainingPageArtifacts = 0;
let remainingAcademiaWatermark = 0;

reloaded.questoes.forEach(q => {
  const full = JSON.stringify(q);
  const m1 = full.match(/té[aeiouáéíóú]/gi);
  if (m1) remainingTeVowel += m1.length;

  const words = full.match(/[\p{L}\p{M}\-]+/gu) || [];
  words.forEach(w => {
    if (/stá/i.test(w) && !isLegitSta(w)) remainingNonLegitSta++;
  });

  const m3 = full.match(/#\s*Page/gi);
  if (m3) remainingPageArtifacts += m3.length;

  const m4 = full.match(/www\.academiapna\.com/gi);
  if (m4) remainingAcademiaWatermark += m4.length;
});

console.log(`Remaining té + vowel: ${remainingTeVowel}`);
console.log(`Remaining non-legit stá: ${remainingNonLegitSta}`);
console.log(`Remaining # Page artifacts: ${remainingPageArtifacts}`);
console.log(`Remaining www.academiapna.com watermarks: ${remainingAcademiaWatermark}`);

if (remainingTeVowel === 0 && remainingNonLegitSta === 0 && remainingPageArtifacts === 0 && remainingAcademiaWatermark === 0) {
  console.log('\nSUCCESS: 100% of target corruptions and OCR artifacts eliminated!');
} else {
  console.warn('\nWARNING: Some patterns remain.');
}
