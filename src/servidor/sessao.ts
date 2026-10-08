import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Sessao num cookie assinado.
 *
 * O cookie leva o id do usuario e a validade, mais uma assinatura HMAC.
 * Quem mexer no conteudo invalida a assinatura. Nao precisa de tabela de
 * sessao nem de biblioteca de fora: e um sistema de um dono so.
 */

const NOME_COOKIE = "calhas_sessao";
const DIAS_VALIDADE = 30;

function segredo(): string {
  const doAmbiente = process.env.SESSION_SECRET;
  if (doAmbiente && doAmbiente.length >= 16) return doAmbiente;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Falta a variavel SESSION_SECRET (minimo 16 caracteres). " +
        "Gere uma com: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  // Somente em desenvolvimento, para nao travar quem acabou de clonar.
  return "segredo-de-desenvolvimento-nao-use-em-producao";
}

function assinar(dados: string): string {
  return createHmac("sha256", segredo()).update(dados).digest("base64url");
}

export function gerarSegredo(): string {
  return randomBytes(32).toString("hex");
}

type Conteudo = { uid: number; exp: number };

function montarToken(conteudo: Conteudo): string {
  const corpo = Buffer.from(JSON.stringify(conteudo)).toString("base64url");
  return `${corpo}.${assinar(corpo)}`;
}

export function lerToken(token: string | undefined): Conteudo | null {
  if (!token) return null;

  const separador = token.lastIndexOf(".");
  if (separador <= 0) return null;

  const corpo = token.slice(0, separador);
  const assinaturaRecebida = token.slice(separador + 1);
  const assinaturaEsperada = assinar(corpo);

  const a = Buffer.from(assinaturaRecebida);
  const b = Buffer.from(assinaturaEsperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const conteudo = JSON.parse(
      Buffer.from(corpo, "base64url").toString("utf8"),
    ) as Conteudo;
    if (typeof conteudo.uid !== "number" || typeof conteudo.exp !== "number") {
      return null;
    }
    if (conteudo.exp < Date.now()) return null;
    return conteudo;
  } catch {
    return null;
  }
}

export async function abrirSessao(usuarioId: number): Promise<void> {
  const exp = Date.now() + DIAS_VALIDADE * 24 * 60 * 60 * 1000;
  const loja = await cookies();
  loja.set(NOME_COOKIE, montarToken({ uid: usuarioId, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS_VALIDADE * 24 * 60 * 60,
  });
}

export async function lerSessao(): Promise<Conteudo | null> {
  const loja = await cookies();
  return lerToken(loja.get(NOME_COOKIE)?.value);
}

export async function encerrarSessao(): Promise<void> {
  const loja = await cookies();
  loja.delete(NOME_COOKIE);
}

export { NOME_COOKIE };
