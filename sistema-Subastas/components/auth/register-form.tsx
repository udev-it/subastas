"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Eye, EyeOff, Upload } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { registerUser, getLatestTerms } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

type Documento = {
  url: string
  tipo: string
  path: string
}

interface RegisterFormProps {
  onSuccess?: () => void
  onLoginClick: () => void
  onBackClick: () => void
}

export default function RegisterForm({ onSuccess, onLoginClick, onBackClick }: RegisterFormProps) {
  // Estados para el formulario de registro
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [nombre, setNombre] = useState("")
  const [primerApellido, setPrimerApellido] = useState("")
  const [segundoApellido, setSegundoApellido] = useState("")
  const [telefono, setTelefono] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Estados para la contraseña
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Estados para términos y documentos
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [termsAndConditions, setTermsAndConditions] = useState<any>(null)
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [tipoDocumento, setTipoDocumento] = useState("INE")
  const [documentoSubido, setDocumentoSubido] = useState<Documento | null>(null)
  const [documentError, setDocumentError] = useState<string | null>(null)

  const { toast } = useToast()

  // Cargar términos y condiciones
  useEffect(() => {
    const loadTerms = async () => {
      const terms = await getLatestTerms()
      setTermsAndConditions(terms)
    }

    loadTerms()
  }, [])

  // Manejo de documentos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return

    const selectedFile = e.target.files[0]
    if (selectedFile.size > 5 * 1024 * 1024) {
      setDocumentError("El archivo no debe exceder 5MB")
      return
    }

    if (selectedFile.type !== "application/pdf") {
      setDocumentError("Solo se aceptan archivos PDF")
      return
    }

    setFile(selectedFile)
    setDocumentError(null)
  }

  const subirDocumento = async () => {
    if (!file) {
      setDocumentError("Selecciona un archivo antes de continuar")
      return
    }

    const filePath = `documentos/${Date.now()}_${file.name}`

    try {
      // Subir documento
      const { error: uploadError } = await supabase.storage.from("pdfs").upload(filePath, file)

      if (uploadError) throw uploadError

      // Obtener URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("pdfs").getPublicUrl(filePath)

      // Eliminar documento anterior si existe
      if (documentoSubido?.path) {
        await supabase.storage.from("pdfs").remove([documentoSubido.path]).catch(console.error)
      }

      // Actualizar estado
      setDocumentoSubido({
        url: publicUrl,
        tipo: tipoDocumento,
        path: filePath,
      })

      setDocumentDialogOpen(false)
      toast({
        title: "Documento subido",
        description: "Tu documento se ha cargado correctamente",
      })
    } catch (error) {
      console.error("Error al subir documento:", error)
      setDocumentError(error instanceof Error ? error.message : "Error al subir documento")
      toast({
        title: "Error",
        description: "No se pudo subir el documento",
        variant: "destructive",
      })
    }
  }

  // Abrir términos y condiciones
  const openTermsAndConditions = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!termsAndConditions?.archivo_url) {
      toast({
        title: "Error",
        description: "No se pudo cargar los términos y condiciones",
        variant: "destructive",
      })
      return
    }
    window.open(`${termsAndConditions.archivo_url}?t=${Date.now()}`, "_blank")
  }

  // Manejar el registro
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones básicas
    if (!nombre || !primerApellido || !email || !password || !confirmPassword || !telefono) {
      setError("Por favor, completa todos los campos obligatorios")
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    if (!aceptaTerminos) {
      setError("Debes aceptar los términos y condiciones") 
      return
    }

    if (!documentoSubido) {
      setError("Debes subir un documento de identidad")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Crear FormData para enviar al servidor
      const formData = new FormData()
      formData.append("name", nombre)
      formData.append("apellido-paterno", primerApellido)
      formData.append("apellido-materno", segundoApellido)
      formData.append("register-email", email)
      formData.append("register-password", password)
      formData.append("confirm-password", confirmPassword)
      formData.append("telefono", telefono)
      formData.append("terms", aceptaTerminos ? "on" : "")

      // Agregar datos del documento
      formData.append("documento-url", documentoSubido.url)
      formData.append("documento-tipo", documentoSubido.tipo)

      // Agregar ID de términos y condiciones si existe
      if (termsAndConditions) {
        formData.append("tyc-id", termsAndConditions.id_tyc.toString())
      }

      // Registrar usuario
      const result = await registerUser(formData)

      if (!result.success) {
        throw new Error(result.error || "Error al registrarse")
      }

      // Éxito - limpiar el formulario
      setNombre("")
      setPrimerApellido("")
      setSegundoApellido("")
      setEmail("")
      setPassword("")
      setConfirmPassword("")
      setTelefono("")
      setAceptaTerminos(false)
      setDocumentoSubido(null)
      setFile(null)
      setTipoDocumento("INE")

      toast({
        title: "Registro exitoso",
        description: result.message || "Se ha enviado un correo de verificación",
      })

      // Llamar al callback de éxito si existe
      if (onSuccess) {
        onSuccess()
      }

      // Redirigir al login
      onLoginClick()
    } catch (error: any) {
      console.error("Error al registrarse:", error)
      setError(error.message || "Error al registrarse")

      toast({
        title: "Error en el registro",
        description: error.message.includes("Database error")
          ? "Error al guardar en la base de datos. Contacta al soporte."
          : error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Crear una cuenta</h2>
        <p className="text-muted-foreground">Regístrate para participar en nuestras subastas</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleRegister}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan"
              className="h-12"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apellido-paterno">
              Primer apellido <span className="text-red-500">*</span>
            </Label>
            <Input
              id="apellido-paterno"
              value={primerApellido}
              onChange={(e) => setPrimerApellido(e.target.value)}
              placeholder="Pérez"
              className="h-12"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apellido-materno">Segundo apellido</Label>
            <Input
              id="apellido-materno"
              value={segundoApellido}
              onChange={(e) => setSegundoApellido(e.target.value)}
              placeholder="González"
              className="h-12"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="register-email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="h-12"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono">
              Teléfono <span className="text-red-500">*</span>
            </Label>
            <Input
              id="telefono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+52 123 456 7890"
              className="h-12"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="register-password">
              Contraseña <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="register-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 pr-10"
                required
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-12 w-12"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              Confirmar contraseña <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-12 w-12"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Documentación de identidad <span className="text-red-500">*</span>
          </Label>
          {documentoSubido ? (
            <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
              <p className="text-sm">Documento subido: {documentoSubido.tipo}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setDocumentDialogOpen(true)}
              >
                Cambiar documento
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full" onClick={() => setDocumentDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Subir documentación
            </Button>
          )}
          {documentError && <p className="text-sm text-red-500">{documentError}</p>}
        </div>

        <div className="flex items-start">
          <Checkbox
            id="terms"
            checked={aceptaTerminos}
            onCheckedChange={(checked) => setAceptaTerminos(checked === true)}
            className="mt-1"
          />
          <label htmlFor="terms" className="ml-3 text-sm">
            Acepto los{" "}
            <a href="#" className="font-medium text-primary hover:underline" onClick={openTermsAndConditions}>
              Términos y Condiciones
            </a>
          </label>
        </div>

        <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-white" disabled={isLoading}>
          {isLoading ? "Procesando..." : "Registrarse"}
        </Button>
      </form>

      <div className="text-center text-sm">
        ¿Ya tienes una cuenta?{" "}
        <button className="text-primary font-medium hover:underline" onClick={onLoginClick}>
          Inicia sesión
        </button>
      </div>

      <div className="mt-6 text-center">
        <button className="text-sm text-muted-foreground hover:text-foreground underline" onClick={onBackClick}>
          Volver a la página de bienvenida
        </button>
      </div>

      {/* Diálogo para subir documentos */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir documento de identidad</DialogTitle>
            <DialogDescription>Por favor sube un documento válido (PDF, máximo 5MB)</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INE">INE</SelectItem>
                  <SelectItem value="CURP">CURP</SelectItem>
                  <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Archivo PDF</Label>
              <Input type="file" accept=".pdf" onChange={handleFileChange} />
              {file && <p className="text-sm text-muted-foreground">Archivo seleccionado: {file.name}</p>}
            </div>

            {documentError && <p className="text-sm text-red-500">{documentError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" onClick={subirDocumento} disabled={!file}>
              <Upload className="mr-2 h-4 w-4" /> Subir documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
