"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, Trash2, Check, Search, Save, Flame, Trophy, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

// Interfaces
interface Exercise {
  id: string; name: string; muscle_group: string
}
interface LogExerciseItem {
  unique_id: string; exercise_id: string; name: string; is_extra: boolean
}
interface SetData {
  reps: number | string; weight: number | string; completed: boolean; is_warmup: boolean
}
interface Workout {
  id: string; name: string; days_of_week: string[];
  workout_exercises: { exercise_id: string; exercises: Exercise }[]
}

const MUSCLE_GROUPS = ["Peito", "Costas", "Pernas", "Ombros", "Braços", "Core"]

export default function LogPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("custom")
  const [workoutName, setWorkoutName] = useState("Treino Avulso")
  const [logExercises, setLogExercises] = useState<LogExerciseItem[]>([])
  const [sets, setSets] = useState<{ [exerciseUniqueId: string]: SetData[] }>({})
  
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Modal Adicionar Extra / Criar
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newExercise, setNewExercise] = useState({ name: "", muscle_group: "" })

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => { loadInitialData() }, [])

  async function loadInitialData() {
    const supabase = createClient()
    const { data: exData } = await supabase.from("exercises").select("*").order("name")
    if (exData) setAllExercises(exData)

    const { data: wData } = await supabase.from("workouts").select(`*, workout_exercises(exercise_id, exercises(*))`)
    
    if (wData) {
      setWorkouts(wData as any)
      const paramWorkout = searchParams.get("workout")
      const today = new Date().toLocaleDateString("pt-BR", { weekday: "long" })
      
      const target = paramWorkout 
        ? wData.find(w => w.id === paramWorkout) 
        : wData.find(w => w.days_of_week?.some(d => d && today.toLowerCase().includes(d.toLowerCase())))
      if (target) selectWorkout(target as any)
      else setIsLoading(false)
    }
  }

  function selectWorkout(workout: Workout) {
    setSelectedWorkoutId(workout.id)
    setWorkoutName(workout.name)
    const items = workout.workout_exercises.map((we, idx) => ({
      unique_id: `planned-${we.exercise_id}-${idx}`,
      exercise_id: we.exercise_id,
      name: we.exercises.name,
      is_extra: false
    }))
    setLogExercises(items)
    const initialSets: any = {}
    items.forEach(i => initialSets[i.unique_id] = [])
    setSets(initialSets)
    setIsLoading(false)
  }

  // --- Lógica de Exercícios (Remover da lista do dia) ---

  function removeExerciseFromLog(uniqueId: string) {
    if (!confirm("Remover este exercício do treino de hoje?")) return
    
    setLogExercises(prev => prev.filter(ex => ex.unique_id !== uniqueId))
    setSets(prev => {
        const newSets = { ...prev }
        delete newSets[uniqueId]
        return newSets
    })
  }

  // --- Lógica de Séries ---

  function addSet(uniqueId: string) {
    setSets(prev => {
        const current = prev[uniqueId] || []
        const lastSet = current.length > 0 ? current[current.length - 1] : { reps: '', weight: '', completed: false, is_warmup: false }
        return {
            ...prev,
            [uniqueId]: [...current, { ...lastSet, completed: false }]
        }
    })
  }

  function updateSet(uniqueId: string, index: number, field: keyof SetData, value: any) {
    setSets(prev => {
      const currentSets = [...(prev[uniqueId] || [])]
      currentSets[index] = { ...currentSets[index], [field]: value }
      return { ...prev, [uniqueId]: currentSets }
    })
  }

  function removeSet(uniqueId: string, index: number) {
    setSets(prev => ({ ...prev, [uniqueId]: prev[uniqueId].filter((_, i) => i !== index) }))
  }

  function toggleWarmup(uniqueId: string, index: number) {
    const current = sets[uniqueId][index].is_warmup
    updateSet(uniqueId, index, 'is_warmup', !current)
  }

  // --- Adicionar Exercício Extra / Criar ---

  async function handleCreateNewExercise() {
    const supabase = createClient()
    const { data, error } = await supabase.from("exercises").insert({
        ...newExercise, is_custom: true
    }).select().single()

    if (data) {
        setAllExercises(prev => [...prev, data])
        handleAddExtraExercise(data)
        setIsCreateOpen(false)
        setNewExercise({ name: "", muscle_group: "" })
    }
  }

  function handleAddExtraExercise(exercise: Exercise) {
    const newUniqueId = `extra-${exercise.id}-${Date.now()}`
    setLogExercises(prev => [...prev, {
      unique_id: newUniqueId, exercise_id: exercise.id, name: exercise.name, is_extra: true
    }])
    setSets(prev => ({ ...prev, [newUniqueId]: [] }))
    setIsAddOpen(false)
    setSearchTerm("")
  }

  const filteredExercises = allExercises.filter(ex => {
    const t = searchTerm.toLowerCase()
    return ex.name.toLowerCase().includes(t) || ex.muscle_group.toLowerCase().includes(t)
  }).slice(0, 5)

  // --- Finalizar ---

  async function handleFinish() {
    setIsSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: log, error } = await supabase.from("workout_logs").insert({
        user_id: user.id,
        workout_id: selectedWorkoutId !== 'custom' ? selectedWorkoutId : null,
        date: date,
        completed: true,
        notes: workoutName
    }).select().single()

    if (log) {
        const setsToInsert: any[] = []
        logExercises.forEach(ex => {
            (sets[ex.unique_id] || []).forEach((s, idx) => {
                if (s.completed) {
                    setsToInsert.push({
                        workout_log_id: log.id,
                        exercise_id: ex.exercise_id,
                        set_number: idx + 1,
                        reps: Number(s.reps),
                        weight: Number(s.weight),
                        completed: true,
                        is_warmup: s.is_warmup
                    })
                }
            })
        })
        if (setsToInsert.length > 0) await supabase.from("set_logs").insert(setsToInsert)
        router.push("/dashboard")
    }
    setIsSaving(false)
  }

  if (isLoading) return <div className="flex h-screen items-center justify-center">Carregando...</div>

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h1 className="text-sm font-bold">{workoutName}</h1>
            <p className="text-xs text-muted-foreground">{new Date(date).toLocaleDateString("pt-BR")}</p>
          </div>
          <Button size="sm" onClick={handleFinish} disabled={isSaving} className={isSaving ? "opacity-50" : ""}>
            {isSaving ? "..." : <Save className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="container mx-auto max-w-3xl p-4 space-y-6">
        
        {/* Lista de Exercícios */}
        {logExercises.map((exercise) => (
            <Card key={exercise.unique_id} className="overflow-hidden shadow-sm border-l-4 border-l-primary/50">
                <CardHeader className="bg-muted/20 py-3 px-4 flex flex-row items-center justify-between space-y-0">
                    <div className="flex flex-col">
                        <CardTitle className="text-base">{exercise.name}</CardTitle>
                        {exercise.is_extra && <span className="text-[10px] text-primary font-medium">Extra</span>}
                    </div>
                    {/* Botão de Remover Exercício do Dia */}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeExerciseFromLog(exercise.unique_id)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-2 space-y-2">
                        {/* Header da Tabela */}
                        {(sets[exercise.unique_id]?.length || 0) > 0 && (
                            <div className="grid grid-cols-10 gap-2 text-xs text-muted-foreground text-center font-medium px-2">
                                <div className="col-span-1">#</div>
                                <div className="col-span-3">KG</div>
                                <div className="col-span-3">REPS</div>
                                <div className="col-span-3">TIPO</div>
                            </div>
                        )}

                        {/* Linhas de Séries */}
                        {(sets[exercise.unique_id] || []).map((set, idx) => (
                            <div key={idx} className={`grid grid-cols-10 gap-2 items-center ${set.is_warmup ? 'opacity-90' : ''}`}>
                                <div className="col-span-1 flex justify-center">
                                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${set.completed ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                        {idx + 1}
                                    </div>
                                </div>
                                
                                <div className="col-span-3">
                                    <Input 
                                        type="number" className="h-9 text-center font-bold" placeholder="-"
                                        value={set.weight}
                                        onChange={(e) => updateSet(exercise.unique_id, idx, 'weight', e.target.value)}
                                    />
                                </div>
                                
                                <div className="col-span-3">
                                    <Input 
                                        type="number" className="h-9 text-center font-bold" placeholder="-"
                                        value={set.reps}
                                        onChange={(e) => updateSet(exercise.unique_id, idx, 'reps', e.target.value)}
                                    />
                                </div>

                                {/* Botões de Ação */}
                                <div className="col-span-3 flex gap-1 justify-center">
                                    <Button 
                                        size="icon" variant="ghost" 
                                        className={`h-9 w-9 rounded-md border ${set.is_warmup ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'bg-green-500/10 border-green-600 text-green-600'}`}
                                        onClick={() => toggleWarmup(exercise.unique_id, idx)}
                                    >
                                        {set.is_warmup ? <Flame className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
                                    </Button>
                                    
                                    <Button 
                                        size="icon" 
                                        className={`h-9 w-9 shrink-0 ${set.completed ? 'bg-primary' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                        onClick={() => updateSet(exercise.unique_id, idx, 'completed', !set.completed)}
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    
                                    <Button 
                                        size="icon" variant="ghost"
                                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeSet(exercise.unique_id, idx)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button 
                        variant="ghost" 
                        className="w-full rounded-none border-t h-12 text-primary hover:text-primary hover:bg-primary/5 font-medium"
                        onClick={() => addSet(exercise.unique_id)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Série
                    </Button>
                </CardContent>
            </Card>
        ))}

        {/* Adicionar Exercício ao Treino */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full py-8 border-dashed border-2 text-muted-foreground hover:text-primary hover:border-primary">
                    <Plus className="mr-2 h-5 w-5" /> Adicionar Exercício ao Treino
                </Button>
            </DialogTrigger>
            <DialogContent className="top-[20%] translate-y-0">
                <DialogHeader><DialogTitle>Adicionar Exercício</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por nome ou tag..." className="pl-9"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                        {filteredExercises.map(ex => (
                            <div key={ex.id} 
                                className="p-3 hover:bg-accent rounded-md cursor-pointer flex justify-between items-center"
                                onClick={() => handleAddExtraExercise(ex)}
                            >
                                <span className="font-medium">{ex.name}</span>
                                <span className="text-xs bg-muted px-2 py-1 rounded">{ex.muscle_group}</span>
                            </div>
                        ))}
                        
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <div className="p-3 text-primary font-medium hover:bg-primary/10 rounded-md cursor-pointer flex items-center gap-2">
                                    <Plus className="h-4 w-4" /> Cadastrar novo: "{searchTerm}"
                                </div>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Novo Exercício</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Nome</Label>
                                        <Input value={newExercise.name} onChange={e => setNewExercise({...newExercise, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Grupo</Label>
                                        <Select onValueChange={val => setNewExercise({...newExercise, muscle_group: val})}>
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                {MUSCLE_GROUPS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button onClick={handleCreateNewExercise} className="w-full">Salvar</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
