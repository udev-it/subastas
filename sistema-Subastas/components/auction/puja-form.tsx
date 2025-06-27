"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, DollarSign, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
// Ya no importamos pujaService directamente
// import { pujaService } from "@/lib/puja-service"
import { supabase } from "@/lib/supabase"

interface PujaFormProps {
  idSubasta?: string
  onSuccess?: () => void
}

export default function PujaForm({ idSubasta: propIdSubasta, onSuccess }: PujaFormProps) {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const [idSubasta, setIdSubasta] = useState(propIdSubasta || "")
  const [monto, setMonto] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [infoSubasta, setInfoSubasta] = useState<any>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)

  // Cargar información de la subasta cuando se proporciona un ID
  useEffect(() => {
    if (idSubasta) {
      cargarInfoSubasta(idSubasta)
    }
  }, [idSubasta])

  // Cargar información de la subasta desde el nuevo endpoint
  const cargarInfoSubasta = async (id: string) => {
    try {
      setLoadingInfo(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError("Sesión no encontrada para cargar información de la subasta.")
        setLoadingInfo(false)
        return
      }

      const response = await fetch(`/api/subastas/${id}/info`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || "No se pudo cargar la información de la subasta")
      }

      setInfoSubasta(result.data)
    } catch (err: any) {
      console.error("Error al cargar info de subasta:", err)
      setError(err.message || "Error al cargar información de la subasta")
      setInfoSubasta(null)
    } finally {
      setLoadingInfo(false)
    }
  }

  // Manejar cambio en el ID de la subasta
  const handleIdSubastaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setIdSubasta(value)
    setInfoSubasta(null)
    setError(null)
    setSuccess(null)
  }

  // Manejar cambio en el monto de la puja
  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, "")
    setMonto(value)
  }

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar autenticación
    if (!isAuthenticated || !user) {
      setError("Debe iniciar sesión para realizar una puja")
      return
    }

    // Validar campos
    if (!idSubasta) {
      setError("Debe ingresar el ID de la subasta")
      return
    }

    if (!monto || Number.parseFloat(monto) <= 0) {
      setError("Debe ingresar un monto válido")
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setSuccess(null)

      // Obtener el token de sesión
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError("Sesión expirada. Por favor, inicie sesión nuevamente.")
        setIsLoading(false)
        return
      }

      // Enviar la puja
      const response = await fetch("/api/pujas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id_subasta: idSubasta,
          monto: Number.parseFloat(monto),
        }),
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
        throw new Error(result.message || "Error al realizar la puja")
      }

      // Mostrar mensaje de éxito
      setSuccess(result.message || "Puja realizada correctamente")
      setMonto("")

      // Llamar al callback de éxito si existe
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error al realizar puja:", error)
      setError(error.message || "Error al realizar la puja")
    } finally {
      setIsLoading(false)
    }
  }

  // Verificar si el usuario está cargando
  if (authLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando...</span>
      </div>
    )
  }

  // Verificar si el usuario está autenticado
  if (!isAuthenticated) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No autorizado</AlertTitle>
        <AlertDescription>Debe iniciar sesión para realizar pujas en las subastas.</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="w-full border-primary/20 shadow-md">
      <CardHeader className="bg-accent">
        <CardTitle className="text-primary">Realizar Puja</CardTitle>
        <CardDescription>Complete el formulario para realizar una puja en la subasta seleccionada.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Campo para ID de la subasta */}
            <div className="space-y-2">
              <label htmlFor="id-subasta" className="text-sm font-medium">
                ID de la Subasta
              </label>
              <div className="flex gap-2">
                <Input
                  id="id-subasta"
                  value={idSubasta}
                  onChange={handleIdSubastaChange}
                  placeholder="Ingrese el ID de la subasta"
                  disabled={isLoading || !!propIdSubasta}
                  className="flex-1"
                />
                {!propIdSubasta && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cargarInfoSubasta(idSubasta)}
                    disabled={!idSubasta || isLoading || loadingInfo}
                  >
                    {loadingInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
                  </Button>
                )}
              </div>
            </div>

            {/* Información de la subasta */}
            {infoSubasta && (
              <div className="p-4 border rounded-md bg-accent/30">
                <h3 className="font-medium text-lg mb-2">{infoSubasta.titulo}</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Descripción:</span>{" "}
                    <span className="text-muted-foreground">{infoSubasta.descripcion}</span>
                  </div>
                  <div>
                    <span className="font-medium">Estado:</span>{" "}
                    <span className={infoSubasta.estado === "activa" ? "text-green-600" : "text-amber-600"}>
                      {infoSubasta.estado.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Campo para monto de la puja */}
            <div className="space-y-2">
              <label htmlFor="monto" className="text-sm font-medium">
                Monto de la Puja
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="monto"
                  value={monto}
                  onChange={handleMontoChange}
                  placeholder="0.00"
                  className="pl-9"
                  disabled={isLoading || !infoSubasta}
                />
              </div>
              {infoSubasta && (
                <p className="text-xs text-muted-foreground">Ingrese el monto que desea pujar por este artículo</p>
              )}
            </div>

            {/* Mensajes de error y éxito */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-400">Éxito</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">{success}</AlertDescription>
              </Alert>
            )}

            {/* Botón de envío */}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white"
              disabled={isLoading || !infoSubasta || !monto}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Realizar Puja"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
