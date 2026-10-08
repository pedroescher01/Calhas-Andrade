import { redirect } from "next/navigation";
import { precisaDefinirSenha } from "@/servidor/acoes";
import { lerSessao, sessaoConfigurada } from "@/servidor/sessao";
import { FormularioLogin } from "./formulario";

export const metadata = { title: "Entrar - Calhas Andrade" };

/**
 * Sempre renderizada no servidor, a cada acesso.
 *
 * Sem isto o Next percebe que, em certos caminhos, a pagina nao le cookie
 * nem banco, e serve uma copia congelada no momento do build -- que foi
 * exatamente o que aconteceu aqui: o build rodou sem SESSION_SECRET e o
 * aviso de "falta configurar" ficou gravado na pagina para sempre.
 */
export const dynamic = "force-dynamic";

export default async function PaginaLogin() {
  if (await lerSessao()) redirect("/");

  const configurado = sessaoConfigurada();
  const primeiroAcesso = configurado ? await precisaDefinirSenha() : false;

  if (!configurado) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
        <h1 className="text-2xl font-bold text-tinta">Falta configurar o servidor</h1>
        <p className="mt-3 text-[15px] text-cinza">
          O sistema precisa de uma variavel de ambiente chamada{" "}
          <code className="rounded bg-superficie px-1 font-mono">SESSION_SECRET</code>,
          com no mínimo 16 caracteres. E ela que assina o seu login: sem isso o
          sistema não tem como saber que e você.
        </p>
        <p className="mt-3 text-[15px] text-cinza">
          Gere uma assim, e cole no painel da hospedagem:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-tinta p-3 text-[13px] text-white">
          node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;hex&apos;))&quot;
        </pre>
        <p className="mt-3 text-[14px] text-cinza">
          Depois de salvar a variável, publique de novo e recarregue esta página.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8">
        <p className="font-condensada text-[13px] font-bold uppercase tracking-[0.2em] text-marca">
          Calhas Andrade
        </p>
        <h1 className="mt-1 text-2xl font-bold text-tinta">
          {primeiroAcesso ? "Primeiro acesso" : "Entrar no sistema"}
        </h1>
        <p className="mt-2 text-[15px] text-cinza">
          {primeiroAcesso
            ? "Escolha a senha que você vai usar no computador e no celular."
            : "Use a sua senha para abrir a gestão da fábrica."}
        </p>
      </div>

      <FormularioLogin primeiroAcesso={primeiroAcesso} />
    </main>
  );
}
