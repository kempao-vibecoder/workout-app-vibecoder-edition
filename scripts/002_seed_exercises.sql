-- Seed de exercícios pré-cadastrados
INSERT INTO public.exercises (name, muscle_group, description, is_custom) VALUES
  -- Peito
  ('Supino Reto', 'Peito', 'Exercício fundamental para desenvolvimento do peitoral', FALSE),
  ('Supino Inclinado', 'Peito', 'Foca na parte superior do peitoral', FALSE),
  ('Supino Declinado', 'Peito', 'Trabalha a parte inferior do peitoral', FALSE),
  ('Crucifixo Reto', 'Peito', 'Isolamento do peitoral com halteres', FALSE),
  ('Crucifixo Inclinado', 'Peito', 'Isolamento da parte superior do peitoral', FALSE),
  ('Flexão de Braço', 'Peito', 'Exercício de peso corporal para peitoral', FALSE),
  ('Crossover', 'Peito', 'Isolamento do peitoral no cabo', FALSE),
  
  -- Costas
  ('Barra Fixa', 'Costas', 'Exercício fundamental para largura das costas', FALSE),
  ('Remada Curvada', 'Costas', 'Desenvolvimento da espessura das costas', FALSE),
  ('Pulldown', 'Costas', 'Exercício no cabo para largura', FALSE),
  ('Remada Unilateral', 'Costas', 'Trabalho unilateral das costas com halter', FALSE),
  ('Remada Sentado', 'Costas', 'Exercício no cabo para espessura', FALSE),
  ('Levantamento Terra', 'Costas', 'Exercício composto para costas e posterior', FALSE),
  ('Pullover', 'Costas', 'Expansão da caixa torácica', FALSE),
  
  -- Pernas
  ('Agachamento', 'Pernas', 'Rei dos exercícios para membros inferiores', FALSE),
  ('Leg Press', 'Pernas', 'Exercício fundamental para quadríceps', FALSE),
  ('Cadeira Extensora', 'Pernas', 'Isolamento do quadríceps', FALSE),
  ('Cadeira Flexora', 'Pernas', 'Isolamento dos isquiotibiais', FALSE),
  ('Stiff', 'Pernas', 'Trabalha posterior de coxa e glúteos', FALSE),
  ('Agachamento Búlgaro', 'Pernas', 'Exercício unilateral para pernas', FALSE),
  ('Elevação Pélvica', 'Pernas', 'Foco em glúteos', FALSE),
  ('Panturrilha em Pé', 'Pernas', 'Desenvolvimento das panturrilhas', FALSE),
  
  -- Ombros
  ('Desenvolvimento', 'Ombros', 'Exercício fundamental para ombros', FALSE),
  ('Desenvolvimento com Halteres', 'Ombros', 'Variação com maior amplitude', FALSE),
  ('Elevação Lateral', 'Ombros', 'Isolamento do deltoide lateral', FALSE),
  ('Elevação Frontal', 'Ombros', 'Trabalha o deltoide anterior', FALSE),
  ('Crucifixo Inverso', 'Ombros', 'Foco no deltoide posterior', FALSE),
  ('Remada Alta', 'Ombros', 'Trabalha ombros e trapézio', FALSE),
  ('Encolhimento', 'Ombros', 'Desenvolvimento do trapézio', FALSE),
  
  -- Braços
  ('Rosca Direta', 'Braços', 'Exercício fundamental para bíceps', FALSE),
  ('Rosca Alternada', 'Braços', 'Trabalho unilateral dos bíceps', FALSE),
  ('Rosca Martelo', 'Braços', 'Trabalha bíceps e antebraço', FALSE),
  ('Rosca Concentrada', 'Braços', 'Isolamento máximo do bíceps', FALSE),
  ('Tríceps Testa', 'Braços', 'Exercício fundamental para tríceps', FALSE),
  ('Tríceps Francês', 'Braços', 'Alongamento máximo do tríceps', FALSE),
  ('Tríceps Corda', 'Braços', 'Exercício no cabo para tríceps', FALSE),
  ('Tríceps Coice', 'Braços', 'Isolamento do tríceps com halter', FALSE),
  ('Rosca Punho', 'Braços', 'Desenvolvimento dos antebraços', FALSE),
  
  -- Core
  ('Abdominal Supra', 'Core', 'Trabalha a parte superior do abdômen', FALSE),
  ('Abdominal Infra', 'Core', 'Foco na parte inferior do abdômen', FALSE),
  ('Prancha', 'Core', 'Isometria para o core completo', FALSE),
  ('Prancha Lateral', 'Core', 'Trabalha os oblíquos', FALSE),
  ('Abdominal Bicicleta', 'Core', 'Exercício dinâmico para abdômen', FALSE),
  ('Elevação de Pernas', 'Core', 'Foco em abdômen inferior', FALSE)
ON CONFLICT DO NOTHING;
