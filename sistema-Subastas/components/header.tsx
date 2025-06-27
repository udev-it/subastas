"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { ModeToggle } from "./mode-toggle"
import { Button } from "@/components/ui/button"
import { Menu, X, LogOut, User, ChevronDown, LayoutDashboard, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import Link from "next/link"
import { signOut } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import NotificationDropdown from "@/components/NotificationDropdown"
import { obtenerNotificaciones } from "@/lib/notifications"



interface HeaderProps {
  activeSection: string
  setActiveSection: (section: string) => void
}

export default function Header({ activeSection, setActiveSection }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [idPostor, setIdPostor] = useState<string | null>(null)
  const [verDropdown, setVerDropdown] = useState(false)
  const [hayNoLeidas, setHayNoLeidas] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Obtenemos el estado de autenticación del hook useAuth
  const { user, isLoading } = useAuth()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setVerDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [dropdownRef])

  useEffect(() => {
    if (!idPostor) return
    const verificarNoLeidas = async () => {
      try {
        const notis = await obtenerNotificaciones(idPostor)
        setHayNoLeidas(notis.some((n: any) => !n.leida))
      } catch (e) {
        console.error("Error al obtener notificaciones:", e)
      }
    }
    verificarNoLeidas()
    const interval = setInterval(verificarNoLeidas, 20000)
    return () => clearInterval(interval)
  }, [idPostor])

  // Handle navigation item click
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault()
    setActiveSection(sectionId)
    if (isOpen) setIsOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Manejador para cerrar sesión
  const handleSignOut = async () => {
    const success = await signOut()
    if (success) {
      // Redirigir al inicio después de cerrar sesión
      setActiveSection("home")
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // Obtener las iniciales del email del usuario para el avatar
  const getUserInitials = () => {
    if (!user || !user.email) return "U"
    return user.email.substring(0, 1).toUpperCase()
  }

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled ? "bg-background/70 backdrop-blur-lg shadow-sm border-b border-border/50" : "bg-transparent",
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        {/* Logo ZAGOOM - siempre redirecciona a la página de bienvenida */}
        <Link href="/" className="flex items-center space-x-2" onClick={(e) => handleNavClick(e, "home")}>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-2xl font-bold text-primary">ZAGOOM</span>
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-4">
          <div className="relative flex space-x-4 items-center">
            
          </div>
          {/* Botón de notificaciones */}
          {user && (
            <div className="relative" ref={dropdownRef}>
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                onClick={() => setVerDropdown((v) => !v)}
                className="relative p-2 rounded-full hover:bg-muted/50 transition-colors"
                aria-label="Notificaciones"
              >
                <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                {hayNoLeidas && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"
                  />
                )}
              </motion.button>
              {verDropdown && <NotificationDropdown id_postor={idPostor!} />}
            </div>
          )}
          {/* Menú desplegable del perfil de usuario */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 rounded-md">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{user.email}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer flex items-center"
                  onClick={() => setActiveSection("auctions")}
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Subasta
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer flex items-center"
                  onClick={() => setActiveSection("profile")}
                >
                  <User className="mr-2 h-4 w-4" />
                  Mi Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer flex items-center text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <ModeToggle />
        </nav>

        {/* Mobile Navigation Toggle */}
        <div className="flex items-center md:hidden space-x-4">
          {/* Avatar para móvil cuando el usuario está autenticado */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>Mi cuenta</span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer flex items-center"
                  onClick={() => {
                    setActiveSection("dashboard")
                    setIsOpen(false)
                  }}
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Inicio
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer flex items-center"
                  onClick={() => {
                    setActiveSection("profile")
                    setIsOpen(false)
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  Mi Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer flex items-center text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Menu"
            className="relative"
          >
            <motion.div
              initial={false}
              animate={isOpen ? "open" : "closed"}
              variants={{
                open: { rotate: 180 },
                closed: { rotate: 0 },
              }}
              transition={{ duration: 0.3 }}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.div>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <motion.div
        className="md:hidden overflow-hidden"
        initial={{ height: 0 }}
        animate={{ height: isOpen ? "auto" : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="container py-4 bg-background/95 backdrop-blur-sm">
          <nav className="flex flex-col space-y-4">
            {/* Solo mostrar opciones adicionales si no está autenticado */}
            {!user && (
              <div className="flex flex-col space-y-2">
                <Button
                  variant="default"
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveSection("home")
                    setIsOpen(false)
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Iniciar sesión
                </Button>
              </div>
            )}
            {/* Botón de notificaciones para móvil */}
            {user && (
              <button
                onClick={() => {
                  setVerDropdown((v) => !v)
                  setIsOpen(false)
                }}
                className="text-sm font-medium py-2 px-3 rounded-md flex items-center text-muted-foreground hover:bg-muted/50 hover:text-foreground justify-start"
              >
                <Bell className="mr-2 h-4 w-4" />
                Notificaciones
                {hayNoLeidas && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>}
              </button>
            )}
          </nav>
        </div>
      </motion.div>
    </header>
  )
}
