import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";
import {
  getFirestore,
  type Firestore,
  initializeFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getAuth,
  type Auth,
  initializeAuth,
  connectAuthEmulator,
} from "firebase/auth";

// Configuração do projeto Firebase do Combogó Unicap.
// Mantida aqui para centralizar a inicialização do SDK no lado do cliente.
const firebaseConfig = {
  apiKey: "AIzaSyCUcwt7aIpJN7_gKMmh42QeVGG9q7eWyGM",
  authDomain: "combogo-unicap.firebaseapp.com",
  projectId: "combogo-unicap",
  storageBucket: "combogo-unicap.firebasestorage.app",
  messagingSenderId: "444966140936",
  appId: "1:444966140936:web:b4ba144b4bfaf4b8bda5bd",
  measurementId: "G-V3E6ZFS21B",
};

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let firestore: Firestore | null = null;
let auth: Auth | null = null;

/** Inicializa o Firebase apenas uma vez, mesmo se chamado em vários lugares. */
export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

/** Retorna a instância de Firestore quando disponível. */
export function getFirebaseFirestore(): Firestore | null {
  if (typeof window === "undefined") return null;
  if (!firestore) {
    try {
      firestore = getFirestore(getFirebaseApp());
    } catch {
      firestore = null;
    }
  }
  return firestore;
}

/** Retorna a instância de Auth quando disponível. */
export function getFirebaseAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  if (!auth) {
    try {
      auth = getAuth(getFirebaseApp());
    } catch {
      auth = null;
    }
  }
  return auth;
}

/** Retorna a instância de Analytics quando disponível.

 * O `getAnalytics` só funciona em ambiente com `window`; evita erros em server/SSR.
 */
export function getFirebaseAnalytics(): Analytics | null {
  if (typeof window === "undefined") return null;
  if (!analytics) {
    try {
      analytics = getAnalytics(getFirebaseApp());
    } catch {
      analytics = null;
    }
  }
  return analytics;
}

/** Conecta o Firestore a um emulador local durante o desenvolvimento. */
export function connectFirebaseEmulators() {
  if (typeof window === "undefined") return;
  const firestore = getFirebaseFirestore();
  const auth = getFirebaseAuth();
  if (!firestore || !auth) return;

  const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST;
  if (emulatorHost) {
    try {
      connectFirestoreEmulator(firestore, emulatorHost, 8080);
      connectAuthEmulator(auth, `http://${emulatorHost}:9099`);
    } catch {
      // Emulador indisponível: ignora e mantém a conexão da nuvem.
    }
  }
}

/** Retorna se o Firebase foi iniciado com sucesso (Firestore + Auth). */
export function isFirebaseReady(): boolean {
  return getFirebaseFirestore() != null && getFirebaseAuth() != null;
}

export { firebaseConfig };
