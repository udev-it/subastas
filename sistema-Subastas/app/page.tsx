"use client"

import { useState, useEffect } from "react"
import Hero from "@/components/hero"
import Header from "@/components/header"
import UserDashboard from "@/components/auth/user-dashboard"
import UserProfile from "@/components/auth/user-profile"
import Auctions from "@/components/auctions"
import AuctionDetail from "@/components/auction/auction-detail"
import { useAuth } from "@/hooks/use-auth"
import { fetchAuctionById, type Auction } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"

export default function Home() {
  const [activeSection, setActiveSection] = useState("home")
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null)
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const [loadingAuction, setLoadingAuction] = useState(false)
  const { user, isLoading } = useAuth()

  // Cuando el usuario inicia sesión, actualizar automáticamente a la sección de subastas
  useEffect(() => {
    if (user && activeSection === "home") {
      setActiveSection("auctions")
    }
  }, [user, activeSection])

  // Cargar detalles de la subasta cuando se selecciona una
  useEffect(() => {
    const loadAuctionDetails = async () => {
      if (selectedAuctionId) {
        setLoadingAuction(true)
        try {
          const auction = await fetchAuctionById(selectedAuctionId)
          if (auction) {
            setSelectedAuction(auction)
            setActiveSection("auction-detail")
          } else {
            console.error("No se pudo cargar la subasta")
            // Volver a la lista de subastas si no se puede cargar
            setSelectedAuctionId(null)
            setActiveSection("auctions")
          }
        } catch (error) {
          console.error("Error al cargar detalles de la subasta:", error)
          setSelectedAuctionId(null)
          setActiveSection("auctions")
        } finally {
          setLoadingAuction(false)
        }
      }
    }

    loadAuctionDetails()
  }, [selectedAuctionId])

  // Función para cambiar a la sección de perfil
  const handleViewProfile = () => {
    setActiveSection("profile")
  }

  // Función para volver al dashboard
  const handleBackToDashboard = () => {
    setActiveSection("dashboard")
  }

  // Función para volver a las subastas
  const handleBackToAuctions = () => {
    setSelectedAuctionId(null)
    setSelectedAuction(null)
    setActiveSection("auctions")
  }

  // Función para manejar participación en subasta
  const handleParticipate = (auction: any) => {
    console.log("Participar en subasta:", auction)
    // Aquí puedes implementar la lógica para participar en la subasta
    // Por ejemplo, redirigir a una página de pujas o abrir un modal
  }

  // Función para manejar participación desde el detalle
  const handleParticipateFromDetail = (auctionId: string) => {
    console.log("Participar en subasta desde detalle:", auctionId)
    // Aquí puedes implementar la lógica para participar en la subasta
  }

  // Función para manejar ver detalles de subasta
  const handleViewDetails = (auction: any) => {
    console.log("Ver detalles de subasta:", auction)
    setSelectedAuctionId(auction.id)
  }

  return (
    <>
      <Header activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="container mx-auto px-4 pt-16">
        {activeSection === "home" && <Hero />}

        {activeSection === "auctions" && user && (
          <Auctions onParticipate={handleParticipate} onViewDetails={handleViewDetails} />
        )}

        {activeSection === "auction-detail" && user && (
          <div className="space-y-4">
            {/* Botón para volver a la lista */}
            <div className="flex items-center">
              <Button
                variant="outline"
                onClick={handleBackToAuctions}
                className="flex items-center gap-2 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a subastas
              </Button>
            </div>

            {/* Contenido del detalle */}
            {loadingAuction ? (
              <div className="flex justify-center items-center py-12">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Cargando detalles de la subasta...</span>
                </div>
              </div>
            ) : selectedAuction ? (
              <AuctionDetail auction={selectedAuction} onParticipate={handleParticipateFromDetail} />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No se pudo cargar la información de la subasta.</p>
                <Button onClick={handleBackToAuctions} className="mt-4">
                  Volver a subastas
                </Button>
              </div>
            )}
          </div>
        )}

        {activeSection === "dashboard" && user && <UserDashboard user={user} onViewProfile={handleViewProfile} />}

        {activeSection === "profile" && user && (
          <div className="mx-auto max-w-3xl">
            <UserProfile
              userId={user.id}
              email={user.email || ""}
              userType={user.userType || "unknown"}
              onBack={handleBackToAuctions}
            />
          </div>
        )}
      </div>
    </>
  )
}