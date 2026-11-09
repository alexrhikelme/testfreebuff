import { describe, it, expect } from "vitest";
import { createFakeConvex, runHandler } from "./helpers/fakeConvex";
import type { FakeConvex } from "./helpers/fakeConvex";
import * as notes from "../../convex/notes";
import * as dashboards from "../../convex/dashboards";
import * as members from "../../convex/members";
import * as projects from "../../convex/projects";
import * as profiles from "../../convex/profiles";
import * as seed from "../../convex/seed";
import { DEMO_ACCOUNT } from "../../convex/permissions";

/**
 * Sprint 11 (P1) — Testes de execução do backend.
 *
 * Cada caso executa o handler real da função Convex contra o banco falso em
 * memória, cobrindo o CRUD do schema atual e as permissões por papel
 * (viewer/editor/admin), além das validações de domínio.
 */

const ANA = { id: "users:ana", name: "Ana Costa", email: DEMO_ACCOUNT.email };
const BRUNO = { id: "users:bruno", name: "Bruno Lima", email: "bruno@lab.local" };
const CARLA = { id: "users:carla", name: "Carla Dias", email: "carla@lab.local" };

const READ_ONLY_ERROR = "somente leitura";
const ADMIN_ERROR = "Apenas administradores";
const PROJECT_ERROR = "responsável pelo projeto";

/** Workspace mínimo: 1 dashboard, Bruno editor, Carla viewer, 1 nota. */
function workspace(): FakeConvex {
  const fake = createFakeConvex();
  fake.seed("users", ANA.id, { name: ANA.name, email: ANA.email });
  fake.seed("users", BRUNO.id, { name: BRUNO.name, email: BRUNO.email });
  fake.seed("users", CARLA.id, { name: CARLA.name, email: CARLA.email });
  fake.seed("dashboards", "dashboards:1", {
    id: "dash-1",
    name: "Experimento A",
    description: "Coleta",
    createdAt: "2026-09-10T09:00:00.000Z",
    updatedAt: "2026-09-10T09:00:00.000Z",
  });
  fake.seed("members", "members:1", {
    id: "member-1",
    name: BRUNO.name,
    email: BRUNO.email,
    role: "editor",
    dashboardId: "dash-1",
    invitedAt: "2026-09-11T10:00:00.000Z",
  });
  fake.seed("members", "members:2", {
    id: "member-2",
    name: CARLA.name,
    email: CARLA.email,
    role: "viewer",
    dashboardId: "dash-1",
    invitedAt: "2026-09-12T10:00:00.000Z",
  });
  fake.seed("notes", "notes:1", {
    id: "note-1",
    title: "Coletar amostras",
    content: "",
    status: "in_progress",
    tags: ["coleta"],
    assignee: BRUNO.name,
    startDate: "2026-09-10",
    dueDate: "2026-09-18",
    dashboardId: "dash-1",
    createdAt: "2026-09-10T09:00:00.000Z",
    updatedAt: "2026-09-10T09:00:00.000Z",
  });
  return fake;
}

describe("permissões — notes", () => {
  it("recusa escrita sem sessão", async () => {
    const fake = workspace();
    await expect(
      runHandler(notes.create, fake.ctx, { id: "n-x", title: "Sem sessão" })
    ).rejects.toThrow("Faça login para continuar.");
    expect(fake.table("notes")).toHaveLength(1);
  });

  it("viewer não cria, edita, move nem exclui", async () => {
    const fake = workspace();
    fake.setUser(CARLA);

    await expect(
      runHandler(notes.create, fake.ctx, { id: "n-x", title: "Nova" })
    ).rejects.toThrow(READ_ONLY_ERROR);
    await expect(
      runHandler(notes.update, fake.ctx, { id: "note-1", patch: { title: "X" } })
    ).rejects.toThrow(READ_ONLY_ERROR);
    await expect(
      runHandler(notes.move, fake.ctx, { id: "note-1", status: "completed" })
    ).rejects.toThrow(READ_ONLY_ERROR);
    await expect(
      runHandler(notes.remove, fake.ctx, { id: "note-1" })
    ).rejects.toThrow(READ_ONLY_ERROR);

    expect(fake.table("notes")).toHaveLength(1);
    expect(fake.table("notes")[0].title).toBe("Coletar amostras");
  });

  it("editor cria a nota com defaults e registra a atividade com o nome da sessão", async () => {
    const fake = workspace();
    fake.setUser(BRUNO);

    await runHandler(notes.create, fake.ctx, {
      id: "note-2",
      title: "Preparar tubos",
      tags: ["preparo"],
      dashboardId: "dash-1",
    });

    const created = fake.table("notes").find((n) => n.id === "note-2");
    expect(created).toMatchObject({
      title: "Preparar tubos",
      content: "",
      status: "not_started",
      tags: ["preparo"],
      updatedBy: BRUNO.name,
      dashboardId: "dash-1",
    });
    const activity = fake.table("activity").at(-1);
    expect(activity).toMatchObject({
      noteId: "note-2",
      action: "created",
      actor: BRUNO.name,
    });
  });

  it("ignora autoria forjada: o ator vem da sessão", async () => {
    const fake = workspace();
    fake.setUser(BRUNO);

    await runHandler(notes.create, fake.ctx, {
      id: "note-3",
      title: "Nota",
      actor: "Ana Costa", // tentativa de forjar autoria
    });

    expect(fake.table("activity").at(-1)?.actor).toBe(BRUNO.name);
  });

  it("valida o período e impede id duplicado", async () => {
    const fake = workspace();
    fake.setUser(BRUNO);

    await expect(
      runHandler(notes.create, fake.ctx, {
        id: "note-4",
        title: "Período inválido",
        startDate: "2026-09-20",
        dueDate: "2026-09-10",
      })
    ).rejects.toThrow("A data de início não pode ser depois do prazo.");

    await expect(
      runHandler(notes.create, fake.ctx, { id: "note-1", title: "Duplicada" })
    ).rejects.toThrow("Já existe uma nota com este identificador.");
    expect(fake.table("notes")).toHaveLength(1);
  });

  it("editor atualiza campos, limpa opcionais e registra status_changed", async () => {
    const fake = workspace();
    fake.setUser(BRUNO);

    await runHandler(notes.update, fake.ctx, {
      id: "note-1",
      patch: { status: "completed", assignee: null, title: "Coleta concluída" },
    });

    const note = fake.table("notes").find((n) => n.id === "note-1")!;
    expect(note.title).toBe("Coleta concluída");
    expect(note.status).toBe("completed");
    expect(note.assignee).toBeUndefined();
    expect(note.updatedBy).toBe(BRUNO.name);
    expect(fake.table("activity").at(-1)).toMatchObject({
      action: "status_changed",
      actor: BRUNO.name,
    });
  });

  it("update recusa período inválido e nota inexistente", async () => {
    const fake = workspace();
    fake.setUser(BRUNO);

    await expect(
      runHandler(notes.update, fake.ctx, {
        id: "note-1",
        patch: { dueDate: "2026-09-01" },
      })
    ).rejects.toThrow("A data de início não pode ser depois do prazo.");
    await expect(
      runHandler(notes.update, fake.ctx, { id: "note-404", patch: {} })
    ).rejects.toThrow("Nota não encontrada.");
  });

  it("move grava status/ordem e só registra atividade quando muda de coluna", async () => {
    const fake = workspace();
    fake.setUser(BRUNO);

    await runHandler(notes.move, fake.ctx, {
      id: "note-1",
      status: "completed",
      order: 2,
    });
    expect(fake.table("notes").find((n) => n.id === "note-1")).toMatchObject({
      status: "completed",
      order: 2,
    });
    const activityCount = fake.table("activity").length;

    // Mesmo status: nada muda, nenhuma atividade nova.
    await runHandler(notes.move, fake.ctx, { id: "note-1", status: "completed" });
    expect(fake.table("activity")).toHaveLength(activityCount);
  });

  it("remove apaga a nota e registra a exclusão", async () => {
    const fake = workspace();
    fake.setUser(BRUNO);

    await runHandler(notes.remove, fake.ctx, { id: "note-1" });
    expect(fake.table("notes")).toHaveLength(0);
    expect(fake.table("activity").at(-1)).toMatchObject({
      action: "deleted",
      noteId: "note-1",
      actor: BRUNO.name,
    });
  });

  it("lista notas da mais recente para a mais antiga", async () => {
    const fake = workspace();
    fake.seed("notes", "notes:2", {
      id: "note-2",
      title: "Mais recente",
      content: "",
      status: "not_started",
      tags: [],
      createdAt: "2026-09-12T09:00:00.000Z",
      updatedAt: "2026-09-12T09:00:00.000Z",
    });

    const list = await runHandler<Array<{ id: string }>>(notes.list, fake.ctx);
    expect(list.map((n) => n.id)).toEqual(["note-2", "note-1"]);
  });
});

describe("permissões — dashboards", () => {
  it("viewer não cria dashboard; editor cria; nome vazio é recusado", async () => {
    const fake = workspace();

    fake.setUser(CARLA);
    await expect(
      runHandler(dashboards.create, fake.ctx, { id: "dash-2", name: "Novo" })
    ).rejects.toThrow(READ_ONLY_ERROR);

    fake.setUser(BRUNO);
    await expect(
      runHandler(dashboards.create, fake.ctx, { id: "dash-2", name: "   " })
    ).rejects.toThrow("O nome é obrigatório.");

    await runHandler(dashboards.create, fake.ctx, {
      id: "dash-2",
      name: "  Novo dashboard  ",
      description: "Descrição",
    });
    expect(fake.table("dashboards").find((d) => d.id === "dash-2")).toMatchObject({
      name: "Novo dashboard",
      description: "Descrição",
    });
  });

  it("editor renomeia; exclusão é só de admin", async () => {
    const fake = workspace();

    fake.setUser(BRUNO);
    await runHandler(dashboards.update, fake.ctx, {
      id: "dash-1",
      name: "Renomeado",
    });
    expect(fake.table("dashboards")[0].name).toBe("Renomeado");

    await expect(
      runHandler(dashboards.remove, fake.ctx, { id: "dash-1" })
    ).rejects.toThrow(ADMIN_ERROR);

    fake.setUser(ANA);
    await runHandler(dashboards.remove, fake.ctx, { id: "dash-1" });

    // Cascade: notas perdem o vínculo e membros do dashboard saem.
    expect(fake.table("dashboards")).toHaveLength(0);
    expect(fake.table("notes")[0].dashboardId).toBeUndefined();
    expect(fake.table("members")).toHaveLength(0);
  });
});

describe("permissões — membros do dashboard", () => {
  it("só admin convida; valida e-mail e duplicidade", async () => {
    const fake = workspace();
    fake.setUser(BRUNO);
    await expect(
      runHandler(members.add, fake.ctx, {
        id: "member-9",
        name: "Novo",
        email: "novo@lab.local",
        role: "viewer",
        dashboardId: "dash-1",
      })
    ).rejects.toThrow(ADMIN_ERROR);

    fake.setUser(ANA);
    await expect(
      runHandler(members.add, fake.ctx, {
        id: "member-9",
        name: "Novo",
        email: "sem-arroba",
        role: "viewer",
        dashboardId: "dash-1",
      })
    ).rejects.toThrow("Informe um e-mail válido.");

    await expect(
      runHandler(members.add, fake.ctx, {
        id: "member-9",
        name: "Bruno",
        email: "BRUNO@lab.local",
        role: "admin",
        dashboardId: "dash-1",
      })
    ).rejects.toThrow("Este e-mail já é membro deste dashboard.");

    await runHandler(members.add, fake.ctx, {
      id: "member-9",
      name: "Novo Membro",
      email: "novo@lab.local",
      role: "editor",
      dashboardId: "dash-1",
    });
    expect(fake.table("members")).toHaveLength(3);
  });

  it("admin altera papel e remove; editor não", async () => {
    const fake = workspace();

    fake.setUser(CARLA);
    await expect(
      runHandler(members.updateRole, fake.ctx, { id: "member-1", role: "admin" })
    ).rejects.toThrow(ADMIN_ERROR);

    fake.setUser(ANA);
    await runHandler(members.updateRole, fake.ctx, {
      id: "member-1",
      role: "viewer",
    });
    expect(fake.table("members").find((m) => m.id === "member-1")?.role).toBe(
      "viewer"
    );

    await runHandler(members.remove, fake.ctx, { id: "member-1" });
    expect(fake.table("members").map((m) => m.id)).toEqual(["member-2"]);
  });
});

describe("permissões — projetos", () => {
  it("viewer não cria projeto", async () => {
    const fake = workspace();
    fake.setUser(CARLA);
    await expect(
      runHandler(projects.createProject, fake.ctx, { id: "proj-1", name: "X" })
    ).rejects.toThrow(READ_ONLY_ERROR);
    expect(fake.table("projects")).toHaveLength(0);
  });

  it("cria projeto com o dono vindo da sessão", async () => {
    const fake = workspace();
    fake.setUser(BRUNO);

    await runHandler(projects.createProject, fake.ctx, {
      id: "proj-1",
      name: "Projeto novo",
      createdBy: "qualquer-um", // ignorado
    });

    const project = fake.table("projects")[0];
    expect(project).toMatchObject({
      id: "proj-1",
      name: "Projeto novo",
      status: "planning",
      createdBy: BRUNO.email,
    });
    expect(fake.table("projectMembers")[0]).toMatchObject({
      projectId: "proj-1",
      userId: BRUNO.email,
      role: "owner",
    });
  });

  it("só o responsável (ou admin global) altera e exclui", async () => {
    const fake = workspace();
    fake.setUser(BRUNO);
    await runHandler(projects.createProject, fake.ctx, {
      id: "proj-1",
      name: "Projeto",
    });

    fake.setUser(CARLA);
    await expect(
      runHandler(projects.updateProject, fake.ctx, { id: "proj-1", name: "X" })
    ).rejects.toThrow(PROJECT_ERROR);
    await expect(
      runHandler(projects.removeProject, fake.ctx, { id: "proj-1" })
    ).rejects.toThrow(PROJECT_ERROR);

    fake.setUser(BRUNO);
    await runHandler(projects.updateProject, fake.ctx, {
      id: "proj-1",
      name: "Renomeado",
      status: "active",
    });
    expect(fake.table("projects")[0]).toMatchObject({
      name: "Renomeado",
      status: "active",
    });

    // Admin global passa mesmo sem vínculo no projeto.
    fake.setUser(ANA);
    await runHandler(projects.removeProject, fake.ctx, { id: "proj-1" });
    expect(fake.table("projects")).toHaveLength(0);
    expect(fake.table("projectMembers")).toHaveLength(0);
  });

  it("gestão de membros do projeto exige papel de responsável", async () => {
    const fake = workspace();
    fake.setUser(BRUNO);
    await runHandler(projects.createProject, fake.ctx, {
      id: "proj-1",
      name: "Projeto",
    });

    fake.setUser(CARLA);
    await expect(
      runHandler(projects.addProjectMember, fake.ctx, {
        projectId: "proj-1",
        userId: "carla@lab.local",
        role: "viewer",
      })
    ).rejects.toThrow(PROJECT_ERROR);

    fake.setUser(BRUNO);
    await runHandler(projects.addProjectMember, fake.ctx, {
      projectId: "proj-1",
      userId: CARLA.email,
      role: "editor",
    });
    await expect(
      runHandler(projects.addProjectMember, fake.ctx, {
        projectId: "proj-1",
        userId: CARLA.email,
        role: "editor",
      })
    ).rejects.toThrow("Este usuário já está no projeto.");

    await runHandler(projects.updateProjectMemberRole, fake.ctx, {
      projectId: "proj-1",
      userId: CARLA.email,
      role: "admin",
    });
    expect(
      fake.table("projectMembers").find((m) => m.userId === CARLA.email)?.role
    ).toBe("admin");

    await runHandler(projects.removeProjectMember, fake.ctx, {
      projectId: "proj-1",
      userId: CARLA.email,
    });
    expect(fake.table("projectMembers")).toHaveLength(1);
  });
});

describe("permissões — perfis", () => {
  it("perfil próprio herda o papel do domínio; outro e-mail exige admin", async () => {
    const fake = workspace();

    fake.setUser(CARLA);
    const created = await runHandler<{ role: string; created: boolean }>(
      profiles.createProfile,
      fake.ctx,
      { name: "Carla Dias", email: CARLA.email, role: "admin" }
    );
    expect(created).toMatchObject({ role: "viewer", created: true });

    await expect(
      runHandler(profiles.createProfile, fake.ctx, {
        name: "Outra",
        email: "outra@lab.local",
      })
    ).rejects.toThrow("Você só pode criar o seu próprio perfil.");

    fake.setUser(ANA);
    const adminCreated = await runHandler<{ role: string }>(
      profiles.createProfile,
      fake.ctx,
      { name: "Nova Pessoa", email: "nova@lab.local", role: "editor" }
    );
    expect(adminCreated.role).toBe("editor");
  });

  it("só admin altera papel e edita perfil de terceiros", async () => {
    const fake = workspace();
    fake.seed("profiles", "profiles:1", {
      id: "user-carla",
      name: "Carla Dias",
      email: CARLA.email,
      role: "viewer",
      createdAt: "2026-09-01T09:00:00.000Z",
      updatedAt: "2026-09-01T09:00:00.000Z",
    });

    fake.setUser(CARLA);
    await runHandler(profiles.updateProfile, fake.ctx, {
      id: "user-carla",
      bio: "Analista",
    });
    expect(fake.table("profiles")[0].bio).toBe("Analista");

    await expect(
      runHandler(profiles.updateProfile, fake.ctx, {
        id: "user-carla",
        role: "admin",
      })
    ).rejects.toThrow("Apenas administradores podem alterar papéis.");

    fake.setUser(ANA);
    await runHandler(profiles.updateProfile, fake.ctx, {
      id: "user-carla",
      role: "editor",
    });
    expect(fake.table("profiles")[0].role).toBe("editor");
  });
});

describe("ensureWorkspace — seed autenticado", () => {
  it("exige sessão", async () => {
    const fake = createFakeConvex();
    await expect(runHandler(seed.ensureWorkspace, fake.ctx)).rejects.toThrow(
      "Faça login para continuar."
    );
    expect(fake.table("dashboards")).toHaveLength(0);
  });

  it("popula os registros e dá admin da conta demo em todos os dashboards", async () => {
    const fake = createFakeConvex();
    fake.setUser(ANA);

    await runHandler(seed.ensureWorkspace, fake.ctx);

    expect(fake.table("dashboards")).toHaveLength(5);
    expect(fake.table("notes")).toHaveLength(3);
    expect(fake.table("members")).toHaveLength(8); // 3 sementes + 5 vínculos demo
    const demoMemberships = fake
      .table("members")
      .filter((m) => m.email === ANA.email);
    expect(demoMemberships).toHaveLength(5);
    expect(demoMemberships.every((m) => m.role === "admin")).toBe(true);
    expect(fake.table("profiles")[0]).toMatchObject({
      email: ANA.email,
      role: "admin",
    });

    // Idempotente: rodar de novo não duplica nada.
    await runHandler(seed.ensureWorkspace, fake.ctx);
    expect(fake.table("dashboards")).toHaveLength(5);
    expect(fake.table("notes")).toHaveLength(3);
    expect(fake.table("members")).toHaveLength(8);
    expect(fake.table("profiles")).toHaveLength(1);
  });

  it("conta nova entra como viewer e sem vínculos", async () => {
    const fake = createFakeConvex();
    fake.setUser({ id: "users:novo", name: "Nova Pessoa", email: "novo@unicap.br" });

    await runHandler(seed.ensureWorkspace, fake.ctx);

    expect(fake.table("profiles")[0]).toMatchObject({
      email: "novo@unicap.br",
      role: "viewer",
    });
    expect(
      fake.table("members").filter((m) => m.email === "novo@unicap.br")
    ).toHaveLength(0);
  });
});
