"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dumbbell, TrendingUp, Calendar, Plus, LogOut } from "lucide-react"

interface Workout {
  id: string
  name: string
  days_of_week: string[] // CORRIGIDO: de day_of_week para days_of_week
}

interface WorkoutLog {
  id: string
  date: string
  completed: boolean
  workouts: {
    name: string
  }
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (!user || error) {
      window.location.href = "/auth/login"
      return
    }

    setUser(user)
    loadDashboardData()
  }

  async function loadDashboardData() {
    const supabase = createClient()

    // Carregar treinos
    const { data: workoutsData } = await supabase
      .from("workouts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)

    if (workoutsData) setWorkouts(workoutsData)

    // Carregar logs recentes
    const { data: logsData } = await supabase
      .from("workout_logs")
      .select(`
        id,
        date,
        completed,
        workouts (name)
      `)
      .order("date", { ascending: false })
      .limit(5)

    if (logsData) setRecentLogs(logsData as any)
    setIsLoading(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long" })
  
  // AQUI ESTAVA O ERRO: Adicionei proteção (?. e || []) e corrigi o nome da variável
  const todayWorkout = workouts.find((w) =>
    (w.days_of_week || []).some((day) => day && day.toLowerCase().includes(today.toLowerCase())),
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Dumbbell className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Dumbbell className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">GymTrack</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto p-4 md:p-6">
        {/* Treino de Hoje */}
        <Card className="mb-6 border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Treino de Hoje - {today}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayWorkout ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{todayWorkout.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Dias: {(todayWorkout.days_of_week || []).join(", ")}
                  </p>
                </div>
                <Button onClick={() => router.push(`/log?workout=${todayWorkout.id}`)}>Iniciar Treino</Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Nenhum treino programado para hoje</p>
                <Button variant="outline" className="mt-4 bg-transparent" onClick={() => router.push("/workouts/new")}>
                  Criar Treino
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Treinos</CardDescription>
              <CardTitle className="text-3xl">{workouts.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Treinos Esta Semana</CardDescription>
              <CardTitle className="text-3xl">
                {
                  recentLogs.filter((log) => {
                    const logDate = new Date(log.date)
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return logDate >= weekAgo && log.completed
                  }).length
                }
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Último Treino</CardDescription>
              <CardTitle className="text-lg">
                {recentLogs[0] ? new Date(recentLogs[0].date).toLocaleDateString("pt-BR") : "Nenhum"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Ações Rápidas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Button className="h-24 flex-col gap-2" onClick={() => router.push("/workouts")}>
            <Dumbbell className="h-6 w-6" />
            Meus Treinos
          </Button>

          <Button className="h-24 flex-col gap-2" onClick={() => router.push("/workouts/new")}>
            <Plus className="h-6 w-6" />
            Criar Treino
          </Button>

          <Button className="h-24 flex-col gap-2" onClick={() => router.push("/log")}>
            <Calendar className="h-6 w-6" />
            Registrar Treino
          </Button>

          <Button className="h-24 flex-col gap-2" onClick={() => router.push("/history")}>
            <TrendingUp className="h-6 w-6" />
            Meu Progresso
          </Button>
        </div>

        {/* Treinos Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Treinos Recentes</CardTitle>
            <CardDescription>Seus últimos treinos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{(log.workouts as any)?.name || "Treino"}</p>
                      <p className="text-sm text-muted-foreground">{new Date(log.date).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        log.completed ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                      }`}
                    >
                      {log.completed ? "Completo" : "Parcial"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum treino registrado ainda. Comece agora!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
