/**
 * Define a senha de acesso ao sistema.
 *   npm run senha -- "minha senha"
 * Sem argumento, apenas mostra se ja existe senha definida.
 */
import { eq } from "drizzle-orm";
import { obterBanco, fecharBanco } from "../src/db/index";
import { usuario } from "../src/db/schema";
import { gerarHashSenha } from "../src/servidor/senha";

async function principal() {
  const nova = process.argv[2];
  const banco = obterBanco();
  const existentes = await banco.select().from(usuario).limit(1);

  if (!nova) {
    console.log(
      existentes.length > 0
        ? `Senha ja definida para "${existentes[0]!.nome}". Para trocar: npm run senha -- "nova senha"`
        : 'Nenhuma senha definida. Rode: npm run senha -- "minha senha"',
    );
    await fecharBanco();
    return;
  }

  if (nova.length < 6) {
    console.error("A senha precisa ter pelo menos 6 caracteres.");
    process.exit(1);
  }

  const hash = gerarHashSenha(nova);
  if (existentes.length > 0) {
    await banco
      .update(usuario)
      .set({ senhaHash: hash })
      .where(eq(usuario.id, existentes[0]!.id));
    console.log("Senha trocada.");
  } else {
    await banco.insert(usuario).values({ nome: "Dono", senhaHash: hash });
    console.log("Senha definida.");
  }
  await fecharBanco();
}

principal().catch((erro) => {
  console.error("Falhou:", erro);
  process.exit(1);
});
