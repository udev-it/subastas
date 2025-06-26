"use client"

import { useState, useEffect } from "react"
import Hero from "@/components/hero"
import Header from "@/components/header"
import UserDashboard from "@/components/auth/user-dashboard"
import UserProfile from "@/components/auth/user-profile"
import { useAuth } from "@/hooks/use-auth"

export default function Home() {
  const [activeSection, setActiveSection] = useState("home")
  const { user, isLoading } = useAuth()

  // Cuando el usuario inicia sesión, actualizar automáticamente a la sección dashboard
  useEffect(() => {
    if (user && activeSection === "home") {
      setActiveSection("dashboard")
    }
  }, [user, activeSection])

  // Función para cambiar a la sección de perfil
  const handleViewProfile = () => {
    setActiveSection("profile")
  }

  // Función para volver al dashboard
  const handleBackToDashboard = () => {
    setActiveSection("dashboard")
  }

  return (
    <>
      <Header activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="container mx-auto px-4 pt-16">
        {activeSection === "home" && <Hero />}
        {activeSection === "dashboard" && user && <UserDashboard user={user} onViewProfile={handleViewProfile} />}
        {activeSection === "profile" && user && (
          <div className="mx-auto max-w-3xl">
            <UserProfile
              userId={user.id}
              email={user.email || ""}
              userType={user.userType || "unknown"}
              onBack={handleBackToDashboard}
            />
          </div>
        )}
      </div>
    </>
  )
}
