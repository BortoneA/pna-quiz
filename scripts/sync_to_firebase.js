const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'pna-quiz', '.env') });

async function initFirebase() {
  console.log('\n============================================================');
  console.log('   PNA QUIZ -- SINCRONIZADOR COM GOOGLE CLOUD FIRESTORE');
  console.log('============================================================\n');

  const possibleKeyPaths = [
    path.join(__dirname, '..', 'serviceAccountKey.json'),
    path.join(__dirname, '..', 'pna-quiz', 'serviceAccountKey.json'),
    path.join(__dirname, 'serviceAccountKey.json'),
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);

  let serviceAccount = null;
  let keyPathUsed = null;

  for (const kp of possibleKeyPaths) {
    if (fs.existsSync(kp)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(kp, 'utf8'));
        keyPathUsed = kp;
        break;
      } catch (e) {
        console.error(`Erro ao ler credenciais em ${kp}:`, e.message);
      }
    }
  }

  if (serviceAccount) {
    console.log(`[1/4] Inicializando com credencial: ${path.basename(keyPathUsed)} (Projeto: ${serviceAccount.project_id})`);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else if (process.env.FIREBASE_PROJECT_ID) {
    console.log(`[1/4] Inicializando com Application Default Credentials (Projeto: ${process.env.FIREBASE_PROJECT_ID})`);
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } else {
    try {
      console.log('[1/4] Tentando inicialização padrão do ambiente Google Cloud / Firebase...');
      admin.initializeApp();
    } catch (e) {
      console.error('\n[ERRO CRÍTICO] Nenhuma credencial do Firebase encontrada!');
      console.error('Por favor, siga um dos seguintes passos:');
      console.error(' 1. Baixe o arquivo serviceAccountKey.json no Firebase Console e salve-o nesta pasta:');
      console.error(`    ${path.resolve(__dirname, '..')}`);
      console.error(' 2. Ou defina a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_PROJECT_ID.\n');
      process.exit(1);
    }
  }

  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

async function carregarDados() {
  console.log('[2/4] Carregando bases de dados locais...');

  const rootDir = path.join(__dirname, '..');
  const primaryJsonPath = path.join(rootDir, 'banco_questoes_pna_recategorizado_4a_edicao.json');
  const fallbackJsonPath = path.join(rootDir, 'banco_questoes_pna_sync_1787792260576.json');
  const syncJsonPath = fs.existsSync(primaryJsonPath) ? primaryJsonPath : fallbackJsonPath;
  const taxonomiaJsonPath = path.join(rootDir, 'taxonomia_oficial_apna_4a_edicao.json');

  if (!fs.existsSync(syncJsonPath)) {
    throw new Error(`Arquivo mestre não encontrado: ${syncJsonPath}`);
  }

  console.log(`  -> Lendo ${path.basename(syncJsonPath)}...`);
  const rawQuestoes = JSON.parse(fs.readFileSync(syncJsonPath, 'utf8'));
  const questoes = rawQuestoes.questoes || [];
  console.log(`  -> Total de questões carregadas: ${questoes.length}`);

  let taxonomia = {};
  if (fs.existsSync(taxonomiaJsonPath)) {
    console.log(`  -> Lendo ${path.basename(taxonomiaJsonPath)}...`);
    taxonomia = JSON.parse(fs.readFileSync(taxonomiaJsonPath, 'utf8'));
  }

  return { questoes, taxonomia };
}

async function sincronizarTaxonomia(db, taxonomia) {
  const areas = Object.keys(taxonomia);
  if (areas.length === 0) {
    console.log('[3/4] Nenhuma taxonomia adicional para sincronizar. Prosseguindo.');
    return;
  }

  console.log(`[3/4] Sincronizando Taxonomia Oficial APNA 4ª Edição (${areas.length} áreas)...`);
  const batch = db.batch();

  for (const areaNome of areas) {
    const areaData = taxonomia[areaNome];
    const docId = areaNome.replace(/[\/\\]/g, '-').trim();
    const docRef = db.collection('taxonomia_areas').doc(docId);
    batch.set(docRef, {
      nome: areaNome,
      totalCapitulos: areaData.total_capitulos || 0,
      capitulos: (areaData.capitulos || []).map(c => ({
        numero: c.numero,
        titulo: c.titulo,
        totalSubareas: (c.subareas || []).length,
        subareas: (c.subareas || []).map(s => ({
          codigo: s.codigo,
          titulo: s.titulo
        }))
      })),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  await batch.commit();
  console.log(`  -> ${areas.length} áreas médicas sincronizadas com sucesso em 'taxonomia_areas'.`);
}

async function sincronizarQuestoes(db, questoes) {
  console.log(`[4/4] Sincronizando ${questoes.length} Questões Médicas com o Cloud Firestore...`);

  const BATCH_SIZE = 400; // Limite seguro abaixo de 500
  const totalLotes = Math.ceil(questoes.length / BATCH_SIZE);
  let processadas = 0;

  for (let i = 0; i < questoes.length; i += BATCH_SIZE) {
    const loteNumero = Math.floor(i / BATCH_SIZE) + 1;
    const chunk = questoes.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const q of chunk) {
      const qId = q.id || `PNA-AUTO-${processadas + 1}`;
      const docRef = db.collection('questoes').doc(qId);

      const questaoDoc = {
        id: qId,
        numero: q.numero ?? null,
        parte: q.parte ?? null,
        anoDaProva: q.ano_da_prova ?? null,
        area: q.area ?? 'Geral',
        subarea: q.subarea ?? null,
        nivelDeDificuldade: q.nivel_de_dificuldade ?? 'médio',
        enunciado: q.enunciado ?? '',
        alternativas: q.alternativas ?? {},
        respostaCorreta: q.resposta_correta ?? '',
        explicacao: q.explicacao ?? '',
        doencaOuConjunto: q.doenca_ou_conjunto_de_doencas ?? null,
        ativo: true,
        versao: 1,
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(docRef, questaoDoc, { merge: true });
    }

    await batch.commit();
    processadas += chunk.length;
    const perc = ((processadas / questoes.length) * 100).toFixed(1);
    console.log(`  -> Lote ${loteNumero}/${totalLotes} salvo (${processadas}/${questoes.length} questões - ${perc}%)`);
  }

  // Grava metadados de sincronização
  const metaRef = db.collection('metadata').doc('sync_info');
  await metaRef.set({
    versao: 'PNA 4ª Edição',
    dataset: 'PNA_MED_PORTUGAL_MASTER',
    totalQuestoes: questoes.length,
    sincronizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    status: 'COMPLETO'
  }, { merge: true });

  console.log('\n[✓] Metadados de sincronização gravados em "metadata/sync_info".');
}

async function main() {
  try {
    const db = await initFirebase();
    const { questoes, taxonomia } = await carregarDados();
    await sincronizarTaxonomia(db, taxonomia);
    await sincronizarQuestoes(db, questoes);

    console.log('\n============================================================');
    console.log('   SINCRONIZAÇÃO FINALIZADA COM SUCESSO!');
    console.log('   Sua base de dados completa já está na nuvem Google Firebase');
    console.log('   e acessível de qualquer local ou dispositivo.');
    console.log('============================================================\n');
  } catch (error) {
    console.error('\n[ERRO DURANTE A SINCRONIZAÇÃO]:', error);
    process.exit(1);
  }
}

main();
