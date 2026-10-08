# Calhas Andrade — sistema de gestão da fábrica

Sistema para controlar a fábrica de calhas: orçamentos, obras, recebimentos,
contas a pagar, compras de matéria-prima e a conta de cada calheiro.

É **um app só**, que funciona nos dois lugares:

- **No celular** — o que você faz correndo: abrir orçamento na obra, registrar
  um pagamento, mandar no WhatsApp. Barra embaixo com cinco atalhos e um botão
  redondo de novo orçamento.
- **No computador** — o que você faz com tempo: ver os números do mês, a lista
  completa de orçamentos, para onde foi o dinheiro, a conta dos calheiros.

Os dados são os mesmos nos dois. O que você lança no celular na obra já está no
computador quando você chega na fábrica.

---

## A regra que amarra o sistema

Todo orçamento guarda **dois valores separados**: o material e a mão de obra.
O cliente vê um preço por metro só — a divisão é conta interna da fábrica.

Quando o cliente paga, a mão de obra correspondente passa a estar **liberada
para acerto com o calheiro**, na mesma proporção:

| O cliente pagou | Mão de obra liberada ao calheiro |
|---|---|
| nada | R$ 0,00 |
| metade | metade |
| tudo | tudo |

O saldo do calheiro **não é guardado em lugar nenhum**: é sempre recalculado
das obras dele. Por isso não existe a chance de a tela mostrar um número e o
banco guardar outro — que é o jeito mais comum de um sistema desses perder a
confiança do dono.

Desconto sai da **sua margem**, nunca da mão de obra do calheiro: se você deu
desconto e o cliente quitou, o calheiro recebe a mão de obra inteira.

Vale e acerto gravam duas coisas ao mesmo tempo: o movimento na conta do
calheiro **e** a saída no financeiro. Nunca um sem o outro.

---

## Rodar na sua máquina (para experimentar)

Precisa do [Node.js](https://nodejs.org) versão 20 ou mais nova.

```bash
npm install
npm run db:seed            # cria o banco local com dados de exemplo
npm run senha -- "a-senha-que-voce-quiser"
npm run dev
```

Abra `http://localhost:3000`.

Sem a variável `DATABASE_URL`, o sistema sobe um Postgres **dentro do próprio
processo** (pasta `.pglite`). Serve para experimentar; não serve para uso de
verdade, porque some se a pasta for apagada e não dá para acessar do celular.

Os dados de exemplo são inventados — nomes, endereços e **preços**. Ajuste os
preços em **Tabela de preços** antes de usar para valer. Para zerar tudo:

```bash
npm run db:seed -- --limpar
```

---

## Publicar na nuvem (para usar de verdade)

Duas contas, as duas com plano grátis que sobra para uma fábrica:

### 1. O banco de dados — Neon

1. Crie uma conta em <https://neon.tech> e um projeto novo.
2. Copie a *connection string*. É parecida com:
   `postgres://usuario:senha@ep-algo-123.us-east-2.aws.neon.tech/neondb?sslmode=require`

### 2. O sistema — Vercel

1. Crie uma conta em <https://vercel.com> e importe este repositório do GitHub.
2. Em **Settings → Environment Variables**, cadastre duas variáveis:

   | Nome | Valor |
   |---|---|
   | `DATABASE_URL` | a connection string do Neon |
   | `SESSION_SECRET` | um texto aleatório longo (veja abaixo) |

   Para gerar o `SESSION_SECRET`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Essa variável é o que assina o seu login. **Sem ela o sistema não deixa
   ninguém entrar** — e avisa isso na tela, não em silêncio.

3. Publique (*Deploy*).

### 3. Criar as tabelas no banco novo

Na sua máquina, apontando para o banco da nuvem:

```bash
DATABASE_URL="a-string-do-neon" npm run db:migrate
DATABASE_URL="a-string-do-neon" npm run senha -- "a-sua-senha"
```

Pronto. Abra o endereço que a Vercel deu.

### 4. Instalar no celular

Abra o endereço no navegador do celular e escolha:

- **Android (Chrome):** menu ⋮ → *Instalar aplicativo*
- **iPhone (Safari):** botão de compartilhar → *Adicionar à Tela de Início*

Fica um ícone igual ao de qualquer app, abre em tela cheia.

---

## O que tem dentro

| Tela | Para quê |
|---|---|
| **Início** | O dia: a receber, recebido no mês, contas a pagar, devido aos calheiros, obras da semana |
| **Orçamentos** | Criar, editar, filtrar por situação da obra e por pagamento, imprimir, mandar no WhatsApp |
| **Financeiro** | Contas a pagar, para onde foi o dinheiro por categoria, movimento do período, saldo do caixa |
| **Calheiros** | Conta de cada um, vale, acerto e extrato obra por obra |
| **Clientes** | Cadastro e quanto cada um ainda deve |
| **Compras** | Lista do que está faltando, pedidos ao fornecedor, gasto por fornecedor |
| **Tabela de preços** | Material e mão de obra de cada tipo de calha |
| **Configurações** | Dados da empresa, Pix, percentual de nota, senha |

---

## O que o sistema **não** faz (ainda)

Dito na cara, para não haver surpresa:

- **Não emite nota fiscal.** O percentual de nota é só um acréscimo no preço,
  para o orçamento sair certo quando o cliente pede nota.
- **Não controla estoque de bobina.** Registra o que você comprou e quanto
  custou, sem dar baixa por obra.
- **É de um usuário só.** Um login, que é o seu.

As três decisões foram combinadas no começo do projeto e o banco já está
preparado para receber estoque e mais usuários quando fizer sentido.

---

## Decisões técnicas que valem explicação

**Dinheiro é inteiro, em centavos.** R$ 1.234,56 é guardado como `123456`.
Número com vírgula não serve para dinheiro: `0.1 + 0.2` dá
`0.30000000000000004`, e no fechamento do mês isso vira centavo sobrando.
Quantidade segue a mesma ideia, em milésimos: 12,5 m é `12500`, o que permite
meio metro e um quarto de metro sem perder exatidão.

**Datas de negócio são texto `AAAA-MM-DD`, no fuso de São Paulo.** O servidor
roda em UTC; um pagamento registrado às 21h cairia no dia seguinte se a data
fosse um `timestamp`.

**Totais não são guardados em coluna.** São sempre recalculados dos itens e dos
pagamentos. Em uma fábrica com algumas centenas de orçamentos por ano isso
custa quase nada, e evita o pior defeito desse tipo de sistema: a tela e o
banco discordarem.

**Nada é apagado.** Estorno de pagamento, cancelamento de vale e arquivamento
deixam o registro de pé, marcado. Toda alteração entra no histórico.

**O preço fica congelado no orçamento.** Mudar a tabela de preços hoje não
altera um orçamento de três meses atrás.

---

## Comandos

```bash
npm run dev            # rodar na sua máquina
npm test               # 175 testes das contas e das regras
npm run typecheck      # conferir os tipos
npm run build          # gerar a versão de produção
npm run db:migrate     # aplicar migrações no banco
npm run db:seed        # dados de exemplo (--limpar apaga antes)
npm run senha -- "x"   # definir ou trocar a senha
```

Os testes cobrem as contas do orçamento, a liberação da mão de obra, o saldo do
calheiro, datas e fuso, leitura de valores digitados, a mensagem do WhatsApp e
um teste de ponta a ponta que roda contra um Postgres de verdade.

---

## Como é por dentro

- **Next.js 15** (App Router) com **TypeScript** e **Tailwind 4**
- **Drizzle ORM** sobre **PostgreSQL**
- **PGlite** para rodar na sua máquina sem instalar banco nenhum
- Login de um usuário só, com `scrypt` e cookie assinado — sem dependência de
  terceiro guardando a sua senha

```
src/
  dominio/     as contas puras: dinheiro, datas, orçamento, calheiro, WhatsApp
  db/          tabelas e conexão
  servidor/    leitura (consultas) e escrita (ações), login e sessão
  componentes/ peças de tela reaproveitadas
  app/         as páginas
```

A pasta `dominio` não conhece banco nem tela: são funções que recebem números e
devolvem números. É onde ficam as regras, e é por isso que dá para testá-las
todas sem subir nada.
