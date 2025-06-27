"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2, TrendingUp } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"

interface PujasListProps {
  idSubasta: string
  autoRefresh?: boolean
}

export default function PujasList({ idSubasta, autoRefresh = false }: PujasListProps) {
  const { isAuthenticated } = useAuth()
  const [pujas, setPujas] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar pujas al montar el componente y cuando cambia el ID de la subasta
  useEffect(() => {
    if (idSubasta) {
      cargarPujas()
    }
  }, [idSubasta])

  // Configurar actualización automática si está habilitada
  useEffect(() => {
    if (autoRefresh && idSubasta) {
      const interval = setInterval(() => {
        cargarPujas(false) // Cargar sin mostrar indicador de carga
      }, 10000) // Actualizar cada 10 segundos

      return () => clearInterval(interval)
    }
  }, [autoRefresh, idSubasta])

  // Cargar pujas de la subasta
  const cargarPujas = async (showLoading = true) => {
    if (!isAuthenticated) {
      setError("Debe iniciar sesión para ver las pujas")
      return
    }

    try {
      if (showLoading) {
        setIsLoading(true)
      }
      setError(null)

      // Obtener el token de sesión
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError("Sesión expirada. Por favor, inicie sesión nuevamente.")
        return
      }

      const response = await fetch(`/api/pujas?id_subasta=${idSubasta}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      // Manejar respuestas no-JSON
      let result
      try {
        const text = await response.text()
        try {
          result = JSON.parse(text)
        } catch (e) {
          console.error("Error al parsear respuesta JSON:", text)
          throw new Error(`Error del servidor: ${text.substring(0, 100)}...`)
        }
      } catch (parseError) {
        console.error("Error al leer respuesta:", parseError)
        throw new Error("Error al procesar la respuesta del servidor")
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Error al cargar las pujas")
      }

      setPujas(result.data || [])
    } catch (error: any) {
      console.error("Error al cargar pujas:", error)
      setError(error.message || "Error al cargar las pujas")
    } finally {
      if (showLoading) {
        setIsLoading(false)
      }
    }
  }

  // Formatear fecha y hora
  const formatDateTime = (fecha: string, hora: string) => {
    try {
      const fechaObj = new Date(`${fecha}T${hora}`)
      return fechaObj.toLocaleString()
    } catch (e) {
      return `${fecha} ${hora}`
    }
  }

  // Verificar si el usuario está autenticado
  if (!isAuthenticated) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No autorizado</AlertTitle>
        <AlertDescription>Debe iniciar sesión para ver las pujas de las subastas.</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="w-full border-primary/20 shadow-md">
      <CardHeader className="bg-accent">
        <CardTitle className="text-primary flex items-center">
          <TrendingUp className="mr-2 h-5 w-5" />
          Historial de Pujas
        </CardTitle>
        <CardDescription>Historial de pujas realizadas en esta subasta.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Cargando pujas...</span>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : pujas.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">No hay pujas registradas para esta subasta.</div>
        ) : (
          <div className="space-y-4">
            {/* Puja más alta */}
            <div className="bg-primary/10 p-4 rounded-md">
              <h3 className="font-medium text-primary mb-2">Puja más alta</h3>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold">${pujas[0].monto.toFixed(2)}</span>
                  <p className="text-sm text-muted-foreground">
                    Por: {pujas[0].postor?.usuario?.nombre || "Usuario"}{" "}
                    {pujas[0].postor?.usuario?.primer_apellido || ""}
                  </p>
                </div>
                <Badge variant="outline" className="text-primary border-primary">
                  {formatDateTime(pujas[0].fecha, pujas[0].hora)}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Lista de todas las pujas */}
            <div className="space-y-2">
              <h3 className="font-medium">Todas las pujas</h3>
              <div className="space-y-2">
                {pujas.map((puja, index) => (
                  <div
                    key={puja.id_puja}
                    className={`p-3 rounded-md border ${index === 0 ? "bg-primary/5 border-primary/20" : "bg-background"}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">${puja.monto.toFixed(2)}</span>
                        <p className="text-xs text-muted-foreground">
                          {puja.postor?.usuario?.nombre || "Usuario"} {puja.postor?.usuario?.primer_apellido || ""}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(puja.fecha, puja.hora)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
