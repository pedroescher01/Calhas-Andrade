/** Aplica as migracoes no banco apontado por DATABASE_URL (ou no PGlite local). */
import { aplicarMigracoes } from "../src/db/migrar";
import { fecharBanco, usandoPostgresDeVerdade } from "../src/db/index";

async function principal() {
  const onde = usandoPostgresDeVerdade()
    ? "Postgres de DATABASE_URL"
    : `PGlite local (${process.env.PGLITE_DIR ?? ".pglite"})`;
  console.log(`Aplicando migracoes em: ${onde}`);
  await aplicarMigracoes();
  console.log("Migracoes aplicadas.");
  await fecharBanco();
}

principal().catch((erro) => {
  console.error("Falhou ao migrar:", erro);
  process.exit(1);
});
