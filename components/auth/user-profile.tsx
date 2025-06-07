"use client"

import { DialogFooter } from "@/components/ui/dialog"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import {
  Save,
  ArrowLeft,
  Upload,
  AlertCircle,
  CheckCircle2,
  FileText,
  ExternalLink,
  Edit,
  Mail,
  Phone,
  Shield,
  KeyRound,
  AlertTriangle,
  User,
  Users,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { PasswordChangeModal } from "@/components/modals/password-change-modal"

// Tipos de documentos disponibles
const DOCUMENT_TYPES = ["INE", "CURP", "PASAPORTE"]

// Primero, asegúrate de importar los componentes Dialog necesarios
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface UserProfileProps {
  userId: string
  email: string
  userType: "postor" | "subastador" | "unknown"
  onBack: () => void
}

interface UserProfile {
  id_usuario: string
  nombre: string
  primer_apellido: string
  segundo_apellido: string
  email: string
}

interface DocumentInfo {
  id_documento: string
  archivo_url: string
  tipo: string
  fecha_subida: string
  estado: boolean
  id_postor: string
}

interface PostorInfo {
  id_postor?: string
  telefono?: string
  id_usuario?: string
}

interface FormErrors {
  nombre?: string
  primer_apellido?: string
  segundo_apellido?: string
  documento?: string
  tipo_documento?: string
  telefono?: string
}

interface NotificationState {
  show: boolean
  message: string
  type: "success" | "error"
}

export default function UserProfile({ userId, email, userType, onBack }: UserProfileProps) {
  // Estado para indicar carga de datos
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)

  // Determinar si el usuario es postor o subastador
  const isPostor = userType === "postor"
  const isSubastador = userType === "subastador"

  // Estado para los datos del perfil
  const [profile, setProfile] = useState<UserProfile>({
    id_usuario: userId,
    nombre: "",
    primer_apellido: "",
    segundo_apellido: "",
    email: email,
  })

  // Estado para la información de los documentos
  const [documents, setDocuments] = useState<DocumentInfo[]>([])

  // Estado para la información del postor
  const [postorInfo, setPostorInfo] = useState<PostorInfo>({
    id_postor: "",
    telefono: "",
    id_usuario: userId,
  })

  // Estado para el archivo seleccionado
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Estado para el tipo de documento seleccionado
  const [documentType, setDocumentType] = useState<string>("")

  // Estado para el documento que se está actualizando
  const [updatingDocumentType, setUpdatingDocumentType] = useState<string | null>(null)

  // Estado para errores de validación
  const [errors, setErrors] = useState<FormErrors>({})

  // Estado para indicar si el formulario ha sido enviado
  const [formSubmitted, setFormSubmitted] = useState(false)

  // Estado para mostrar mensajes de éxito o error
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    message: "",
    type: "success",
  })

  // Estado para controlar la visibilidad del modal de confirmación
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    if (userId) {
      loadUserData(userId)
    }
  }, [userId])

  // Función para mostrar notificaciones
  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({
      show: true,
      message,
      type,
    })

    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }))
    }, 4000)
  }

  // Cargar datos del usuario
  const loadUserData = async (userId: string) => {
    try {
      setIsLoading(true)
      console.log("Cargando datos del usuario con ID:", userId)

      // Buscar usuario en la base de datos
      const { data, error } = await supabase.from("usuario").select("*").eq("id_usuario", userId).maybeSingle()

      if (error) {
        console.error("Error de Supabase al buscar usuario:", error)
        showNotification(`Error: ${error.message}`, "error")
        return
      }

      if (data) {
        console.log("Usuario encontrado:", data)

        // Actualizar el formulario con los datos del usuario
        setProfile({
          id_usuario: data.id_usuario,
          nombre: data.nombre || "",
          primer_apellido: data.primer_apellido || "",
          segundo_apellido: data.segundo_apellido || "",
          email: data.correo || email,
        })

        // Obtener información de los documentos y postor solo si es un postor
        if (isPostor) {
          await fetchUserDocuments(data.id_usuario)
        }
      } else {
        console.log("Usuario no encontrado")
        showNotification("Usuario no encontrado", "error")
      }
    } catch (error) {
      console.error("Error al cargar datos del usuario:", error)
      showNotification(`Error de conexión: ${error instanceof Error ? error.message : "Desconocido"}`, "error")
    } finally {
      setIsLoading(false)
    }
  }

  // Validar el formulario
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    let isValid = true

    // Validar nombre
    if (!profile.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio"
      isValid = false
    }

    // Validar primer apellido
    if (!profile.primer_apellido.trim()) {
      newErrors.primer_apellido = "El primer apellido es obligatorio"
      isValid = false
    }

    // Validar segundo apellido
    if (!profile.segundo_apellido.trim()) {
      newErrors.segundo_apellido = "El segundo apellido es obligatorio"
      isValid = false
    }

    // Validar teléfono solo si es postor
    if (isPostor) {
      if (!postorInfo.telefono || postorInfo.telefono.trim() === "") {
        newErrors.telefono = "El teléfono es obligatorio"
        isValid = false
      } else if (!/^[0-9]{10}$/.test(postorInfo.telefono)) {
        newErrors.telefono = "El teléfono debe tener 10 dígitos"
        isValid = false
      }
    }

    setErrors(newErrors)
    return isValid
  }

  // Validar el formulario de documento
  const validateDocumentForm = (): boolean => {
    const newErrors: FormErrors = {}
    let isValid = true

    // Validar archivo
    if (!selectedFile) {
      newErrors.documento = "Debes seleccionar un archivo PDF"
      isValid = false
    }

    // Validar tipo de documento
    if (!documentType && !updatingDocumentType) {
      newErrors.tipo_documento = "Debes seleccionar un tipo de documento"
      isValid = false
    }

    setErrors((prev) => ({ ...prev, ...newErrors }))
    return isValid
  }

  // Manejador para cambios en los campos del perfil
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Si el formulario ya ha sido enviado, validamos en tiempo real
    if (formSubmitted) {
      if (!value.trim()) {
        setErrors((prev) => ({
          ...prev,
          [name]: `Este campo es obligatorio`,
        }))
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[name as keyof FormErrors]
          return newErrors
        })
      }
    }
  }

  // Manejador para cambios en el teléfono
  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target

    // Solo permitir dígitos
    const onlyDigits = value.replace(/\D/g, "")

    setPostorInfo((prev) => ({
      ...prev,
      telefono: onlyDigits,
    }))

    // Validación en tiempo real si el formulario ya ha sido enviado
    if (formSubmitted) {
      if (!onlyDigits.trim()) {
        setErrors((prev) => ({
          ...prev,
          telefono: "El teléfono es obligatorio",
        }))
      } else if (onlyDigits && !/^[0-9]{10}$/.test(onlyDigits)) {
        setErrors((prev) => ({
          ...prev,
          telefono: "El teléfono debe tener 10 dígitos",
        }))
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors.telefono
          return newErrors
        })
      }
    }
  }

  // Manejador para cambios en el tipo de documento
  const handleDocumentTypeChange = (value: string) => {
    setDocumentType(value)
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.tipo_documento
      return newErrors
    })
  }

  // Función para obtener la información de los documentos del usuario
  const fetchUserDocuments = async (userId: string) => {
    try {
      // Primero obtenemos la información del postor
      const { data: postorData, error: postorError } = await supabase
        .from("postor")
        .select("*")
        .eq("id_usuario", userId)
        .maybeSingle()

      if (postorError && postorError.code !== "PGRST116") {
        // Ignorar error si no se encuentra
        console.error("Error al obtener información del postor:", postorError)
        return { postor: null, documents: [] }
      }

      let postor = postorData
      let userDocuments: DocumentInfo[] = []

      // Si encontramos un postor, guardamos su información
      if (postor) {
        setPostorInfo({
          id_postor: postor.id_postor,
          telefono: postor.telefono || "",
          id_usuario: postor.id_usuario,
        })

        // Ahora buscamos documentos asociados al postor
        const { data: docsData, error: docsError } = await supabase
          .from("documentacion")
          .select("*")
          .eq("id_postor", postor.id_postor)
          .eq("estado", true)

        if (docsError) {
          console.error("Error al obtener información de los documentos:", docsError)
        } else if (docsData && docsData.length > 0) {
          userDocuments = docsData as DocumentInfo[]
          setDocuments(userDocuments)
        }
      } else {
        // Si no hay postor, creamos uno
        const newPostorId = crypto.randomUUID()
        const { data: newPostor, error: createPostorError } = await supabase
          .from("postor")
          .insert({
            id_postor: newPostorId,
            id_usuario: userId,
            telefono: "", // Campo requerido según el esquema
          })
          .select()
          .single()

        if (createPostorError) {
          console.error("Error al crear postor:", createPostorError)
        } else {
          postor = newPostor
          setPostorInfo({
            id_postor: postor.id_postor,
            telefono: postor.telefono || "",
            id_usuario: postor.id_usuario,
          })
        }
      }

      return { postor, documents: userDocuments }
    } catch (error) {
      console.error("Error al obtener información de los documentos:", error)
      return { postor: null, documents: [] }
    }
  }

  // Iniciar actualización de un documento específico
  const handleStartUpdateDocument = (docType: string) => {
    setUpdatingDocumentType(docType)
    setSelectedFile(null)
    setDocumentType("")
  }

  // Cancelar actualización de documento
  const handleCancelUpdateDocument = () => {
    setUpdatingDocumentType(null)
    setSelectedFile(null)
  }

  // Manejador para seleccionar archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Verificar que sea un archivo PDF
    if (file.type !== "application/pdf") {
      showNotification("Solo se permiten archivos PDF", "error")
      return
    }

    // Verificar tamaño del archivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showNotification("El archivo no debe superar los 5MB", "error")
      return
    }

    setSelectedFile(file)
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.documento
      return newErrors
    })
  }

  // Función para subir documento a Supabase Storage
  const handleUploadDocument = async () => {
    // Validar el formulario de documento
    if (!validateDocumentForm()) {
      return
    }

    if (!profile.id_usuario || !postorInfo.id_postor) {
      showNotification("Debes buscar un usuario primero", "error")
      return
    }

    // Determinar el tipo de documento a subir
    const typeToUpload = updatingDocumentType || documentType

    if (!typeToUpload) {
      showNotification("Debes seleccionar un tipo de documento", "error")
      return
    }

    try {
      setIsUploading(true)

      // Generar un nombre único para el archivo
      const fileExt = selectedFile!.name.split(".").pop()
      const fileName = `${Date.now()}_${typeToUpload}.${fileExt}`
      const filePath = `documentos/${fileName}`

      // Buscar si ya existe un documento del mismo tipo
      const existingDocIndex = documents.findIndex((doc) => doc.tipo === typeToUpload)
      const existingDoc = existingDocIndex >= 0 ? documents[existingDocIndex] : null

      // Si ya existe un documento del mismo tipo, eliminarlo primero
      if (existingDoc?.archivo_url) {
        // Extraer la ruta del archivo existente
        const existingPath = existingDoc.archivo_url.split("/").slice(-2).join("/")

        // Eliminar el archivo existente
        const { error: deleteError } = await supabase.storage.from("pdfs").remove([existingPath])

        if (deleteError) {
          console.error("Error al eliminar el documento existente:", deleteError)
          // Continuamos aunque haya error en la eliminación
        }
      }

      // Subir el nuevo archivo
      const { error: uploadError } = await supabase.storage.from("pdfs").upload(filePath, selectedFile!)

      if (uploadError) {
        throw new Error(`Error al subir el documento: ${uploadError.message}`)
      }

      // Obtener la URL pública del archivo
      const {
        data: { publicUrl },
      } = supabase.storage.from("pdfs").getPublicUrl(filePath)

      if (existingDoc) {
        // Actualizar documento existente
        const { error: updateError } = await supabase
          .from("documentacion")
          .update({
            archivo_url: publicUrl,
            fecha_subida: new Date().toISOString(),
            estado: true,
          })
          .eq("id_documento", existingDoc.id_documento)

        if (updateError) {
          throw new Error(`Error al actualizar el registro de documentación: ${updateError.message}`)
        }

        // Actualizar el estado local
        const updatedDocs = [...documents]
        updatedDocs[existingDocIndex] = {
          ...existingDoc,
          archivo_url: publicUrl,
          fecha_subida: new Date().toISOString(),
          estado: true,
        }
        setDocuments(updatedDocs)
      } else {
        // Crear nuevo documento
        const { data: newDoc, error: docError } = await supabase
          .from("documentacion")
          .insert([
            {
              archivo_url: publicUrl,
              fecha_subida: new Date().toISOString(),
              estado: true,
              tipo: typeToUpload,
              id_postor: postorInfo.id_postor,
            },
          ])
          .select()

        if (docError) {
          throw new Error(`Error al crear el registro de documentación: ${docError.message}`)
        }

        // Actualizar el estado local con el nuevo documento
        if (newDoc && newDoc.length > 0) {
          setDocuments((prev) => [...prev, newDoc[0] as DocumentInfo])
        }
      }

      setSelectedFile(null)
      setUpdatingDocumentType(null)
      showNotification(`Documento ${typeToUpload} subido correctamente`, "success")
    } catch (error) {
      console.error("Error al procesar el documento:", error)
      showNotification(`Error: ${error instanceof Error ? error.message : "Error desconocido"}`, "error")
    } finally {
      setIsUploading(false)
    }
  }

  // Función para abrir el modal de confirmación
  const handleOpenConfirmDialog = () => {
    // Validar el formulario antes de mostrar el diálogo
    setFormSubmitted(true)
    if (validateForm()) {
      setShowConfirmDialog(true)
    } else {
      showNotification("Por favor, completa todos los campos obligatorios", "error")
    }
  }

  // Manejador para guardar cambios del perfil
  const handleSaveProfile = async () => {
    try {
      setIsLoading(true)
      console.log("Guardando cambios para usuario con ID:", profile.id_usuario)

      // Actualizar usuario en la base de datos
      const { error: userError } = await supabase
        .from("usuario")
        .update({
          nombre: profile.nombre,
          primer_apellido: profile.primer_apellido,
          segundo_apellido: profile.segundo_apellido,
        })
        .eq("id_usuario", profile.id_usuario)

      if (userError) {
        console.error("Error de Supabase al actualizar usuario:", userError)
        showNotification(`Error: ${userError.message}`, "error")
        return
      }

      // Actualizar información del postor (teléfono) solo si es postor
      if (isPostor && postorInfo.id_postor) {
        const { error: postorError } = await supabase
          .from("postor")
          .update({
            telefono: postorInfo.telefono,
          })
          .eq("id_postor", postorInfo.id_postor)

        if (postorError) {
          console.error("Error de Supabase al actualizar postor:", postorError)
          showNotification(`Error: ${postorError.message}`, "error")
          return
        }
      }

      console.log("Datos actualizados correctamente")
      showNotification("Datos actualizados correctamente", "success")
      setShowConfirmDialog(false)
    } catch (error) {
      console.error("Error al guardar el perfil:", error)
      showNotification(`Error de conexión: ${error instanceof Error ? error.message : "Desconocido"}`, "error")
    } finally {
      setIsLoading(false)
    }
  }

  // Función para obtener el nombre legible del tipo de documento
  const getDocumentTypeName = (type: string): string => {
    switch (type) {
      case "INE":
        return "Credencial de Elector (INE)"
      case "CURP":
        return "CURP"
      case "PASAPORTE":
        return "Pasaporte"
      default:
        return type
    }
  }

  // Función para formatear el número de teléfono para mostrar
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return ""

    // Si el teléfono tiene 10 dígitos, formatearlo como (XXX) XXX-XXXX
    if (phone.length === 10) {
      return `(${phone.substring(0, 3)}) ${phone.substring(3, 6)}-${phone.substring(6, 10)}`
    }

    return phone
  }

  // Manejadores para el modal de cambio de contraseña
  const handlePasswordChangeSuccess = () => {
    showNotification("Contraseña actualizada correctamente", "success")
  }

  const handlePasswordChangeError = (message: string) => {
    showNotification(`Error: ${message}`, "error")
  }

  return (
    <>
      {/* Notificación centralizada con z-index muy alto */}
      {notification.show && (
        <div
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100000] p-4 rounded-md shadow-lg max-w-md w-full"
          style={{
            backgroundColor:
              notification.type === "success" ? "rgba(220, 252, 231, 0.95)" : "rgba(254, 226, 226, 0.95)",
            color: notification.type === "success" ? "#166534" : "#991b1b",
            backdropFilter: "blur(8px)",
            border: `1px solid ${notification.type === "success" ? "#86efac" : "#fca5a5"}`,
          }}
        >
          <div className="flex items-center justify-center">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-6 w-6 mr-3" style={{ color: "#16a34a" }} />
            ) : (
              <AlertCircle className="h-6 w-6 mr-3" style={{ color: "#dc2626" }} />
            )}
            <p className="text-base font-medium">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Modal de confirmación para guardar cambios */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar cambios
            </DialogTitle>
            <DialogDescription>
              Estás a punto de actualizar tu información personal. Esta información es importante para la gestión de tu
              cuenta y participación en subastas.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Al confirmar, tus datos personales serán actualizados en nuestro sistema. Por favor, verifica que toda la
              información proporcionada sea correcta antes de continuar.
            </p>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveProfile} disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center">
                  <span className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent border-white rounded-full"></span>
                  Guardando...
                </span>
              ) : (
                "Confirmar cambios"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-4">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Regresar
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-2xl flex items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-lg font-semibold">
                {profile.nombre.charAt(0)}
                {profile.primer_apellido.charAt(0)}
              </span>
            </div>
            Datos del usuario
          </CardTitle>
          <CardDescription>
            Actualiza la información del usuario.
            <span className="block mt-1 text-red-500 dark:text-red-400 text-sm">* Campos obligatorios</span>
          </CardDescription>
      
        </CardHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <CardContent className="p-6">
              <div className="space-y-8">
                {/* Sección de información personal */}
                <div>
                  <h3 className="text-lg font-medium mb-4 pb-2 border-b">Información personal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nombre" className="flex items-center">
                        Nombre <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="nombre"
                        name="nombre"
                        value={profile.nombre}
                        onChange={handleProfileChange}
                        placeholder="Nombre"
                        className={errors.nombre ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="primer_apellido" className="flex items-center">
                        Primer apellido <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="primer_apellido"
                        name="primer_apellido"
                        value={profile.primer_apellido}
                        onChange={handleProfileChange}
                        placeholder="Primer apellido"
                        className={errors.primer_apellido ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {errors.primer_apellido && <p className="text-xs text-red-500 mt-1">{errors.primer_apellido}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="segundo_apellido" className="flex items-center">
                        Segundo apellido <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="segundo_apellido"
                        name="segundo_apellido"
                        value={profile.segundo_apellido}
                        onChange={handleProfileChange}
                        placeholder="Segundo apellido"
                        className={errors.segundo_apellido ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {errors.segundo_apellido && (
                        <p className="text-xs text-red-500 mt-1">{errors.segundo_apellido}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sección de contacto y seguridad */}
                <div>
                  <h3 className="text-lg font-medium mb-4 pb-2 border-b">Contacto y seguridad</h3>

                  {/* Correo y teléfono */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Correo electrónico */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center">
                        Correo electrónico
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          name="email"
                          value={profile.email}
                          readOnly
                          className="pl-10 bg-muted cursor-not-allowed"
                          placeholder="correo@ejemplo.com"
                          type="email"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        El correo electrónico no puede ser modificado.
                      </p>
                    </div>

                    {/* Teléfono - solo para postores */}
                    {isPostor && (
                      <div className="space-y-2">
                        <Label htmlFor="telefono" className="flex items-center">
                          Teléfono <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="telefono"
                            name="telefono"
                            value={postorInfo.telefono}
                            onChange={handleTelefonoChange}
                            placeholder="Ingresa tu número de teléfono"
                            className={`pl-10 ${errors.telefono ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                            maxLength={10}
                          />
                        </div>
                        {errors.telefono ? (
                          <p className="text-xs text-red-500 mt-1">{errors.telefono}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">
                            Ingresa un número de teléfono de 10 dígitos.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sección de contraseña mejorada */}
                  <div className="border rounded-lg p-5 bg-muted/10">
                    <div className="flex items-center mb-4">
                      <Shield className="h-5 w-5 mr-2 text-primary" />
                      <h4 className="font-medium">Seguridad de la cuenta</h4>
                    </div>

                    <div className="flex items-center p-3 border rounded bg-background">
                      <KeyRound className="h-5 w-5 mr-3 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Cambiar contraseña</p>
                        <p className="text-xs text-muted-foreground">Actualiza tu contraseña para mayor seguridad</p>
                      </div>
                      <PasswordChangeModal
                        email={profile.email}
                        onSuccess={handlePasswordChangeSuccess}
                        onError={handlePasswordChangeError}
                      />
                    </div>

                    <div className="mt-4 text-sm text-muted-foreground">
                      <p></p>
                    </div>
                  </div>
                </div>

                {/* Sección de documentos - solo para postores */}
                {isPostor && (
                  <div>
                    <h3 className="text-lg font-medium mb-4 pb-2 border-b flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-primary" />
                      Documentos de identidad
                    </h3>

                    {/* Selector de tipo de documento y subida */}
                    {!updatingDocumentType && (
                      <div className="space-y-4 mb-6">
                        <h4 className="font-medium text-muted-foreground mb-3">Añadir nuevo documento</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="tipo_documento" className="flex items-center">
                              Tipo de documento <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <Select value={documentType} onValueChange={handleDocumentTypeChange}>
                              <SelectTrigger
                                id="tipo_documento"
                                className={errors.tipo_documento ? "border-red-500 focus-visible:ring-red-500" : ""}
                              >
                                <SelectValue placeholder="Selecciona el tipo de documento" />
                              </SelectTrigger>
                              <SelectContent>
                                {DOCUMENT_TYPES.map((type) => {
                                  // Verificar si ya existe un documento de este tipo
                                  const exists = documents.some((doc) => doc.tipo === type)
                                  return (
                                    <SelectItem key={type} value={type} disabled={exists}>
                                      {getDocumentTypeName(type)} {exists && "(Ya existe)"}
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                            {errors.tipo_documento && (
                              <p className="text-xs text-red-500 mt-1">{errors.tipo_documento}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="documento" className="flex items-center">
                              Seleccionar archivo <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <div className="flex flex-col sm:flex-row gap-4">
                              <div className="flex-1 overflow-hidden">
                                <Input
                                  id="documento"
                                  type="file"
                                  accept=".pdf"
                                  onChange={handleFileChange}
                                  className={errors.documento ? "border-red-500 focus-visible:ring-red-500" : ""}
                                  disabled={isUploading || !documentType}
                                />
                              </div>
                              <Button
                                onClick={handleUploadDocument}
                                disabled={isUploading || !selectedFile || !documentType}
                                className="whitespace-nowrap"
                              >
                                {isUploading ? (
                                  <span className="flex items-center">
                                    <span className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent border-white rounded-full"></span>
                                    Subiendo...
                                  </span>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Subir
                                  </>
                                )}
                              </Button>
                            </div>
                            {errors.documento && <p className="text-xs text-red-500 mt-1">{errors.documento}</p>}
                            <p className="text-xs text-muted-foreground mt-1">
                              Solo se aceptan archivos PDF. Tamaño máximo: 5MB.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Documentos existentes */}
                    {documents.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-medium mb-3 text-muted-foreground">Documentos existentes</h4>
                        <div className="flex flex-col space-y-4">
                          {documents.map((doc) => (
                            <div
                              key={doc.id_documento}
                              className="p-4 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                                    <FileText className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <h3 className="font-medium">{getDocumentTypeName(doc.tipo)}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      Subido el: {new Date(doc.fecha_subida).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(doc.archivo_url, "_blank")}
                                    className="flex items-center gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    <span>Ver</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStartUpdateDocument(doc.tipo)}
                                    className="flex items-center gap-1"
                                  >
                                    <Edit className="h-3 w-3" />
                                    <span>Actualizar</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sección para actualizar documento existente */}
                    {updatingDocumentType && (
                      <div className="space-y-4 p-5 border rounded-md bg-muted/10">
                        <h4 className="font-medium flex items-center">
                          <Edit className="h-4 w-4 mr-2 text-primary" />
                          Actualizar {getDocumentTypeName(updatingDocumentType)}
                        </h4>
                        <div className="space-y-2">
                          <Label htmlFor="documento" className="flex items-center">
                            Seleccionar archivo <span className="text-red-500 ml-1">*</span>
                          </Label>
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 overflow-hidden">
                              <Input
                                id="documento"
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className={errors.documento ? "border-red-500 focus-visible:ring-red-500" : ""}
                                disabled={isUploading}
                              />
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                onClick={handleUploadDocument}
                                disabled={isUploading || !selectedFile}
                                className="whitespace-nowrap"
                              >
                                {isUploading ? (
                                  <span className="flex items-center">
                                    <span className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent border-white rounded-full"></span>
                                    Subiendo...
                                  </span>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Subir documento
                                  </>
                                )}
                              </Button>
                              <Button variant="outline" onClick={handleCancelUpdateDocument} disabled={isUploading}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                          {errors.documento && <p className="text-xs text-red-500 mt-1">{errors.documento}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            Solo se aceptan archivos PDF. Tamaño máximo: 5MB.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Mensaje si no hay documentos */}
                    {documents.length === 0 && !updatingDocumentType && (
                      <div className="bg-muted/30 p-4 rounded-md mb-4 text-center">
                        <p className="text-sm text-muted-foreground">No hay documentos asociados a este usuario.</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Selecciona un tipo de documento y sube un archivo PDF.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex justify-end border-t p-6 bg-muted/30">
              <Button onClick={handleOpenConfirmDialog} disabled={isLoading} className="min-w-[150px]">
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent border-white rounded-full"></span>
                    Guardando...
                  </span>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </>
  )
}
