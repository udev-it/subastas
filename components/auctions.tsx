"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, DollarSign, Users, X, AlertCircle, Car, Info, Loader2, RefreshCw } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import AuctionBidding from "@/components/auction-bidding"
import { registerParticipation, checkUserType, fetchAvailableAuctions } from "@/lib/supabase"

interface Auction {
  id_subasta: string
  title: string
  description: string
  status: "Publicada" | "Activa" | "Finalizada"
  startDate: string
  endDate: string
  rawStartDate: string
  rawEndDate: string
  basePrice: number
  minimumBid: string
  maxParticipants: number
  participants: number
  vehicle: {
    ficha: string
    anio: number
    model: string
    description: string
    imageUrl: string
  }
}

interface AuctionsProps {
  onParticipate?: (auction: Auction) => void
  onViewDetails?: (auction: Auction) => void
}

export default function Auctions({ onParticipate, onViewDetails }: AuctionsProps) {
  const { user } = useAuth()
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isLoadingParticipation, setIsLoadingParticipation] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [postorId, setPostorId] = useState<string | null>(null)
  const [activeAuctionId, setActiveAuctionId] = useState<string | null>(null)
  const [isAlreadyParticipatingModalOpen, setIsAlreadyParticipatingModalOpen] = useState(false)
  const [startDateFilter, setStartDateFilter] = useState("")
  const [endDateFilter, setEndDateFilter] = useState("")
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (value: number): string => {
    return `$${value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start' && endDateFilter && value > endDateFilter) {
      toast.error('La fecha de inicio no puede ser mayor a la fecha de fin')
      return
    }
    if (type === 'end' && startDateFilter && value < startDateFilter) {
      toast.error('La fecha de fin no puede ser menor a la fecha de inicio')
      return
    }
    type === 'start' ? setStartDateFilter(value) : setEndDateFilter(value)
  }

  const clearFilters = () => {
    setStartDateFilter("")
    setEndDateFilter("")
  }

  const loadAuctions = async () => {
    try {
      setLoading(true)
      setError(null)

      const filters = {
        startDate: startDateFilter,
        endDate: endDateFilter
      }

      const supabaseAuctions = await fetchAvailableAuctions(filters)
      
      const formattedAuctions = supabaseAuctions.map(auction => ({
        id_subasta: auction.id_subasta,
        title: auction.titulo,
        description: auction.descripcion,
        status: auction.estado as "Publicada" | "Activa" | "Finalizada",
        startDate: new Date(auction.inicio).toLocaleDateString('es-MX'),
        endDate: new Date(auction.fin).toLocaleDateString('es-MX'),
        rawStartDate: auction.inicio,
        rawEndDate: auction.fin,
        basePrice: auction.precio_base,
        minimumBid: formatCurrency(auction.monto_minimo_puja),
        maxParticipants: auction.cantidad_max_participantes,
        participants: auction.cantidad_participantes,
        vehicle: {
          ficha: auction.vehicleDetails?.ficha || "",
          anio: auction.vehicleDetails?.anio || 0,
          model: auction.vehicleDetails?.modelo || "Modelo no especificado",
          description: auction.vehicleDetails?.descripcion || "Sin descripción disponible",
          imageUrl: auction.vehicleDetails?.imagen_url || "/placeholder.svg"
        }
      }))

      setAuctions(formattedAuctions)
    } catch (err) {
      console.error("Error loading auctions:", err)
      setError("Error al cargar las subastas. Intente nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAuctions()
  }, [startDateFilter, endDateFilter])

  useEffect(() => {
    if (!user?.id) return
    const loadPostorId = async () => {
      const profile = await checkUserType(user.id)
      if (profile.userType === 'postor' && profile.postorId) {
        setPostorId(profile.postorId)
      }
    }
    loadPostorId()
  }, [user?.id])

  const openModal = (auction: Auction) => {
    setSelectedAuction(auction)
    setIsModalOpen(true)
    onViewDetails?.(auction)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleParticipate = async (auction: Auction) => {
    if (!user?.id) {
      toast.error("Debes iniciar sesión para participar")
      return
    }
    if (!auction.id_subasta) {
      toast.error("Error: ID de subasta no válida")
      return
    }
    setSelectedAuction(auction)
    setIsConfirmModalOpen(true)
  }

  const confirmParticipation = async () => {
    if (!user?.id || !selectedAuction?.id_subasta) {
      toast.error("Datos incompletos para participar")
      return
    }

    try {
      setIsLoadingParticipation(true)

      const { success, error } = await registerParticipation(
        user.id,
        selectedAuction.id_subasta
      )

      if (success) {
        toast.success("¡Participación registrada con éxito!")
        setIsConfirmModalOpen(false)
        setActiveAuctionId(selectedAuction.id_subasta)
        onParticipate?.(selectedAuction)
      } else if (error?.includes("Ya estás participando")) {
        setIsAlreadyParticipatingModalOpen(true)
        setIsConfirmModalOpen(false)
      } else {
        toast.error(error || "Error al participar")
      }
    } catch (error) {
      console.error("Error al confirmar participación:", error)
      toast.error("Error al procesar la participación")
    } finally {
      setIsLoadingParticipation(false)
    }
  }

  const handleRetry = () => {
    loadAuctions()
  }

  if (activeAuctionId) {
    return (
      <AuctionBidding
        auctionId={activeAuctionId}
        onBack={() => {
          setActiveAuctionId(null)
        }}
      />
    )
  }

  return (
    <section className="py-20">
      <div className="container px-4 md:px-6">
        <div className="space-y-12">
          <div className="space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Subastas</h2>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Explora nuestras subastas activas y participa para obtener los mejores precios
            </p>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Filtrar Subastas</h3>
                <div className="flex gap-2">
                  {(startDateFilter || endDateFilter) && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="flex items-center gap-2">
                      <X className="h-4 w-4" />
                      Limpiar filtros
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleRetry} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Actualizar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Fecha de Inicio (desde)</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    placeholder="Seleccionar fecha de inicio"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Fecha de Fin (hasta)</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    placeholder="Seleccionar fecha de fin"
                    disabled={loading}
                  />
                </div>
              </div>

              {(startDateFilter || endDateFilter) && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>Filtros activos:</strong>
                    {startDateFilter && ` Desde: ${startDateFilter}`}
                    {endDateFilter && ` Hasta: ${endDateFilter}`}
                  </p>
                </div>
              )}
            </Card>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Cargando subastas...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error al cargar subastas</h3>
              <p className="text-muted-foreground mb-4 text-center max-w-md">{error}</p>
              <Button onClick={handleRetry} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
              {auctions.length > 0 ? (
                auctions.map((auction) => (
                  <Card key={auction.id_subasta} className="overflow-hidden h-full flex flex-col">
                    <div className="relative h-48 w-full">
                      <Image
                        src={auction.vehicle.imageUrl}
                        alt={`${auction.vehicle.anio} ${auction.vehicle.model}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      {/*<Badge
                        className={`absolute top-2 right-2 ${
                          auction.status === "Activa"
                            ? "bg-primary text-primary-foreground"
                            : auction.status === "Finalizada"
                              ? "bg-gray-500"
                              : "bg-yellow-500"
                        }`}
                      >
                        {auction.status}
                      </Badge>*/}
                    </div>
                    <CardContent className="flex-1 flex flex-col p-5">
                      <h3 className="text-lg font-bold mb-1">{auction.title}</h3>
                      {/*<p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {auction.vehicle.anio} {auction.vehicle.model}
                      </p>*/}

                      <div className="space-y-2 mb-4 flex-1">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="mr-2 h-4 w-4" />
                          <span>
                            {auction.startDate} - {auction.endDate}
                          </span>
                        </div>
                        {/*<div className="flex items-center text-sm text-muted-foreground">
                          <DollarSign className="mr-2 h-4 w-4" />
                          <span>Precio base: {formatCurrency(auction.basePrice)}</span>
                        </div>*/}
                        <div className="flex items-center text-sm text-muted-foreground">
                          <DollarSign className="mr-2 h-4 w-4" />
                          <span>Monto mínimo: {auction.minimumBid}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="mr-2 h-4 w-4" />
                          <span>
                            Participantes: {auction.participants} / {auction.maxParticipants}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-auto">
                        <Button variant="outline" onClick={() => openModal(auction)} className="flex-1">
                          <Info className="mr-2 h-4 w-4" /> Ver detalles
                        </Button>
                        <Button onClick={() => handleParticipate(auction)} className="flex-1">
                          Participar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    No se encontraron subastas activas que coincidan con los filtros seleccionados.
                  </p>
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalles */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        {selectedAuction && (
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedAuction.title}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="relative h-64 w-full">
                <Image
                  src={selectedAuction.vehicle.imageUrl}
                  alt={`${selectedAuction.vehicle.anio} ${selectedAuction.vehicle.model}`}
                  fill
                  className="object-cover rounded-md"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Detalles de la Subasta</h3>
                  <p className="text-sm text-muted-foreground mb-3">{selectedAuction.description}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-primary" />
                      <span>
                        <strong>Duración:</strong> {selectedAuction.startDate} - {selectedAuction.endDate}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="mr-2 h-4 w-4 text-primary" />
                      <span>
                        <strong>Precio base:</strong> {formatCurrency(selectedAuction.basePrice)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="mr-2 h-4 w-4 text-primary" />
                      <span>
                        <strong>Puja mínima:</strong> {selectedAuction.minimumBid}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4 text-primary" />
                      <span>
                        <strong>Participantes:</strong> {selectedAuction.participants} /{" "}
                        {selectedAuction.maxParticipants}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Detalles del Vehículo</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start">
                      <Car className="mr-2 h-4 w-4 text-primary mt-0.5" />
                      <span>
                        <strong>Modelo:</strong> {selectedAuction.vehicle.anio} {selectedAuction.vehicle.model}
                      </span>
                    </div>
                    <div className="mt-2">
                      <strong>Descripción:</strong>
                      <p className="text-muted-foreground mt-1 leading-relaxed">
                        {selectedAuction.vehicle.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={closeModal} className="sm:order-first">
                Cerrar
              </Button>
              <Button onClick={() => handleParticipate(selectedAuction)}>Participar en la Subasta</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Modal de confirmación para participar */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        {selectedAuction && (
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Confirmar participación</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>
                ¿Está seguro que desea participar en la subasta <strong>{selectedAuction.title}</strong>?
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Al confirmar, usted acepta las reglas de la subasta y se compromete a pagar el monto de su puja en caso
                de ganar.
              </p>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsConfirmModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={confirmParticipation}
                disabled={isLoadingParticipation}
              >
                {isLoadingParticipation ? "Procesando..." : "Confirmar participación"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Modal "Ya estás participando" */}
      <Dialog open={isAlreadyParticipatingModalOpen} onOpenChange={setIsAlreadyParticipatingModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="text-yellow-500" />
              <span>Ya estás participando</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>
              Ya estás registrado en la subasta: <strong>{selectedAuction?.title}</strong>
            </p>
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="font-medium">¿Qué deseas hacer?</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Puedes ir directamente a pujar</li>
                <li>O volver a la lista de subastas</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAlreadyParticipatingModalOpen(false)}
            >
              Volver a subastas
            </Button>
            <Button
              onClick={() => {
                if (selectedAuction?.id_subasta) {
                  console.log("Usuario ya participando, estableciendo ID de subasta activa:", selectedAuction.id_subasta)
                  setActiveAuctionId(selectedAuction.id_subasta)
                  setIsAlreadyParticipatingModalOpen(false)
                } else {
                  console.error("No se encontró ID de subasta al intentar ir a pujar")
                  toast.error("Error al acceder a la subasta")
                }
              }}
            >
              Ir a pujar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}