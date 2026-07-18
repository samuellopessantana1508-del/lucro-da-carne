# Planejamento estrategico e operacional

Base de decisao do Lucro da Carne em 18/07/2026. Este documento deve ser revisto toda segunda-feira com os numeros reais da semana anterior.

## Oferta atual

- Gratis: uso ilimitado por 3 dias.
- Mensal: R$ 49,90 por mes, sem limite de uso enquanto vigente.
- Anual: R$ 149,90 por ano, sem limite de uso enquanto vigente.
- Publico inicial: acougues, casas de carne e pequenos mercados que precisam conhecer rendimento, quebra, margem e lucro por lote.
- Promessa comercial: transformar pesagem e precificacao de um lote em uma decisao de compra e venda mensuravel.

O anual equivale a R$ 12,49 por mes e custa cerca de 75% menos que doze mensalidades. O desconto deve permanecer uma decisao consciente: revisar margem, suporte e conversao depois dos primeiros 20 clientes pagos, sem alterar assinaturas ja vendidas.

## Portao de vendas

Concluido:

- Dominio, SSL, deploy, Supabase, SMTP, documentos legais e suporte em producao.
- Trial de 3 dias e acesso pago controlados pelo banco.
- Webhook Perfect Pay com idempotencia, liberacao, cancelamento, reembolso e chargeback.
- Monitor de producao a cada 6 horas.
- Primeiro backup logico criado via Docker e verificado em 18/07/2026.

Obrigatorio antes de ampliar anuncios:

1. Comprar o mensal com um e-mail novo, confirmar convite, acesso e validade; depois cancelar ou reembolsar e confirmar o bloqueio.
2. Repetir o fluxo com o anual.
3. Copiar o ZIP e o `.sha256` atuais para armazenamento externo criptografado.
4. Restaurar uma copia em outro projeto Supabase e registrar o tempo total.

## Metas iniciais

- 30 dias: 10 clientes pagos, 5 entrevistas com clientes e zero compra aprovada sem acesso.
- 60 dias: ativacao de trial acima de 60% e conversao trial-pago acima de 15%.
- 90 dias: churn mensal abaixo de 5%, suporte respondido em ate 1 dia util e decisao documentada sobre preco anual.

Ativacao significa o cliente salvar o primeiro lote nas primeiras 24 horas do trial.

## Painel semanal

- Trials iniciados e percentual ativado em 24 horas.
- Conversoes para mensal e anual.
- MRR reconhecido: `49,90 x mensais ativos + 149,90 / 12 x anuais ativos`.
- Caixa recebido, reembolsos, chargebacks e cancelamentos.
- Churn de clientes pagos.
- Webhooks com falha, compras aprovadas sem acesso e tempo de correcao.
- Chamados de suporte, tema e tempo de primeira resposta.
- Idade do ultimo backup valido e existencia da copia externa.

## Rotina operacional

Diariamente, durante os primeiros 30 dias:

- Conferir vendas na Perfect Pay contra assinaturas e eventos no admin.
- Resolver imediatamente qualquer aprovado sem acesso.
- Conferir alertas do monitor e a caixa `suporte@lucrodacarne.com.br`.
- Executar o backup no fim do dia enquanto houver vendas ou alteracoes de dados.

Semanalmente:

- Atualizar o painel de indicadores e revisar a origem dos clientes.
- Conversar com pelo menos um cliente e registrar a principal dificuldade.
- Testar cadastro, recuperacao de senha, calculo, salvamento e checkout.
- Verificar o backup mais recente com `scripts/verify-supabase-backup.cmd`.

Mensalmente:

- Revisar conversao, churn, reembolsos, custos de Hostinger, suporte e aquisicao.
- Revisar acessos administrativos, secrets e dependencias com atualizacao de seguranca.
- Guardar um snapshot mensal criptografado fora do computador.
- Decidir prioridades do produto a partir de uso e entrevistas, nao apenas de pedidos isolados.

## Continuidade

- RPO alvo: no maximo 24 horas de dados perdidos.
- RTO alvo: restaurar a operacao em ate 4 horas.
- Retencao local: 30 dias, controlada pelo script.
- Retencao externa: um snapshot mensal por 12 meses.
- Backup adicional: antes e depois de migration, mudanca de webhook ou operacao administrativa em lote.
- Incidente critico: site indisponivel, vazamento, compra aprovada sem acesso generalizada ou perda de dados. Interromper campanhas, preservar logs e priorizar restauracao do servico.

O backup contem dados pessoais. Nunca envie o ZIP por e-mail ou WhatsApp e nunca o coloque no GitHub. Secrets das Edge Functions, SMTP, DNS e arquivos binarios do Storage precisam de inventario separado; nao fazem parte do dump PostgreSQL.

## Proximos 7 dias

1. Realizar e filmar os dois testes de compra ponta a ponta.
2. Criar a copia externa criptografada e validar o checksum depois da transferencia.
3. Fazer o primeiro ensaio de restauracao em um projeto separado.
4. Preparar uma lista inicial de 30 estabelecimentos e abordar 5 por dia.
5. Registrar cada trial, ativacao, venda, motivo de perda e feedback em uma unica planilha comercial.
