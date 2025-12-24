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
    
    // Iniciar últimos 7 dias com 0
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
        
        // Volume do treino
        const sessionVolume = log.set_logs.reduce((acc, set) => acc + (set.weight * set.reps), 0)

        // Se estiver dentro do range do gráfico
        if (dataMap[dateKey]) {
            dataMap[dateKey].treinos += 1
            dataMap[dateKey].volume += sessionVolume
        }

        // Stats da semana atual (domingo a sábado ou últimos 7 dias)
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
  const todayWorkout = workouts.find((w) =>
    (w.days_of_week || []).some((day) => day && day.toLowerCase() === todayName),
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
        
        {/* Section 1: Hero & Today's Workout */}
        <div className="grid gap-4 md:grid-cols-12">
            {/* Card Principal: Treino de Hoje */}
            <div className="md:col-span-8">
                <Card className="h-full border-primary/20 bg-gradient-to-br from-card to-secondary/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 blur-3xl pointer-events-none"></div>
                    
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">Olá, Atleta! 👋</h2>
                                <p className="text-muted-foreground">Pronto para superar seus limites hoje?</p>
                            </div>
                            {/* Stats Rápidos Mobile */}
                            <div className="text-right hidden sm:block">
                                <p
