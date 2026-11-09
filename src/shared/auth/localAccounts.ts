import type { MemberRole } from "@/features/dashboards/types";

/**
 * Sprint 11 (P1) — Contas do modo local (protótipo/demonstração).
 *
 * Espelha o contrato do Convex Auth para que a tela de acesso tenha o mesmo
 * comportamento nos dois modos: validação de credenciais no "servidor",
 * e-mail único e papel por conta.
 *
 * A conta de demonstração é registrada de fábrica e é usada pelos
 * desenvolvedores: `ana@unicap.br` / `Senha1234`, papel admin, com acesso a
 * todos os registros semeados. Contas criadas na demonstração entram como
 * `viewer` (somente leitura) — o mesmo papel que o backend Convex atribui a
 * quem ainda não foi convidado para nenhum dashboard.
 *
 * As senhas ficam no armazenamento local do navegador porque este modo é
 * um protótipo: não há servidor. Em produção quem guarda os hashes é o
 * Convex Auth.
 */

export type LocalAccount = {
  name: string;
  email: string;
  password: string;
  role: MemberRole;
};

/** Conta de teste da equipe (documentada na tela de acesso). */
export const DEMO_ACCOUNT: LocalAccount = {
  name: "Ana Costa",
  email: "ana@unicap.br",
  password: "Senha1234",
  role: "admin",
};

const STORAGE_KEY = "labnotes.accounts.v1";
export const MIN_PASSWORD_LENGTH = 8;

const INVALID_CREDENTIALS = "E-mail ou senha incorretos.";
const DUPLICATE_EMAIL = "Já existe uma conta com este e-mail.";

function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function readRegistered(): LocalAccount[] {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is LocalAccount =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as LocalAccount).email === "string" &&
        typeof (item as LocalAccount).password === "string"
    );
  } catch {
    return [];
  }
}

function writeRegistered(accounts: LocalAccount[]): void {
  storage()?.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Contas disponíveis: a demo sempre existe, mesmo após limpar o storage. */
export function listAccounts(): LocalAccount[] {
  const registered = readRegistered().filter(
    (account) => normalizeEmail(account.email) !== DEMO_ACCOUNT.email
  );
  return [DEMO_ACCOUNT, ...registered];
}

/** Registra uma conta nova (papel `viewer`). Lança erro com a mensagem da UI. */
export function registerAccount(input: {
  name: string;
  email: string;
  password: string;
}): LocalAccount {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (!name) throw new Error("Informe seu nome.");
  if (!email) throw new Error("Informe o e-mail.");
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  if (listAccounts().some((account) => normalizeEmail(account.email) === email)) {
    throw new Error(DUPLICATE_EMAIL);
  }

  const account: LocalAccount = {
    name,
    email,
    password: input.password,
    role: "viewer",
  };
  writeRegistered([...readRegistered(), account]);
  return account;
}

/** Valida credenciais; devolve a conta quando o par e-mail/senha confere. */
export function authenticate(
  email: string,
  password: string
): { ok: true; account: LocalAccount } | { ok: false; error: string } {
  const normalized = normalizeEmail(email);
  const account = listAccounts().find(
    (candidate) => normalizeEmail(candidate.email) === normalized
  );
  if (!account || account.password !== password) {
    return { ok: false, error: INVALID_CREDENTIALS };
  }
  return { ok: true, account };
}

/** Limpa as contas registradas (usado pelos testes; a demo permanece). */
export function resetLocalAccounts(): void {
  storage()?.removeItem(STORAGE_KEY);
}
