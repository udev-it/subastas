"use client"

import { useState, useEffect } from "react"
import { onAuthStateChange, getCurrentSession, checkUserType, type UserProfile } from "@/lib/supabase"

/**
 * Hook personalizado para manejar la autenticación
 * Proporciona el usuario actual, estado de carga y funciones relacionadas con la autenticación
 */
export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    // Obtener la sesión actual al montar el componente
    const getInitialSession = async () => {
      try {
        setIsLoading(true)
        const { user } = await getCurrentSession()

        // Solo actualizar el estado si el componente sigue montado
        if (isMounted && user) {
          // Verificar el tipo de usuario (postor o subastador)
          const userTypeInfo = await checkUserType(user.id)

          // Combinar la información del usuario con su tipo
          const userWithType: UserProfile = {
            ...user,
            userType: userTypeInfo.userType,
            postorId: userTypeInfo.postorId,
            subastadorId: userTypeInfo.subastadorId,
          }

          setUser(userWithType)
          setIsLoading(false)
        } else if (isMounted) {
          setUser(null)
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Error getting initial session:", error)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    // Iniciar con la sesión actual
    getInitialSession()

    // Configurar el listener para cambios en la autenticación
    const unsubscribe = onAuthStateChange(async (authUser) => {
      if (isMounted) {
        if (authUser) {
          // Verificar el tipo de usuario (postor o subastador)
          const userTypeInfo = await checkUserType(authUser.id)

          // Combinar la información del usuario con su tipo
          const userWithType: UserProfile = {
            ...authUser,
            userType: userTypeInfo.userType,
            postorId: userTypeInfo.postorId,
            subastadorId: userTypeInfo.subastadorId,
          }

          setUser(userWithType)
        } else {
          setUser(null)
        }
        setIsLoading(false)
      }
    })

    // Limpiar el listener y marcar el componente como desmontado
    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    userType: user?.userType || "unknown",
  }
}
