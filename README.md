# Lucro da Carne

SaaS para calcular rendimento, quebra, custo real e lucro de lotes de carne para acougues, casas de carne e pequenos mercados.

O app funciona em dois modos:

- **Modo local:** sem login, salvando lotes no `localStorage` do navegador.
- **Modo SaaS:** com Supabase Auth, perfis, assinaturas, limite de lotes por plano e persistencia por usuario no PostgreSQL.

## Funcionalidades

- Calculadora de lote com peso de entrada, custo por kg ou custo total.
- Cadastro rapido de cortes com peso, categoria e preco de venda.
- Calculo automatico de rendimento, quebra, custo real por kg vendavel, receita, lucro e margem.
- Alertas de dados inconsistentes, margem negativa e cortes sem preco.
- Recomendacoes automaticas para precificacao e fornecedor.
- Historico de lotes com filtros por fornecedor, tipo e status.
- Dashboard com indicadores e graficos por lote e fornecedor.
- Detalhe de lote com duplicacao, exclusao, impressao, relatorio copiavel e PDF.
- Conta com login/cadastro via Supabase, plano, limite e importacao de lotes locais para a nuvem.
- Pagina de planos com CTA para checkout Kirvano quando os links estiverem configurados.
- Painel administrativo protegido por RLS para acompanhar clientes, uso e ajustar planos manualmente.
- Fallback local quando as variaveis do Supabase nao estao configuradas.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Zustand
- Supabase Auth e PostgreSQL
- Recharts
- jsPDF
- Lucide React

## Como rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

No Windows PowerShell, se `npm` for bloqueado pela politica de execucao, use:

```bash
npm.cmd run dev
```

## Configurar Supabase

1. Crie um projeto no Supabase ou aplique as migrations de `supabase/migrations/`.
2. Copie `.env.local.example` para `.env.local`.
3. Preencha:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica-aqui
NEXT_PUBLIC_KIRVANO_PRO_CHECKOUT_URL=https://checkout.kirvano.com/seu-produto-pro
NEXT_PUBLIC_KIRVANO_BUSINESS_CHECKOUT_URL=https://checkout.kirvano.com/seu-produto-business
```

4. Em Auth > URL Configuration, defina a URL publica do produto como Site URL e inclua os enderecos locais usados no desenvolvimento, como `http://localhost:3000/**`.
5. Reinicie o servidor de desenvolvimento.

O schema cria:

- `profiles`
- `lots`
- `subscriptions`
- `billing_events` para processar webhooks de pagamento no backend
- trigger de criacao de perfil/assinatura no cadastro
- RLS para isolamento por usuario e administradores
- limite de lotes por plano no banco
- grants explicitos para a Data API do Supabase
- funcoes internas no schema privado, fora da API publica

## Planos

Por padrao, novos usuarios entram no plano `gratis` com teste de 3 dias. A conta administradora pode alterar plano, status, validade e limite em `/admin`.

- `gratis`: R$ 0, teste por 3 dias.
- `pro`: R$ 49/mes, ate 50 lotes.
- `business`: R$ 149/ano, lotes ilimitados.

Para liberar o primeiro administrador, cadastre a sua conta e execute uma unica vez no SQL Editor do Supabase:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'seu-email@empresa.com';
```

## Cobranca recorrente

O banco armazena provedor, periodo, cancelamento, identificadores externos e eventos de webhook sem expor dados de cobranca ao navegador. A chave `service_role` nunca deve ir para `.env.local` com prefixo `NEXT_PUBLIC_`.

### Kirvano

O endpoint publicado para a Kirvano e:

```text
https://<project-ref>.supabase.co/functions/v1/kirvano-webhook
```

No Dashboard do Supabase, em Edge Functions > Secrets, cadastre:

```text
KIRVANO_WEBHOOK_TOKEN=um-token-longo-e-aleatorio
KIRVANO_APP_URL=https://seu-dominio-publico
```

Depois, no painel da Kirvano, crie um webhook com esse endpoint, use o mesmo token e selecione ao menos `Compra aprovada`. Para cancelar acesso em chargebacks, inclua tambem `Chargeback`.

Em `/admin`, cadastre o ID do produto Kirvano e associe-o ao plano, limite de lotes e prazo de acesso. A funcao somente libera acesso para produtos cadastrados. Ela usa o e-mail de `customer.email` enviado pela Kirvano: se o comprador ja tiver conta, o plano e liberado na hora; caso contrario, ele recebe um convite e o acesso pendente e aplicado quando aceitar o cadastro.

Os links `NEXT_PUBLIC_KIRVANO_PRO_CHECKOUT_URL` e `NEXT_PUBLIC_KIRVANO_BUSINESS_CHECKOUT_URL` aparecem na pagina `/planos`. O webhook continua sendo a fonte de verdade para liberar ou revogar acesso.

## Prontidao SaaS

O arquivo [`docs/SAAS_READINESS.md`](docs/SAAS_READINESS.md) lista o prompt operacional executado, o estado atual do projeto e o que ainda falta para lancamento como SaaS.

Pontos criticos antes de publicar:

- Remover artefatos locais grandes do pacote de deploy, como `.env.local.zip` e `node_modules.zip`.
- Configurar dominio, Site URL do Supabase, secrets da Edge Function e produtos Kirvano.
- Testar compra aprovada, reembolso/chargeback, comprador sem conta e limite de plano.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Estrutura principal

```text
src/app/
  calculadora/     Fluxo de calculo e salvamento
  historico/       Lista e filtros de lotes
  dashboard/       Indicadores e graficos
  lote/[id]/       Detalhe do lote
  planos/          Planos e CTAs de checkout
  conta/           Login, plano, perfil e migracao local
  admin/           Clientes e gestao de planos
src/components/    Componentes de UI
src/hooks/         Estado de auth e lotes
src/lib/           Calculos, Supabase, storage, PDF e tipos
supabase/migrations/ Migrations versionadas do banco
```

## Validacao

Antes de publicar:

```bash
npm run lint
npm run build
```
