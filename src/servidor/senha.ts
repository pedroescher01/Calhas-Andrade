import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Senha guardada com scrypt, do proprio Node.
 *
 * scrypt e proposital: e lento e usa memoria, o que torna caro tentar
 * adivinhar a senha por tentativa e erro. Nao da para "descriptografar" o
 * que esta guardado -- so comparar.
 */

const TAMANHO_SAL = 16;
const TAMANHO_CHAVE = 64;
const CUSTO = 16_384; // N do scrypt

export function gerarHashSenha(senha: string): string {
  const sal = randomBytes(TAMANHO_SAL);
  const chave = scryptSync(senha.normalize("NFKC"), sal, TAMANHO_CHAVE, {
    N: CUSTO,
  });
  return `scrypt$${CUSTO}$${sal.toString("hex")}$${chave.toString("hex")}`;
}

export function conferirSenha(senha: string, guardado: string): boolean {
  const partes = guardado.split("$");
  if (partes.length !== 4 || partes[0] !== "scrypt") return false;

  const custo = Number(partes[1]);
  const sal = Buffer.from(partes[2]!, "hex");
  const esperado = Buffer.from(partes[3]!, "hex");
  if (!Number.isFinite(custo) || sal.length === 0 || esperado.length === 0) {
    return false;
  }

  const calculado = scryptSync(senha.normalize("NFKC"), sal, esperado.length, {
    N: custo,
  });
  // Comparacao de tempo constante: nao vaza quanto da senha estava certo.
  return timingSafeEqual(calculado, esperado);
}
