import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

/**
 * Sprint 9 (D3) — Auth real com Convex Auth (e-mail + senha).
 *
 * O provedor Password guarda as credenciais nas tabelas authAccounts e
 * cria o usuário em `users`. O campo `name` informado no cadastro é
 * preservado via `profile`, para que notas e atividade mostrem quem fez.
 *
 * P1 — a regra de senha mínima também é validada no servidor; a tela de
 * acesso apenas antecipa a mensagem para o usuário.
 */
export const MIN_PASSWORD_LENGTH = 8;

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      validatePasswordRequirements(password) {
        if (password.length < MIN_PASSWORD_LENGTH) {
          throw new Error(
            `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
          );
        }
      },
      profile(params) {
        const email = String(params.email ?? "").trim().toLowerCase();
        return {
          name: (params.name as string | undefined)?.trim() || "Sem nome",
          email,
        };
      },
    }),
  ],
});
