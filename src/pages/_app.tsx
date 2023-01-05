import { AppProps } from "next/app";
import { Header } from "../Components/Header";

// Usando contexto para ler autenticacao do usuario
// Como para frente podemos ter varios providers, daremos
// o nome de NextAuthProvider para esse (codigo diferente do video por conta de versoes diferentes)
import { SessionProvider as NextAuthProvider } from "next-auth/react";

import "../styles/global.scss";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <NextAuthProvider session={pageProps.session}>
      <Header />
      <Component {...pageProps} />
    </NextAuthProvider>
  );
}

export default MyApp;
