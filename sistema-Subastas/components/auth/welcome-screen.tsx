"use client"

import { Button } from "@/components/ui/button"
import { LogIn, UserPlus } from "lucide-react"

interface WelcomeScreenProps {
  onLoginClick: () => void
  onRegisterClick: () => void
}

export default function WelcomeScreen({ onLoginClick, onRegisterClick }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center space-y-4 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
          Bienvenido a <span className="text-primary">ZAGOOM</span>
        </h1>
        <p className="mx-auto max-w-[700px] text-xl text-muted-foreground md:text-2xl">
          Encuentra las mejores oportunidades en vehículos y participa en nuestras subastas
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <Button onClick={onLoginClick} size="lg" className="rounded-full bg-primary hover:bg-primary/90 text-white">
          <LogIn className="mr-2 h-4 w-4" /> Iniciar Sesión
        </Button>
        <Button
          onClick={onRegisterClick}
          variant="outline"
          size="lg"
          className="rounded-full border-primary text-primary hover:bg-primary/10"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Registrarse
        </Button>
      </div>
    </div>
  )
}
