import { describe, it, expect, beforeEach } from "vitest";
import {
  DEMO_ACCOUNT,
  authenticate,
  listAccounts,
  registerAccount,
  resetLocalAccounts,
} from "../shared/auth/localAccounts";

/**
 * Sprint 11 (P1) — Contas do modo local.
 * A conta de demonstração é registrada de fábrica e as novas contas entram
 * como `viewer`; as credenciais são validadas como no Convex Auth.
 */

beforeEach(() => {
  resetLocalAccounts();
  window.localStorage.clear();
});

describe("conta de demonstração", () => {
  it("está registrada e entra com a senha documentada", () => {
    expect(listAccounts()[0]).toMatchObject({
      email: "ana@unicap.br",
      name: "Ana Costa",
      role: "admin",
    });

    const result = authenticate(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
    expect(result).toEqual({ ok: true, account: DEMO_ACCOUNT });
  });

  it("recusa senha errada e e-mail desconhecido", () => {
    expect(authenticate(DEMO_ACCOUNT.email, "outra-senha")).toEqual({
      ok: false,
      error: "E-mail ou senha incorretos.",
    });
    expect(authenticate("ninguem@unicap.br", "Senha1234")).toEqual({
      ok: false,
      error: "E-mail ou senha incorretos.",
    });
  });

  it("aceita o e-mail com caixa/espaços diferentes", () => {
    const result = authenticate("  ANA@UNICAP.BR ", DEMO_ACCOUNT.password);
    expect(result.ok).toBe(true);
  });

  it("continua disponível mesmo depois de limpar o armazenamento", () => {
    registerAccount({
      name: "Nova",
      email: "nova@unicap.br",
      password: "Senha1234",
    });
    window.localStorage.clear();
    expect(listAccounts()).toHaveLength(1);
    expect(authenticate(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password).ok).toBe(true);
  });
});

describe("cadastro de novas contas", () => {
  it("registra como viewer e permite entrar depois", () => {
    const created = registerAccount({
      name: "  Nova Pessoa  ",
      email: " Nova@Unicap.br ",
      password: "Senha1234",
    });

    expect(created).toMatchObject({
      name: "Nova Pessoa",
      email: "nova@unicap.br",
      role: "viewer",
    });
    expect(authenticate("nova@unicap.br", "Senha1234")).toMatchObject({
      ok: true,
    });
    expect(listAccounts()).toHaveLength(2);
  });

  it("recusa e-mail repetido, senha curta e nome vazio", () => {
    expect(() =>
      registerAccount({
        name: "Ana",
        email: DEMO_ACCOUNT.email,
        password: "Senha1234",
      })
    ).toThrow("Já existe uma conta com este e-mail.");

    expect(() =>
      registerAccount({ name: "Nova", email: "n@x.com", password: "1234567" })
    ).toThrow("A senha deve ter pelo menos 8 caracteres.");

    expect(() =>
      registerAccount({ name: "   ", email: "n@x.com", password: "Senha1234" })
    ).toThrow("Informe seu nome.");
  });

  it("persiste no armazenamento local entre leituras", () => {
    registerAccount({ name: "A", email: "a@x.com", password: "Senha1234" });
    registerAccount({ name: "B", email: "b@x.com", password: "Senha1234" });

    expect(listAccounts().map((a) => a.email)).toEqual([
      "ana@unicap.br",
      "a@x.com",
      "b@x.com",
    ]);
    expect(JSON.parse(window.localStorage.getItem("labnotes.accounts.v1")!)).toHaveLength(2);
  });
});
