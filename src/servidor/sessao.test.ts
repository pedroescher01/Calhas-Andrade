import { describe, it, expect, vi } from "vitest";

// O modulo de sessao importa next/headers, que so existe dentro do Next.
vi.mock("next/headers", () => ({ cookies: async () => ({}) }));

const { lerToken } = await import("./sessao");

/** Monta um token do jeito que o modulo monta, para testar a leitura. */
async function tokenValido(uid: number, exp: number): Promise<string> {
  const { createHmac } = await import("node:crypto");
  const corpo = Buffer.from(JSON.stringify({ uid, exp })).toString("base64url");
  const assinatura = createHmac(
    "sha256",
    "segredo-de-desenvolvimento-nao-use-em-producao",
  )
    .update(corpo)
    .digest("base64url");
  return `${corpo}.${assinatura}`;
}

const umaHoraAFrente = Date.now() + 3_600_000;

describe("lerToken", () => {
  it("aceita token valido", async () => {
    const conteudo = lerToken(await tokenValido(1, umaHoraAFrente));
    expect(conteudo?.uid).toBe(1);
  });

  it("recusa token vencido", async () => {
    expect(lerToken(await tokenValido(1, Date.now() - 1000))).toBeNull();
  });

  it("recusa token com conteudo trocado", async () => {
    const token = await tokenValido(1, umaHoraAFrente);
    const [, assinatura] = token.split(".");
    const outroCorpo = Buffer.from(
      JSON.stringify({ uid: 999, exp: umaHoraAFrente }),
    ).toString("base64url");
    expect(lerToken(`${outroCorpo}.${assinatura}`)).toBeNull();
  });

  it("recusa token com assinatura inventada", async () => {
    const token = await tokenValido(1, umaHoraAFrente);
    const [corpo] = token.split(".");
    expect(lerToken(`${corpo}.assinaturafalsa`)).toBeNull();
  });

  it("recusa lixo", () => {
    for (const ruim of [undefined, "", ".", "aaa", "a.b.c"]) {
      expect(lerToken(ruim)).toBeNull();
    }
  });
});
