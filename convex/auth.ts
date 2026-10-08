import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

/**
 * Sprint 9 (D3) — Auth real com Convex Auth (e-mail + senha).
 *
 * O provedor Password guarda as credenciais nas tabelas authAccounts e
 * cria o usuário em `users`. O campo `name` informado no cadastro é
 * preservado via `profile`, para que notas e atividade mostrem quem fez.
 */
export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          name: (params.name as string | undefined) ?? "Sem nome",
          email: params.email as string,
        };
      },
    }),
  ],
});
