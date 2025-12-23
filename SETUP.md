# Setup do Projeto - App de Treinos

## Variáveis de Ambiente Necessárias

Para o app funcionar corretamente, você precisa adicionar as seguintes variáveis de ambiente no painel **"Vars"** do v0:

### Como adicionar:

1. Clique em **"Vars"** no painel lateral esquerdo
2. Adicione as seguintes variáveis:

### Variáveis Obrigatórias:

**NEXT_PUBLIC_SUPABASE_URL**
- Copie o valor de `SUPABASE_URL` que já existe nas suas variáveis
- Formato: `https://seu-projeto.supabase.co`
```
https://hudbavbhohmxcresequb.supabase.co
```

**NEXT_PUBLIC_SUPABASE_ANON_KEY**
- Copie o valor de `SUPABASE_ANON_KEY` que já existe nas suas variáveis
- É uma chave longa começando com `eyJ...`
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1ZGJhdmJob2hteGNyZXNlcXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MDczMTQsImV4cCI6MjA4MjA4MzMxNH0.Y5vmGg3GzFLGGTLk9Bgx6W2AEEZDt2W39qpPXHv658M
```

### Por que preciso do prefixo NEXT_PUBLIC_?

As variáveis com prefixo `NEXT_PUBLIC_` são expostas no navegador (client-side). Como o Supabase precisa funcionar tanto no servidor quanto no cliente, essas variáveis são necessárias para o login, registro e outras operações no navegador.

## Após adicionar as variáveis

1. Recarregue a página
2. Faça o registro de um novo usuário
3. Comece a usar o app!

## Scripts SQL

Os scripts SQL em `/scripts` já foram executados e criaram:
- Tabelas: exercises, workouts, workout_exercises, workout_logs, set_logs
- 44 exercícios pré-cadastrados organizados por grupo muscular
- Políticas RLS para segurança dos dados
