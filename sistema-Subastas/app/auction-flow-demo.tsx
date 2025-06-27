/**
 * Componente AuctionFlowDemo
 *
 * Este componente demuestra el flujo completo de visualización y participación en subastas.
 * Se conecta con Supabase para obtener datos reales de la base de datos.
 *
 * @author ZAGOOM
 * @version 1.0
 */

"use client"

import { useState } from "react"
import Auctions from "@/components/auctions"
import AuctionDetail from "@/components/auction-detail"
import type { Auction as SupabaseAuction } from "@/lib/supabase"

// Interfaz para la subasta del componente Auctions (actualizada para coincidir con components/auctions.tsx)
interface AuctionUI {
  id: string
  title: string
  image: string
  descripcion: string
  startDate: string
  endDate: string
  minimumBid: string
  participants: number
  maxParticipants: number
  precioBase: number
  status: "Activa" | "Finalizada" | "Próxima"
  vehicleDetails: {
    id: string
    anio: number
    description: string
    modelo: string
  }
}

/**
 * Componente de demostración para el flujo completo de subastas
 */
export default function AuctionFlowDemo() {
  // Estado para controlar si se muestran los detalles
  const [showDetails, setShowDetails] = useState(false)

  // Estado para almacenar la subasta seleccionada (formato Supabase)
  const [selectedAuction, setSelectedAuction] = useState<SupabaseAuction | null>(null)

  /**
   * Función auxiliar para validar y formatear números
   */
  const safeNumber = (value: any, defaultValue = 0): number => {
    const num = Number(value)
    return isNaN(num) ? defaultValue : num
  }

  /**
   * Convierte una subasta de la UI al formato de Supabase para mostrar detalles
   */
  const convertToSupabaseFormat = (auctionUI: AuctionUI): SupabaseAuction => {
    // Extraer el precio base de minimumBid si está disponible
    const precioBase = auctionUI.precioBase || 0
    const montoMinimoPuja = safeNumber(auctionUI.minimumBid?.replace(/[^0-9.-]+/g, ""), 0)

    return {
      id_subasta: auctionUI.id,
      titulo: auctionUI.title,
      descripcion: auctionUI.descripcion || `Subasta de ${auctionUI.title}`,
      estado: auctionUI.status,
      inicio: auctionUI.startDate,
      fin: auctionUI.endDate,
      precio_base: precioBase,
      monto_minimo_puja: montoMinimoPuja,
      cantidad_max_participantes: auctionUI.maxParticipants,
      vehicleDetails: {
        id_vehiculo: auctionUI.vehicleDetails?.id || "",
        ficha: auctionUI.vehicleDetails?.id || "",
        anio: auctionUI.vehicleDetails?.anio || 2020,
        modelo: auctionUI.vehicleDetails?.modelo || auctionUI.title,
        descripcion: auctionUI.vehicleDetails?.description || "Sin descripción disponible",
        imagen_url: auctionUI.image || "/placeholder.svg?height=300&width=400",
      },
    }
  }

  /**
   * Maneja cuando se hace clic en "Ver detalles" de una subasta
   */
  const handleViewDetails = (auctionUI: AuctionUI) => {
    console.log("Ver detalles de la subasta:", auctionUI.id)

    try {
      // Convertir al formato de Supabase para el componente AuctionDetail
      const supabaseAuction = convertToSupabaseFormat(auctionUI)
      setSelectedAuction(supabaseAuction)
      setShowDetails(true)
    } catch (error) {
      console.error("Error al convertir datos de la subasta:", error)
      alert("Ocurrió un error al cargar los detalles de la subasta. Por favor, inténtelo de nuevo.")
    }
  }

  /**
   * Maneja cuando se hace clic en "Participar" en una subasta
   */
  const handleParticipate = (auctionUI: AuctionUI) => {
    console.log(`Participando en la subasta: ${auctionUI.id}`)
    // Aquí iría la lógica para participar en la subasta
    alert(`Te has registrado exitosamente para participar en la subasta ${auctionUI.title}`)
  }

  /**
   * Maneja la participación desde la vista de detalles
   */
  const handleParticipateFromDetails = (auctionId: string) => {
    console.log(`Participando en la subasta: ${auctionId}`)
    // Aquí iría la lógica para participar en la subasta
    if (selectedAuction) {
      alert(`Te has registrado exitosamente para participar en la subasta ${selectedAuction.titulo}`)
    }
  }

  /**
   * Vuelve a la lista de subastas
   */
  const handleBackToList = () => {
    setShowDetails(false)
    setSelectedAuction(null)
  }

  // Renderizado del componente
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Sistema de Subastas ZAGOOM</h1>

      {!showDetails ? (
        // Mostrar la lista de subastas disponibles
        <Auctions onViewDetails={handleViewDetails} onParticipate={handleParticipate} />
      ) : (
        // Mostrar los detalles de la subasta seleccionada
        <div className="space-y-4">
          <button onClick={handleBackToList} className="text-primary hover:underline flex items-center mb-4">
            ← Volver a la lista de subastas
          </button>

          {selectedAuction && <AuctionDetail auction={selectedAuction} onParticipate={handleParticipateFromDetails} />}
        </div>
      )}
    </div>
  )
}
