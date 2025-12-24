"use client"

import { useEffect, useState, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, Plus, X, Trophy, History, Check } from "lucide-react"
import { toast } from "sonner"
import confetti from "canvas-confetti"

// Interfaces
interface Exercise {
  id: string
  name: string
  muscle_group: string
}

interface LogExerciseItem {
  unique_id: string
  exercise_id: string
  name: string
  is_extra: boolean
}

interface SetData {
  id?: string // ID do set_log no banco (para update)
  reps: number | string
  weight: number | string
  completed: boolean
  is_warmup: boolean
}

interface Workout {
  id: string
  name: string
  days_of_week: string[]
  workout_exercises: { exercise_id: string; exercises: Exercise }[]
}

const MUSCLE_GROUPS = ["Peito", "Costas", "Pernas", "Ombros", "Braços", "Core"]

// 1. Lógica principal movida para LogContent
function LogContent() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [allExercises, setAllExercises] = useState<Exercise[]>([])

  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("custom")
  const [workoutName, setWorkoutName] = useState("Treino Avulso")
  const [logExercises, setLogExercises] = useState<LogExerciseItem[]>([])
  const [sets, setSets] = useState<{ [exerciseUniqueId: string]: SetData[] }>({})

  // Histórico de Cargas: { exercise_id: { weight: 10, reps: 10, date: '...' } }
  const [history, setHistory] = useState<Record<string, { weight: number; reps: number; date: string }>>({})

  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // ID do Log atual (criado no primeiro check)
  const [currentLogId, setCurrentLogId] = useState<string | null>(null)

  // Modal Adicionar Extra / Criar
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newExercise, setNewExercise] = useState({ name: "", muscle_group: "" })

  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    loadInitialData()
  }, [])

  async function loadInitialData() {
    const supabase = createClient()
    const { data: exData } = await supabase.from("exercises").select("*").order("name")
    if (exData) setAllExercises(exData)

    const { data: wData } = await supabase
      .from("workouts")
      .select(`*, workout_exercises(exercise_id, exercises(*))`)

    if (wData) {
      setWorkouts(wData as any)
      const paramWorkout = searchParams.get("workout")

      const today = new Date().toLocaleDateString("pt-BR", { weekday: "long" })
      const target = paramWorkout
        ? wData.find((w) => w.id === paramWorkout)
        : wData.find((w) => w.days_of_week?.some((d) => d && today.toLowerCase().includes(d.toLowerCase())))

      if (target) selectWorkout(target as any)
      else setIsLoading(false)
    }

    // Carregar histórico de cargas
    loadHistory()
  }

  async function loadHistory() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: historyData } = await supabase
      .from("set_logs")
      .select(`weight, reps, exercise_id, created_at`)
      .eq("completed", true)
      .order("created_at", { ascending: false })
      .limit(500)

    if (historyData) {
      const historyMap: Record<string, any> = {}
      historyData.forEach((item) => {
        if (!historyMap[item.exercise_id]) {
          historyMap[item.exercise_id] = {
            weight: item.weight,
            reps: item.reps,
            date: item.created_at,
          }
        }
      })
      setHistory(historyMap)
    }
  }

  function selectWorkout(workout: Workout) {
    setSelectedWorkoutId(workout.id)
    setWorkoutName(workout.name)
    const items = workout.workout_exercises.map((we, idx) => ({
      unique_id: `planned-${we.exercise_id}-${idx}`,
      exercise_id: we.exercise_id,
      name: we.exercises.name,
      is_extra: false,
    }))
    setLogExercises(items)
    const initialSets: any = {}
    items.forEach((i) => (initialSets[i.unique_id] = []))
    setSets(initialSets)
    setIsLoading(false)
  }

  function addSet(uniqueId: string) {
    setSets((prev) => {
      const current = prev[uniqueId] || []
      const lastSet =
        current.length > 0
          ? current[current.length - 1]
          : { reps: "", weight: "", completed: false, is_warmup: false }

      return {
        ...prev,
        [uniqueId]: [...current, { ...lastSet, completed: false, id: undefined }],
      }
    })
  }

  function updateSet(uniqueId: string, index: number, field: keyof SetData, value: any) {
    setSets((prev) => {
      const currentSets = [...(prev[uniqueId] || [])]

      let shouldUncheck = false
      if ((field === "weight" || field === "reps") && currentSets[index].completed) {
        shouldUncheck = true
      }

      currentSets[index] = {
        ...currentSets[index],
        [field]: value,
        completed: shouldUncheck ? false : field === "completed" ? value : currentSets[index].completed,
      }

      if (field === "completed" && value === true) {
        saveSetToDb(uniqueId, currentSets[index], index)
      }

      return { ...prev, [uniqueId]: currentSets }
    })
  }

  async function saveSetToDb(exerciseUniqueId: string, setData: SetData, index: number) {
    const exercise = logExercises.find((e) => e.unique_id === exerciseUniqueId)
    if (!exercise) return

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    let activeLogId = currentLogId

    if (!activeLogId) {
      const { data: newLog, error } = await supabase
        .from("workout_logs")
        .insert({
          user_id: user.id,
          workout_id: selectedWorkoutId !== "custom" ? selectedWorkoutId : null,
          date: date,
          completed: false,
          notes: workoutName,
        })
        .select()
        .single()

      if (error || !newLog) {
        toast.error("Erro ao iniciar salvamento")
        return
      }
      activeLogId = newLog.id
      setCurrentLogId(newLog.id)
    }

    const payload = {
      workout_log_id: activeLogId,
      exercise_id: exercise.exercise_id,
      set_number: index + 1,
      reps: Number(setData.reps),
      weight: Number(setData.weight),
      completed: true,
      is_warmup: setData.is_warmup,
    }

    let result
    if (setData.id) {
      result = await supabase.from("set_logs").update(payload).eq("id", setData.id).select().single()
    } else {
      result = await supabase.from("set_logs").insert(payload).select().single()
    }

    if (result.data) {
      setSets((prev) => {
        const newSets = [...prev[exerciseUniqueId]]
        newSets[index] = { ...newSets[index], id: result.data.id }
        return { ...prev, [exerciseUniqueId]: newSets }
      })
      toast.success("Série salva!")
    }
  }

  function toggleWarmup(uniqueId: string, index: number) {
    const current = sets[uniqueId][index].is_warmup
    updateSet(uniqueId, index, "is_warmup", !current)
  }

  async function handleCreateNewExercise() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data } = await supabase
      .from("exercises")
      .insert({
        ...newExercise,
        is_custom: true,
        user_id: user?.id,
      })
      .select()
      .single()

    if (data) {
      setAllExercises((prev) => [...prev, data])
      handleAddExtraExercise(data)
      setIsCreateOpen(false)
      setNewExercise({ name: "", muscle_group: "" })
      toast.success("Exercício criado e adicionado!")
    }
  }

  function handleAddExtraExercise(exercise: Exercise) {
    const newUniqueId = `extra-${exercise.id}-${Date.now()}`
    setLogExercises((prev) => [
      ...prev,
      {
        unique_id: newUniqueId,
        exercise_id: exercise.id,
        name: exercise.name,
        is_extra: true,
      },
    ])
    setSets((prev) => ({ ...prev, [newUniqueId]: [] }))
    setIsAddOpen(false)
    setSearchTerm("")
  }

  async function handleFinish() {
    setIsSaving(true)
    const supabase = createClient()

    if (currentLogId) {
      await supabase.from("workout_logs").update({ completed: true }).eq("id", currentLogId)
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("workout_logs").insert({
          user_id: user.id,
          workout_id: selectedWorkoutId !== "custom" ? selectedWorkoutId : null,
          date: date,
          completed: true,
          notes: workoutName,
        })
      }
    }

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    })

    setTimeout(() => {
      router.push("/dashboard")
    }, 2000)
  }

  if (isLoading) return <div className="flex h-screen items-center justify-center">Carregando...</div>

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-sm font-bold">{workoutName}</h1>
              <p className="text-xs text-muted-foreground capitalize">
                {new Date(date).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric" })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-3xl p-4 space-y-6">
        {logExercises.map((exercise) => {
          const lastHistory = history[exercise.exercise_id]

          return (
            <Card key={exercise.unique_id} className="overflow-hidden shadow-sm border-l-4 border-l-primary/50">
              <CardHeader className="bg-muted/30 py-3 px-4 flex flex-row items-center justify-between space-y-0">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base">{exercise.name}</CardTitle>
                  <div className="flex items-center gap-3">
                    {exercise.is_extra && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Extra</span>
                    )}
                    {lastHistory && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full border">
                        <History className="h-3 w-3" />
                        Last: <strong>{lastHistory.weight}kg</strong> x {lastHistory.reps}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setLogExercises((prev) => prev.filter((ex) => ex.unique_id !== exercise.unique_id))
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-2 space-y-2">
                  {(sets[exercise.unique_id]?.length || 0) > 0 && (
                    <div className="grid grid-cols-10 gap-2 text-xs text-muted-foreground text-center font-medium px-2 uppercase tracking-wider">
                      <div className="col-span-1">#</div>
                      <div className="col-span-3">kg</div>
                      <div className="col-span-3">reps</div>
                      <div className="col-span-3">check</div>
                    </div>
                  )}

                  {(sets[exercise.unique_id] || []).map((set, idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-10 gap-2 items-center transition-all duration-300 ${
                        set.completed ? "opacity-50" : "opacity-100"
                      }`}
                    >
                      <div className="col-span-1 flex justify-center">
                        <div
                          onClick={() => toggleWarmup(exercise.unique_id, idx)}
                          className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                            set.is_warmup
                              ? "bg-yellow-500 text-yellow-950"
                              : set.completed
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {set.is_warmup ? "W" : idx + 1}
                        </div>
                      </div>

                      <div className="col-span-3">
                        <Input
                          type="number"
                          className={`h-10 text-center font-bold text-lg ${
                            set.completed ? "bg-muted/50" : "bg-background"
                          }`}
                          placeholder={lastHistory ? String(lastHistory.weight) : "-"}
                          value={set.weight}
                          onChange={(e) => updateSet(exercise.unique_id, idx, "weight", e.target.value)}
                        />
                      </div>

                      <div className="col-span-3">
                        <Input
                          type="number"
                          className={`h-10 text-center font-bold text-lg ${
                            set.completed ? "bg-muted/50" : "bg-background"
                          }`}
                          placeholder={lastHistory ? String(lastHistory.reps) : "-"}
                          value={set.reps}
                          onChange={(e) => updateSet(exercise.unique_id, idx, "reps", e.target.value)}
                        />
                      </div>

                      <div className="col-span-3 flex justify-center">
                        <Button
                          className={`w-full h-10 transition-all ${
                            set.completed
                              ? "bg-green-500 hover:bg-green-600 text-white"
                              : "bg-muted hover:bg-muted/80 text-muted-foreground"
                          }`}
                          onClick={() => updateSet(exercise.unique_id, idx, "completed", !set.completed)}
                        >
                          <Check className={`h-5 w-5 ${set.completed ? "scale-110" : "scale-100"}`} />
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
          )
        })}

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full py-8 border-dashed border-2 text-muted-foreground hover:text-primary hover:border-primary"
            >
              <Plus className="mr-2 h-5 w-5" /> Adicionar Exercício ao Treino
            </Button>
          </DialogTrigger>
          <DialogContent className="top-[20%] translate-y-0">
            <DialogHeader>
              <DialogTitle>Adicionar Exercício</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou tag..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {allExercises
                  .filter(
                    (ex) =>
                      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      ex.muscle_group.toLowerCase().includes(searchTerm.toLowerCase()),
                  )
                  .slice(0, 10)
                  .map((ex) => (
                    <div
                      key={ex.id}
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
                    <DialogHeader>
                      <DialogTitle>Novo Exercício</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          value={newExercise.name}
                          onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Grupo</Label>
                        <Select
                          onValueChange={(val) => setNewExercise({ ...newExercise, muscle_group: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {MUSCLE_GROUPS.map((g) => (
                              <SelectItem key={g} value={g}>
                                {g}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleCreateNewExercise} className="w-full">
                        Salvar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="pt-4 pb-8">
          <Button
            size="lg"
            className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20"
            onClick={handleFinish}
            disabled={isSaving}
          >
            {isSaving ? (
              "Salvando..."
            ) : (
              <>
                <Trophy className="mr-2 h-6 w-6 text-yellow-400" /> FINALIZAR TREINO
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// 2. Novo componente padrão que envolve o conteúdo em Suspense
export default function LogPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Carregando...</div>}>
      <LogContent />
    </Suspense>
  )
}
