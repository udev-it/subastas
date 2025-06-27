"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Auctions from "@/components/auctions"
import Header from "@/components/header"

interface UserData {
  id_postor: number
  email: string
  nombre_completo: string
  id_usuario: string
  loginTime: string
}

export default function SubastasPage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verificar si el usuario está logueado
    const storedUser = localStorage.getItem("zagoom_user")

    if (!storedUser) {
      // Si no hay usuario logueado, redirigir al login
      router.push("/")
      return
    }

    try {
      const user = JSON.parse(storedUser) as UserData
      setUserData(user)
      console.log("Usuario logueado:", user)
    } catch (error) {
      console.error("Error al parsear datos del usuario:", error)
      localStorage.removeItem("zagoom_user")
      router.push("/")
      return
    }

    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("zagoom_user")
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!userData) {
    return null // El useEffect se encargará de la redirección
  }

  return (
    <>
      <Header activeSection="auctions" setActiveSection={() => {}} />
      <div className="container mx-auto px-4 pt-16">
        <Auctions />
      </div>
    </>
  )
}
