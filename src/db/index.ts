import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * O mesmo banco nos dois lugares.
 *
 * Na nuvem, DATABASE_URL aponta para um Postgres de verdade (Neon, Supabase,
 * Railway, o que for). Na maquina, sem DATABASE_URL, o sistema sobe um
 * Postgres dentro do proprio processo com PGlite, numa pasta .pglite.
 *
 * E Postgres nos dois casos, mesmo SQL, mesmas migracoes. Nao existe o
 * classico "funciona na minha maquina e quebra no servidor" por diferenca
 * de banco.
 */

export type Banco = PostgresJsDatabase<typeof schema>;

type Cache = {
  banco?: Banco;
  fecharPglite?: () => Promise<void>;
};

// O Next recarrega os modulos a cada alteracao em desenvolvimento. Sem este
// cache global, cada recarga abriria outro banco e travaria a pasta.
const global_ = globalThis as unknown as { __calhasDb?: Cache };
const cache: Cache = (global_.__calhasDb ??= {});

export function usandoPostgresDeVerdade(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return /^postgres(ql)?:\/\//.test(url);
}

export function obterBanco(): Banco {
  if (cache.banco) return cache.banco;

  if (usandoPostgresDeVerdade()) {
    const cliente = postgres(process.env.DATABASE_URL!, {
      max: Number(process.env.DATABASE_POOL ?? 5),
      // Pgbouncer e os Postgres serverless nao gostam de prepared statements.
      prepare: false,
    });
    cache.banco = drizzlePostgres(cliente, { schema });
  } else {
    const pasta = process.env.PGLITE_DIR ?? ".pglite";
    const pglite = new PGlite(pasta);
    cache.banco = drizzlePglite(pglite, { schema }) as unknown as Banco;
    cache.fecharPglite = () => pglite.close();
  }

  return cache.banco;
}

/** Usado pelos testes e scripts para fechar o PGlite ao terminar. */
export async function fecharBanco(): Promise<void> {
  if (cache.fecharPglite) await cache.fecharPglite();
  cache.banco = undefined;
  cache.fecharPglite = undefined;
}

export { schema };
