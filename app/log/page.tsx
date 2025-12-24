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
import { ArrowLeft, Search, Plus, X, Trophy, History, Check, Flame, Calendar as CalendarIcon, Clock, Trash2 } from "lucide-react"
import { toast } from "sonner"
import confetti from "canvas-confetti"

// --- Interfaces ---

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
  id?: string 
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

// --- Lógica Principal do Componente ---

function LogContent() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [allExercises, setAllExercises] = useState<Exercise[]>([])

  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("custom")
  const [workoutName, setWorkoutName] = useState("Treino Avulso")
  const [logExercises, setLogExercises] = useState<LogExerciseItem[]>([])
  const [sets, setSets] = useState<{ [exerciseUniqueId: string]: SetData[] }>({})

  // Histórico por Série
  const [history, setHistory] = useState<Record<string, Record<number, { weight: number; reps: number; date: string }>>>({})

  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  const [currentLogId, setCurrentLogId] = useState<string | null>(null)

  // Modais
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
    
    if (wData) setWorkouts(wData as any)

    const logIdToEdit = searchParams.get("id")
    const paramWorkout = searchParams.get("workout")

    if (logIdToEdit) {
        await loadLogForEditing(logIdToEdit, exData || [])
    } else if (wData) {
      const today = new Date().toLocaleDateString("pt-BR", { weekday: "long" })
      const target = paramWorkout
        ? wData.find((w) => w.id === paramWorkout)
        : wData.find((w) => w.days_of_week?.some((d) => d && today.toLowerCase().includes(d.toLowerCase())))

      if (target) selectWorkout(target as any)
      else setIsLoading(false)
    } else {
        setIsLoading(false)
    }

    loadHistory()
  }

  async function loadLogForEditing(logId: string, exercisesList: Exercise[]) {
      setIsEditMode(true)
      setCurrentLogId(logId)
      const supabase = createClient()

      const { data: log, error } = await supabase
        .from("workout_logs")
        .select(`*, set_logs(*), workouts(name)`)
        .eq("id", logId)
        .single()

      if (error || !log) {
          toast.error("Treino não encontrado")
          setIsLoading(false)
          return
      }

      setDate(log.date)
      if (log.created_at) {
          const dateObj = new Date(log.created_at)
          setTime(dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      }
      setWorkoutName(log.notes || (log.workouts?.name) || "Treino Personalizado")
      setSelectedWorkoutId(log.workout_id || "custom")

      const groupedSets: Record<string, any[]> = {}
      const sortedSets = log.set_logs.sort((a: any, b: any) => a.set_number - b.set_number)

      sortedSets.forEach((set: any) => {
          if (!groupedSets[set.exercise_id]) groupedSets[set.exercise_id] = []
          groupedSets[set.exercise_id].push(set)
      })

      const restoredExercises: LogExerciseItem[] = []
      const restoredSetsState: any = {}

      Object.keys(groupedSets).forEach((exId, index) => {
          const exerciseDef = exercisesList.find(e => e.id === exId)
          const uniqueId = `edit-${exId}-${index}`
          
          if (exerciseDef) {
              restoredExercises.push({
                  unique_id: uniqueId,
                  exercise_id: exId,
                  name: exerciseDef.name,
                  is_extra: false
              })

              restoredSetsState[uniqueId] = groupedSets[exId].map((s: any) => ({
                  id: s.id,
                  reps: s.reps,
                  weight: s.weight,
                  completed: s.completed,
                  is_warmup: s.is_warmup || false
              }))
          }
      })

      setLogExercises(restoredExercises)
      setSets(restoredSetsState)
      setIsLoading(false)
  }

  async function loadHistory() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: historyData } = await supabase
      .from("set_logs")
      .select(`weight, reps, exercise_id, set_number, created_at`)
      .eq("completed", true)
      .order("created_at", { ascending: false })
      .limit(1000)

    if (historyData) {
      const historyMap: Record<string, Record<number, any>> = {}
      historyData.forEach((item) => {
        if (!historyMap[item.exercise_id]) historyMap[item.exercise_id] = {}
        if (!historyMap[item.exercise_id][item.set_number]) {
            historyMap[item.exercise_id][item.set_number] = {
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
      const lastSet = current.length > 0
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
    const { data: { user } } = await supabase.auth.getUser()
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
    const { data: { user } } = await supabase.auth.getUser()

    const { data } = await supabase.from("exercises").insert({
        ...newExercise,
        is_custom: true,
        user_id: user?.id,
      }).select().single()

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
      { unique_id: newUniqueId, exercise_id: exercise.id, name: exercise.name, is_extra: true },
    ])
    setSets((prev) => ({ ...prev, [newUniqueId]: [] }))
    setIsAddOpen(false)
    setSearchTerm("")
  }

  async function handleFinish() {
    setIsSaving(true)
    const supabase = createClient()

    if (currentLogId) {
      await supabase.from("workout_logs").update({ 
          completed: true,
          date: date,
          notes: workoutName
      }).eq("id", currentLogId)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
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

    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    setTimeout(() => { router.push("/dashboard") }, 1500)
  }

  async function handleDelete() {
    if (!currentLogId) return
    if (!confirm("Tem certeza que deseja excluir este treino? Essa ação não pode ser desfeita.")) return

    setIsSaving(true)
    const supabase = createClient()
    
    const { error } = await supabase
        .from("workout_logs")
        .delete()
        .eq("id", currentLogId)

    if (error) {
        toast.error("Erro ao excluir o treino")
        setIsSaving(false)
    } else {
        toast.success("Treino excluído com sucesso")
        router.push("/dashboard")
    }
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3"/> 
                    {new Date(date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                  </span>
                  {isEditMode && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3"/> {time}</span>
                  )}
              </div>
            </div>
          </div>

          {isEditMode && (
            <Button 
                variant="ghost" 
                size="icon" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
            >
                <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      <div className="container mx-auto max-w-3xl p-4 space-y-6">
        {logExercises.map((exercise) => {
          const currentSetCount = (sets[exercise.unique_id]?.length || 0)
          const nextSetNumber = currentSetCount + 1
          
          const setHistoryData = history[exercise.exercise_id]?.[nextSetNumber]

          return (
            <Card key={exercise.unique_id} className="overflow-hidden shadow-sm border-l-4 border-l-primary/50">
              <CardHeader className="bg-muted/30 py-3 px-4 flex flex-row items-center justify-between space-y-0">
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base truncate pr-2">{exercise.name}</CardTitle>
                    <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive -mt-1 -mr-2"
                        onClick={() => setLogExercises((prev) => prev.filter((ex) => ex.unique_id !== exercise.unique_id))}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    {exercise.is_extra && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Extra</span>
                    )}
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full border border-dashed border-primary/30">
                        <History className="h-3 w-3 text-primary" />
                        {setHistoryData ? (
                            <span>
                                Série {nextSetNumber}: <strong>{setHistoryData.weight}kg</strong> x {setHistoryData.reps}
                            </span>
                        ) : (
                            <span>Série {nextSetNumber}: Sem histórico</span>
                        )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="p-2 space-y-2">
                  {(sets[exercise.unique_id]?.length || 0) > 0 && (
                    <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground text-center font-medium px-2 uppercase tracking-wider">
                      <div className="col-span-1">#</div>
                      <div className="col-span-4">kg</div>
                      <div className="col-span-4">reps</div>
                      <div className="col-span-3">Check</div>
                    </div>
                  )}

                  {(sets[exercise.unique_id] || []).map((set, idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-12 gap-2 items-center transition-all duration-300 ${
                        set.completed ? "opacity-50" : "opacity-100"
                      }`}
                    >
                      <div className="col-span-1 flex justify-center">
                        <div
                          onClick={() => toggleWarmup(exercise.unique_id, idx)}
                          className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                            set.is_warmup
                              ? "bg-orange-500 text-white"
                              : set.completed
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {set.is_warmup ? "W" : idx + 1}
                        </div>
                      </div>

                      <div className="col-span-4">
                        <Input
                          type="number"
                          className={`h-10 text-center font-bold text-lg ${set.completed ? "bg-muted/50" : "bg-background"}`}
                          placeholder={history[exercise.exercise_id]?.[idx+1]?.weight?.toString() || "-"}
                          value={set.weight}
                          onChange={(e) => updateSet(exercise.unique_id, idx, "weight", e.target.value)}
                        />
                      </div>

                      <div className="col-span-4">
                        <Input
                          type="number"
                          className={`h-10 text-center font-bold text-lg ${set.completed ? "bg-muted/50" : "bg-background"}`}
                          placeholder={history[exercise.exercise_id]?.[idx+1]?.reps?.toString() || "-"}
                          value={set.reps}
                          onChange={(e) => updateSet(exercise.unique_id, idx, "reps", e.target.value)}
                        />
                      </div>

                      <div className="col-span-3 flex gap-1 justify-center">
                        <Button
                          size="icon"
                          className={`flex-1 h-10 transition-all ${
                            set.completed
                              ? "bg-green-500 hover:bg-green-600 text-white"
                              : "bg-muted hover:bg-muted/80 text-muted-foreground"
                          }`}
                          onClick={() => updateSet(exercise.unique_id, idx, "completed", !set.completed)}
                        >
                          <Check className={`h-5 w-5 ${set.completed ? "scale-110" : "scale-100"}`} />
                        </Button>

                         {!set.completed && (
                             <Button
                                size="icon"
                                variant="ghost"
                                className={`h-10 w-8 ${set.is_warmup ? "text-orange-500 bg-orange-500/10" : "text-muted-foreground/30 hover:text-orange-500"}`}
                                onClick={() => toggleWarmup(exercise.unique_id, idx)}
                             >
                                 <Flame className="h-4 w
