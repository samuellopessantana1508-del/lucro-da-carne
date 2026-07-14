# Backup externo no Supabase Free

O Supabase Free nao permite baixar os backups gerenciados da plataforma. Por decisao do proprietario, o Lucro da Carne permanece nesse plano e usa um backup logico externo como medida compensatoria.

## Preparacao unica

1. Instale o Docker Desktop e deixe o servico em execucao.
2. No Supabase, abra o projeto `arosnbldkgvbqhwnwfcr` e clique em **Connect**.
3. Copie a connection string do **Session pooler** e substitua o marcador de senha pela senha do banco.
4. Nao salve a connection string em arquivos do projeto, no GitHub ou na Hostinger.

## Executar o backup

No PowerShell, a partir da raiz do projeto:

```powershell
$env:SUPABASE_DB_URL = 'postgresql://postgres.PROJECT_REF:SENHA@HOST_POOLER:5432/postgres'
.\scripts\backup-supabase.cmd
Remove-Item Env:SUPABASE_DB_URL
```

O script usa uma versao fixada do Supabase CLI e gera:

- `roles.sql`
- `schema.sql`
- `data.sql`
- `manifest.json`
- um arquivo ZIP e seu checksum SHA-256 em `.backups/`

A pasta `.backups/` e ignorada pelo Git. O arquivo contem contas e dados de clientes: mova cada copia para armazenamento externo criptografado e apague copias locais que nao forem necessarias.

## Frequencia operacional

- Execute ao menos uma vez por semana.
- Execute antes e depois de migrations ou alteracoes de cobranca.
- Mantenha ao menos uma copia fora deste computador.
- Faca um teste de restauracao trimestral em um projeto separado.
- O script remove arquivos locais com mais de 30 dias por padrao. Use `-RetentionDays` para alterar esse periodo.

O backup do banco nao inclui a configuracao de SMTP, os secrets das Edge Functions, o DNS ou arquivos de Storage. Esses itens devem permanecer documentados e versionados sem seus valores secretos.
