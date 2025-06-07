"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Eye, EyeOff, Lock } from "lucide-react"
import { verifyPassword, changePassword } from "@/lib/supabase"

interface PasswordChangeModalProps {
  email: string
  onSuccess: () => void
  onError: (message: string) => void
}

export function PasswordChangeModal({ email, onSuccess, onError }: PasswordChangeModalProps) {
  // Estados para controlar la visibilidad de la contraseña
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Estados para los campos del formulario
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Estado para errores de validación
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }>({})

  // Estado para indicar si se está procesando el cambio
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Estado para controlar la apertura/cierre del modal
  const [isOpen, setIsOpen] = useState(false)

  // Validar el formulario
  const validatePasswordForm = (): boolean => {
    const newErrors: {
      currentPassword?: string
      newPassword?: string
      confirmPassword?: string
    } = {}
    let isValid = true

    // Validar contraseña actual
    if (!currentPassword.trim()) {
      newErrors.currentPassword = "La contraseña actual es obligatoria"
      isValid = false
    }

    // Validar nueva contraseña
    if (!newPassword.trim()) {
      newErrors.newPassword = "La nueva contraseña es obligatoria"
      isValid = false
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "La contraseña debe tener al menos 6 caracteres"
      isValid = false
    }

    // Validar confirmación de contraseña
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden"
      isValid = false
    }

    setPasswordErrors(newErrors)
    return isValid
  }

  // Función para cambiar la contraseña
  const handleChangePassword = async () => {
    // Validar el formulario
    if (!validatePasswordForm()) {
      return
    }

    try {
      setIsChangingPassword(true)

      // Primero verificamos que la contraseña actual sea correcta
      const { success, error: verifyError } = await verifyPassword(email, currentPassword)

      if (!success) {
        // Si la contraseña actual es incorrecta, mostramos un error
        setPasswordErrors({
          ...passwordErrors,
          currentPassword: "La contraseña actual es incorrecta",
        })
        throw new Error("La contraseña actual es incorrecta")
      }

      // Si la contraseña actual es correcta, procedemos a cambiarla
      const { success: changeSuccess, error: changeError } = await changePassword(newPassword)

      if (!changeSuccess) {
        throw new Error(changeError || "Error al cambiar la contraseña")
      }

      // Limpiar el formulario y cerrar el diálogo
      resetForm()
      setIsOpen(false)

      // Notificar éxito
      onSuccess()
    } catch (error: any) {
      console.error("Error al cambiar la contraseña:", error)

      // Notificar error
      if (error.message.includes("contraseña actual")) {
        onError("La contraseña actual es incorrecta")
      } else {
        onError(error.message)
      }
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Función para resetear el formulario
  const resetForm = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setPasswordErrors({})
  }

  // Función para manejar el cierre del modal
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    setIsOpen(open)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Lock className="h-4 w-4" />
          <span>Cambiar contraseña</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>Ingresa tu contraseña actual y la nueva contraseña para actualizarla.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-right">
              Contraseña actual <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showPassword ? "text" : "password"}
                placeholder="Ingresa tu contraseña actual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={passwordErrors.currentPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="sr-only">{showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
              </Button>
            </div>
            {passwordErrors.currentPassword && (
              <p className="text-xs text-red-500 mt-1">{passwordErrors.currentPassword}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-right">
              Nueva contraseña <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                placeholder="Ingresa tu nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={passwordErrors.newPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="sr-only">{showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
              </Button>
            </div>
            {passwordErrors.newPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-right">
              Confirmar contraseña <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showNewPassword ? "text" : "password"}
                placeholder="Confirma tu nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={passwordErrors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
            </div>
            {passwordErrors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{passwordErrors.confirmPassword}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isChangingPassword}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleChangePassword} disabled={isChangingPassword}>
            {isChangingPassword ? (
              <span className="flex items-center">
                <span className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent border-white rounded-full"></span>
                Guardando...
              </span>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
