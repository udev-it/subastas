"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, DollarSign, Users, AlertCircle, Car, Info } from "lucide-react"
import Image from "next/image"
import { getTablaValidaciones } from "../app/api/api"
import { useAuth } from "@/hooks/use-auth"


interface Auction {
  id: string
  title: string
  image: string
  startDate: string
  endDate: string
  minimumBid: string
  participants: number
  maxParticipants: number
  status: "Activa" | "Finalizada" | "Próxima"
  vehicleDetails: {
    id: string
    mainDamage: string
    secondaryDamage: string
    retailValue: string
    cylinders: string
    bodyStyle: string
    color: string
    engine: string
  }
}

export default function AuctionsList() {
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [validaciones, setValidaciones] = useState<null | {
    edad_verificada: boolean
    documentos_validados: boolean
    reputacion_aprobada: boolean
  }>(null)
  const [validacionesLoading, setValidacionesLoading] = useState(true)


  // Datos de ejemplo para las subastas
  const auctions: Auction[] = [
    {
      id: "SUB-001",
      title: "Subasta de Toyota Corolla 2019",
      image: "/placeholder.svg?key=swhxw",
      startDate: "01/05/2025",
      endDate: "15/05/2025",
      minimumBid: "$2,000.00",
      participants: 12,
      maxParticipants: 50,
      status: "Activa",
      vehicleDetails: {
        id: "VEH-2023-001",
        mainDamage: "Golpe lateral",
        secondaryDamage: "Parabrisas roto",
        retailValue: "$12,500.00",
        cylinders: "4",
        bodyStyle: "Sedán",
        color: "Blanco",
        engine: "1.8L",
      },
    },
    {
      id: "SUB-002",
      title: "Subasta de Honda Civic 2020",
      image: "/placeholder.svg?key=7v3ui",
      startDate: "05/05/2025",
      endDate: "20/05/2025",
      minimumBid: "$2,500.00",
      participants: 8,
      maxParticipants: 50,
      status: "Activa",
      vehicleDetails: {
        id: "VEH-2023-002",
        mainDamage: "Golpe frontal",
        secondaryDamage: "Faros rotos",
        retailValue: "$14,000.00",
        cylinders: "4",
        bodyStyle: "Sedán",
        color: "Gris",
        engine: "2.0L",
      },
    },
    {
      id: "SUB-003",
      title: "Subasta de Nissan Sentra 2018",
      image: "/placeholder.svg?key=qypg5",
      startDate: "10/05/2025",
      endDate: "25/05/2025",
      minimumBid: "$1,800.00",
      participants: 15,
      maxParticipants: 50,
      status: "Activa",
      vehicleDetails: {
        id: "VEH-2023-003",
        mainDamage: "Golpe trasero",
        secondaryDamage: "Puerta abollada",
        retailValue: "$10,800.00",
        cylinders: "4",
        bodyStyle: "Sedán",
        color: "Azul",
        engine: "1.6L",
      },
    },
  ]

  const openModal = (auction: Auction) => {
    setSelectedAuction(auction)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleParticipate = (auctionId: string) => {
    console.log(`Participando en la subasta: ${auctionId}`)
    // Aquí iría la lógica para participar en la subasta
  }

  const { user } = useAuth()

  useEffect(() => {
    const fetchValidaciones = async () => {
      if (!user?.id) return

      try {
        setValidacionesLoading(true)
        const data = await getTablaValidaciones(user.id)
        setValidaciones(data)
      } catch (err) {
        console.error("Error al cargar validaciones:", err)
        setValidaciones(null)
      } finally {
        setValidacionesLoading(false)
      }
    }

    fetchValidaciones()
  }, [user?.id])

  const puedeParticipar =
  validaciones?.edad_verificada &&
  validaciones?.documentos_validados &&
  validaciones?.reputacion_aprobada



  return (
    <section className="py-20">
      <div className="container px-4 md:px-6">
        <div className="space-y-12">
          <div className="space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Listado de Subastas</h2>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Explora nuestras subastas activas en formato de lista
            </p>
          </div>

          <div className="flex flex-col items-center space-y-6 mt-12">
            {auctions.map((auction) => (
              <Card key={auction.id} className="w-full max-w-3xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="relative h-48 md:h-auto md:w-1/3">
                      <Image
                        src={auction.image || "/placeholder.svg"}
                        alt={auction.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <Badge
                        className={`absolute top-2 right-2 ${
                          auction.status === "Activa"
                            ? "bg-primary text-primary-foreground"
                            : auction.status === "Finalizada"
                              ? "bg-gray-500"
                              : "bg-yellow-500"
                        }`}
                      >
                        {auction.status}
                      </Badge>
                    </div>
                    <div className="p-5 md:w-2/3 flex flex-col">
                      <h3 className="text-lg font-bold mb-2">{auction.title}</h3>

                      <div className="space-y-2 mb-4 flex-1">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="mr-2 h-4 w-4" />
                          <span>
                            {auction.startDate} - {auction.endDate}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <DollarSign className="mr-2 h-4 w-4" />
                          <span>Monto mínimo de puja: {auction.minimumBid}</span>
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
                        <Button onClick={() => handleParticipate(auction.id)} className="flex-1">
                          Participar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                  src={selectedAuction.image || "/placeholder.svg"}
                  alt={selectedAuction.title}
                  fill
                  className="object-cover rounded-md"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Detalles de la Subasta</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Calendar className="mr-2 h-4 w-4 text-primary" />
                      <span>
                        <strong>Duración de la subasta:</strong> {selectedAuction.startDate} - {selectedAuction.endDate}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="mr-2 h-4 w-4 text-primary" />
                      <span>
                        <strong>Monto mínimo de puja:</strong> {selectedAuction.minimumBid}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4 text-primary" />
                      <span>
                        <strong>Participantes:</strong> {selectedAuction.participants} /{" "}
                        {selectedAuction.maxParticipants}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-primary" />
                      <span>
                        <strong>Estado:</strong>{" "}
                        <Badge
                          className={`${
                            selectedAuction.status === "Activa"
                              ? "bg-primary text-primary-foreground"
                              : selectedAuction.status === "Finalizada"
                                ? "bg-gray-500"
                                : "bg-yellow-500"
                          }`}
                        >
                          {selectedAuction.status}
                        </Badge>
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
                        <strong>ID vehicular:</strong> {selectedAuction.vehicleDetails.id}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <AlertCircle className="mr-2 h-4 w-4 text-primary mt-0.5" />
                      <span>
                        <strong>Daño principal:</strong> {selectedAuction.vehicleDetails.mainDamage}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <AlertCircle className="mr-2 h-4 w-4 text-primary mt-0.5" />
                      <span>
                        <strong>Daño secundario:</strong> {selectedAuction.vehicleDetails.secondaryDamage}
                      </span>
                    </div>
                    <div className="flex items-start">
                      <DollarSign className="mr-2 h-4 w-4 text-primary mt-0.5" />
                      <span>
                        <strong>Valor minorista estimado:</strong> {selectedAuction.vehicleDetails.retailValue}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-start">
                        <span>
                          <strong>Cilindros:</strong> {selectedAuction.vehicleDetails.cylinders}
                        </span>
                      </div>
                      <div className="flex items-start">
                        <span>
                          <strong>Estilo de carrocería:</strong> {selectedAuction.vehicleDetails.bodyStyle}
                        </span>
                      </div>
                      <div className="flex items-start">
                        <span>
                          <strong>Color:</strong> {selectedAuction.vehicleDetails.color}
                        </span>
                      </div>
                      <div className="flex items-start">
                        <span>
                          <strong>Motor:</strong> {selectedAuction.vehicleDetails.engine}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={closeModal} className="sm:order-first">
                Cerrar
              </Button>
              <Button
                onClick={() => handleParticipate(selectedAuction.id)}
                className={`w-full ${
                  puedeParticipar ? "bg-red-600 hover:bg-red-700" : "bg-gray-400 cursor-not-allowed"
                }`}
                disabled={!puedeParticipar}
              >
                Participar en la Subasta
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </section>
  )
}
