"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, Check } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Exercise {
  id: string
  name: string
  muscle_group: string
}

interface WorkoutExercise {
  id: string
  exercise_id: string
  target_sets: number
  target_reps: number
  exercises: Exercise
}

interface Workout {
  id: string
  name: string
  workout_exercises: WorkoutExercise[]
}

interface SetData {
  exercise_id: string
  set_number: number
  reps: number
  weight: number
}

export default function LogPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("")
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [sets, setSets] = useState<{ [key: string]: SetData[] }>({})
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    loadWorkouts()
  }, [])

  useEffect(() => {
    const workoutParam = searchParams.get("workout")
    if (workoutParam && workouts.length > 0) {
      setSelectedWorkoutId(workoutParam)
      const workout = workouts.find((w) => w.id === workoutParam)
      if (workout) setSelectedWorkout(workout)
    }
  }, [searchParams, workouts])

  function loadWorkouts() {
    const supabase = createClient()
    supabase
      .from("workouts")
      .select(
        `
        id,
        name,
        workout_exercises (
          id,
          exercise_id,
          target_sets,
          target_reps,
          exercises (
            id,
            name,
            muscle_group
          )
        )
      `,
      )
      .then(({ data }) => {
        if (data) {
          setWorkouts(data as any)
        }
      })
  }

  function handleWorkoutSelect(workoutId: string) {
    setSelectedWorkoutId(workoutId)
    const workout = workouts.find((w) => w.id === workoutId)
    setSelectedWorkout(workout || null)
    setSets({})
  }

  function addSet(exerciseId: string) {
    setSets((prev) => {
      const exerciseSets = prev[exerciseId] || []
      return {
        ...prev,
        [exerciseId]: [
          ...exerciseSets,
          {
            exercise_id: exerciseId,
            set_number: exerciseSets.length + 1,
            reps: 0,
            weight: 0,
          },
        ],
      }
    })
  }

  function updateSet(exerciseId: string, setIndex: number, field: "reps" | "weight", value: number) {
    setSets((prev) => {
      const exerciseSets = [...(prev[exerciseId] || [])]
      exerciseSets[setIndex] = { ...exerciseSets[setIndex], [field]: value }
      return { ...prev, [exerciseId]: exerciseSets }
    })
  }

  function removeSet(exerciseId: string, setIndex: number) {
    setSets((prev) => {
      const exerciseSets = prev[exerciseId].filter((_, i) => i !== setIndex)
      return { ...prev, [exerciseId]: exerciseSets }
    })
  }

  async function handleSave() {
    if (!selectedWorkout) return

    setIsLoading(true)
    const supabase = createClient()

    // Criar workout log
    const { data: logData, error: logError } = await supabase
      .from("workout_logs")
      .insert({
        workout_id: selectedWorkout.id,
        date,
        completed: true,
      })
      .select()
      .single()

    if (logError || !logData) {
      alert("Erro ao salvar treino")
      setIsLoading(false)
      return
    }

    // Criar set logs
    const allSets = Object.values(sets).flat()
    const setLogs = allSets.map((set) => ({
      workout_log_id: logData.id,
      exercise_id: set.exercise_id,
      set_number: set.set_number,
      reps: set.reps,
      weight: set.weight,
      completed: true,
    }))

    const { error: setsError } = await supabase.from("set_logs").insert(setLogs)

    if (setsError) {
      alert("Erro ao salvar séries")
    } else {
      alert("Treino registrado com sucesso!")
      router.push("/dashboard")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Registrar Treino</h1>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl p-4 md:p-6 space-y-6">
        {/* Seleção de Treino e Data */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Treino</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Treino</Label>
              <Select value={selectedWorkoutId} onValueChange={handleWorkoutSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um treino" />
                </SelectTrigger>
                <SelectContent>
                  {workouts.map((workout) => (
                    <SelectItem key={workout.id} value={workout.id}>
                      {workout.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Exercícios */}
        {selectedWorkout && (
          <div className="space-y-4">
            {selectedWorkout.workout_exercises.map((we) => (
              <Card key={we.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{we.exercises.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Meta: {we.target_sets} séries de {we.target_reps} reps
                      </p>
                    </div>
                    <Button size="sm" onClick={() => addSet(we.exercise_id)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Série
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {sets[we.exercise_id]?.length > 0 ? (
                    <div className="space-y-3">
                      {sets[we.exercise_id].map((set, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-sm font-medium w-16">Série {idx + 1}</span>
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div>
                              <Input
                                type="number"
                                placeholder="Reps"
                                value={set.reps || ""}
                                onChange={(e) => updateSet(we.exercise_id, idx, "reps", Number(e.target.value))}
                              />
                            </div>
                            <div>
                              <Input
                                type="number"
                                placeholder="Peso (kg)"
                                step="0.5"
                                value={set.weight || ""}
                                onChange={(e) => updateSet(we.exercise_id, idx, "weight", Number(e.target.value))}
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => removeSet(we.exercise_id, idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma série registrada. Clique em "Série" para adicionar.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Botões de Ação */}
        {selectedWorkout && (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => router.push("/dashboard")}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={isLoading}>
              <Check className="mr-2 h-4 w-4" />
              {isLoading ? "Salvando..." : "Salvar Treino"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
