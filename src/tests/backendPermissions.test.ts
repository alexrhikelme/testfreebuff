import { describe, it, expect } from "vitest";
import {
  DEMO_ACCOUNT,
  hasAtLeast,
  permissionError,
  roleForEmail,
  currentUser,
  requireRole,
  requireProjectManager,
} from "../../convex/permissions";
import { createFakeConvex } from "./helpers/fakeConvex";

/**
 * Sprint 11 (P1) — Regras de autorização isoladas.
 * Os handlers testados em `backendDb.test.ts` usam exatamente estas funções.
 */

describe("hasAtLeast — escala viewer < editor < admin", () => {
  it("respeita a hierarquia", () => {
    expect(hasAtLeast("viewer", "viewer")).toBe(true);
    expect(hasAtLeast("viewer", "editor")).toBe(false);
    expect(hasAtLeast("viewer", "admin")).toBe(false);

    expect(hasAtLeast("editor", "viewer")).toBe(true);
    expect(hasAtLeast("editor", "editor")).toBe(true);
    expect(hasAtLeast("editor", "admin")).toBe(false);

    expect(hasAtLeast("admin", "editor")).toBe(true);
    expect(hasAtLeast("admin", "admin")).toBe(true);

    expect(hasAtLeast(null, "viewer")).toBe(false);
  });

  it("devolve mensagens distintas para leitura e administração", () => {
    expect(permissionError("admin")).toMatch(/administradores/);
    expect(permissionError("editor")).toMatch(/somente leitura/);
    expect(permissionError("viewer")).toMatch(/Faça login/);
  });
});

describe("roleForEmail", () => {
  function fakeWithMembers() {
    const fake = createFakeConvex();
    fake.seed("members", "members:1", {
      email: "editor@lab.local",
      role: "editor",
      dashboardId: "dash-1",
    });
    fake.seed("members", "members:2", {
      email: "editor@lab.local",
      role: "admin",
      dashboardId: "dash-2",
    });
    fake.seed("members", "members:3", {
      email: "viewer@lab.local",
      role: "viewer",
      dashboardId: "dash-1",
    });
    return fake;
  }

  it("pega o papel mais alto e ignora caixa/espaços", async () => {
    const fake = fakeWithMembers();
    await expect(roleForEmail(fake.ctx, "  EDITOR@lab.local ")).resolves.toBe("admin");
    await expect(roleForEmail(fake.ctx, "viewer@lab.local")).resolves.toBe("viewer");
  });

  it("quem não foi convidado é viewer", async () => {
    const fake = fakeWithMembers();
    await expect(roleForEmail(fake.ctx, "ninguem@lab.local")).resolves.toBe("viewer");
  });

  it("a conta demo é admin mesmo sem convite", async () => {
    const fake = createFakeConvex();
    await expect(roleForEmail(fake.ctx, DEMO_ACCOUNT.email)).resolves.toBe("admin");
  });
});

describe("sessão e exigências", () => {
  it("sem identidade não há usuário", async () => {
    const fake = createFakeConvex();
    await expect(currentUser(fake.ctx)).resolves.toBeNull();
    await expect(requireRole(fake.ctx, "viewer")).rejects.toThrow(
      "Faça login para continuar."
    );
  });

  it("resolve nome/e-mail/papel da sessão", async () => {
    const fake = createFakeConvex();
    fake.setUser({ id: "users:b", name: "Bruno Lima", email: "bruno@lab.local" });
    fake.seed("members", "members:1", {
      email: "bruno@lab.local",
      role: "editor",
      dashboardId: "dash-1",
    });

    await expect(currentUser(fake.ctx)).resolves.toMatchObject({
      name: "Bruno Lima",
      email: "bruno@lab.local",
      role: "editor",
    });
  });

  it("admin global gerencia qualquer projeto; editor sem vínculo não", async () => {
    const fake = createFakeConvex();
    fake.seed("projectMembers", "projectMembers:1", {
      projectId: "proj-1",
      userId: "bruno@lab.local",
      role: "owner",
    });

    fake.setUser({ id: "users:c", name: "Carla", email: "carla@lab.local" });
    await expect(requireProjectManager(fake.ctx, "proj-1")).rejects.toThrow(
      /responsável pelo projeto/
    );

    fake.setUser({ id: "users:b", name: "Bruno", email: "bruno@lab.local" });
    await expect(requireProjectManager(fake.ctx, "proj-1")).resolves.toMatchObject({
      email: "bruno@lab.local",
    });

    fake.setUser({ id: "users:ana", name: "Ana", email: DEMO_ACCOUNT.email });
    await expect(requireProjectManager(fake.ctx, "proj-1")).resolves.toMatchObject({
      role: "admin",
    });
  });
});
