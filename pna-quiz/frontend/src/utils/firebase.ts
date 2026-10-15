import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, query, where, limit, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = () => {
  return !!(firebaseConfig.projectId && firebaseConfig.apiKey);
};

export const getFirebaseApp = () => {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
};

export const getFirestoreDb = () => {
  if (!isFirebaseConfigured()) return null;
  return getFirestore(getFirebaseApp());
};

// Funções utilitárias para consulta remota direta no Firestore
export async function getQuestoesFirestore(filtro?: { area?: string; subarea?: string; ano?: number; limite?: number }) {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firebase não configurado');

  const questoesRef = collection(db, 'questoes');
  let qConstraints: any[] = [];

  if (filtro?.area) {
    qConstraints.push(where('area', '==', filtro.area));
  }
  if (filtro?.subarea) {
    qConstraints.push(where('subarea', '==', filtro.subarea));
  }
  if (filtro?.ano) {
    qConstraints.push(where('anoDaProva', '==', filtro.ano));
  }
  if (filtro?.limite) {
    qConstraints.push(limit(filtro.limite));
  } else {
    qConstraints.push(limit(50));
  }

  const q = query(questoesRef, ...qConstraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
}

export async function getQuestaoPorIdFirestore(id: string) {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firebase não configurado');

  const docRef = doc(db, 'questoes', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data();
}

export async function getTaxonomiaAreasFirestore() {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firebase não configurado');

  const snapshot = await getDocs(collection(db, 'taxonomia_areas'));
  return snapshot.docs.map(doc => doc.data());
}
