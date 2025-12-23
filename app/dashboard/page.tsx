"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
// AQUI ESTAVA O ERRO: Adicionei o "Plus" na lista de importações
import { Dumbbell, Calendar, Play, LogOut, Activity, Eye, TrendingUp, Clock, Plus } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

interface Workout {
  id: string
  name: string
  days_of_week: string[]
}

interface SetLog {
  id: string
  weight: number
  reps: number
  set_number: number
  exercises: {
    name: string
  }
}

interface WorkoutLog {
  id: string
  date: string
  completed: boolean
  notes?: string
  workouts: {
    name: string
  }
  set_logs: SetLog[]
}

interface ChartData {
  name: string
  volume: number
  treinos: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Controle do Modal de Detalhes
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (!user || error) {
      window.location.href = "/auth/login"
      return
    }
    setUser(user)
    loadDashboardData()
  }

  async function loadDashboardData() {
    const supabase = createClient()

    // 1. Carregar Treinos (Para sugerir o de hoje)
    const { data: workoutsData } = await supabase
      .from("workouts")
      .select("*")

    if (workoutsData) setWorkouts(workoutsData)

    // 2. Carregar Histórico Completo (Últimos 30 dias para gráfico e lista)
    const { data: logsData } = await supabase
      .from("workout_logs")
      .select(`
        *,
        workouts (name),
        set_logs (
          id, weight, reps, set_number,
          exercises (name)
        )
      `)
      .order("date", { ascending: false })
      .limit(20)

    if (logsData) {
      setRecentLogs(logsData as any)
      processChartData(logsData as any)
    }
    
    setIsLoading(false)
  }

  function processChartData(logs: WorkoutLog[]) {
    const dataMap: Record<string, { volume: number, treinos: number }> = {}
    
    const reversedLogs = [...logs].reverse()

    reversedLogs.forEach(log => {
        const dateKey = new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        
        if (!dataMap[dateKey]) dataMap[dateKey] = { volume: 0, treinos: 0 }
        
        dataMap[dateKey].treinos += 1
        
        const sessionVolume = log.set_logs.reduce((acc, set) => {
            return acc + (set.weight * set.reps)
        }, 0)
        
        dataMap[dateKey].volume += sessionVolume
    })

    const chart = Object.entries(dataMap).map(([key, val]) => ({
        name: key,
        volume: val.volume,
        treinos: val.treinos
    })).slice(-7)

    setChartData(chart)
  }

  function openLogDetails(log: WorkoutLog) {
    setSelectedLog(log)
    setIsDetailsOpen(true)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long" })
  const todayWorkout = workouts.find((w) =>
    (w.days_of_week || []).some((day) => day && today.toLowerCase().includes(day.toLowerCase())),
  )
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Dumbbell className="h-12 w-12 animate-pulse text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <Dumbbell className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">GymTrack</h1>
              <p className="text-xs text-muted-foreground font-medium">Dashboard</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto p-4 md:p-6 space-y-6">
        
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Calendar className="h-5 w-5 text-primary" />
                        Treino de Hoje <span className="text-muted-foreground font-normal capitalize">- {today}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {todayWorkout ? (
                    <div className="flex flex-col gap-4">
                        <div>
                            <h2 className="text-2xl font-bold">{todayWorkout.name}</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Exercícios pré-configurados prontos para execução.
                            </p>
                        </div>
                        <Button 
                            size="lg" 
                            className="w-full sm:w-auto font-bold shadow-lg shadow-primary/25"
                            onClick={() => router.push(`/log?workout=${todayWorkout.id}`)}
                        >
                            <Play className="mr-2 h-5 w-5 fill-current" /> INICIAR AGORA
                        </Button>
                    </div>
                    ) : (
                    <div className="text-center py-6">
                        <div className="bg-muted/50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                            <Activity className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">Descanso ou Treino Livre?</p>
                        <p className="text-xs text-muted-foreground mb-4">Nenhum treino agendado para hoje.</p>
                        <Button variant="outline" onClick={() => router.push("/log")}>
                            Iniciar Treino Avulso
                        </Button>
                    </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        Volume Recente
                    </CardTitle>
                    <CardDescription>Carga total (kg) levantada por treino</CardDescription>
                </CardHeader>
                <CardContent className="h-[180px]">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{fontSize: 10}} 
                                    tickLine={false} 
                                    axisLine={false} 
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Volume Total']}
                                />
                                <Bar 
                                    dataKey="volume" 
                                    fill="hsl(var(--primary))" 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={30}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                            Sem dados suficientes
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-20 flex flex-col gap-1 border-dashed hover:border-primary hover:bg-primary/5" onClick={() => router.push("/workouts/new")}>
                <Plus className="h-6 w-6" />
                Criar Treino
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-1 hover:bg-secondary" onClick={() => router.push("/workouts")}>
                <Dumbbell className="h-6 w-6" />
                Meus Treinos
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-1 hover:bg-secondary" onClick={() => router.push("/exercises")}>
                <Activity className="h-6 w-6" />
                Exercícios
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-1 hover:bg-secondary" onClick={() => router.push("/history")}>
                <Clock className="h-6 w-6" />
                Histórico
            </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico Recente</CardTitle>
            <CardDescription>Seus últimos treinos realizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-base">{(log.workouts as any)?.name || "Treino Avulso"}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(log.date).toLocaleDateString("pt-BR", { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                        <span>•</span>
                        <span>{log.set_logs.length} séries</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        log.completed 
                        ? "bg-green-500/10 text-green-600 border-green-500/20" 
                        : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                    }`}>
                      {log.completed ? "Feito" : "Parcial"}
                    </div>
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => openLogDetails(log)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {recentLogs.length === 0 && (
                  <div className="text-center py-10">
                      <p className="text-muted-foreground">Nenhum histórico encontrado.</p>
                  </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{(selectedLog?.workouts as any)?.name || "Detalhes do Treino"}</DialogTitle>
                <DialogDescription>
                    Realizado em {selectedLog && new Date(selectedLog.date).toLocaleDateString("pt-BR")}
                </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 space-y-6">
                {selectedLog && Object.entries(
                    selectedLog.set_logs.reduce((acc: any, set) => {
                        const name = set.exercises?.name || "Exercício Desconhecido"
                        if (!acc[name]) acc[name] = []
                        acc[name].push(set)
                        return acc
                    }, {})
                ).map(([exerciseName, sets]: [string, any], idx) => (
                    <div key={idx} className="border-b pb-4 last:border-0 last:pb-0">
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <div className="w-1 h-4 bg-primary rounded-full"></div>
                            {exerciseName}
                        </h4>
                        <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mb-1 pl-3">
                            <span>Série</span>
                            <span className="text-center">Kg</span>
                            <span className="text-center">Reps</span>
                        </div>
                        <div className="space-y-1 pl-3">
                            {sets.sort((a: any, b: any) => a.set_number - b.set_number).map((set: any, sIdx: number) => (
                                <div key={sIdx} className="grid grid-cols-4 gap-2 text-sm items-center">
                                    <span className="text-muted-foreground">#{set.set_number}</span>
                                    <span className="text-center font-medium">{set.weight}</span>
                                    <span className="text-center font-medium">{set.reps}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
