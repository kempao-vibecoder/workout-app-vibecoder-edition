-- Tabela de Exercícios
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  description TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Treinos
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days_of_week TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Exercícios do Treino
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps INTEGER NOT NULL DEFAULT 10,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Registro de Treinos (Log de Execuções)
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Registro de Séries
CREATE TABLE IF NOT EXISTS public.set_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id UUID NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight DECIMAL(6,2) NOT NULL,
  completed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para exercises (exercícios públicos + personalizados do usuário)
CREATE POLICY "exercises_select_all" ON public.exercises FOR SELECT
  USING (is_custom = FALSE OR user_id = auth.uid());

CREATE POLICY "exercises_insert_own" ON public.exercises FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_custom = TRUE);

CREATE POLICY "exercises_update_own" ON public.exercises FOR UPDATE
  USING (user_id = auth.uid() AND is_custom = TRUE);

CREATE POLICY "exercises_delete_own" ON public.exercises FOR DELETE
  USING (user_id = auth.uid() AND is_custom = TRUE);

-- Políticas RLS para workouts
CREATE POLICY "workouts_select_own" ON public.workouts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "workouts_insert_own" ON public.workouts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "workouts_update_own" ON public.workouts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "workouts_delete_own" ON public.workouts FOR DELETE
  USING (user_id = auth.uid());

-- Políticas RLS para workout_exercises
CREATE POLICY "workout_exercises_select_own" ON public.workout_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid()
  ));

CREATE POLICY "workout_exercises_insert_own" ON public.workout_exercises FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid()
  ));

CREATE POLICY "workout_exercises_update_own" ON public.workout_exercises FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid()
  ));

CREATE POLICY "workout_exercises_delete_own" ON public.workout_exercises FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.workouts WHERE workouts.id = workout_exercises.workout_id AND workouts.user_id = auth.uid()
  ));

-- Políticas RLS para workout_logs
CREATE POLICY "workout_logs_select_own" ON public.workout_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "workout_logs_insert_own" ON public.workout_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "workout_logs_update_own" ON public.workout_logs FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "workout_logs_delete_own" ON public.workout_logs FOR DELETE
  USING (user_id = auth.uid());

-- Políticas RLS para set_logs
CREATE POLICY "set_logs_select_own" ON public.set_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workout_logs WHERE workout_logs.id = set_logs.workout_log_id AND workout_logs.user_id = auth.uid()
  ));

CREATE POLICY "set_logs_insert_own" ON public.set_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_logs WHERE workout_logs.id = set_logs.workout_log_id AND workout_logs.user_id = auth.uid()
  ));

CREATE POLICY "set_logs_update_own" ON public.set_logs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.workout_logs WHERE workout_logs.id = set_logs.workout_log_id AND workout_logs.user_id = auth.uid()
  ));

CREATE POLICY "set_logs_delete_own" ON public.set_logs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.workout_logs WHERE workout_logs.id = set_logs.workout_log_id AND workout_logs.user_id = auth.uid()
  ));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON public.workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON public.workout_logs(date);
CREATE INDEX IF NOT EXISTS idx_set_logs_exercise_id ON public.set_logs(exercise_id);
