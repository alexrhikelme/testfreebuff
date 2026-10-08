import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "../shared/components/Toast";
import { ConfirmDialog } from "../shared/components/ConfirmDialog";

function ToastDemo() {
  const { showToast } = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        showToast("success", "Anotação excluída.", {
          label: "Desfazer",
          onClick: () => showToast("info", "Ação desfeita."),
        })
      }
    >
      disparar
    </button>
  );
}

describe("ToastProvider (Sprint 10 — H3/H9)", () => {
  it("exibe o toast com a ação de desfazer", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastDemo />
      </ToastProvider>
    );

    await user.click(screen.getByText("disparar"));
    expect(screen.getByText("Anotação excluída.")).toBeInTheDocument();
    expect(screen.getByText("Desfazer")).toBeInTheDocument();
  });

  it("executa a ação de desfazer e fecha o toast", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastDemo />
      </ToastProvider>
    );

    await user.click(screen.getByText("disparar"));
    await user.click(screen.getByText("Desfazer"));
    expect(screen.getByText("Ação desfeita.")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Anotação excluída.")).not.toBeInTheDocument();
    });
  });
});

describe("ConfirmDialog (Sprint 10 — H3)", () => {
  it("confirma a ação destrutiva", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        title="Excluir anotação?"
        description="Esta ação pode ser desfeita."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancela e fecha com ESC", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        title="Excluir dashboard?"
        description="As notas são preservadas."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
