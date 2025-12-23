"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Dumbbell, Calendar, TrendingUp, ListChecks, User } from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Treinos", href: "/workouts", icon: Dumbbell },
  { name: "Registrar", href: "/log", icon: Calendar },
  { name: "Progresso", href: "/history", icon: TrendingUp },
  { name: "Exercícios", href: "/exercises", icon: ListChecks },
]

export function NavSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-16 flex-col items-center gap-4 border-r border-border bg-card py-4 md:w-64">
      <div className="mb-4 px-4">
        <h1 className="hidden text-xl font-bold text-primary md:block">GymTrack</h1>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary md:hidden">
          <Dumbbell className="h-6 w-6 text-primary-foreground" />
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2 px-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="hidden md:inline">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-2">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
            pathname === "/profile" && "bg-primary text-primary-foreground",
          )}
        >
          <User className="h-5 w-5" />
          <span className="hidden md:inline">Perfil</span>
        </Link>
      </div>
    </div>
  )
}
