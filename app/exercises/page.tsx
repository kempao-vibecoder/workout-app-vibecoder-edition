"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, ArrowLeft, Dumbbell, Search } from "lucide-react"

interface Exercise {
  id: string
  name: string
  muscle_group: string
  is_custom: boolean
}

const MUSCLE_GROUPS = ["Peito", "Costas", "Pernas", "Ombros", "Braços", "Core"]

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterGroup, setFilterGroup] = useState<string>("Todos")
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [newExercise, setNewExercise] = useState({ name: "", muscle_group: "" })
  const router = useRouter()

  useEffect(() => {
    loadExercises()
  }, [])

  useEffect(() => {
    filterExercises()
  }, [exercises, searchTerm, filterGroup])

  function loadExercises() {
    const supabase = createClient()
    supabase
      .from("exercises")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) setExercises(data)
        setIsLoading(false)
      })
  }

  function filterExercises() {
    let filtered = exercises

    if (searchTerm) {
      filtered = filtered.filter((ex) => ex.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    if (filterGroup !== "Todos") {
      filtered = filtered.filter((ex) => ex.muscle_group === filterGroup)
    }

    setFilteredExercises(filtered)
  }

  async function handleCreateExercise() {
    if (!newExercise.name || !newExercise.muscle_group) return

    const supabase = createClient()
    const { error } = await supabase.from("exercises").insert({
      name: newExercise.name,
      muscle_group: newExercise.muscle_group,
      is_custom: true,
    })

    if (!error) {
      setIsOpen(false)
      setNewExercise({ name: "", muscle_group: "" })
      loadExercises()
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Dumbbell className="h-12 w-12 animate-pulse text-primary" />
      </div>
    )
  }

  const groupedExercises = MUSCLE_GROUPS.reduce(
    (acc, group) => {
      acc[group] = filteredExercises.filter((ex) => ex.muscle_group === group)
      return acc
    },
    {} as Record<string, Exercise[]>,
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Biblioteca de Exercícios</h1>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Exercício
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Exercício Personalizado</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="exercise-name">Nome do Exercício</Label>
                  <Input
                    id="exercise-name"
                    placeholder="Ex: Supino Inclinado com Halteres"
                    value={newExercise.name}
                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="muscle-group">Grupo Muscular</Label>
                  <Select
                    value={newExercise.muscle_group}
                    onValueChange={(val) => setNewExercise({ ...newExercise, muscle_group: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {MUSCLE_GROUPS.map((group) => (
                        <SelectItem key={group} value={group}>
                          {group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateExercise} className="w-full">
                  Criar Exercício
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="container mx-auto p-4 md:p-6">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar exercícios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos os Grupos</SelectItem>
                  {MUSCLE_GROUPS.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {MUSCLE_GROUPS.map((group) => {
            const groupExercises = groupedExercises[group]
            if (groupExercises.length === 0) return null

            return (
              <Card key={group}>
                <CardHeader>
                  <CardTitle>{group}</CardTitle>
                  <CardDescription>{groupExercises.length} exercícios</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {groupExercises.map((exercise) => (
                      <div key={exercise.id} className="flex items-center justify-between rounded-lg border p-3">
                        <span className="font-medium">{exercise.name}</span>
                        {exercise.is_custom && (
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                            Personalizado
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredExercises.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum exercício encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
