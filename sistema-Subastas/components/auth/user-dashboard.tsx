"use client"

import type { UserProfile } from "@/lib/supabase"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { UserIcon, FileText, ChevronRight, Users, User, PlusCircle, Gavel } from "lucide-react"
import RegistroSubasta from "@/components/auction/registro-subasta"
import { Toaster } from "@/components/ui/toaster"
import PujaDashboard from "@/components/auction/puja-dashboard"

interface UserDashboardProps {
  user: UserProfile
  onViewProfile: () => void
}

export default function UserDashboard({ user, onViewProfile }: UserDashboardProps) {
  const isPostor = user.userType === "postor"
  const isSubastador = user.userType === "subastador"
  const [showRegistroSubasta, setShowRegistroSubasta] = useState(false)
  const [showPujaDashboard, setShowPujaDashboard] = useState(false)

  return (
    <section className="py-10 md:py-20 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center text-center space-y-4 mb-12">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tighter">Inicio</h1>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary mt-2">
            {isPostor ? (
              <>
                <Users className="h-4 w-4 mr-2" /> Usuario postor
              </>
            ) : isSubastador ? (
              <>
                <User className="h-4 w-4 mr-2" /> Usuario subastador
              </>
            ) : (
              "Tipo de usuario desconocido"
            )}
          </div>
          <p className="text-muted-foreground max-w-[700px] md:text-xl">
            Has iniciado sesión correctamente. Aquí podrás gestionar tu cuenta y acceder a todas las funcionalidades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Mi perfil</CardTitle>
              <CardDescription>Gestiona tu información personal</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex items-center space-x-2 text-sm">
                <UserIcon className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground truncate">{user.email}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full justify-between" onClick={onViewProfile}>
                Ver perfil
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>

          {isPostor && (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Mis documentos</CardTitle>
                <CardDescription>Gestiona tus documentos</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex items-center space-x-2 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Documentos de identidad</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full justify-between" onClick={onViewProfile}>
                  Ver documentos
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {isPostor && (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Pujas</CardTitle>
                <CardDescription>Participa en subastas</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Gavel className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Realiza pujas en subastas activas</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setShowPujaDashboard(!showPujaDashboard)}
                >
                  {showPujaDashboard ? "Ocultar pujas" : "Ver pujas"}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {isSubastador && (
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Mis subastas</CardTitle>
                <CardDescription>Gestiona tus subastas</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Subastas activas y programadas</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full justify-between">
                  Ver subastas
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {isSubastador && (
          <div className="mt-12 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-primary">Gestión de subastas</h2>
              <Button
                onClick={() => setShowRegistroSubasta(!showRegistroSubasta)}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {showRegistroSubasta ? (
                  <>Ocultar formulario</>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Registrar nueva subasta
                  </>
                )}
              </Button>
            </div>

            {showRegistroSubasta && <RegistroSubasta />}
          </div>
        )}

        {showPujaDashboard && (
          <div className="mt-12 max-w-5xl mx-auto">
            <PujaDashboard />
          </div>
        )}
      </div>
      <Toaster />
    </section>
  )
}
