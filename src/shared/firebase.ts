import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics } from "firebase/analytics";

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

/** Inicializa o Firebase apenas uma vez, mesmo se chamado em vários lugares. */
export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

/**
 * Retorna a instância de Analytics quando disponível.
 * O `getAnalytics` só funciona em ambiente com `window`; evita erros em server/SSR.
 */
export function getFirebaseAnalytics(): Analytics | null {
  if (typeof window === "undefined") return null;
  if (!analytics) {
    analytics = getAnalytics(getFirebaseApp());
  }
  return analytics;
}

export { firebaseConfig };
