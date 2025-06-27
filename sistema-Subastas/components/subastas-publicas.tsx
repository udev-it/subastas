"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, DollarSign, Users, X, Eye, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import Image from "next/image"
import { fetchAvailableAuctions, type Auction as SupabaseAuction, type AuctionFilters } from "@/lib/supabase"

// Interfaz para el formato de datos que usa el componente (manteniendo el diseño original)
interface Auction {
  id: string
  title: string
  image: string
  descripcion: string
  startDate: string
  endDate: string
  rawStartDate: string // Formato ISO para filtrado
  rawEndDate: string   // Formato ISO para filtrado
  minimumBid: string
  participants: number
  maxParticipants: number
  Participants: number
  precioBase: number
  status: "Publicada"
  vehicleDetails: {
    id: string
    anio: number
    description: string
    modelo: string
  }
}

// Actualizar la interfaz de props para incluir onParticipate y onViewDetails
interface AuctionsProps {
  onParticipate: (auction: Auction) => void
  onViewDetails: (auction: Auction) => void
}

export default function Auctions({ onParticipate, onViewDetails }: AuctionsProps) {
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  // Estados para el filtro de fechas
  const [startDateFilter, setStartDateFilter] = useState("")
  const [endDateFilter, setEndDateFilter] = useState("")

  // Estados para manejo de datos
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para manejar cambios en las fechas de filtro
  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start' && endDateFilter && value > endDateFilter) {
      alert('La fecha de inicio no puede ser mayor a la fecha de fin');
      return;
    }
    if (type === 'end' && startDateFilter && value < startDateFilter) {
      alert('La fecha de fin no puede ser menor a la fecha de inicio');
      return;
    }
    
    type === 'start' ? setStartDateFilter(value) : setEndDateFilter(value);
  };

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
   * Convierte los datos de Supabase al formato esperado por el componente (diseño original)
   */
  const convertToDisplayFormat = (supabaseAuction: SupabaseAuction): Auction => {
    // Extraer información del modelo para generar datos más realistas
    const modelo = supabaseAuction.vehicleDetails?.modelo || "Vehículo"
    const anio = safeNumber(supabaseAuction.vehicleDetails?.anio, new Date().getFullYear())
    const descripcion = supabaseAuction.vehicleDetails?.descripcion || ""

    // Validar y formatear precios
    const precioBase = safeNumber(supabaseAuction.precio_base, 0)
    const montoMinimoPuja = safeNumber(supabaseAuction.monto_minimo_puja, 0)
    const maxParticipantes = safeNumber(supabaseAuction.cantidad_max_participantes, 1)
    const Participants = safeNumber(supabaseAuction.cantidad_participantes, 1)

    // Formatear fechas para mostrar
    const formatDateForDisplay = (isoDate: string) => {
      try {
        if (!isoDate) return "Fecha no disponible";
        const date = new Date(isoDate);
        if (isNaN(date.getTime())) return "Fecha inválida";
        return date.toLocaleDateString('es-MX', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        console.error("Error al formatear fecha:", isoDate, e);
        return "Fecha inválida";
      }
    };

    return {
      id: supabaseAuction.id_subasta || "",
      title: supabaseAuction.titulo || "Subasta sin título",
      image: supabaseAuction.vehicleDetails?.imagen_url || "/placeholder.svg?height=300&width=400",
      descripcion: supabaseAuction.descripcion || "Sin datos",
      startDate: formatDateForDisplay(supabaseAuction.inicio),
      endDate: formatDateForDisplay(supabaseAuction.fin),
      // Añade estas propiedades para el filtrado
      rawStartDate: supabaseAuction.inicio,
      rawEndDate: supabaseAuction.fin,
      minimumBid: formatCurrency(montoMinimoPuja),
      participants: Participants,
      maxParticipants: maxParticipantes,
      precioBase: precioBase,
      status: (supabaseAuction.estado as "Publicada" | "Activa" | "Finalizada") || "Publicada",
      vehicleDetails: {
        id: supabaseAuction.vehicleDetails?.id_vehiculo || "",
        anio: anio,
        description: supabaseAuction.vehicleDetails?.descripcion || "",
        modelo: modelo,
      },
    }
  }

  //  Núcleo de la carga de datos
  const loadAuctions = async () => {
  try {
    setLoading(true);
    setError(null);

    // Solo enviar filtros si tienen valor
    const filters: AuctionFilters = {};
    
    if (startDateFilter) {
      // Asegurar formato YYYY-MM-DD
      filters.startDate = startDateFilter;
    }
    
    if (endDateFilter) {
      // Asegurar formato YYYY-MM-DD
      filters.endDate = endDateFilter;
    }

    console.log('Enviando filtros:', filters);

    const supabaseAuctions = await fetchAvailableAuctions(filters);
    //console.log("Datos crudos de Supabase:", supabaseAuctions);
    const convertedAuctions = supabaseAuctions.map(convertToDisplayFormat);
    //console.log("Datos convertidos:", convertedAuctions);

    console.log("Datos ANTES de setAuctions:", {
      supabaseAuctions,
      convertedAuctions,
      filters
    });
    
    setAuctions(convertedAuctions);
  } catch (err: any) {
    console.error("Error al cargar subastas:", err);
    setError(err.message || "Error al cargar las subastas");
  } finally {
    setLoading(false);
  }
};

  // Cargar subastas al montar el componente
  useEffect(() => {
    loadAuctions()
  }, [])

  // Recargar subastas cuando cambien los filtros
  useEffect(() => {
    loadAuctions();
  }, [startDateFilter, endDateFilter]);

  // Función para convertir fecha de formato DD/MM/YYYY HH:MM a Date
  const parseDate = (dateString: string): Date => {
    try {
      // Formato esperado: "DD/MM/YYYY, HH:MM"
      const [datePart] = dateString.split(", ")
      const [day, month, year] = datePart.split("/").map(Number)
      return new Date(year, month - 1, day)
    } catch {
      return new Date()
    }
  }

  // Función para convertir fecha de formato YYYY-MM-DD a Date
  const parseInputDate = (dateString: string): Date => {
    return new Date(dateString)
  }

  // Función para limpiar filtros
  const clearFilters = () => {
    setStartDateFilter("")
    setEndDateFilter("")
  }

  // Función para manejar el clic en "Ver detalles"
  const handleViewDetails = (auction: Auction) => {
    console.log("Ver detalles de la subasta:", auction.id)
    onViewDetails(auction)
  }

  const handleParticipate = (auction: Auction) => {
    setSelectedAuction(auction)
    setIsConfirmModalOpen(true)
  }

  const confirmParticipation = () => {
    if (selectedAuction) {
      setIsConfirmModalOpen(false)
      onParticipate(selectedAuction)
    }
  }

  // Función para reintentar la carga
  const handleRetry = () => {
    loadAuctions()
  }

  return (
    <section className="py-20">
      <div className="container px-4 md:px-6">
        <div className="space-y-12">
          {/* Encabezado */}
          <div className="space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Subastas</h2>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            </p>
          </div>

          {/* Sección de filtros */}
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

              {/* Mostrar información de filtros activos */}
              {(startDateFilter || endDateFilter) && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>Filtros activos:</strong>
                    {startDateFilter && ` Desde: ${startDateFilter}`}
                    {endDateFilter && ` Hasta: ${endDateFilter}`}
                    {` • Mostrando ${auctions.length} de ${auctions.length} subastas`} {/* Cambiado */}
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Contenido principal */}
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
            /* Grid de subastas - Diseño original */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {auctions.length > 0 ? (
                auctions.map((auction) => (
                  <Card key={auction.id} className="overflow-hidden h-full flex flex-col">
                    <div className="relative h-48 w-full">
                      <Image
                        src={auction.image || "/placeholder.svg"}
                        alt={auction.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <CardContent className="flex-1 flex flex-col p-5">
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
                        <Button variant="outline" onClick={() => handleViewDetails(auction)} className="flex-1">
                          <Eye className="mr-2 h-4 w-4" /> Ver detalles
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
              <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)} className="sm:order-first">
                Cancelar
              </Button>
              <Button onClick={confirmParticipation}>Confirmar participación</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </section>
  )
}
