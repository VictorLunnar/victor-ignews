// Fauna possue seu proprio metodo de escrita de suas
// queries (consultas), importado como 'q' pois se repete
import { query as q } from "faunadb";

import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";

// Usando client do Fauna
import { fauna } from "../../../services/fauna";

// Cheat sheet: https://docs.fauna.com/fauna/current/api/fql/cheat_sheet

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "read:user", // Grants access to read a user's profile data.
        },
      },
    }),
  ],
  callbacks: {
    // Permite modificar os dados de session
    async session({ session }) {
      try {
        const userActiveSubscription = await fauna.query<string>(
          q.Get(
            q.Intersection([
              // Busca subscription_by_user_ref que bate
              // com o index declarado
              q.Match(
                q.Index("subscription_by_user_ref"),
                q.Select(
                  // Seleciona somente o dado ref
                  "ref",
                  // Pega os dados do usuario
                  q.Get(
                    // Encontra usuario por email
                    q.Match(
                      q.Index("user_by_email"),
                      q.Casefold(session.user.email)
                    )
                  )
                )
              ),
              q.Match(q.Index("subscription_by_status"), "active"),
            ])
          )
        );
        return {
          ...session,
          activeSubscription: userActiveSubscription,
        };
      } catch {
        return {
          ...session,
          activeSubscription: null,
        };
      }
    },
    // Retornar dados do usuario
    async signIn({ user, account, profile }) {
      // Resgata email de dentro do user
      const { email } = user;
      // Adicionar informacoes no banco de dados
      // Usamos try para caso tenha erro de insercao
      // de dados no banco o usuario nao consiga logar
      try {
        await fauna.query(
          // Verifica usuarios duplicados
          q.If(
            q.Not(
              q.Exists(
                q.Match(q.Index("user_by_email"), q.Casefold(user.email))
              )
            ),
            // Metodo de insercao FQL (Fauna Query Language)
            // 1o parametro sera a collection/tabela
            // 2 serao os dados do usuario a serem inseridos
            q.Create(q.Collection("users"), { data: { email } }),
            q.Get(q.Match(q.Index("user_by_email"), q.Casefold(user.email)))
          )
        );
        return true;
      } catch {
        return false;
      }
    },
  },
};
export default NextAuth(authOptions);
