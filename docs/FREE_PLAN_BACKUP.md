# Backup externo no Supabase Free

O Supabase Free nao permite baixar os backups gerenciados da plataforma. Por decisao do proprietario, o Lucro da Carne permanece nesse plano e usa um backup logico externo como medida compensatoria.

## Preparacao unica

1. Instale o Docker Desktop e deixe o servico em execucao.
2. Mantenha `SUPABASE_ACCESS_TOKEN` disponivel somente na sessao local. O script usa esse token para criar uma credencial PostgreSQL temporaria de cinco minutos.
3. Como alternativa, use a connection string do **Session pooler** em `SUPABASE_DB_URL`.
4. Nao salve tokens, senhas ou connection strings em arquivos do projeto, no GitHub ou na Hostinger.

## Executar o backup

No PowerShell, a partir da raiz do projeto, com o token de acesso ja configurado:

```powershell
.\scripts\backup-supabase.cmd
```

O fallback com senha fixa continua disponivel:

```powershell
$env:SUPABASE_DB_URL = 'postgresql://postgres.PROJECT_REF:SENHA@HOST_POOLER:5432/postgres'
.\scripts\backup-supabase.cmd
Remove-Item Env:SUPABASE_DB_URL
```

O script usa uma versao fixada do Supabase CLI e gera:

- `roles.sql`
- `schema.sql`
- `data.sql`
- `auth-data.sql` com usuarios e identidades do Supabase Auth
- `storage-data.sql` com metadados do Storage
- `migration-history.sql` com o historico aplicado no banco
- `manifest.json`
- um arquivo ZIP e seu checksum SHA-256 em `.backups/`

O script valida os arquivos obrigatorios, grava hash individual no manifest e confere o conteudo do ZIP. Para validar novamente um backup existente:

```powershell
.\scripts\verify-supabase-backup.cmd -ArchivePath .\.backups\supabase-backup-AAAAMMDD-HHMMSS.zip
```

A pasta `.backups/` e ignorada pelo Git. O arquivo contem contas e dados de clientes: mova cada copia para armazenamento externo criptografado e apague copias locais que nao forem necessarias.

## Frequencia operacional

- Execute ao menos uma vez por semana.
- Execute antes e depois de migrations ou alteracoes de cobranca.
- Mantenha ao menos uma copia fora deste computador.
- Faca um teste de restauracao trimestral em um projeto separado.
- O script remove arquivos locais com mais de 30 dias por padrao. Use `-RetentionDays` para alterar esse periodo.

O primeiro backup verificado foi criado em 18/07/2026. A verificacao confirmou estrutura, dados publicos, contas do Auth, metadados do Storage e historico de migrations em arquivos separados, sem duplicidade entre schemas.

O backup do banco nao inclui a configuracao de SMTP, os secrets das Edge Functions, o DNS nem o conteudo binario dos arquivos do Storage. Esses itens devem permanecer documentados e versionados sem seus valores secretos. O Lucro da Carne atualmente nao usa o Storage para guardar os lotes.
