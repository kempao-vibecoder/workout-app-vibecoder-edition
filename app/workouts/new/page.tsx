"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft } from "lucide-react"

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]

export default function NewWorkoutPage() {
  const [name, setName] = useState("")
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  function toggleDay(day: string) {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || selectedDays.length === 0) return

    setIsLoading(true)
    const supabase = createClient()

    // 1. Pegamos o usuário atual logado
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        // Se não tiver usuário, redireciona pro login ou avisa o erro
        console.error("Usuário não logado")
        setIsLoading(false)
        return
    }

    // 2. Mandamos o user_id junto no insert
    const { error } = await supabase.from("workouts").insert({ 
        name, 
        days_of_week: selectedDays, // Lembra do plural que arrumamos antes
        user_id: user.id 
    })

    if (error) {
        console.error("Erro ao criar treino:", error) // Bom pra debugar no console
    } else {
        router.push("/workouts")
    }
    
    setIsLoading(false)
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

      <div className="container mx-auto max-w-2xl p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Treino</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Treino</Label>
                <Input
                  id="name"
                  placeholder="Ex: Treino A - Peito e Tríceps"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label>Dias da Semana</Label>
                <div className="grid grid-cols-2 gap-3">
                  {DAYS.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox id={day} checked={selectedDays.includes(day)} onCheckedChange={() => toggleDay(day)} />
                      <label
                        htmlFor={day}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {day}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => router.push("/workouts")}
                >
                  Cancelar
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={isLoading || !name || selectedDays.length === 0}
                  // onClick removido, o form cuida disso sozinho!
                >
                  {isLoading ? "Criando..." : "Criar Treino"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
