import { migrate as migrarPostgres } from "drizzle-orm/postgres-js/migrator";
import { migrate as migrarPglite } from "drizzle-orm/pglite/migrator";
import { obterBanco, usandoPostgresDeVerdade, type Banco } from "./index";

/** Aplica as migracoes pendentes, no driver que estiver em uso. */
export async function aplicarMigracoes(banco: Banco = obterBanco()): Promise<void> {
  const pasta = "./drizzle";
  if (usandoPostgresDeVerdade()) {
    await migrarPostgres(banco, { migrationsFolder: pasta });
  } else {
    // Mesmo contrato, migrador do PGlite.
    await migrarPglite(banco as never, { migrationsFolder: pasta });
  }
}
