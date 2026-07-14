# Lancamento em producao

## Estado confirmado

- Dominio: `https://lucrodacarne.com.br` com SSL e CDN ativos na Hostinger.
- Hospedagem: Web App Next.js, Node 22, branch `main`, deploy automatico pelo GitHub.
- Supabase: projeto `arosnbldkgvbqhwnwfcr`, tabelas com RLS e migrations aplicadas.
- Webhook: `perfectpay-webhook` publicado sem JWT porque valida token proprio.
- Gratuito: uso ilimitado por 3 dias desde o cadastro, validado no banco.
- Mensal: R$ 49,90 por mes, uso ilimitado enquanto vigente.
- Anual: R$ 149,90 por ano, uso ilimitado enquanto vigente.
- Autoexclusao: `account-self-service` ativa, autenticada por JWT e bloqueada para assinatura paga vigente.
- Monitor: GitHub Actions verifica o dominio, paginas legais, cabecalhos e protecao da funcao a cada 6 horas.
- Documentos legais: fornecedor e controlador identificados como `60.144.937 SAMUEL LOPES SANTANA`, CNPJ `60.144.937/0001-62`.

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
3. SMTP proprio ativo com `suporte@lucrodacarne.com.br` pela Hostinger.
4. Templates de convite, confirmacao e recuperacao publicados a partir de `supabase/templates/`.
5. Envio do Supabase Auth validado de ponta a ponta em 14/07/2026.
6. Senha minima do Auth configurada em 8 caracteres.
7. A protecao contra senhas vazadas nao esta disponivel no plano Free e permanece desativada por limitacao do plano.

## Continuidade no plano Free

- O projeto permanece no Supabase Free por decisao do proprietario.
- Backups gerenciados nao podem ser baixados nesse plano.
- Use `scripts/backup-supabase.cmd` conforme `docs/FREE_PLAN_BACKUP.md` e mantenha uma copia criptografada fora deste computador.
- Projetos Free podem ser pausados por inatividade; o monitor de producao nao substitui um plano de recuperacao.

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
- Executar o primeiro backup externo depois de obter a senha do banco e instalar o Docker Desktop.
- Guardar a connection string e os backups fora do repositorio.
