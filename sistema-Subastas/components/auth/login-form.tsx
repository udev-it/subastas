"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { signInWithEmail } from "@/lib/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface LoginFormProps {
  onSuccess?: () => void
  onRegisterClick: () => void
  onBackClick: () => void
}

export default function LoginForm({ onSuccess, onRegisterClick, onBackClick }: LoginFormProps) {
  // Estados para el formulario de inicio de sesión
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Manejar el inicio de sesión
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError("Por favor, completa todos los campos")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const { user, error } = await signInWithEmail(email, password)

      if (error) {
        setError(error)
        return
      }

      // Éxito - limpiar el formulario
      setEmail("")
      setPassword("")

      // Llamar al callback de éxito si existe
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      setError(error.message || "Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Bienvenido de nuevo</h2>
        <p className="text-muted-foreground">Inicia sesión en tu cuenta de ZAGOOM</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form className="space-y-4" onSubmit={handleLogin}>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            placeholder="tu@email.com"
            type="email"
            className="h-12"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </Label>
          
          </div>
          <Input
            id="password"
            placeholder="••••••••"
            type="password"
            className="h-12"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-white" disabled={isLoading}>
          {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </Button>
      </form>

      <div className="text-center text-sm">
        ¿No tienes una cuenta?{" "}
        <button className="text-primary font-medium hover:underline" onClick={onRegisterClick}>
          Regístrate
        </button>
      </div>

      <div className="mt-6 text-center">
        <button className="text-sm text-muted-foreground hover:text-foreground underline" onClick={onBackClick}>
          Volver a la página de bienvenida
        </button>
      </div>
    </div>
  )
}
