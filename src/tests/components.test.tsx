import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteStatusChip, StatusSelect, STATUS_LABEL } from "../features/notes/NoteStatusChip";
import { canEditDashboard, canManageMembers, ROLE_LABEL } from "../features/dashboards/store";

describe("NoteStatusChip", () => {
  it("renderiza o rótulo do status", () => {
    render(<NoteStatusChip status="in_progress" />);
    expect(screen.getByText(STATUS_LABEL.in_progress)).toBeInTheDocument();
  });

  it("renderiza cada status sem quebrar", () => {
    for (const s of Object.keys(STATUS_LABEL) as Array<keyof typeof STATUS_LABEL>) {
      const { unmount } = render(<NoteStatusChip status={s} />);
      expect(screen.getByText(STATUS_LABEL[s])).toBeInTheDocument();
      unmount();
    }
  });
});

describe("StatusSelect (mudança inline de status)", () => {
  it("troca o status via select invisível com 2 cliques", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatusSelect status="not_started" onChange={onChange} />);

    const select = screen.getByLabelText("Mudar status");
    await user.selectOptions(select, "completed");

    expect(onChange).toHaveBeenCalledWith("completed");
  });
});

describe("Permissões (Sprint 4)", () => {
  it("admin e editor podem editar dashboard", () => {
    expect(canEditDashboard("admin")).toBe(true);
    expect(canEditDashboard("editor")).toBe(true);
    expect(canEditDashboard("viewer")).toBe(false);
  });

  it("apenas admin gerencia membros", () => {
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageMembers("editor")).toBe(false);
    expect(canManageMembers("viewer")).toBe(false);
  });

  it("rótulos de papel estão definidos", () => {
    expect(ROLE_LABEL.admin).toBe("Administrador");
    expect(ROLE_LABEL.editor).toBe("Editor");
    expect(ROLE_LABEL.viewer).toBe("Visualizador");
  });
});
