# Lancamento em producao

## Estado confirmado

- Dominio: `https://lucrodacarne.com.br` com SSL e CDN ativos na Hostinger.
- Hospedagem: Web App Next.js, Node 22, branch `main`, deploy automatico pelo GitHub.
- Supabase: projeto `arosnbldkgvbqhwnwfcr`, tabelas com RLS e migrations aplicadas.
- Webhook: `perfectpay-webhook` publicado sem JWT porque valida token proprio.
- Gratuito: uso ilimitado por 3 dias desde o cadastro, validado no banco.
- Pro: R$ 49,90 por mes, uso ilimitado enquanto vigente.
- Business: R$ 149,90 por ano, uso ilimitado enquanto vigente.

## Perfect Pay

1. Produto `PPPBF498` criado no formato Assinatura como Lucro da Carne.
2. Plano mensal recorrente: `PPLQQPVN7`, R$ 49,90, checkout `https://go.perfectpay.com.br/PPU38CQE6NA`.
3. Plano anual recorrente: `PPLQQPVIL`, R$ 149,90, checkout `https://go.perfectpay.com.br/PPU38CQE4L9`.
4. Nao use `https://go.perfectpay.com.br/PPU38CQE4L8`: esse checkout esta vinculado ao plano antigo avulso `PPLQQPVBO`.
5. Em Ferramentas > Webhook - Vendas, adicione:

```text
https://arosnbldkgvbqhwnwfcr.supabase.co/functions/v1/perfectpay-webhook
```

6. Selecione Aprovado, Cancelado, Devolvido/Reembolsado, Chargeback, Completo e eventos de recorrencia disponiveis.
7. Use JSON e envio imediato, sem delay.
8. Configure um token forte e use o mesmo valor em `PERFECTPAY_WEBHOOK_TOKEN`.

## Secrets do Supabase

Configure em Edge Functions > Secrets:

```text
PERFECTPAY_MONTHLY_PLAN_CODE=
PERFECTPAY_ANNUAL_PLAN_CODE=
PERFECTPAY_PRODUCT_CODE=
PERFECTPAY_WEBHOOK_TOKEN=
APP_URL=https://lucrodacarne.com.br
```

`SUPABASE_SERVICE_ROLE_KEY` nao deve ir para a Hostinger ou para o frontend. A Edge Function usa a chave administrativa fornecida pelo ambiente Supabase.

## Variaveis da Hostinger

As variaveis publicas do Supabase ja estao configuradas. Use somente os checkouts recorrentes validados abaixo:

```text
NEXT_PUBLIC_PERFECTPAY_MONTHLY_CHECKOUT_URL=https://go.perfectpay.com.br/PPU38CQE6NA
NEXT_PUBLIC_PERFECTPAY_ANNUAL_CHECKOUT_URL=https://go.perfectpay.com.br/PPU38CQE4L9
```

Depois de aplicar cada variavel, aguarde a reimplantacao automatica e confirme o codigo do plano no checkout antes de liberar o botao em `/planos`.

## Auth e e-mail

1. No Supabase Auth > URL Configuration, defina Site URL como `https://lucrodacarne.com.br`.
2. Adicione `https://lucrodacarne.com.br/definir-senha` nas Redirect URLs.
3. Configure SMTP proprio com remetente do dominio.
4. No template Invite, use o assunto `Sua compra do Lucro da Carne foi aprovada`.
5. Cole o conteudo de `supabase/templates/invite.html` no template de convite.
6. Ative protecao contra senhas vazadas em Auth > Password Security.

## Homologacao

- Compra mensal aprovada cria ou localiza usuario e libera Pro.
- Compra anual aprovada libera Business.
- Reenvio do mesmo webhook retorna duplicado sem estender periodo.
- Status autorizado ou pendente nao libera acesso.
- Cancelamento, reembolso e chargeback encerram o acesso sem apagar lotes.
- Evento completo nao duplica acesso.
- Convite leva para `/definir-senha`.
- Acesso gratuito e bloqueado pelo banco apos 3 dias.
- Cliente autenticado nao consegue alterar plano ou status.
- Logs e `billing_events` registram falhas sem expor documento ou token.

## Antes da primeira venda

- Fazer uma compra real de baixo valor em cada plano e depois estornar.
- Revisar Termos de Uso e Privacidade com os dados juridicos do controlador e definir a politica comercial de reembolso.
- Criar `suporte@lucrodacarne.com.br` e validar recebimento.
- Ativar backups, alertas de webhook e monitoramento de erros.
