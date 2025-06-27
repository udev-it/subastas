"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, DollarSign, Users, Car, Award, Calendar, Loader2 } from "lucide-react"
import Image from "next/image"
import { getAuctionById, checkParticipation } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"

interface Auction {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  basePrice: string
  minimumBidAmount: string
  participants: number
  maxParticipants: number
  status: "Publicada" | "Activa" | "Finalizada" | "Completada"
  vehiculo: {
    ficha: string
    anio: number
    modelo: string
    descripcion: string
    imagen_url: string
  }
}

interface AuctionResponse {
  id_subasta: string
  titulo: string
  descripcion: string
  inicio: string
  fin: string
  precio_base: number
  monto_minimo_puja: number
  cantidad_participantes: number
  cantidad_max_participantes: number
  estado: "Publicada" | "Activa" | "Finalizada" | "Completada"
  vehiculo: {
    ficha: string
    anio: number
    modelo: string
    descripcion: string
    imagen_url: string
  }
}

interface Bid {
  id: string
  monto: number
  fecha: string
  postor: {
    usuario: {
      nombre: string
      primer_apellido: string
    }
  }
}

export default function AuctionBidding({ auctionId, onBack }: { auctionId: string; onBack: () => void }) {
  const { user } = useAuth()
  const [auction, setAuction] = useState<Auction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentBid, setCurrentBid] = useState(0)
  const [userBid, setUserBid] = useState("")
  const [timeLeft, setTimeLeft] = useState("")
  const [bidHistory, setBidHistory] = useState<Bid[]>([])
  const [isHighestBidder, setIsHighestBidder] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isParticipating, setIsParticipating] = useState(false)

  // Cargar datos de la subasta
  useEffect(() => {
    if (!auctionId || !auctionId.trim()) {
      console.error("ID de subasta no válido:", auctionId)
      setError("ID de subasta no proporcionado")
      setLoading(false)
      return
    }

    const loadAuction = async () => {
      try {
        setLoading(true)

        // Verificar participación del usuario
        if (user?.id) {
          const participating = await checkParticipation(auctionId, user.id)
          setIsParticipating(participating)
        }

        const data = (await getAuctionById(auctionId)) as AuctionResponse | null
        if (!data) {
          setError("Subasta no encontrada")
          return
        }

        // Verificar que los datos del vehículo existen y tienen la estructura esperada
        if (!data.vehiculo || typeof data.vehiculo !== "object") {
          setError("Error: Datos del vehículo no disponibles")
          return
        }

        const normalizedAuction: Auction = {
          id: data.id_subasta,
          title: data.titulo,
          description: data.descripcion,
          startDate: new Date(data.inicio).toLocaleDateString("es-ES"),
          endDate: new Date(data.fin).toLocaleDateString("es-ES"),
          basePrice: `$${data.precio_base.toFixed(2)}`,
          minimumBidAmount: `$${data.monto_minimo_puja.toFixed(2)}`,
          participants: data.cantidad_participantes,
          maxParticipants: data.cantidad_max_participantes,
          status: data.estado,
          vehiculo: {
            ficha: data.vehiculo.ficha || "",
            anio: data.vehiculo.anio || 0,
            modelo: data.vehiculo.modelo || "No especificado",
            descripcion: data.vehiculo.descripcion || "Sin descripción",
            imagen_url: data.vehiculo.imagen_url || "/placeholder.svg",
          },
        }

        setAuction(normalizedAuction)
        setCurrentBid(data.monto_minimo_puja)
      } catch (err) {
        console.error("Error cargando subasta:", err)
        setError("Error al cargar la subasta")
      } finally {
        setLoading(false)
      }
    }

    loadAuction()
  }, [auctionId, user?.id])

  // Calcular tiempo restante
  useEffect(() => {
    if (!auction) return

    const calculateTimeLeft = () => {
      const endDate = new Date(auction.endDate)
      const now = new Date()
      const diff = endDate.getTime() - now.getTime()

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
      } else {
        setTimeLeft("Subasta finalizada")
      }
    }

    const timer = setInterval(calculateTimeLeft, 1000)
    calculateTimeLeft()
    return () => clearInterval(timer)
  }, [auction])

  const handleBid = async () => {
    if (!user?.id || !auction) return

    const bidAmount = Number.parseFloat(userBid)

    // Validaciones
    if (isNaN(bidAmount)) {
      setErrorMessage("Por favor ingrese un monto válido")
      return
    }

    if (bidAmount <= currentBid) {
      setErrorMessage(`Su puja debe ser mayor a $${currentBid.toFixed(2)}`)
      return
    }

    if (!isParticipating) {
      setErrorMessage("Debes participar en la subasta antes de pujar")
      return
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando subasta...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">{error}</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a las subastas
        </Button>
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="text-center py-10">
        <p>No se encontró la subasta</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a las subastas
        </Button>
      </div>
    )
  }

  // Formatear fechas para mostrar
  const startDate = new Date(auction.startDate).toLocaleDateString("es-ES")
  const endDate = new Date(auction.endDate).toLocaleDateString("es-ES")

  return (
    <section className="py-10">
      <div className="container px-4 md:px-6">
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a las subastas
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información de la subasta y vehículo */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">{auction.title}</h1>
                  <p className="text-muted-foreground text-sm">{auction.description}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Imagen del vehículo */}
              <div className="relative h-64 w-full rounded-md overflow-hidden">
                <Image
                  src={auction?.vehiculo.imagen_url || "/placeholder.svg"}
                  alt={`${auction?.vehiculo.anio || ""} ${auction?.vehiculo.modelo || "Vehículo"}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Detalles de la Subasta */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <DollarSign className="mr-2 h-5 w-5 text-primary" />
                    Detalles de la subasta
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium">Estado:</span>
                      <Badge variant={auction.status === "Activa" ? "default" : "secondary"}>{auction.status}</Badge>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium flex items-center">
                        <Calendar className="mr-1 h-4 w-4" />
                        Fecha inicio:
                      </span>
                      <span>{startDate}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium flex items-center">
                        <Calendar className="mr-1 h-4 w-4" />
                        Fecha fin:
                      </span>
                      <span>{endDate}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        Tiempo restante:
                      </span>
                      <span className="font-mono text-primary">{timeLeft}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium">Precio base:</span>
                      <span className="font-semibold text-green-600">{auction.basePrice}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium">Puja mínima:</span>
                      <span className="font-semibold text-blue-600">{auction.minimumBidAmount}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium">Puja actual:</span>
                      <span className="font-bold text-primary text-lg">${currentBid.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium flex items-center">
                        <Users className="mr-1 h-4 w-4" />
                        Participantes:
                      </span>
                      <span>
                        {auction.participants} / {auction.maxParticipants}
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${(auction.participants / auction.maxParticipants) * 100}%`,
                            }}
                          />
                        </div>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detalles del Vehículo */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Car className="mr-2 h-5 w-5 text-primary" />
                    Detalles del vehículo
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium">Año:</span>
                      <span className="font-semibold">{auction?.vehiculo.anio || "No especificado"}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium">Modelo:</span>
                      <span className="font-semibold">{auction?.vehiculo.modelo || "No especificado"}</span>
                    </div>

                    <div className="p-2 bg-muted/50 rounded">
                      <span className="font-medium block mb-2">Descripción:</span>
                      <p className="text-muted-foreground leading-relaxed">
                        {auction?.vehiculo.descripcion || "Sin descripción disponible"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Panel de pujas */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Realizar puja
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isHighestBidder && (
                  <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-md mb-4 flex items-center">
                    <Award className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                    <p className="text-green-600 dark:text-green-400 text-sm font-medium">¡Tienes la puja más alta!</p>
                  </div>
                )}

                {!isParticipating && (
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-md mb-4">
                    <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                      Debes participar en la subasta antes de pujar
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-sm font-medium mb-1">Puja actual</p>
                    <p className="text-2xl font-bold text-primary">${currentBid.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">La puja mínima debe ser mayor a la puja actual</p>
                  </div>

                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={userBid}
                        onChange={(e) => setUserBid(e.target.value)}
                        placeholder="Ingrese su puja"
                        className="pl-9"
                        step="0.01"
                        min={currentBid + 0.01}
                        disabled={!isParticipating}
                      />
                    </div>
                    <Button onClick={handleBid} className="px-6" disabled={!isParticipating}>
                      Pujar
                    </Button>
                  </div>

                  {errorMessage && (
                    <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-md">
                      <p className="text-red-600 dark:text-red-400 text-xs">{errorMessage}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserBid((currentBid + 100).toString())}
                      disabled={!isParticipating}
                    >
                      +$100
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserBid((currentBid + 250).toString())}
                      disabled={!isParticipating}
                    >
                      +$250
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserBid((currentBid + 500).toString())}
                      disabled={!isParticipating}
                    >
                      +$500
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historial de pujas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {bidHistory.length > 0 ? (
                    bidHistory.map((bid) => (
                      <div
                        key={bid.id}
                        className={`flex justify-between items-center p-3 rounded-md border-l-4 ${
                          bid.postor.usuario.nombre === "Tú"
                            ? "bg-primary/10 border-l-primary"
                            : "bg-muted/50 border-l-muted"
                        }`}
                      >
                        <div>
                          <p className={`font-medium ${bid.postor.usuario.nombre === "Tú" ? "text-primary" : ""}`}>
                            {bid.postor.usuario.nombre} {bid.postor.usuario.primer_apellido}
                          </p>
                          <p className="text-xs text-muted-foreground">{new Date(bid.fecha).toLocaleString()}</p>
                        </div>
                        <p className="font-bold text-lg">${bid.monto.toFixed(2)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No hay pujas registradas</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
