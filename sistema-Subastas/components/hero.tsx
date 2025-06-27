"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import LoginForm from "@/components/auth/login-form"
import RegisterForm from "@/components/auth/register-form"
import WelcomeScreen from "@/components/auth/welcome-screen"

export default function Hero() {
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [showRegisterForm, setShowRegisterForm] = useState(false)

  // Obtener el estado de autenticación
  const { user, isLoading } = useAuth()

  const handleLoginClick = () => {
    setShowLoginForm(true)
    setShowRegisterForm(false)
  }

  const handleRegisterClick = () => {
    setShowRegisterForm(true)
    setShowLoginForm(false)
  }

  const handleBackToWelcome = () => {
    setShowLoginForm(false)
    setShowRegisterForm(false)
  }

  // Si el usuario está autenticado, mostrar un mensaje de bienvenida
  if (user) {
    return (
      <section className="py-20 md:py-32 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Bienvenido a <span className="text-primary">ZAGOOM</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-xl text-muted-foreground md:text-2xl">
                Encuentra las mejores oportunidades en vehículos y participa en nuestras subastas
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-20 md:py-32 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="container px-4 md:px-6">
        {!showLoginForm && !showRegisterForm ? (
          // Welcome Screen
          <WelcomeScreen onLoginClick={handleLoginClick} onRegisterClick={handleRegisterClick} />
        ) : (
          // Login or Register Form
          <div className="flex justify-center">
            <div
              className={`w-full ${showLoginForm ? "max-w-md" : "max-w-2xl"} bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-800`}
            >
              {showLoginForm ? (
                <LoginForm
                  onSuccess={handleBackToWelcome}
                  onRegisterClick={handleRegisterClick}
                  onBackClick={handleBackToWelcome}
                />
              ) : (
                <RegisterForm
                  onSuccess={handleBackToWelcome}
                  onLoginClick={handleLoginClick}
                  onBackClick={handleBackToWelcome}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
