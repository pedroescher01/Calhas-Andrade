/** Resposta padrao das acoes: ou deu certo, ou tem um motivo em portugues. */
export type Resultado<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { dados?: undefined } : { dados: T }))
  | { ok: false; erro: string };

export function certo(): Resultado;
export function certo<T>(dados: T): Resultado<T>;
export function certo<T>(dados?: T): Resultado<T> {
  return { ok: true, dados } as Resultado<T>;
}

export function errado<T = undefined>(erro: string): Resultado<T> {
  return { ok: false, erro };
}
