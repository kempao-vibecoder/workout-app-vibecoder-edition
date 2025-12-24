"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Dumbbell, Calendar, Play, LogOut, Activity, Eye, TrendingUp, Clock, Plus, Pencil, Save, X } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { toast } from "sonner"

// ... (interfaces mantidas iguais, adicionei editable no SetLog para controle local)
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
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState<SetLog[]>([]) // Estado local para edição

  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  // ... (funções checkUser, loadDashboardData, processChartData mantidas iguais)
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

    // 1. Carregar Treinos
    const { data: workoutsData } = await supabase.from("workouts").select("*")
    if (workoutsData) setWorkouts(workoutsData)

    // 2. Carregar Histórico
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
        const sessionVolume = log.set_logs.reduce((acc, set) => acc + (set.weight * set.reps), 0)
        dataMap[dateKey].volume += sessionVolume
    })

    const chart = Object.entries(dataMap).map(([key, val]) => ({
        name: key, volume: val.volume, treinos: val.treinos
    })).slice(-7)

    setChartData(chart)
  }

  function openLogDetails(log: WorkoutLog) {
    setSelectedLog(log)
    setEditFormData(JSON.parse(JSON.stringify(log.set_logs))) // Deep copy para edição
    setIsEditing(false)
    setIsDetailsOpen(true)
  }

  // Lógica 2: Função para salvar edição
  async function handleSaveChanges() {
      const supabase = createClient()
      
      const updates = editFormData.map(set => 
          supabase.from("set_logs").update({ weight: Number(set.weight), reps: Number(set.reps) }).eq("id", set.id)
      )

      await Promise.all(updates)
      
      toast.success("Treino atualizado!")
      setIsEditing(false)
      setIsDetailsOpen(false)
      loadDashboardData() // Recarrega para atualizar gráfico e lista
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

  // ... (Loading e Header mantidos iguais)
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
        {/* ... (Cards de Treino de Hoje e Gráfico mantidos iguais ao anterior) ... */}
        
        {/* ... (Grid de botões de atalho mantido igual) ... */}

        <Card>
          <CardHeader>
            <CardTitle>Histórico Recente</CardTitle>
            <CardDescription>Seus últimos treinos realizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group cursor-pointer" onClick={() => openLogDetails(log)}>
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
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
                <div className="flex items-center justify-between pr-8">
                    <DialogTitle>{(selectedLog?.workouts as any)?.name || "Detalhes do Treino"}</DialogTitle>
                    {!isEditing ? (
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                        </Button>
                    ) : (
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                            <X className="h-4 w-4 mr-2" /> Cancelar
                        </Button>
                    )}
                </div>
                <DialogDescription>
                    Realizado em {selectedLog && new Date(selectedLog.date).toLocaleDateString("pt-BR")}
                </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 space-y-6">
                {selectedLog && Object.entries(
                    (isEditing ? editFormData : selectedLog.set_logs).reduce((acc: any, set) => {
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
                                <div key={set.id} className="grid grid-cols-4 gap-2 text-sm items-center">
                                    <span className="text-muted-foreground">#{set.set_number}</span>
                                    {isEditing ? (
                                        <>
                                            <Input 
                                                type="number" 
                                                className="h-7 text-center" 
                                                value={set.weight} 
                                                onChange={(e) => {
                                                    const newValue = e.target.value
                                                    setEditFormData(prev => prev.map(p => p.id === set.id ? {...p, weight: newValue} : p))
                                                }}
                                            />
                                            <Input 
                                                type="number" 
                                                className="h-7 text-center" 
                                                value={set.reps}
                                                onChange={(e) => {
                                                    const newValue = e.target.value
                                                    setEditFormData(prev => prev.map(p => p.id === set.id ? {...p, reps: newValue} : p))
                                                }}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-center font-medium">{set.weight}</span>
                                            <span className="text-center font-medium">{set.reps}</span>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            {isEditing && (
                <DialogFooter className="pt-4">
                    <Button onClick={handleSaveChanges} className="w-full">
                        <Save className="mr-2 h-4 w-4" /> Salvar Alterações
                    </Button>
                </DialogFooter>
            )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
