"use client"

import { useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, Trash2, Send, Play, Pause, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Obtener configuración de variables de entorno
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Usuarios predefinidos
const PREDEFINED_USERS = [
  { email: "abilvaldi@gmail.com", password: "12345678" },
  { email: "1@gmail.com", password: "123456" },
  { email: "2@gmail.com", password: "123456" },
  { email: "3@gmail.com", password: "123456" },
  { email: "4@gmail.com", password: "123456" },
  { email: "5@gmail.com", password: "123456" },
  { email: "6@gmail.com", password: "123456" },
  { email: "7@gmail.com", password: "123456" },
  { email: "8@gmail.com", password: "123456" },
  { email: "9@gmail.com", password: "123456" },
  { email: "10@gmail.com", password: "123456" },
  { email: "11@gmail.com", password: "123456" },
]

export default function BiddingInterface() {
  // Estado para usuarios (predefinidos)
  const [usuarios, setUsuarios] = useState(PREDEFINED_USERS)

  // Estado para nuevo usuario
  const [newUser, setNewUser] = useState({ email: "", password: "" })

  // Estado para puja simple (sin valores predefinidos)
  const [monto, setMonto] = useState("")
  const [idSubasta, setIdSubasta] = useState("")

  // Estado para pujas automáticas (sin valores predefinidos)
  const [precioBase, setPrecioBase] = useState("")
  const [incrementoMinimo, setIncrementoMinimo] = useState("")
  const [cantidadPujas, setCantidadPujas] = useState("")
  const [intervaloTiempo, setIntervaloTiempo] = useState("") // Ahora en milisegundos

  // Estado para resultados y carga
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAutoBidding, setIsAutoBidding] = useState(false)
  const [autoBidProgress, setAutoBidProgress] = useState({ current: 0, total: 0, currentUser: "", currentAmount: 0 })

  // Verificar que las variables de entorno estén configuradas
  const isConfigured = SUPABASE_URL && SUPABASE_ANON_KEY

  // Agregar un nuevo usuario a la lista
  const addUser = () => {
    if (newUser.email && newUser.password) {
      setUsuarios([...usuarios, { ...newUser }])
      setNewUser({ email: "", password: "" })
    }
  }

  // Eliminar un usuario de la lista
  const removeUser = (index) => {
    const updatedUsers = [...usuarios]
    updatedUsers.splice(index, 1)
    setUsuarios(updatedUsers)
  }

  // Manejar una solicitud de usuario individual
  const handleUserRequest = async (user, montoPersonalizado = null) => {
    try {
      console.log(`🔄 Iniciando solicitud para ${user.email} con monto ${montoPersonalizado || monto}`)

      // Crear cliente Supabase
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

      // Iniciar sesión con Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      })

      if (error) {
        console.error(`❌ Error de autenticación (${user.email}):`, error)
        return {
          email: user.email,
          status: "error",
          message: `Error de autenticación: ${error.message}`,
          time: 0,
          data: { error: error.message, type: "authentication_error" },
          amount: montoPersonalizado || monto,
        }
      }

      if (!data.session?.access_token) {
        return {
          email: user.email,
          status: "error",
          message: "No se recibió token de acceso",
          time: 0,
          data: { error: "No access token", type: "token_error" },
          amount: montoPersonalizado || monto,
        }
      }

      const token = data.session.access_token

      // Preparar datos de la puja
      const requestBody = {
        id_subasta: idSubasta,
        monto: Number.parseFloat((montoPersonalizado || monto).toString()),
      }

      // Medir tiempo de respuesta
      const start = performance.now()

      // Hacer petición al proxy
      const response = await fetch("/api/proxy-pujas", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const end = performance.now()
      const responseTime = Math.round(end - start)

      // Obtener datos de respuesta
      const resultado = await response.json()

      console.log(`📊 Resultado para ${user.email} (${requestBody.monto}):`, resultado)

      return {
        email: user.email,
        status: response.status,
        message: `${response.ok ? "✅ Éxito" : "❌ Error"}: ${response.status} en ${responseTime}ms`,
        time: responseTime,
        data: resultado,
        amount: requestBody.monto,
      }
    } catch (error) {
      console.error(`💥 Error para ${user.email}:`, error)

      return {
        email: user.email,
        status: "error",
        message: `Error: ${error.message}`,
        time: 0,
        data: {
          error: error.message,
          type: "request_error",
        },
        amount: montoPersonalizado || monto,
      }
    }
  }

  // Ejecutar pujas simples para todos los usuarios
  const executeSimpleBids = async () => {
    if (!isConfigured) {
      alert("⚠️ Configura las variables de entorno de Supabase")
      return
    }

    if (!monto || !idSubasta) {
      alert("⚠️ Completa todos los campos requeridos")
      return
    }

    setIsLoading(true)
    setResults([])

    try {
      const allResults = await Promise.all(usuarios.map((user) => handleUserRequest(user)))
      setResults(allResults)
      console.log("🎉 Todas las pujas simples completadas")
    } catch (error) {
      console.error("💥 Error ejecutando pujas simples:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Reemplazar la función executeAutoBids con la versión secuencial original

  // Ejecutar pujas automáticas secuenciales
  const executeAutoBids = async () => {
    if (!isConfigured) {
      alert("⚠️ Configura las variables de entorno de Supabase")
      return
    }

    if (!precioBase || !incrementoMinimo || !cantidadPujas || !intervaloTiempo || !idSubasta) {
      alert("⚠️ Completa todos los campos requeridos")
      return
    }

    if (usuarios.length === 0) {
      alert("⚠️ Agrega al menos un usuario")
      return
    }

    setIsAutoBidding(true)
    setResults([])

    const allResults = []
    let currentAmount = Number(precioBase)

    try {
      for (let puja = 1; puja <= Number(cantidadPujas); puja++) {
        // Calcular el usuario actual (rotación circular)
        const userIndex = (puja - 1) % usuarios.length
        const currentUser = usuarios[userIndex]

        // Calcular el monto actual
        currentAmount = Number(precioBase) + puja * Number(incrementoMinimo)

        // Actualizar progreso
        setAutoBidProgress({
          current: puja,
          total: Number(cantidadPujas),
          currentUser: currentUser.email,
          currentAmount: currentAmount,
        })

        console.log(`🎯 Puja ${puja}/${cantidadPujas}: ${currentUser.email} puja ${currentAmount}`)

        // Hacer la puja
        const result = await handleUserRequest(currentUser, currentAmount)
        allResults.push({
          ...result,
          bidNumber: puja,
          timestamp: new Date().toISOString(),
        })

        // Actualizar resultados en tiempo real
        setResults([...allResults])

        // Esperar antes de la siguiente puja (excepto en la última) - AHORA EN MILISEGUNDOS
        if (puja < Number(cantidadPujas)) {
          await new Promise((resolve) => setTimeout(resolve, Number(intervaloTiempo)))
        }
      }

      console.log("🎉 Todas las pujas automáticas completadas")
    } catch (error) {
      console.error("💥 Error ejecutando pujas automáticas:", error)
    } finally {
      setIsAutoBidding(false)
      setAutoBidProgress({ current: 0, total: 0, currentUser: "", currentAmount: 0 })
    }
  }

  // Detener pujas automáticas
  const stopAutoBids = () => {
    setIsAutoBidding(false)
    setAutoBidProgress({ current: 0, total: 0, currentUser: "", currentAmount: 0 })
  }

  // Limpiar campos de pujas automáticas
  const clearAutoBidFields = () => {
    setPrecioBase("")
    setIncrementoMinimo("")
    setCantidadPujas("")
    setIntervaloTiempo("")
    setIdSubasta("")
    setResults([])
  }

  // Restablecer usuarios a los predefinidos
  const resetUsers = () => {
    setUsuarios(PREDEFINED_USERS)
  }

  // Calcular preview de pujas automáticas (SOLO PRIMERAS 20)
  const getAutoBidPreview = () => {
    if (!precioBase || !incrementoMinimo || !cantidadPujas || usuarios.length === 0) {
      return []
    }

    const preview = []
    const totalPujas = Number(cantidadPujas)
    const maxPreview = Math.min(totalPujas, 20) // MÁXIMO 20 PUJAS EN PREVIEW

    for (let i = 1; i <= maxPreview; i++) {
      const userIndex = (i - 1) % usuarios.length
      const user = usuarios[userIndex]
      const amount = Number(precioBase) + i * Number(incrementoMinimo)
      preview.push({
        bid: i,
        user: user?.email || `Usuario ${userIndex + 1}`,
        amount: amount,
      })
    }
    return preview
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Sistema de Pujas Automáticas</h1>

      {/* Verificación de configuración */}
      {!isConfigured && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>⚠️ Variables de entorno de Supabase no configuradas</AlertDescription>
        </Alert>
      )}

      {/* Estado de configuración */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Estado del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Badge variant={SUPABASE_URL ? "success" : "destructive"}>{SUPABASE_URL ? "✅" : "❌"}</Badge>
              <span className="text-sm">Supabase URL</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={SUPABASE_ANON_KEY ? "success" : "destructive"}>{SUPABASE_ANON_KEY ? "✅" : "❌"}</Badge>
              <span className="text-sm">Supabase Key</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="success">✅</Badge>
              <span className="text-sm">Proxy CORS</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={usuarios.length > 0 ? "success" : "destructive"}>
                {usuarios.length > 0 ? "✅" : "❌"}
              </Badge>
              <span className="text-sm">{usuarios.length} Usuarios</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progreso de pujas automáticas */}
      {isAutoBidding && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pujas Automáticas en Progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>
                  Progreso: {autoBidProgress.current}/{autoBidProgress.total}
                </span>
                <Button onClick={stopAutoBids} variant="destructive" size="sm">
                  <Pause className="mr-2 h-4 w-4" /> Detener
                </Button>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(autoBidProgress.current / autoBidProgress.total) * 100}%` }}
                ></div>
              </div>
              {autoBidProgress.currentUser && (
                <div className="text-sm text-muted-foreground">
                  🎯 {autoBidProgress.currentUser} pujando ${autoBidProgress.currentAmount}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="auto" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="auto">Pujas Automáticas</TabsTrigger>
          <TabsTrigger value="simple">Pujas Simples</TabsTrigger>
        </TabsList>

        {/* Tab de Pujas Automáticas */}
        <TabsContent value="auto" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuración de pujas automáticas */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Pujas Automáticas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Precio Base ($)</label>
                      <Input
                        type="number"
                        value={precioBase}
                        onChange={(e) => setPrecioBase(e.target.value)}
                        placeholder="Ej: 1000"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Incremento Mínimo ($)</label>
                      <Input
                        type="number"
                        value={incrementoMinimo}
                        onChange={(e) => setIncrementoMinimo(e.target.value)}
                        placeholder="Ej: 100"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Cantidad de Pujas</label>
                      <Input
                        type="number"
                        value={cantidadPujas}
                        onChange={(e) => setCantidadPujas(e.target.value)}
                        placeholder="Ej: 10"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Intervalo (milisegundos)</label>
                      <Input
                        type="number"
                        value={intervaloTiempo}
                        onChange={(e) => setIntervaloTiempo(e.target.value)}
                        placeholder="Ej: 1 (ultra rápido), 10 (muy rápido)"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        💡 1ms = ultra rápido, 10ms = muy rápido, 100ms = rápido
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium">ID de Subasta</label>
                      <Input
                        value={idSubasta}
                        onChange={(e) => setIdSubasta(e.target.value)}
                        placeholder="Ingresa el ID de la subasta"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex space-x-4">
                    <Button
                      onClick={executeAutoBids}
                      disabled={isAutoBidding || usuarios.length === 0 || !isConfigured}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isAutoBidding ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Pujando...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" /> Iniciar Pujas Automáticas
                        </>
                      )}
                    </Button>
                    <Button onClick={clearAutoBidFields} variant="outline">
                      <RotateCcw className="mr-2 h-4 w-4" /> Limpiar Campos
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Preview de pujas - SOLO PRIMERAS 20 */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Preview de Pujas
                    {getAutoBidPreview().length > 0 && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        (Mostrando {getAutoBidPreview().length} de {cantidadPujas || 0})
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {getAutoBidPreview().length > 0 ? (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {getAutoBidPreview().map((preview, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded-md text-sm">
                            <span>Puja #{preview.bid}</span>
                            <span className="font-medium">{preview.user}</span>
                            <span className="text-green-600 font-bold">${preview.amount}</span>
                          </div>
                        ))}
                        {Number(cantidadPujas) > 20 && (
                          <div className="text-center text-muted-foreground text-xs py-2 border-t">
                            ... y {Number(cantidadPujas) - 20} pujas más
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <p>Completa los campos de configuración para ver el preview</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Gestión de usuarios */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Agregar Usuario</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="usuario@ejemplo.com"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Contraseña</label>
                      <Input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="Contraseña"
                      />
                    </div>
                    <Button onClick={addUser} disabled={!newUser.email || !newUser.password} className="w-full">
                      <Plus className="mr-2 h-4 w-4" /> Agregar Usuario
                    </Button>
                    <Button onClick={resetUsers} variant="outline" className="w-full">
                      <RotateCcw className="mr-2 h-4 w-4" /> Restablecer Usuarios
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usuarios Activos ({usuarios.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {usuarios.map((user, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                          <div>
                            <div className="font-medium text-sm">{user.email}</div>
                            <div className="text-xs text-muted-foreground">Orden: #{index + 1}</div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeUser(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab de Pujas Simples */}
        <TabsContent value="simple" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Puja Simple</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Monto de Puja ($)</label>
                    <Input
                      type="number"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      placeholder="Ingresa el monto"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">ID de Subasta</label>
                    <Input
                      value={idSubasta}
                      onChange={(e) => setIdSubasta(e.target.value)}
                      placeholder="Ingresa el ID de la subasta"
                    />
                  </div>
                  <Button
                    onClick={executeSimpleBids}
                    disabled={isLoading || usuarios.length === 0 || !isConfigured}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" /> Ejecutar Pujas Simples
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usuarios para Puja Simple</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {usuarios.map((user, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="font-medium text-sm">{user.email}</div>
                        <Badge variant="outline">{monto ? `$${monto}` : "Sin monto"}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Resultados */}
      {results.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Resultados de las Pujas ({results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {result.bidNumber && <Badge variant="outline">#{result.bidNumber}</Badge>}
                        <span className="font-medium">{result.email}</span>
                        <Badge variant="secondary">${result.amount}</Badge>
                      </div>
                      <Badge
                        variant={
                          result.status === 200 || result.status === 201
                            ? "success"
                            : result.status === "error"
                              ? "destructive"
                              : "default"
                        }
                      >
                        {result.status === "error" ? "Error" : `Estado: ${result.status}`}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">{result.message}</div>

                    {result.time > 0 && (
                      <div className="text-xs mb-2">
                        ⏱️ <span className="font-medium">{result.time}ms</span>
                        {result.timestamp && (
                          <span className="ml-4">🕐 {new Date(result.timestamp).toLocaleTimeString()}</span>
                        )}
                      </div>
                    )}

                    <Separator className="my-2" />

                    {result.data && (
                      <div>
                        <div className="text-xs font-medium mb-1">📄 Respuesta:</div>
                        <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
