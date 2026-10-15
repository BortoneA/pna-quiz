const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'banco_questoes_pna_recategorizado_4a_edicao.json');
const origData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Import functions from a clean module
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

function cleanOcrArtifacts(text) {
  if (!text) return text;
  let t = text;
  t = t.replace(/Impressão e acabamento Imprensa Nacional-Casa da Moeda[^.\n]*\.?/gi, '');
  t = t.replace(/([\p{L}]+)-\s*\n+#\s*Page\s*\d+\s*\n+([\p{L}]+)/gu, '$1-$2');
  t = t.replace(/\s*\n+#\s*Page\s*\d+\s*\n+\s*/gi, ' ');
  t = t.replace(/\s*\d+\s*#\s*Page\b/gi, '');
  t = t.replace(/#\s*Page\s*\d+\b/gi, '');
  t = t.replace(/#\s*Page\b/gi, '');
  return t.trim();
}

function fixSpellingAndCorruption(text) {
  if (!text) return text;
  let t = text;
  t = cleanOcrArtifacts(t);

  t = t.replace(/\bmestáástases\b/gi, (m) => m[0] === 'M' ? 'Metástases' : 'metástases');
  t = t.replace(/\bdestáinatéário\b/gi, (m) => m[0] === 'D' ? 'Destinatário' : 'destinatário');
  t = t.replace(/\bpetéquinas\b/gi, 'petéquias');
  t = t.replace(/\bsistémicod\b/gi, 'sistémico');
  t = t.replace(/\bpróstatéra\b/gi, 'próstata');
  t = t.replace(/\bpróstatéa\b/gi, 'próstata');
  t = t.replace(/\bCreaté\b/g, 'Creat');

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

  t = t.replace(/atélet/gi, (m) => m[0] === 'A' ? 'Atlet' : 'atlet');
  t = t.replace(/transatélântic/gi, 'transatlântic');
  t = t.replace(/atélanto/gi, (m) => m[0] === 'A' ? 'Atlanto' : 'atlanto');
  t = t.replace(/triatél/gi, (m) => m[0] === 'T' ? 'Triatl' : 'triatl');
  t = t.replace(/batémotrop/gi, 'batmotrop');

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

  t = t.replace(/latéência/gi, (m) => m[0] === 'L' ? 'Latência' : 'latência');
  t = t.replace(/patéência/gi, (m) => m[0] === 'P' ? 'Patência' : 'patência');
  t = t.replace(/gutatéta/gi, 'gutata');
  t = t.replace(/membranoproliferatéva/gi, 'membranoproliferativa');
  t = t.replace(/tratémento/gi, (m) => m[0] === 'T' ? 'Tratamento' : 'tratamento');

  t = t.replace(/té([aeiouáéíóú])/gi, (m, v) => (m[0] === 'T' ? 'T' : 't') + v);

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

  t = t.replace(/[\p{L}\p{M}\-]+/gu, (token) => {
    if (!/stá/i.test(token)) return token;
    if (isLegitSta(token)) return token;
    let fixed = token.replace(/stá([a-zà-ÿ])/gi, (m, letter) => (m[0] === 'S' ? 'St' : 'st') + letter);
    fixed = fixed.replace(/stá$/gi, (m) => m[0] === 'S' ? 'St' : 'st');
    return fixed;
  });

  return t;
}

// Compare sample questions:
const testIndices = [0, 5, 12, 19, 31, 74, 111, 134, 149];
testIndices.forEach(idx => {
  const q = origData.questoes[idx];
  console.log(`\n================== QUESTION ${q.numero || idx + 1} (Area: ${q.area}) ==================`);
  console.log('--- BEFORE ENUNCIADO ---');
  console.log(q.enunciado.slice(0, 150) + '...');
  console.log('--- AFTER ENUNCIADO ---');
  console.log(fixSpellingAndCorruption(q.enunciado).slice(0, 150) + '...');

  console.log('--- BEFORE ALTERNATIVAS (A and E) ---');
  if (q.alternativas) {
    if (q.alternativas.A) console.log('A: ' + q.alternativas.A);
    if (q.alternativas.E) console.log('E: ' + q.alternativas.E);
  }
  console.log('--- AFTER ALTERNATIVAS (A and E) ---');
  if (q.alternativas) {
    if (q.alternativas.A) console.log('A: ' + fixSpellingAndCorruption(q.alternativas.A));
    if (q.alternativas.E) console.log('E: ' + fixSpellingAndCorruption(q.alternativas.E));
  }

  console.log('--- BEFORE EXPLICACAO (snippet) ---');
  if (q.explicacao) console.log(q.explicacao.slice(0, 160) + '...');
  console.log('--- AFTER EXPLICACAO (snippet) ---');
  if (q.explicacao) console.log(fixSpellingAndCorruption(q.explicacao).slice(0, 160) + '...');
});
