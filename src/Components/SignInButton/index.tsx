import { FaGithub } from "react-icons/fa";
import { FiX } from "react-icons/fi";
// Funcao que autentica o usuario, chamado em signIn btn
// Funcao que desloga o usuario, chamado em signOut btn
// useSession e um hook que retorna se o usario tem uma sessao ativa ou nao
import { signIn, signOut, useSession } from "next-auth/react";

import styles from "./styles.module.scss";

export function SignInButton() {
  const { data: session } = useSession();
  return session ? (
    <button
      type="button"
      className={styles.signInButton}
      onClick={() => signOut()}
    >
      <FaGithub color="#04D361" />
      {session.user.name}
      <FiX color="#737380" className={styles.closeIcon} />
    </button>
  ) : (
    <button
      type="button"
      className={styles.signInButton}
      onClick={() => signIn()}
    >
      <FaGithub color="#EBA417" />
      Sign in with Github
    </button>
  );
}

// Versao bug
/* 

export function SignInButton() {
  // hook useSession, precisamos compartilhar
  // essa informacao atraves de contexto (declarado em app.tsx)
  const { data } = useSession();


  return data ? (
    // Nao recebe o tipo pois desloga independentemente
    // do metodo de login
    <button
      type="button"
      className={styles.signInButton}
      onClick={() => signOut()}
    >
      <FaGithub color="#84f363" />
      {data.session.user.name}
      <FiX color="#737380" className={styles.closeIcon} />
    </button>
  ) : (
    <button
      type="button"
      className={styles.signInButton}
      // Recebe que tipo de autenticacao usar para login
      onClick={() => signIn("github")}
    >
      <FaGithub color="#eba417" />
      Sign in with Github
    </button>
  );
}

*/
