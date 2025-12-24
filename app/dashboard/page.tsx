"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { 
  Dumbbell, 
  Calendar, 
  Play, 
  LogOut, 
  TrendingUp, 
  Plus, 
  Pencil, 
  Save, 
  X, 
  ChevronRight,
  BicepsFlexed,
  LayoutList
} from "lucide-react"
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts"
import { toast } from "sonner"

// --- Interfaces ---
interface Workout {
  id: string
  name: string
  days_of_week?: string[]
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
  
  // Stats Calculados
  const [weeklyWorkouts, setWeeklyWorkouts] = useState(0)
  const [totalVolume, setTotalVolume] = useState(0)

  const [isLoading, setIsLoading] = useState(true)
  
  // Controle do Modal de Detalhes
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState<SetLog[]>([]) 

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

    // 1. Carregar Treinos (Para saber o treino de hoje)
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
      .limit(30) // Pegar um pouco mais para estatísticas

    if (logsData) {
      setRecentLogs(logsData as any)
      processStats(logsData as any)
    }
    
    setIsLoading(false)
  }

  function processStats(logs: WorkoutLog[]) {
    // Processar gráfico (últimos 7 dias)
    const dataMap: Record<string, { volume: number, treinos: number }> = {}
    
    // Iniciar últimos 7 dias com 0 para o gráfico não ficar vazio
    for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        dataMap[key] = { volume: 0, treinos: 0 }
    }

    let weekCount = 0
    let volCount = 0

    logs.forEach(log => {
        const dateObj = new Date(log.date)
        const dateKey = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        
        // Volume do treino (Carga * Reps)
        const sessionVolume = log.set_logs.reduce((acc, set) => acc + (set.weight * set.reps), 0)

        // Se estiver dentro do range do gráfico (últimos 7 dias)
        if (dataMap[dateKey]) {
            dataMap[dateKey].treinos += 1
            dataMap[dateKey].volume += sessionVolume
        }

        // Stats da semana atual (apenas últimos 7 dias corridos)
        const diffTime = Math.abs(new Date().getTime() - dateObj.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
        if (diffDays <= 7) {
            weekCount += 1
            volCount += sessionVolume
        }
    })

    const chart = Object.entries(dataMap).map(([key, val]) => ({
        name: key, volume: val.volume, treinos: val.treinos
    }))

    setChartData(chart)
    setWeeklyWorkouts(weekCount)
    setTotalVolume(volCount)
  }

  function openLogDetails(log: WorkoutLog) {
    setSelectedLog(log)
    setEditFormData(JSON.parse(JSON.stringify(log.set_logs))) 
    setIsEditing(false)
    setIsDetailsOpen(true)
  }

  async function handleSaveChanges() {
      const supabase = createClient()
      const updates = editFormData.map(set => 
          supabase.from("set_logs").update({ weight: Number(set.weight), reps: Number(set.reps) }).eq("id", set.id)
      )
      await Promise.all(updates)
      toast.success("Treino atualizado!")
      setIsEditing(false)
      setIsDetailsOpen(false)
      loadDashboardData() 
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  // Lógica do Treino de Hoje
  const todayName = new Date().toLocaleDateString("pt-BR", { weekday: "long" }).toLowerCase()
  // Procura se existe algum treino que tenha o dia de hoje na lista
  const todayWorkout = workouts.find((w) =>
    (w.days_of_week || []).some((day) => day && day.toLowerCase().includes(todayName.split('-')[0])),
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
      {/* Header */}
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

      <div className="container mx-auto p-4 md:p-6 space-y-8">
        
        {/* Section 1: Hero & Actions Grid */}
        <div className="grid gap-4 md:grid-cols-12">
            
            {/* Card Principal: Treino de Hoje (Ocupa 2/3 no desktop) */}
            <div className="md:col-span-8">
                <Card className="h-full border-primary/20 bg-gradient-to-br from-card to-secondary/10 relative overflow-hidden flex flex-col justify-center">
                    {/* Efeito visual de fundo */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
                    
                    <CardHeader className="pb-2 z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">Olá, Atleta! 👋</h2>
                                <p className="text-muted-foreground">Vamos superar seus limites hoje?</p>
                            </div>
                            {/* Stats Rápidos (visível apenas em telas maiores) */}
                            <div className="text-right hidden sm:block">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Treinos na Semana</p>
                                <p className="text-3xl font-bold text-primary">{weeklyWorkouts}</p>
                            </div>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="mt-2 z-10">
                        {todayWorkout ? (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-background/60 border border-border/50 shadow-sm backdrop-blur-sm">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-primary-foreground uppercase tracking-wide">Hoje</span>
                                        <span className="text-xs text-muted-foreground capitalize font-medium">{todayName}</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground">{todayWorkout.name}</h3>
                                    <p className="text-xs text-muted-foreground">Seu treino agendado está pronto.</p>
                                </div>
                                <Button size="lg" className="w-full sm:w-auto font-bold shadow-lg shadow-primary/20 h-12 px-8 text-base" onClick={() => router.push(`/log?workout=${todayWorkout.id}`)}>
                                    <Play className="mr-2 h-5 w-5 fill-current" /> INICIAR
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl bg-background/60 border border-border/50 shadow-sm border-dashed">
                                <div className="flex items-center gap-4 text-muted-foreground">
                                    <div className="p-3 bg-secondary rounded-full">
                                        <Calendar className="h-6 w-6 opacity-70" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-foreground">Dia de descanso?</h3>
                                        <p className="text-xs">Nenhum treino agendado para hoje.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button className="flex-1 sm:flex-none" onClick={() => router.push("/log")}>
                                        <Plus className="mr-2 h-4 w-4" /> Treino Avulso
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Card Secundário: Ações Rápidas (Ocupa 1/3 no desktop) */}
            <div className="md:col-span-4 grid grid-rows-3 gap-3 h-full min-h-[220px]">
                <Button 
                    variant="outline" 
                    className="h-full justify-start px-4 border-l-4 border-l-blue-500 hover:bg-secondary/50 group relative overflow-hidden"
                    onClick={() => router.push("/workouts/new")}
                >
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Plus className="h-5 w-5" /></div>
                        <div className="text-left">
                            <span className="block font-semibold">Criar Rotina</span>
                            <span className="text-xs text-muted-foreground font-normal">Novo plano semanal</span>
                        </div>
                    </div>
                </Button>

                <Button 
                    variant="outline" 
                    className="h-full justify-start px-4 border-l-4 border-l-purple-500 hover:bg-secondary/50 group"
                    onClick={() => router.push("/exercises")}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors"><BicepsFlexed className="h-5 w-5" /></div>
                        <div className="text-left">
                            <span className="block font-semibold">Exercícios</span>
                            <span className="text-xs text-muted-foreground font-normal">Biblioteca</span>
                        </div>
                    </div>
                </Button>

                <Button 
                    variant="outline" 
                    className="h-full justify-start px-4 border-l-4 border-l-emerald-500 hover:bg-secondary/50 group"
                    onClick={() => router.push("/history")}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><TrendingUp className="h-5 w-5" /></div>
                        <div className="text-left">
                            <span className="block font-semibold">Progresso</span>
                            <span className="text-xs text-muted-foreground font-normal">Ver gráficos</span>
                        </div>
                    </div>
                </Button>
            </div>
        </div>

        {/* Section 2: Chart & History */}
        <div className="grid gap-6 md:grid-cols-2">
            
            {/* Gráfico Semanal */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" /> Volume Semanal
                            </CardTitle>
                            <CardDescription>Carga total (kg) nos últimos 7 dias</CardDescription>
                        </div>
                        <div className="text-right">
                             <span className="text-2xl font-bold">{totalVolume > 1000 ? `${(totalVolume/1000).toFixed(1)}k` : totalVolume}</span>
                             <span className="text-xs text-muted-foreground ml-1">kg</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="h-[250px] pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <XAxis 
                                dataKey="name" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(val) => val.split('/')[0]} // Mostrar só o dia
                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                                itemStyle={{ color: 'hsl(var(--primary))' }}
                                labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.2rem' }}
                            />
                            <Bar 
                                dataKey="volume" 
                                fill="hsl(var(--primary))" 
                                radius={[4, 4, 0, 0]} 
                                barSize={24}
                                animationDuration={1000}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Lista Histórico */}
            <Card className="flex flex-col h-full max-h-[350px]">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <LayoutList className="h-4 w-4 text-primary" /> Histórico Recente
                    </CardTitle>
                    <CardDescription>Seus últimos treinos realizados</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto pr-2 custom-scrollbar">
                    <div className="space-y-3">
                        {recentLogs.map((log) => (
                            <div 
                                key={log.id} 
                                className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-accent hover:border-primary/30 transition-all cursor-pointer group" 
                                onClick={() => openLogDetails(log)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-1 h-8 rounded-full ${log.completed ? 'bg-primary' : 'bg-yellow-500'}`}></div>
                                    <div>
                                        <p className="font-semibold text-sm">{(log.workouts as any)?.name || "Treino Avulso"}</p>
                                        <p className="text-[10px] text-muted-foreground capitalize flex gap-2">
                                            <span>{new Date(log.date).toLocaleDateString("pt-BR", { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                                            <span>•</span>
                                            <span>{log.set_logs.length} séries</span>
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors opacity-50 group-hover:opacity-100" />
                            </div>
                        ))}
                        {recentLogs.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm h-full">
                                <Dumbbell className="h-8 w-8 mb-2 opacity-20" />
                                <p>Nenhum treino registrado ainda.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* Modal Detalhes/Edição */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
                <div className="flex items-center justify-between pr-8">
                    <DialogTitle>{(selectedLog?.workouts as any)?.name || "Detalhes do Treino"}</DialogTitle>
                    {!isEditing ? (
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                            <Pencil className="h-3 w-3 mr-2" /> Editar
                        </Button>
                    ) : (
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                            <X className="h-3 w-3 mr-2" /> Cancelar
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
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-primary">
                            {exerciseName}
                        </h4>
                        <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground mb-1">
                            <span className="col-span-2 text-center">Série</span>
                            <span className="col-span-5 text-center">Carga (kg)</span>
                            <span className="col-span-5 text-center">Reps</span>
                        </div>
                        <div className="space-y-1">
                            {sets.sort((a: any, b: any) => a.set_number - b.set_number).map((set: any, sIdx: number) => (
                                <div key={set.id} className="grid grid-cols-12 gap-2 text-sm items-center bg-muted/20 p-1 rounded">
                                    <span className="col-span-2 text-center font-mono text-muted-foreground">{set.set_number}</span>
                                    {isEditing ? (
                                        <>
                                            <div className="col-span-5 px-1">
                                                <Input 
                                                    type="number" 
                                                    className="h-7 text-center bg-background" 
                                                    value={set.weight} 
                                                    onChange={(e) => {
                                                        const newValue = e.target.value
                                                        setEditFormData(prev => prev.map(p => p.id === set.id ? {...p, weight: newValue} : p))
                                                    }}
                                                />
                                            </div>
                                            <div className="col-span-5 px-1">
                                                <Input 
                                                    type="number" 
                                                    className="h-7 text-center bg-background" 
                                                    value={set.reps}
                                                    onChange={(e) => {
                                                        const newValue = e.target.value
                                                        setEditFormData(prev => prev.map(p => p.id === set.id ? {...p, reps: newValue} : p))
                                                    }}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <span className="col-span-5 text-center font-medium">{set.weight}</span>
                                            <span className="col-span-5 text-center font-medium">{set.reps}</span>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            {isEditing && (
                <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-2 border-t mt-4">
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
