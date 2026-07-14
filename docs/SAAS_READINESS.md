# Lucro da Carne - prontidao SaaS

## Prompt operacional executado

> Analise completamente o projeto existente do SaaS Lucro da Carne antes de alterar qualquer arquivo. Depois implemente a integracao de producao entre Lucro da Carne, Perfect Pay e Supabase, com plano gratuito de 3 dias e uso ilimitado, mensal R$ 49,90, anual R$ 149,90, webhook seguro, idempotencia, convites Supabase, RLS, auditoria admin, documentacao e validacao.

## Estado encontrado

- App Next.js com calculadora, historico, dashboard, detalhe de lote, conta, planos e admin.
- Modo local via `localStorage` e modo SaaS via Supabase Auth/Postgres.
- Schema com `profiles`, `lots`, `subscriptions`, eventos de billing, produtos Kirvano legados e grants pendentes.
- RLS ativa para isolamento por usuario, admin e tabelas internas de billing.
- Edge Function Kirvano existente e nova Edge Function Perfect Pay.
- Repo Git local conectado ao GitHub `samuellopessantana1508-del/lucro-da-carne`.

## Melhorias executadas neste passe

- Plano gratuito ajustado para uso ilimitado durante 3 dias desde o cadastro.
- Planos pagos ajustados para Pro R$ 49,90/mes e Business R$ 149,90/ano, ambos com uso ilimitado enquanto ativos.
- Migration `20260711140000_add_perfectpay_billing_and_free_usage.sql` adicionada com colunas Perfect Pay, ciclo de cobranca, consumo gratis, funcoes privadas e trigger transacional de uso.
- Edge Function `perfectpay-webhook` adicionada com token seguro, validacao de produto/plano/e-mail, idempotencia, status Perfect Pay e convites Supabase.
- Conta mostra validade do periodo gratis, ciclo de cobranca e acoes de senha/suporte.
- Admin ganhou busca por e-mail/plano/status/codigo de venda e historico resumido de eventos sem payload bruto.
- Criada rota `/definir-senha` para convites e reset de senha.
- Termos de Uso e Politica de Privacidade publicados no aplicativo e vinculados no rodape global.
- Payload de auditoria da Perfect Pay reduzido para nao persistir token do webhook nem CPF do comprador.
- `.env.local.example`, README e fixtures de teste Perfect Pay atualizados.

## O que ainda falta para SaaS vendavel

As migrations, a Edge Function, o dominio, o SSL, o deploy automatico e as variaveis publicas do Supabase ja estao ativos em producao. Os dois checkouts recorrentes foram validados e publicados na Hostinger.

1. Configurar SMTP do Supabase e aplicar o template `supabase/templates/invite.html`.
2. Executar a homologacao de compra, duplicidade, revogacao, convite e renovacao.
3. Completar os documentos legais com razao social ou nome do responsavel, CPF/CNPJ, endereco e politica comercial de reembolso.
4. Implementar uma rotina operacional de exportacao e exclusao de dados.
5. Configurar monitoramento, backups Supabase e alertas de webhook.

## Variaveis de producao

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_PERFECTPAY_MONTHLY_CHECKOUT_URL=
NEXT_PUBLIC_PERFECTPAY_ANNUAL_CHECKOUT_URL=
PERFECTPAY_MONTHLY_PLAN_CODE=
PERFECTPAY_ANNUAL_PLAN_CODE=
PERFECTPAY_PRODUCT_CODE=
PERFECTPAY_WEBHOOK_TOKEN=
APP_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Endpoint Perfect Pay

```text
https://<project-ref>.supabase.co/functions/v1/perfectpay-webhook
```

Eventos/status a testar:

- `2` aprovado: libera/renova plano.
- `6` cancelado: volta para gratis.
- `7` reembolsado: volta para gratis.
- `8` autorizado: registra, mas nao libera.
- `9` chargeback: volta para gratis.
- `10` completo: registra, mas nao duplica liberacao.
- Status pendentes/desconhecidos: registra, mas nao libera.

## Validacao local

```bash
npm run lint
npm run typecheck
npm run test:perfectpay
npm run build
```
