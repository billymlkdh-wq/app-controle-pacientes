# Pacientes App

App de gestão de pacientes do Rafael Bolson Nutricionista — Next.js 15 + Supabase + shadcn/ui.

## Setup

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha as variáveis.
3. Execute o SQL em `supabase/migrations/0001_init.sql` no SQL Editor do Supabase.
4. Regenere tipos: `npm run types:gen`
5. Deploy das Edge Functions:
   - `supabase functions deploy send-whatsapp`
   - `supabase functions deploy notify-cron`
6. Agende o cron (pg_cron) para rodar `notify-cron` diariamente.
7. Configure templates WhatsApp no Meta Business Manager: `questionario_lembrete_d2`, `questionario_atraso_d1`, `questionario_atraso_d3`, `questionario_atraso_d7`, `admin_paciente_atrasado`, `admin_pagamento_atrasado`.

## Desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Papel admin

Via Dashboard Supabase → Authentication → Users → editar `user_metadata.role = 'admin'`.
