"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { v4 as uuidv4 } from "uuid"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, ImageOff, X, ZoomIn } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

// Importar el cliente de Supabase inicializado
import { supabase } from "@/lib/supabase"

// Actualizar el esquema de validación para incluir el vehículo
const formSchema = z.object({
  titulo: z.string().min(3, { message: "El título debe tener al menos 3 caracteres" }).max(255),
  descripcion: z.string().min(10, { message: "La descripción debe tener al menos 10 caracteres" }),
  estado: z.string().min(1, { message: "Seleccione un estado" }),
  inicio: z.string().min(1, { message: "Seleccione una fecha de inicio" }),
  fin: z.string().min(1, { message: "Seleccione una fecha de fin" }),
  precio_base: z.string().min(1, { message: "Ingrese un precio base" }),
  monto_minimo_puja: z.string().min(1, { message: "Ingrese un monto mínimo de puja" }),
  cantidad_max_pujas: z.string().min(1, { message: "Ingrese una cantidad máxima de pujas" }),
  cantidad_max_participantes: z.string().min(1, { message: "Ingrese una cantidad máxima de participantes" }),
  ficha_vehiculo: z.string().uuid({ message: "Seleccione un vehículo válido" }).optional(),
})

// Definir la interfaz para el tipo de vehículo, incluyendo imagen_url
interface Vehiculo {
  ficha: string
  modelo: string
  anio: number
  descripcion: string
  imagen_url: string | null
}

export default function RegistroSubasta() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(null)
  const [loadingVehiculos, setLoadingVehiculos] = useState(true)
  const [errorVehiculos, setErrorVehiculos] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  // Inicializar el formulario con react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      descripcion: "",
      estado: "pendiente",
      inicio: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      fin: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
      precio_base: "0",
      monto_minimo_puja: "0",
      cantidad_max_pujas: "10",
      cantidad_max_participantes: "20",
      ficha_vehiculo: undefined,
    },
  })

  // Cargar los vehículos al montar el componente
  useEffect(() => {
    async function cargarVehiculos() {
      try {
        setLoadingVehiculos(true)
        setErrorVehiculos(null)

        // Actualizar la consulta para incluir imagen_url
        const { data, error } = await supabase.from("vehiculo").select("ficha, modelo, anio, descripcion, imagen_url")

        if (error) {
          console.error("Error de Supabase:", error)
          throw new Error(error.message)
        }

        console.log("Vehículos cargados:", data)
        setVehiculos(data || [])
      } catch (error) {
        console.error("Error al cargar vehículos:", error)
        setErrorVehiculos("No se pudieron cargar los vehículos. Por favor, intente nuevamente.")
      } finally {
        setLoadingVehiculos(false)
      }
    }

    cargarVehiculos()
  }, [])

  // Manejar la selección de vehículo
  const handleVehiculoChange = (ficha: string) => {
    const vehiculo = vehiculos.find((v) => v.ficha === ficha) || null
    setVehiculoSeleccionado(vehiculo)
    setImageError(false) // Resetear el error de imagen al cambiar de vehículo
    form.setValue("ficha_vehiculo", ficha)
  }

  // Función para manejar el envío del formulario
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)

    try {
      // Generar un UUID para la subasta
      const id_subasta = uuidv4()

      // Convertir valores numéricos
      const precio_base = Number.parseFloat(values.precio_base)
      const monto_minimo_puja = Number.parseFloat(values.monto_minimo_puja)
      const cantidad_max_pujas = Number.parseInt(values.cantidad_max_pujas)
      const cantidad_max_participantes = Number.parseInt(values.cantidad_max_participantes)

      // Crear objeto de datos para insertar en la base de datos
      const subastaData = {
        id_subasta,
        titulo: values.titulo,
        descripcion: values.descripcion,
        estado: values.estado,
        inicio: values.inicio,
        fin: values.fin,
        precio_base,
        monto_minimo_puja,
        cantidad_max_pujas,
        cantidad_max_participantes,
        id_subastador: "fa30674f-309c-4ffb-9e58-31a2468df1b1", // Valor específico proporcionado
        ficha_vehiculo: values.ficha_vehiculo, // Añadir la referencia al vehículo seleccionado
      }

      // Insertar datos en la tabla "subasta"
      const { error: errorSubasta } = await supabase.from("subasta").insert([subastaData])

      if (errorSubasta) {
        throw new Error(errorSubasta.message)
      }

      // Mostrar mensaje de éxito
      toast({
        title: "Subasta registrada",
        description: "La subasta ha sido registrada exitosamente.",
      })

      // Resetear el formulario y la selección de vehículo
      form.reset()
      setVehiculoSeleccionado(null)
    } catch (error) {
      console.error("Error al registrar la subasta:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al registrar la subasta. Por favor, intente nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Manejar error de carga de imagen
  const handleImageError = () => {
    setImageError(true)
  }

  // Abrir el modal de imagen
  const openImageModal = () => {
    if (vehiculoSeleccionado?.imagen_url && !imageError) {
      setIsImageModalOpen(true)
    }
  }

  return (
    <>
      <Card className="w-full border-primary/20 shadow-md">
        <CardHeader className="bg-accent">
          <CardTitle className="text-primary">Registro de subasta</CardTitle>
          <CardDescription>Complete el formulario para registrar una nueva subasta.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Título de la subasta" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="activa">Activa</SelectItem>
                          <SelectItem value="finalizada">Finalizada</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción detallada de la subasta"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha y hora de inicio</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha y hora de fin</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="precio_base"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio base</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormDescription>Precio inicial de la subasta</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monto_minimo_puja"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto mínimo de puja</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormDescription>Incremento mínimo para cada puja</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="cantidad_max_pujas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad máxima de pujas</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cantidad_max_participantes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad máxima de participantes</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-6 bg-primary/20" />

              <div>
                <h3 className="text-lg font-medium mb-4 text-primary">Información del vehículo</h3>

                {errorVehiculos && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{errorVehiculos}</AlertDescription>
                  </Alert>
                )}

                <FormField
                  control={form.control}
                  name="ficha_vehiculo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seleccionar vehículo</FormLabel>
                      <Select
                        onValueChange={(value) => handleVehiculoChange(value)}
                        value={field.value}
                        disabled={loadingVehiculos}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={loadingVehiculos ? "Cargando vehículos..." : "Seleccione un vehículo"}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehiculos.length === 0 && !loadingVehiculos ? (
                            <SelectItem value="no-vehiculos" disabled>
                              No hay vehículos disponibles
                            </SelectItem>
                          ) : (
                            vehiculos.map((vehiculo) => (
                              <SelectItem key={vehiculo.ficha} value={vehiculo.ficha}>
                                {vehiculo.modelo} ({vehiculo.anio})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {vehiculoSeleccionado && (
                  <div className="mt-4 p-4 border border-primary/20 rounded-md bg-accent">
                    <h4 className="font-medium mb-2 text-primary">Detalles del vehículo</h4>

                    {/* Imagen del vehículo */}
                    <div className="mb-4 flex justify-center">
                      {vehiculoSeleccionado.imagen_url && !imageError ? (
                        <div
                          className="relative w-full h-48 md:h-64 overflow-hidden rounded-md group cursor-pointer"
                          onClick={openImageModal}
                        >
                          <img
                            src={vehiculoSeleccionado.imagen_url || "/placeholder.svg"}
                            alt={`Imagen de ${vehiculoSeleccionado.modelo}`}
                            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                            onError={handleImageError}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="bg-white rounded-full p-2">
                              <ZoomIn className="h-6 w-6 text-primary" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-48 md:h-64 bg-gray-100 dark:bg-gray-800 rounded-md">
                          <ImageOff className="h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">No hay imagen disponible</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Modelo</p>
                        <p>{vehiculoSeleccionado.modelo}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Año</p>
                        <p>{vehiculoSeleccionado.anio}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-500">Descripción</p>
                      <p className="text-sm">{vehiculoSeleccionado.descripcion}</p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Registrando..." : "Registrar subasta"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Modal para visualizar la imagen en tamaño completo */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {vehiculoSeleccionado?.modelo} ({vehiculoSeleccionado?.anio})
            </DialogTitle>
            <DialogDescription>Visualización detallada del vehículo</DialogDescription>
          </DialogHeader>
          <div className="relative flex-1 min-h-[50vh] overflow-hidden rounded-md">
            {vehiculoSeleccionado?.imagen_url && (
              <img
                src={vehiculoSeleccionado.imagen_url || "/placeholder.svg"}
                alt={`Imagen de ${vehiculoSeleccionado.modelo}`}
                className="object-contain w-full h-full"
              />
            )}
          </div>
          <DialogClose className="absolute top-2 right-2 rounded-full p-2 bg-primary/10 hover:bg-primary/20">
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  )
}
