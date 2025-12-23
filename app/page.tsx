import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dumbbell, TrendingUp, Calendar, BarChart3 } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">GymTrack</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Criar Conta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Acompanhe Sua Evolução na Academia</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Registre seus treinos e veja sua progressão de carga em tempo real
          </p>
          <Button size="lg" asChild>
            <Link href="/auth/sign-up">Começar Agora</Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Progressão de Carga</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Acompanhe o aumento de peso em cada exercício e veja sua evolução ao longo do tempo
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Treinos Personalizados</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Crie treinos customizados e atribua exercícios a dias específicos da semana
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Histórico Completo</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Visualize gráficos detalhados e acompanhe seu progresso com estatísticas completas
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          GymTrack - Seu companheiro de treinos
        </div>
      </footer>
    </div>
  )
}
