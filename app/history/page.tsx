"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input" // Importei o Input
import { ArrowLeft, TrendingUp, Filter, X, Search } from "lucide-react" // Importei o Search
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface Exercise {
  id: string
  name: string
}

interface Workout {
  id: string
  name: string
}

interface SetLog {
  weight: number
  reps: number
  exercise_id: string
  exercises: { name: string }
}

interface WorkoutLog {
  id: string
  date: string
  workout_id: string | null
  workouts: { name: string } | null
  set_logs: SetLog[]
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  
  // Filtros
  const [filterType, setFilterType] = useState<"general" | "workout" | "exercise">("general")
  const [selectedId, setSelectedId] = useState<string>("")
  
  // Estado para a pesquisa do dropdown
  const [exerciseSearch, setExerciseSearch] = useState("")

  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()

    const { data: logsData } = await supabase
      .from("workout_logs")
      .select(`
        id, date, workout_id,
        workouts (id, name),
        set_logs (
          weight, reps, exercise_id,
          exercises (name)
        )
      `)
      .order("date", { ascending: true })

    if (logsData) setLogs(logsData as any)

    const { data: exData } = await supabase.from("exercises").select("id, name").order("name")
    if (exData) setExercises(exData)

    const { data: wData } = await supabase.from("workouts").select("id, name").order("name")
    if (wData) setWorkouts(wData)
  }

  // --- Processamento dos Dados para o Gráfico ---
  const chartData = useMemo(() => {
    if (logs.length === 0) return []

    if (filterType === "general") {
      return logs
        .filter(log => log.workouts)
        .map(log => {
          const volume = log.set_logs.reduce((acc, set) => acc + (set.weight * set.reps), 0)
          return {
            date: new Date(log.date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' }),
            name: log.workouts?.name || "Treino",
            volume: volume,
            fullDate: log.date
          }
        })
    }

    if (filterType === "workout" && selectedId) {
      const filteredLogs = logs.filter(log => log.workout_id === selectedId)
      
      return filteredLogs.map(log => {
        const dataPoint: any = {
          date: new Date(log.date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' }),
          fullDate: log.date
        }
        
        log.set_logs.forEach(set => {
            const exName = set.exercises?.name
            if (exName) {
                if (!dataPoint[exName] || set.weight > dataPoint[exName]) {
                    dataPoint[exName] = set.weight
                }
            }
        })
        return dataPoint
      })
    }

    if (filterType === "exercise" && selectedId) {
        const relevantLogs = logs.filter(log => 
            log.set_logs.some(set => set.exercise_id === selectedId)
        )

        return relevantLogs.map(log => {
            const exerciseSets = log.set_logs.filter(s => s.exercise_id === selectedId)
            const maxWeight = Math.max(...exerciseSets.map(s => s.weight))
            const volume = exerciseSets.reduce((acc, s) => acc + (s.weight * s.reps), 0)

            return {
                date: new Date(log.date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' }),
                fullDate: log.date,
                weight: maxWeight,
                volume: volume
            }
        })
    }

    return []
  }, [logs, filterType, selectedId])

  // --- Utilitários ---

  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

  const getDataKeys = () => {
    if (chartData.length === 0) return []
    if (filterType === "exercise") return ["weight"]
    if (filterType === "general") return ["volume"]
    
    const keys = new Set<string>()
    chartData.forEach((d: any) => {
        Object.keys(d).forEach(k => {
            if (k !== 'date' && k !== 'fullDate') keys.add(k)
        })
    })
    return Array.from(keys)
  }

  const clearFilter = () => {
    setFilterType("general")
    setSelectedId("")
    setExerciseSearch("")
  }

  // Filtrar a lista de exercícios baseado na busca
  const filteredExercisesList = exercises.filter(ex => 
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  )

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
        
        {/* Controles de Filtro */}
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium uppercase text-muted-foreground flex items-center gap-2">
                    <Filter className="h-4 w-4" /> Visualização
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Select 
                        value={filterType === "workout" ? selectedId : ""} 
                        onValueChange={(val) => {
                            setFilterType("workout")
                            setSelectedId(val)
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrar por Treino" />
                        </SelectTrigger>
                        <SelectContent>
                            {workouts.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="flex-1">
                    <Select 
                        value={filterType === "exercise" ? selectedId : ""} 
                        onValueChange={(val) => {
                            setFilterType("exercise")
                            setSelectedId(val)
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrar por Exercício" />
                        </SelectTrigger>
                        <SelectContent>
                            {/* CAMPO DE PESQUISA DENTRO DO SELECT */}
                            <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                    <Input 
                                        placeholder="Buscar..." 
                                        className="h-8 pl-8 text-xs"
                                        value={exerciseSearch}
                                        onChange={(e) => setExerciseSearch(e.target.value)}
                                        onKeyDown={(e) => e.stopPropagation()} // Impede que o Select feche ao digitar
                                    />
                                </div>
                            </div>
                            
                            <div className="max-h-[200px] overflow-y-auto">
                                {filteredExercisesList.length > 0 ? (
                                    filteredExercisesList.map(ex => (
                                        <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
                                    ))
                                ) : (
                                    <div className="p-2 text-xs text-muted-foreground text-center">Nenhum encontrado</div>
                                )}
                            </div>
                        </SelectContent>
                    </Select>
                </div>

                {(filterType !== "general") && (
                    <Button variant="ghost" onClick={clearFilter} className="px-3">
                        <X className="mr-2 h-4 w-4" /> Limpar
                    </Button>
                )}
            </CardContent>
        </Card>

        {/* Área Gráfica */}
        <Card className="min-h-[400px]">
            <CardHeader>
                <CardTitle>
                    {filterType === "general" && "Volume por Treino (Geral)"}
                    {filterType === "workout" && "Progressão de Carga por Exercício"}
                    {filterType === "exercise" && "Evolução de Carga Máxima"}
                </CardTitle>
                <CardDescription>
                    {filterType === "general" && "Comparação da intensidade (Volume = Peso x Reps) de todos os seus treinos."}
                    {filterType === "workout" && "Visualizando o aumento de peso nos exercícios deste treino."}
                    {filterType === "exercise" && "Histórico de peso máximo levantado neste exercício."}
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] w-full">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                tick={{fontSize: 12}} 
                                tickMargin={10}
                            />
                            <YAxis 
                                tick={{fontSize: 12}} 
                                width={40}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                            
                            {filterType === "general" ? (
                                <Line 
                                    type="monotone" 
                                    dataKey="volume" 
                                    name="Volume Total (kg)" 
                                    stroke="hsl(var(--primary))" 
                                    strokeWidth={2}
                                    dot={{ r: 4, strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                            ) : (
                                getDataKeys().map((key) => (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        name={filterType === 'exercise' ? "Peso Máximo (kg)" : key}
                                        stroke={filterType === 'exercise' ? "hsl(var(--primary))" : stringToColor(key)}
                                        strokeWidth={2}
                                        connectNulls 
                                        dot={{ r: 3 }}
                                    />
                                ))
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <TrendingUp className="h-10 w-10 mb-2 opacity-20" />
                        <p>Sem dados suficientes para o gráfico.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        {filterType === 'exercise' && chartData.length > 0 && (
             <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardDescription>Recorde (PR)</CardDescription></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{Math.max(...chartData.map((d: any) => d.weight))} kg</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardDescription>Último Treino</CardDescription></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{chartData[chartData.length -1].weight} kg</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardDescription>Evolução Total</CardDescription></CardHeader>
                    <CardContent>
                        <p className={`text-2xl font-bold ${
                            (chartData[chartData.length -1].weight - chartData[0].weight) >= 0 ? "text-green-500" : "text-red-500"
                        }`}>
                            {((chartData[chartData.length -1].weight - chartData[0].weight)).toFixed(1)} kg
                        </p>
                    </CardContent>
                </Card>
             </div>
        )}

      </div>
    </div>
  )
}
