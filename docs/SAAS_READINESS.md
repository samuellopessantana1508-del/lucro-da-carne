# Lucro da Carne - prontidao SaaS

## Prompt operacional executado

> Atue como engenheiro de produto SaaS. Entenda o projeto Lucro da Carne por completo, valide build, dependencias, Git, Supabase, auth, RLS, billing, UX e deploy. Liste o que falta para vender como SaaS e execute melhorias locais de baixo risco que aproximem o produto de lancamento sem exigir credenciais externas.

## Estado encontrado

- App Next.js com calculadora, historico, dashboard, detalhe de lote, conta e admin.
- Modo local via `localStorage` e modo SaaS via Supabase Auth/Postgres.
- Schema com `profiles`, `lots`, `subscriptions`, eventos de billing, produtos Kirvano e grants pendentes.
- RLS ativa para isolamento por usuario e leitura/admin de clientes.
- Edge Function `kirvano-webhook` com token proprio e service key apenas no backend.
- `npm run lint` e `npm run build` passam.
- A pasta do projeto agora tem repo Git isolado e remoto GitHub configurado.
- Existem arquivos grandes locais (`.env.local.zip`, `node_modules.zip`) que nao devem entrar em versionamento ou deploy.

## O que falta para SaaS vendavel

1. Deploy limpo: remover artefatos locais grandes do pacote de deploy e publicar em Vercel/Netlify/Sites.
2. Ambiente de producao: configurar dominio, HTTPS, variaveis Supabase e links publicos de checkout.
3. Checkout completo: publicar links Kirvano por plano, testar webhook com compra aprovada, reembolso/chargeback e comprador sem conta.
4. Conta e suporte: reset de senha, troca de e-mail, cancelamento/gestao de assinatura, canal de suporte e mensagens melhores para limite de plano.
5. Legal/LGPD: politicas de privacidade, termos, consentimento, exportacao/exclusao de dados e contato do controlador.
6. Operacao: monitoramento de erros, backups Supabase, alertas de webhook, logs de billing e rotina de auditoria.
7. Qualidade: testes unitarios dos calculos, testes e2e do fluxo calculadora-login-save e CI no GitHub.
8. Seguranca: rodar advisors do Supabase no projeto real, revisar permissoes, segredos e expiracao de sessoes antes do lancamento.

## Melhorias executadas neste passe

- Criada a tela `/planos` com planos Gratis, Pro e Business.
- Precificacao exibida: Gratis R$ 0 por 3 dias, Pro R$ 49/mes ilimitado e Business R$ 149/ano ilimitado.
- Centralizados dados dos planos em `src/lib/plans.ts`.
- Adicionado CTA de planos no menu e na pagina de conta.
- Melhoradas mensagens de erro quando o banco bloqueia salvamento de lotes por permissao, plano ou limite.
- Adicionadas variaveis de checkout Kirvano ao `.env.local.example`.
- Ajustado `.gitignore` para versionar `.env.local.example` e ignorar arquivos compactados.
- Documentado este checklist de prontidao SaaS.

## Checklist de lancamento

- [x] Criar repo Git limpo dentro de `C:\Users\samue\lucro-da-carne`.
- [ ] Remover do diretorio de deploy os arquivos `.env.local.zip` e `node_modules.zip`.
- [ ] Definir `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` de producao.
- [ ] Definir `NEXT_PUBLIC_KIRVANO_PRO_CHECKOUT_URL` e `NEXT_PUBLIC_KIRVANO_BUSINESS_CHECKOUT_URL`.
- [ ] Aplicar migrations em um projeto Supabase de producao.
- [ ] Configurar `KIRVANO_WEBHOOK_TOKEN` e `KIRVANO_APP_URL` nas secrets da Edge Function.
- [ ] Cadastrar produtos Kirvano em `/admin`.
- [ ] Confirmar que novos cadastros gratis expiram em 3 dias no Supabase.
- [ ] Cadastrar o produto Kirvano Pro como `pro`, limite 9999, R$ 49/mes no checkout.
- [ ] Cadastrar o produto Kirvano Business como `business`, limite 9999, R$ 149/ano no checkout.
- [ ] Fazer uma compra teste aprovada e validar liberacao do plano.
- [ ] Testar chargeback/reembolso e expiracao de acesso.
- [ ] Rodar `npm run lint`, `npm run build` e `npm audit`.
- [ ] Configurar CI, monitoramento, backups e politicas legais.
