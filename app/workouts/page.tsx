"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Dumbbell, ArrowLeft, Trash2, Edit, Play } from "lucide-react"

interface Workout {
  id: string
  name: string
  day_of_weeks: string[] // O supabase pode retornar day_of_weeks ou days_of_week dependendo da versão, ajustaremos no map
  days_of_week?: string[] 
  created_at: string
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadWorkouts()
  }, [])

  function loadWorkouts() {
    const supabase = createClient()
    supabase
      .from("workouts")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setWorkouts(data)
        setIsLoading(false)
      })
  }

  function deleteWorkout(id: string) {
    if (!confirm("Tem certeza que deseja excluir este treino?")) return

    const supabase = createClient()
    supabase
      .from("workouts")
      .delete()
      .eq("id", id)
      .then(() => {
        loadWorkouts()
      })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Dumbbell className="h-12 w-12 animate-pulse text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Meus Treinos</h1>
          </div>
          <Button onClick={() => router.push("/workouts/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Treino
          </Button>
        </div>
      </header>

      <div className="container mx-auto p-4 md:p-6">
        {workouts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workouts.map((workout) => (
              <Card key={workout.id} className="flex flex-col justify-between">
                <CardHeader>
                  <CardTitle>{workout.name}</CardTitle>
                  <CardDescription>
                    {(workout.days_of_week || workout.day_of_weeks || []).join(", ")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full font-bold" 
                    size="lg"
                    onClick={() => router.push(`/log?workout=${workout.id}`)}
                  >
                    <Play className="mr-2 h-5 w-5 fill-current" />
                    INICIAR TREINO
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={() => router.push(`/workouts/${workout.id}/edit`)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="px-3"
                      onClick={() => deleteWorkout(workout.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Nenhum treino criado</p>
              <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro treino para começar</p>
              <Button onClick={() => router.push("/workouts/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Treino
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
