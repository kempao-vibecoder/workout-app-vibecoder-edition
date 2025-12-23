"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, Plus, Trash2, Dumbbell, GripVertical } from "lucide-react"

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
const MUSCLE_GROUPS = ["Peito", "Costas", "Pernas", "Ombros", "Braços", "Core"]

interface Exercise {
  id: string
  name: string
  muscle_group: string
}

export default function NewWorkoutPage() {
  const [name, setName] = useState("")
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [addedExercises, setAddedExercises] = useState<Exercise[]>([])
  
  // Controle modal criar exercício
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newExercise, setNewExercise] = useState({ name: "", muscle_group: "" })
  
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadExercises()
  }, [])

  function loadExercises() {
    const supabase = createClient()
    supabase
      .from("exercises")
      .select("id, name, muscle_group")
      .order("name")
      .then(({ data }) => {
        if (data) setAvailableExercises(data)
      })
  }

  // Busca Inteligente: Nome OU Grupo Muscular
  const filteredExercises = availableExercises.filter(ex => {
    const term = searchTerm.toLowerCase()
    return ex.name.toLowerCase().includes(term) || ex.muscle_group.toLowerCase().includes(term)
  }).slice(0, 5)

  async function handleCreateExercise() {
    if (!newExercise.name || !newExercise.muscle_group) return
    
    const supabase = createClient()
    const { data, error } = await supabase.from("exercises").insert({
        name: newExercise.name,
        muscle_group: newExercise.muscle_group,
        is_custom: true
    }).select().single()

    if (data) {
        setAvailableExercises(prev => [...prev, data])
        addExerciseToWorkout(data)
        setIsCreateOpen(false)
        setNewExercise({ name: "", muscle_group: "" })
    }
  }

  function toggleDay(day: string) {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  function addExerciseToWorkout(exercise: Exercise) {
    setAddedExercises((prev) => [...prev, exercise])
    setSearchTerm("")
  }

  function removeExercise(index: number) {
    setAddedExercises((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || selectedDays.length === 0) {
        alert("Preencha o nome e selecione pelo menos um dia.")
        return
    }

    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { data: workoutData, error: workoutError } = await supabase
        .from("workouts")
        .insert({ name, days_of_week: selectedDays, user_id: user.id })
        .select().single()

    if (workoutError || !workoutData) {
        alert("Erro ao criar treino.")
        setIsLoading(false)
        return
    }

    if (addedExercises.length > 0) {
        const workoutExercisesPayload = addedExercises.map((ex, index) => ({
            workout_id: workoutData.id,
            exercise_id: ex.id,
            order_index: index,
            // Valores padrão apenas para cumprir a constraint do banco
            target_sets: 0, 
            target_reps: 0
        }))

        await supabase.from("workout_exercises").insert(workoutExercisesPayload)
    }

    router.push("/workouts")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/workouts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Criar Novo Treino</h1>
        </div>
      </header>

      <div className="container mx-auto max-w-3xl p-4 md:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Planejamento</CardTitle>
            <CardDescription>Configure os dias e a lista de exercícios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Treino</Label>
              <Input
                id="name"
                placeholder="Ex: Empurrar (Push) - Foco Ombro"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Dias da Semana</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors border ${
                      selectedDays.includes(day)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent hover:bg-secondary text-muted-foreground border-input"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Busca e Lista */}
            <div className="space-y-4 pt-4 border-t">
                <Label>Adicionar Exercícios</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar por nome ou grupo (ex: ombros)..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    
                    {searchTerm && (
                        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
                            {filteredExercises.map((ex) => (
                                <div 
                                    key={ex.id}
                                    className="cursor-pointer px-4 py-3 hover:bg-accent hover:text-accent-foreground text-sm flex justify-between items-center border-b last:border-0"
                                    onClick={() => addExerciseToWorkout(ex)}
                                >
                                    <span className="font-medium">{ex.name}</span>
                                    <span className="text-xs bg-muted px-2 py-1 rounded">{ex.muscle_group}</span>
                                </div>
                            ))}
                            
                            {/* Botão de Criar Novo se não achar */}
                            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                <DialogTrigger asChild>
                                    <div className="cursor-pointer px-4 py-3 hover:bg-primary/10 text-primary text-sm flex items-center gap-2 font-medium">
                                        <Plus className="h-4 w-4" /> Criar "{searchTerm}"
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
                                        <Button onClick={handleCreateExercise} className="w-full">Salvar e Adicionar</Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </div>

                {/* Lista Visual */}
                <div className="space-y-2">
                    {addedExercises.map((ex, idx) => (
                        <div key={idx} className="flex items-center gap-3 rounded-lg border p-3 bg-card/50">
                            <GripVertical className="h-4 w-4 text-muted-foreground opacity-50" />
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                                {idx + 1}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium">{ex.name}</p>
                                <p className="text-xs text-muted-foreground">{ex.muscle_group}</p>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeExercise(idx)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    {addedExercises.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                            Nenhum exercício adicionado
                        </div>
                    )}
                </div>
            </div>

            <Button onClick={handleSubmit} className="w-full" disabled={isLoading || !name || addedExercises.length === 0}>
                {isLoading ? "Salvando..." : "Salvar Treino"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
