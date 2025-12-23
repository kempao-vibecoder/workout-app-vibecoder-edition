"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Exercise {
  id: string
  name: string
}

interface SetLog {
  weight: number
  reps: number
  created_at: string
  workout_logs: {
    date: string
  }
}

interface ChartData {
  date: string
  maxWeight: number
  volume: number
}

export default function HistoryPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("")
  const [setLogs, setSetLogs] = useState<SetLog[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [stats, setStats] = useState({ maxWeight: 0, totalVolume: 0, sessionsCount: 0 })
  const router = useRouter()

  useEffect(() => {
    loadExercises()
  }, [])

  useEffect(() => {
    if (selectedExerciseId) {
      loadExerciseHistory(selectedExerciseId)
    }
  }, [selectedExerciseId])

  function loadExercises() {
    const supabase = createClient()
    supabase
      .from("exercises")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) {
          setExercises(data)
          if (data.length > 0) setSelectedExerciseId(data[0].id)
        }
      })
  }

  function loadExerciseHistory(exerciseId: string) {
    const supabase = createClient()
    supabase
      .from("set_logs")
      .select(
        `
        weight,
        reps,
        created_at,
        workout_logs!inner (
          date
        )
      `,
      )
      .eq("exercise_id", exerciseId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) {
          setSetLogs(data as any)
          processChartData(data as any)
        }
      })
  }

  function processChartData(logs: SetLog[]) {
    const groupedByDate: { [key: string]: SetLog[] } = {}

    logs.forEach((log) => {
      const date = log.workout_logs.date
      if (!groupedByDate[date]) groupedByDate[date] = []
      groupedByDate[date].push(log)
    })

    const chartPoints: ChartData[] = Object.entries(groupedByDate).map(([date, sets]) => {
      const maxWeight = Math.max(...sets.map((s) => s.weight))
      const volume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0)
      return { date, maxWeight, volume }
    })

    setChartData(chartPoints)

    // Calcular estatísticas
    const allWeights = logs.map((l) => l.weight)
    const maxWeight = allWeights.length > 0 ? Math.max(...allWeights) : 0
    const totalVolume = logs.reduce((sum, l) => sum + l.weight * l.reps, 0)
    const sessionsCount = Object.keys(groupedByDate).length

    setStats({ maxWeight, totalVolume, sessionsCount })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Histórico e Progresso</h1>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl p-4 md:p-6 space-y-6">
        {/* Seleção de Exercício */}
        <Card>
          <CardHeader>
            <CardTitle>Selecione um Exercício</CardTitle>
            <CardDescription>Visualize a evolução de carga e volume de cada exercício</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um exercício" />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Peso Máximo</CardDescription>
              <CardTitle className="text-3xl">{stats.maxWeight} kg</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Volume Total</CardDescription>
              <CardTitle className="text-3xl">{stats.totalVolume.toLocaleString()} kg</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sessões Registradas</CardDescription>
              <CardTitle className="text-3xl">{stats.sessionsCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Gráfico de Progressão de Peso */}
        {chartData.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progressão de Peso Máximo
              </CardTitle>
              <CardDescription>Evolução do peso máximo ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) =>
                      new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                    }
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    labelFormatter={(date) => new Date(date).toLocaleDateString("pt-BR")}
                    formatter={(value: number) => [`${value} kg`, "Peso Máximo"]}
                  />
                  <Line type="monotone" dataKey="maxWeight" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum registro encontrado</p>
              <p className="text-sm text-muted-foreground">Registre seus treinos para ver a evolução</p>
            </CardContent>
          </Card>
        )}

        {/* Histórico Detalhado */}
        {setLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico Detalhado</CardTitle>
              <CardDescription>Todas as séries registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {setLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">
                        {log.weight} kg × {log.reps} reps
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(log.workout_logs.date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Volume</p>
                      <p className="font-medium">{log.weight * log.reps} kg</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
