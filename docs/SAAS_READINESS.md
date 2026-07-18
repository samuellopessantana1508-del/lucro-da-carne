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
- Calculadora bloqueada para visitantes e contas com periodo gratuito expirado; o modo local anonimo nao contorna mais a assinatura.
- Cadastro com aceite expresso dos documentos, senha minima de 8 caracteres e recuperacao de senha.
- Checkout pago liberado somente depois do login, reduzindo compras sem conta identificada.
- Autoatendimento com exportacao de dados e exclusao segura de conta; assinaturas pagas ativas bloqueiam a exclusao.
- Politica de Cancelamento e Reembolso publicada e vinculada no rodape, nos Termos, nos planos e na conta.
- Cabecalhos HTTP de seguranca, sitemap, robots e monitor de producao a cada 6 horas adicionados.
- `.env.local.example`, README e fixtures de teste Perfect Pay atualizados.
- Caixa `suporte@lucrodacarne.com.br`, SMTP proprio e templates de Auth ativados e validados de ponta a ponta.
- Rotina de backup logico externo adicionada para a operacao deliberada no Supabase Free.
- Termos, Privacidade e Cancelamento identificam o fornecedor e controlador pelo nome empresarial, CNPJ e endereco completos.
- Revogacao Perfect Pay reforcada para localizar a assinatura atual mesmo quando uma renovacao substituiu o codigo de venda armazenado.
- Monitor de producao executado em cada push e a cada 6 horas, com timeouts por requisicao para evitar execucoes presas.
- Alertas de alteracao de senha e e-mail habilitados no Supabase Auth com mensagens em portugues.

## O que ainda falta para SaaS vendavel

As migrations, a Edge Function, o dominio, o SSL, o deploy automatico, o SMTP proprio e as variaveis publicas do Supabase ja estao ativos em producao. Os dois checkouts recorrentes foram validados e publicados na Hostinger.

1. Executar uma compra real mensal e uma anual, validar o convite/liberacao e depois testar cancelamento ou reembolso.
2. Instalar o Docker Desktop, executar o primeiro backup com `scripts/backup-supabase.cmd` e guardar a copia fora deste computador.

O Supabase permanece no plano Free por decisao do proprietario. A protecao contra senhas vazadas e o download dos backups gerenciados nao estao disponiveis nesse plano; senha minima de 8 caracteres e backup logico externo sao as medidas compensatorias adotadas.

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
npm run test:launch
npm run build
```
