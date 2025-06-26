"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import PujaForm from "@/components/auction/puja-form"
import PujasList from "@/components/auction/pujas-list"
import { Gavel, History, TrendingUp } from "lucide-react"

export default function PujaDashboard() {
  const { user, isAuthenticated } = useAuth()
  const [idSubasta, setIdSubasta] = useState<string>("")
  const [refreshPujas, setRefreshPujas] = useState<boolean>(false)

  // Manejar el éxito de una puja
  const handlePujaSuccess = () => {
    // Forzar actualización de la lista de pujas
    setRefreshPujas(!refreshPujas)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Sistema de Pujas</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario de puja */}
        <div className="lg:col-span-1">
          <PujaForm onSuccess={handlePujaSuccess} />
        </div>

        {/* Historial de pujas */}
        <div className="lg:col-span-2">
          <Card className="w-full border-primary/20 shadow-md">
            <CardHeader className="bg-accent">
              <CardTitle className="text-primary flex items-center">
                <History className="mr-2 h-5 w-5" />
                Historial de Pujas
              </CardTitle>
              <CardDescription>Ingrese el ID de una subasta para ver su historial de pujas.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="historial" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="historial" className="flex items-center">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Historial
                  </TabsTrigger>
                  <TabsTrigger value="realizar" className="flex items-center">
                    <Gavel className="mr-2 h-4 w-4" />
                    Realizar Puja
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="historial" className="pt-4">
                  {idSubasta ? (
                    <PujasList idSubasta={idSubasta} autoRefresh={true} />
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      Ingrese el ID de una subasta en el formulario para ver su historial de pujas.
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="realizar" className="pt-4">
                  <PujaForm idSubasta={idSubasta} onSuccess={handlePujaSuccess} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
