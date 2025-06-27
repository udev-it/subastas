/**
 * Componente AuctionDetail
 *
 * Este componente muestra los detalles completos de una subasta específica.
 * Incluye todos los campos de la base de datos y los datos del vehículo.
 *
 * @author ZAGOOM
 * @version 1.0
 */

"use client"

// Importaciones necesarias
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Calendar, DollarSign, Users, AlertCircle, FileText, Clock, Car, Loader2, AlertTriangle } from "lucide-react"
import Image from "next/image"
import type { Auction } from "@/lib/supabase" // Importa el tipo Auction de Supabase
import { registerParticipation, checkParticipation } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

/**
 * Propiedades del componente AuctionDetail
 */
interface AuctionDetailProps {
  auction: Auction // Datos de la subasta a mostrar
  onParticipate: (auctionId: string) => void // Función para participar en la subasta
}

/**
 * Componente principal para mostrar los detalles de una subasta
 */
export default function AuctionDetail({ auction, onParticipate }: AuctionDetailProps) {
  const { user } = useAuth()
  const [participationLoading, setParticipationLoading] = useState(false)
  const [isParticipating, setIsParticipating] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isAlreadyParticipatingModalOpen, setIsAlreadyParticipatingModalOpen] = useState(false)

  useEffect(() => {
    const checkUserParticipation = async () => {
      if (user?.id && auction?.id_subasta) {
        try {
          const participating = await checkParticipation(auction.id_subasta, user.id)
          setIsParticipating(participating)
        } catch (error) {
          console.error("Error checking participation:", error)
        }
      }
    }

    checkUserParticipation()
  }, [user?.id, auction?.id_subasta])

  /**
   * Función auxiliar para validar y formatear números
   */
  const safeNumber = (value: any, defaultValue = 0): number => {
    const num = Number(value)
    return isNaN(num) ? defaultValue : num
  }

  /**
   * Función auxiliar para formatear moneda de forma segura
   */
  const formatCurrency = (value: any): string => {
    const num = safeNumber(value, 0)
    return `$${num.toLocaleString("es-MX")}`
  }

  /**
   * Maneja el clic en el botón de participar
   */
  const handleParticipateClick = async () => {
    if (!user?.id || !auction) return

    if (isParticipating) {
      // Si ya está participando, mostrar modal de "ya está participando"
      setIsAlreadyParticipatingModalOpen(true)
    } else {
      // Si no está participando, mostrar modal de confirmación
      setIsConfirmModalOpen(true)
    }
  }

  const confirmParticipation = async () => {
    if (!user?.id || !auction) return

    setIsConfirmModalOpen(false)
    setParticipationLoading(true)

    try {
      const result = await registerParticipation(user.id, auction.id_subasta)

      if (result.success) {
        setIsParticipating(true)
        alert("¡Te has registrado exitosamente en la subasta!")
        // Navegar a la interfaz de pujas
        onParticipate(auction.id_subasta)
      } else {
        alert(result.error || "Error al registrar participación")
      }
    } catch (error) {
      console.error("Error al participar:", error)
      alert("Error al registrar participación")
    } finally {
      setParticipationLoading(false)
    }
  }

  const goToBidding = () => {
    setIsAlreadyParticipatingModalOpen(false)
    onParticipate(auction.id_subasta)
  }

  const backToAuctions = () => {
    setIsAlreadyParticipatingModalOpen(false)
  }

  // Validar datos de la subasta
  const precioBase = safeNumber(auction.precio_base, 0)
  const montoMinimoPuja = safeNumber(auction.monto_minimo_puja, 0)
  const maxParticipantes = safeNumber(auction.cantidad_max_participantes, 1)
  const anioVehiculo = safeNumber(auction.vehicleDetails?.anio, 0)

  // Renderizado del componente
  return (
    <>
      <div className="bg-background rounded-lg shadow-lg overflow-hidden border border-border max-w-6xl mx-auto">
        {/* Cabecera con título y estado */}
        <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{auction.titulo || "Subasta sin título"}</h1>
            </div>
            <div className="flex items-center gap-2"></div>
          </div>
        </div>

        {/* Contenido principal en grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6">
          {/* Columna izquierda - Imagen y datos básicos */}
          <div className="space-y-6">
            {/* Imagen del vehículo */}
            <div className="relative h-[400px] w-full bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={auction.vehicleDetails?.imagen_url || "/placeholder.svg"}
                alt={auction.titulo || "Vehículo en subasta"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>

            {/* Descripción de la subasta */}
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                Descripción
              </h2>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-foreground leading-relaxed">{auction.descripcion || "Sin descripción disponible"}</p>
              </div>
            </div>
          </div>

          {/* Columna derecha - Información detallada */}
          <div className="space-y-6">
            {/* Información de fechas */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center">
                <Clock className="mr-2 h-5 w-5 text-primary" />
                Fechas de la Subasta
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-card p-4 rounded-lg border">
                  <div className="flex items-center mb-2">
                    <Calendar className="mr-2 h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-foreground">Fecha de Inicio</h3>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{auction.inicio || "No especificada"}</p>
                </div>
                <div className="bg-card p-4 rounded-lg border">
                  <div className="flex items-center mb-2">
                    <Calendar className="mr-2 h-5 w-5 text-red-600" />
                    <h3 className="font-medium text-foreground">Fecha de Cierre</h3>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{auction.fin || "No especificada"}</p>
                </div>
              </div>
            </div>

            {/* Información financiera */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-primary" />
                Información Financiera
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-card p-4 rounded-lg border">
                  <div className="flex items-center mb-2">
                    <DollarSign className="mr-2 h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-foreground">Precio Base</h3>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(precioBase)}</p>
                  <p className="text-sm text-muted-foreground">Precio inicial de la subasta</p>
                </div>
                <div className="bg-card p-4 rounded-lg border">
                  <div className="flex items-center mb-2">
                    <DollarSign className="mr-2 h-5 w-5 text-orange-600" />
                    <h3 className="font-medium text-foreground">Monto Mínimo de Puja</h3>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(montoMinimoPuja)}</p>
                  <p className="text-sm text-muted-foreground">Incremento mínimo por puja</p>
                </div>
              </div>
            </div>

            {/* Información de participantes */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                Participación
              </h2>
              <div className="bg-card p-4 rounded-lg border">
                <div className="flex items-center mb-2">
                  <Users className="mr-2 h-5 w-5 text-purple-600" />
                  <h3 className="font-medium text-foreground">Máximo de Participantes</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">{maxParticipantes}</p>
                <p className="text-sm text-muted-foreground">Número máximo de participantes permitidos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Información del vehículo (si está disponible) */}
        {auction.vehicleDetails && (
          <div className="p-6 border-t bg-muted/10">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-foreground flex items-center">
                <Car className="mr-2 h-6 w-6 text-primary" />
                Información Detallada del Vehículo
              </h2>

              {/* Grid de información del vehículo */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Información básica */}
                <div className="bg-card p-4 rounded-lg border">
                  <div className="flex items-center mb-3">
                    <Car className="mr-2 h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-foreground">Información Básica</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Año:</span>
                      <p className="text-foreground">{anioVehiculo > 0 ? anioVehiculo.toString() : "N/A"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Modelo:</span>
                      <p className="text-foreground">{auction.vehicleDetails.modelo || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Estado y daños */}
                <div className="bg-card p-4 rounded-lg border">
                  <div className="flex items-center mb-3">
                    <AlertCircle className="mr-2 h-5 w-5 text-red-600" />
                    <h3 className="font-medium text-foreground">Estado del Vehículo</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Descripción:</span>
                      <p className="text-foreground">{auction.vehicleDetails.descripcion || "Sin descripción"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botón de participar en la parte inferior */}
        <div className="p-6 border-t bg-muted/20">
          <Button
            onClick={handleParticipateClick}
            className="w-full h-16 text-xl font-semibold"
            variant={isParticipating ? "default" : "default"}
            size="lg"
            disabled={participationLoading}
          >
            {participationLoading ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Registrando participación...
              </>
            ) : isParticipating ? (
              "Ir a pujar"
            ) : (
              "Participar en esta subasta"
            )}
          </Button>
        </div>
      </div>

      {/* Modal de confirmación para participar (usuario no está participando) */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Confirmar participación</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-base">
              ¿Está seguro que desea participar en la subasta <strong>{auction.titulo}</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              Al confirmar, usted acepta las reglas de la subasta y se compromete a pagar el monto de su puja en caso de
              ganar.
            </p>
          </div>
          <DialogFooter className="flex flex-row gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)} className="px-6">
              Cancelar
            </Button>
            <Button onClick={confirmParticipation} className="px-6 bg-red-600 hover:bg-red-700 text-white">
              Confirmar participación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para cuando ya está participando */}
      <Dialog open={isAlreadyParticipatingModalOpen} onOpenChange={setIsAlreadyParticipatingModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              Ya estás participando
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-base">
              Ya estás registrado en la subasta: <strong>{auction.titulo}</strong>
            </p>
            <div className="space-y-2">
              <p className="font-medium">¿Qué deseas hacer?</p>
              <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                <li>• Puedes ir directamente a pujar</li>
                <li>• O volver a la lista de subastas</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex flex-row gap-3 justify-end">
            <Button variant="outline" onClick={backToAuctions} className="px-6 bg-transparent">
              Volver a subastas
            </Button>
            <Button onClick={goToBidding} className="px-6 bg-red-600 hover:bg-red-700 text-white">
              Ir a pujar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
