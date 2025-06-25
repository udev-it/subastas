import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Verificar si estamos en el navegador
const isBrowser = typeof window !== "undefined"

// Obtener las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Verificar que las variables de entorno estén definidas
if (!supabaseUrl || !supabaseAnonKey) {
  if (isBrowser) {
    console.error(
      "Supabase credentials are missing. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.",
    )
  }
}

// Crear una instancia única del cliente de Supabase
let supabaseInstance: SupabaseClient | null = null

export const supabase = (() => {
  if (!supabaseInstance && supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return supabaseInstance
})()

// Tipos exportados
export type User = {
  id: string
  email?: string
  last_sign_in_at?: string
}

// Add these new types after the existing User type
export type UserType = "postor" | "subastador" | "unknown"

export interface UserProfile extends User {
  userType: UserType
  postorId?: string
  subastadorId?: string
}

// Función para verificar la contraseña actual
export async function verifyPassword(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Check your environment variables.")
    }

    // Intentamos iniciar sesión con el email y contraseña proporcionados
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // Si hay un error, la contraseña es incorrecta
    if (error) {
      return { success: false, error: error.message }
    }

    // Si no hay error, la contraseña es correcta
    return { success: true }
  } catch (error: any) {
    console.error("Error al verificar la contraseña:", error)
    return { success: false, error: error.message }
  }
}

// Función para cambiar la contraseña
export async function changePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Check your environment variables.")
    }

    // Cambiar la contraseña
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error al cambiar la contraseña:", error)
    return { success: false, error: error.message }
  }
}

export async function signOut(): Promise<boolean> {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Check your environment variables.")
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("Error signing out:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Unexpected error signing out:", error)
    return false
  }
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  if (!supabase) {
    throw new Error("Supabase client is not initialized. Check your environment variables.")
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    const user: User | null = session?.user
      ? {
          id: session.user.id,
          email: session.user.email || undefined,
          last_sign_in_at: session.user.last_sign_in_at || undefined,
        }
      : null

    callback(user)
  })

  return () => {
    subscription.unsubscribe()
  }
}

export async function getCurrentSession(): Promise<{ user: User | null }> {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Check your environment variables.")
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error("Error getting session:", error)
      return { user: null }
    }

    const user: User | null = session?.user
      ? {
          id: session.user.id,
          email: session.user.email || undefined,
          last_sign_in_at: session.user.last_sign_in_at || undefined,
        }
      : null

    return { user }
  } catch (error) {
    console.error("Error getting current session:", error)
    return { user: null }
  }
}

// Update the signInWithEmail function to include user type information
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ user: UserProfile | null; error: string | null }> {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Check your environment variables.")
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { user: null, error: error.message }
    }

    if (!data.user) {
      return { user: null, error: "No se encontró información del usuario" }
    }

    // Verificar el tipo de usuario
    const userTypeInfo = await checkUserType(data.user.id)

    const user: UserProfile = {
      id: data.user.id,
      email: data.user.email || undefined,
      last_sign_in_at: data.user.last_sign_in_at || undefined,
      userType: userTypeInfo.userType,
      postorId: userTypeInfo.postorId,
      subastadorId: userTypeInfo.subastadorId,
    }

    return { user, error: null }
  } catch (error: any) {
    console.error("Error signing in with email:", error)
    return { user: null, error: error.message }
  }
}

// Update the signUpWithEmail function to create a postor by default
export async function signUpWithEmail(
  email: string,
  password: string,
  userType: "postor" | "subastador" = "postor", // Por defecto, los usuarios nuevos son postores
): Promise<{ user: UserProfile | null; error: string | null }> {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Check your environment variables.")
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      return { user: null, error: error.message }
    }

    if (!data.user) {
      return { user: null, error: "No se pudo crear el usuario" }
    }

    // Crear entrada en la tabla usuario
    const { error: userError } = await supabase.from("usuario").insert({
      id_usuario: data.user.id,
      correo: email,
      nombre: "",
      primer_apellido: "",
      segundo_apellido: "",
    })

    if (userError) {
      console.error("Error al crear entrada en la tabla usuario:", userError)
      return { user: null, error: userError.message }
    }

    // Crear entrada en la tabla correspondiente según el tipo de usuario
    if (userType === "postor") {
      const postorId = crypto.randomUUID()
      const { error: postorError } = await supabase.from("postor").insert({
        id_postor: postorId,
        id_usuario: data.user.id,
        telefono: "",
      })

      if (postorError) {
        console.error("Error al crear entrada en la tabla postor:", postorError)
        return { user: null, error: postorError.message }
      }

      const user: UserProfile = {
        id: data.user.id,
        email: data.user.email || undefined,
        last_sign_in_at: data.user.last_sign_in_at || undefined,
        userType: "postor",
        postorId: postorId,
      }

      return { user, error: null }
    } else if (userType === "subastador") {
      const subastadorId = crypto.randomUUID()
      const { error: subastadorError } = await supabase.from("subastador").insert({
        id_subastador: subastadorId,
        id_usuario: data.user.id,
      })

      if (subastadorError) {
        console.error("Error al crear entrada en la tabla subastador:", subastadorError)
        return { user: null, error: subastadorError.message }
      }

      const user: UserProfile = {
        id: data.user.id,
        email: data.user.email || undefined,
        last_sign_in_at: data.user.last_sign_in_at || undefined,
        userType: "subastador",
        subastadorId: subastadorId,
      }

      return { user, error: null }
    }

    // Si llegamos aquí, algo salió mal
    return { user: null, error: "Error al crear el tipo de usuario" }
  } catch (error: any) {
    console.error("Error signing up with email:", error)
    return { user: null, error: error.message }
  }
}

// Add these new functions after the existing functions

// Función para verificar el tipo de usuario (postor o subastador)
export async function checkUserType(userId: string): Promise<UserProfile> {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Check your environment variables.")
    }

    // Primero verificamos si el usuario existe en la tabla postor
    const { data: postorData, error: postorError } = await supabase
      .from("postor")
      .select("id_postor")
      .eq("id_usuario", userId)
      .maybeSingle()

    if (postorError && postorError.code !== "PGRST116") {
      console.error("Error al verificar si el usuario es postor:", postorError)
    }

    // Si es postor, devolvemos esa información
    if (postorData) {
      return {
        id: userId,
        userType: "postor",
        postorId: postorData.id_postor,
      }
    }

    // Si no es postor, verificamos si es subastador
    const { data: subastadorData, error: subastadorError } = await supabase
      .from("subastador")
      .select("id_subastador")
      .eq("id_usuario", userId)
      .maybeSingle()

    if (subastadorError && subastadorError.code !== "PGRST116") {
      console.error("Error al verificar si el usuario es subastador:", subastadorError)
    }

    // Si es subastador, devolvemos esa información
    if (subastadorData) {
      return {
        id: userId,
        userType: "subastador",
        subastadorId: subastadorData.id_subastador,
      }
    }

    // Si no es ni postor ni subastador, devolvemos tipo desconocido
    return {
      id: userId,
      userType: "unknown",
    }
  } catch (error) {
    console.error("Error al verificar el tipo de usuario:", error)
    return {
      id: userId,
      userType: "unknown",
    }
  }
}

// Función para obtener información completa del usuario
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Check your environment variables.")
    }

    // Obtener información básica del usuario
    const { data: userData, error: userError } = await supabase
      .from("usuario")
      .select("*")
      .eq("id_usuario", userId)
      .maybeSingle()

    if (userError) {
      console.error("Error al obtener información del usuario:", userError)
      return null
    }

    if (!userData) {
      console.error("Usuario no encontrado")
      return null
    }

    // Verificar el tipo de usuario
    const userTypeInfo = await checkUserType(userId)

    // Construir el perfil completo
    const userProfile: UserProfile = {
      id: userId,
      email: userData.correo,
      userType: userTypeInfo.userType,
      postorId: userTypeInfo.postorId,
      subastadorId: userTypeInfo.subastadorId,
    }

    return userProfile
  } catch (error) {
    console.error("Error al obtener el perfil del usuario:", error)
    return null
  }
}

// Añadir las nuevas funciones para el registro de usuarios

interface RegisterResult {
  success: boolean
  message?: string
  error?: string
  isRateLimit?: boolean
}

export async function registerUser(formData: FormData): Promise<RegisterResult> {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Check your environment variables.")
    }

    // Validar términos y condiciones
    const termsAccepted = formData.get("terms")
    if (!termsAccepted) {
      return {
        success: false,
        error: "Debes aceptar los Términos y Condiciones para continuar.",
      }
    }

    // Extraer datos del formulario
    const nombre = formData.get("name") as string
    const primerApellido = formData.get("apellido-paterno") as string
    const segundoApellido = (formData.get("apellido-materno") as string) || null
    const email = formData.get("register-email") as string
    const password = formData.get("register-password") as string
    const telefono = formData.get("telefono") as string
    const documentoUrl = formData.get("documento-url") as string
    const documentoTipo = formData.get("documento-tipo") as string
    const tycId = formData.get("tyc-id") as string

    // Validaciones básicas
    if (!nombre || !primerApellido || !email || !password || !telefono || !documentoUrl || !documentoTipo) {
      return {
        success: false,
        error: "Por favor completa todos los campos obligatorios.",
      }
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: "Por favor ingresa una dirección de correo electrónico válida.",
      }
    }

    // Registrar usuario en Supabase Auth
    console.log("Intentando registrar usuario en Supabase Auth...")

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      console.error("Detalles completos del error:", {
        message: authError.message,
        status: authError.status,
      })

      if (authError.message.includes("rate limit")) {
        return {
          success: false,
          error: "Límite de envío de correos alcanzado. Intenta más tarde.",
          isRateLimit: true,
        }
      }

      if (authError.message.includes("already registered")) {
        return {
          success: false,
          error: "Este correo electrónico ya está registrado",
        }
      }

      return {
        success: false,
        error: `Error al crear cuenta: ${authError.message}`,
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: "No se pudo crear la cuenta de usuario",
      }
    }

    const userId = authData.user.id

    console.log("Datos a insertar en usuario:", {
      id_usuario: userId,
      nombre,
      primer_apellido: primerApellido,
      segundo_apellido: segundoApellido,
    })

    // Insertar en tabla usuario
    const { error: usuarioError } = await supabase.from("usuario").insert({
      id_usuario: userId,
      nombre: String(nombre),
      primer_apellido: String(primerApellido),
      segundo_apellido: segundoApellido ? String(segundoApellido) : null,
    })

    if (usuarioError) {
      console.error("Error detallado al insertar usuario:", {
        message: usuarioError.message,
        details: usuarioError.details,
        hint: usuarioError.hint,
        code: usuarioError.code,
      })

      return {
        success: false,
        error: `Error al crear perfil de usuario: ${usuarioError.message}`,
      }
    }

    // Insertar en tabla postor
    const { data: postorData, error: postorError } = await supabase
      .from("postor")
      .insert({
        id_usuario: userId,
        telefono,
      })
      .select("id_postor")
      .single()

    if (postorError || !postorData) {
      return {
        success: false,
        error: postorError ? `Error al crear postor: ${postorError.message}` : "No se pudo obtener ID del postor",
      }
    }

    const idPostor = postorData.id_postor

    // Insertar documentación
    const { error: docError } = await supabase.from("documentacion").insert({
      archivo_url: documentoUrl,
      tipo: documentoTipo,
      fecha_subida: new Date().toISOString(),
      estado: false,
      id_postor: idPostor,
    })

    if (docError) {
      return {
        success: false,
        error: `Error al registrar documentación: ${docError.message}`,
      }
    }

    // Obtener términos y condiciones si no se proporcionó
    let idTyc = tycId
    if (!idTyc) {
      const { data: tycData, error: tycError } = await supabase
        .from("tyc")
        .select("id_tyc")
        .order("fecha_modificacion", { ascending: false })
        .limit(1)
        .single()

      if (tycError || !tycData) {
        return {
          success: false,
          error: tycError ? `Error al obtener T&C: ${tycError.message}` : "No se encontraron T&C",
        }
      }
      idTyc = tycData.id_tyc.toString()
    }

    // Registrar aceptación de términos
    const { error: aceptaError } = await supabase.from("acepta").insert({
      id_tyc: idTyc,
      id_postor: idPostor,
    })

    if (aceptaError) {
      return {
        success: false,
        error: `Error al registrar aceptación de términos: ${aceptaError.message}`,
      }
    }

    return {
      success: true,
      message: "Registro completado. Por favor verifica tu correo electrónico.",
    }
  } catch (error) {
    console.error("Error en el proceso de registro:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ocurrió un error inesperado",
    }
  }
}

// Función para obtener los términos y condiciones más recientes
export async function getLatestTerms() {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Check your environment variables.")
    }

    const { data, error } = await supabase
      .from("tyc")
      .select("*")
      .order("fecha_modificacion", { ascending: false })
      .limit(1)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error al obtener términos y condiciones:", error)
    return null
  }
}

// ==================== FUNCIONES DE SUBASTAS ====================

export async function fetchAuctionById(auctionId: string): Promise<Auction | null> {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Check your environment variables.")
    }
    if (!areCredentialsAvailable()) {
      console.log("Usando datos de demostración para fetchAuctionById")
      return null
    }

    if (!isUuid(auctionId)) {
      console.error("El ID de la subasta no es un UUID válido.")
      return null
    }

    const { data: subastaData, error: subastaError } = await supabase
      .from("subasta")
      .select("*")
      .eq("id_subasta", auctionId.trim())
      .single()

    if (subastaError) {
      console.error("Error en la consulta a la tabla subasta:", subastaError)
      return null
    }

    if (!subastaData) {
      console.log("No se encontró la subasta con ID:", auctionId)
      return null
    }

    const { data: vehiculoData, error: vehiculoError } = await supabase
      .from("vehiculo")
      .select("*")
      .eq("ficha", subastaData.ficha)
      .single()

    if (vehiculoError && vehiculoError.code !== "PGRST116") {
      console.error("Error en la consulta a la tabla vehiculo:", vehiculoError)
    }

    return {
      id_subasta: subastaData.id_subasta,
      titulo: subastaData.titulo,
      descripcion: subastaData.descripcion,
      estado: subastaData.estado,
      inicio: subastaData.inicio,
      fin: subastaData.fin,
      precio_base: subastaData.precio_base,
      monto_minimo_puja: subastaData.monto_minimo_puja,
      cantidad_max_participantes: subastaData.cantidad_max_participantes,
      cantidad_participantes: subastaData.cantidad_participantes,
      vehicleDetails: vehiculoData
        ? {
            ficha: vehiculoData.ficha,
            anio: vehiculoData.anio,
            modelo: vehiculoData.modelo,
            descripcion: vehiculoData.descripcion,
            imagen_url: vehiculoData.imagen_url,
          }
        : undefined,
    }
  } catch (error: any) {
    console.error("Error al buscar la subasta:", error?.message)
    return null
  }
}

export async function fetchAvailableAuctions(filters?: AuctionFilters): Promise<Auction[]> {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Check your environment variables.")
    }

    let query = supabase
      .from("subasta")
      .select("*")
      .or("estado.eq.Publicada,estado.eq.publicada")

    if (filters?.startDate) {
      const startDate = new Date(filters.startDate)
      const startDateStr = startDate.toISOString().split('T')[0]
      query = query
        .gte('inicio', `${startDateStr}T00:00:00`)
        .lt('inicio', `${startDateStr}T23:59:59.999`)
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate)
      const endDateStr = endDate.toISOString().split('T')[0]
      query = query
        .gte('fin', `${endDateStr}T00:00:00`)
        .lt('fin', `${endDateStr}T23:59:59.999`)
    }

    query = query.order("inicio", { ascending: false })

    const { data: subastasData, error: subastasError } = await query
    
    if (subastasError) {
      console.error("Error en la consulta a la tabla subasta:", subastasError)
      throw new Error(`Error al obtener subastas: ${subastasError.message}`)
    }

    if (!subastasData || subastasData.length === 0) {
      console.log("No se encontraron subastas disponibles")
      return []
    }

    const fichas = subastasData.map((subasta) => subasta.ficha).filter((ficha) => ficha)

    let vehiculosData: any[] = []

    if (fichas.length > 0) {
      const { data: vehiculosResult, error: vehiculosError } = await supabase
        .from("vehiculo")
        .select("*")
        .in("ficha", fichas)

      if (vehiculosError) {
        console.error("Error en la consulta a la tabla vehiculo:", vehiculosError)
      } else {
        vehiculosData = vehiculosResult || []
      }
    }

    const vehiculosPorFicha = vehiculosData.reduce(
      (map, vehiculo) => {
        map[vehiculo.ficha] = vehiculo
        return map
      },
      {} as Record<string, any>,
    )

    const auctions = subastasData.map((subasta) => {
      const vehiculo = vehiculosPorFicha[subasta.ficha]
      return {
        id_subasta: subasta.id_subasta,
        titulo: subasta.titulo,
        descripcion: subasta.descripcion,
        estado: subasta.estado || "Publicada",
        inicio: subasta.inicio,
        fin: subasta.fin,
        precio_base: subasta.precio_base,
        monto_minimo_puja: subasta.monto_minimo_puja,
        cantidad_max_participantes: subasta.cantidad_max_participantes,
        cantidad_participantes: subasta.cantidad_participantes,
        vehicleDetails: vehiculo
          ? {
              ficha: vehiculo.ficha,
              anio: vehiculo.anio,
              modelo: vehiculo.modelo,
              descripcion: vehiculo.descripcion,
              imagen_url: vehiculo.imagen_url,
            }
          : undefined,
      }
    })

    if (filters) {
      return filterAuctionsByDateRange(auctions, filters)
    }

    return auctions
  } catch (error: any) {
    console.error("Error al obtener las subastas disponibles:", error?.message)
    throw error
  }
}

export async function fetchAllVehicles(): Promise<VehicleDetails[]> {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Check your environment variables.")
    }
    if (!areCredentialsAvailable()) {
      return []
    }

    const { data: vehiculosData, error: vehiculosError } = await supabase.from("vehiculo").select("*")

    if (vehiculosError) {
      throw new Error(`Error al obtener vehículos: ${vehiculosError.message}`)
    }

    return vehiculosData || []
  } catch (error: any) {
    console.error("Error al obtener vehículos:", error?.message)
    throw error
  }
}

export async function registerParticipation(
  userId: string,
  auctionId: string
): Promise<{ success: boolean; postorId?: string; error?: string }> {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized. Check your environment variables.")
    }

    const { data: postorData, error: postorError } = await supabase
      .from('postor')
      .select('id_postor')
      .eq('id_usuario', userId)
      .single()

    if (postorError || !postorData) {
      throw new Error("No se encontró el postor asociado a este usuario")
    }

    const idPostor = postorData.id_postor

    const { data: existing } = await supabase
      .from('participa')
      .select('id_postor')
      .eq('id_postor', idPostor)
      .eq('id_subasta', auctionId)
      .single()

    if (existing) {
      return { success: false, error: "Ya estás participando en esta subasta" }
    }

    const { data: auctionData, error: auctionError } = await supabase
      .from('subasta')
      .select('cantidad_participantes, cantidad_max_participantes, estado')
      .eq('id_subasta', auctionId)
      .single()

    if (auctionError || !auctionData) {
      throw new Error("No se pudo obtener información de la subasta")
    }

    if (auctionData.cantidad_participantes >= auctionData.cantidad_max_participantes) {
      return { 
        success: false, 
        error: "Esta subasta ya ha alcanzado el límite máximo de participantes" 
      }
    }

    if(auctionData.estado !== "Publicada") {
      return {
        success: false,
        error: "No puedes participar en esta subasta porque no está activa"
      }
    }

    const { data, error } = await supabase
      .from('participa')
      .insert([{ 
        id_postor: idPostor,
        id_subasta: auctionId,
      }])
      .select()

    if (error) {
      throw error
    }

    const { error: updateError } = await supabase
      .from('subasta')
      .update({ 
        cantidad_participantes: auctionData.cantidad_participantes + 1,
        estado: auctionData.cantidad_participantes + 1 >= auctionData.cantidad_max_participantes 
          ? "Completada" 
          : auctionData.estado
      })
      .eq('id_subasta', auctionId)

    if (updateError) {
      throw updateError
    }

    return { 
      success: true,
      postorId: idPostor
    }
  } catch (error: any) {
    console.error("Error en registerParticipation:", error)
    return {
      success: false,
      error: error.message || "Error al registrar participación"
    }
  }
}

export async function getAuctionById(auctionId: string) {
  if (!supabase) {
    throw new Error("Supabase no está inicializado.")
  }

  try {
    console.log("Iniciando consulta para obtener subasta con ID:", auctionId)
    
    const { data, error } = await supabase
      .from("subasta")
      .select(`
        id_subasta,
        titulo,
        descripcion,
        estado,
        inicio,
        fin,
        precio_base,
        monto_minimo_puja,
        cantidad_max_participantes,
        cantidad_participantes,
        ficha,
        vehiculo:vehiculo(*)
      `)
      .eq("id_subasta", auctionId)
      .single()

    if (error) {
      console.error("Error al obtener subasta:", error)
      throw new Error("Error al obtener subasta: " + error.message)
    }

    if (!data) {
      console.error("No se encontró la subasta con ID:", auctionId)
      return null
    }

    console.log("Datos obtenidos de la base de datos:", data)

    // Transformar los datos para que coincidan con la estructura esperada
    return {
      id_subasta: data.id_subasta,
      titulo: data.titulo,
      descripcion: data.descripcion,
      estado: data.estado,
      inicio: data.inicio,
      fin: data.fin,
      precio_base: data.precio_base,
      monto_minimo_puja: data.monto_minimo_puja,
      cantidad_max_participantes: data.cantidad_max_participantes,
      cantidad_participantes: data.cantidad_participantes,
      vehiculo: data.vehiculo || {
        ficha: "",
        anio: 0,
        modelo: "No especificado",
        descripcion: "Sin descripción",
        imagen_url: "/placeholder.svg"
      }
    }
  } catch (err) {
    console.error("Error inesperado al obtener subasta:", err)
    throw new Error("Error inesperado al obtener la subasta")
  }
}

export async function checkParticipation(auctionId: string, userId: string): Promise<boolean> {
  if (!supabase) {
    throw new Error("Supabase no está inicializado.")
  }

  try {
    // Primero obtener el id_postor del usuario
    const { data: postorData, error: postorError } = await supabase
      .from('postor')
      .select('id_postor')
      .eq('id_usuario', userId)
      .single()

    if (postorError || !postorData) {
      console.error("Error al obtener id_postor:", postorError)
      return false
    }

    console.log("ID del postor obtenido:", postorData.id_postor)
    console.log("Verificando participación para subasta:", auctionId)

    // Luego verificar la participación usando el id_postor
    const { data: participaData, error: participaError } = await supabase
      .from('participa')
      .select('id_postor')
      .eq('id_postor', postorData.id_postor)
      .eq('id_subasta', auctionId)
      .maybeSingle()

    if (participaError) {
      console.error("Error al verificar participación:", participaError)
      return false
    }

    const isParticipating = !!participaData
    console.log("¿Está participando?:", isParticipating)
    return isParticipating

  } catch (error) {
    console.error("Error en checkParticipation:", error)
    return false
  }
}

// ==================== FUNCIONES AUXILIARES ====================

export function areCredentialsAvailable(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(supabaseUrl && supabaseAnonKey)
}

export function isUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

function filterAuctionsByDateRange(auctions: Auction[], filters: AuctionFilters): Auction[] {
  try {
    if (!filters?.startDate && !filters?.endDate) return auctions

    const normalizeDate = (dateStr: string): Date => {
      const [year, month, day] = dateStr.split('-').map(Number)
      return new Date(Date.UTC(year, month - 1, day))
    }

    return auctions.filter((auction) => {
      try {
        const auctionStart = new Date(auction.inicio)
        const auctionEnd = new Date(auction.fin)

        if (isNaN(auctionStart.getTime()) || isNaN(auctionEnd.getTime())) {
          console.warn('Fechas inválidas en subasta:', auction.inicio, auction.fin)
          return false
        }

        const normalizedAuctionStart = new Date(Date.UTC(
          auctionStart.getFullYear(),
          auctionStart.getMonth(),
          auctionStart.getDate()
        ))
        
        const normalizedAuctionEnd = new Date(Date.UTC(
          auctionEnd.getFullYear(),
          auctionEnd.getMonth(),
          auctionEnd.getDate()
        ))

        const normalizedFilterStart = filters.startDate 
          ? normalizeDate(filters.startDate)
          : null
          
        const normalizedFilterEnd = filters.endDate
          ? normalizeDate(filters.endDate)
          : null

        const startMatch = !normalizedFilterStart || 
          normalizedAuctionStart >= normalizedFilterStart
          
        const endMatch = !normalizedFilterEnd || 
          normalizedAuctionEnd <= normalizedFilterEnd

        return startMatch && endMatch
      } catch (error) {
        console.error("Error filtrando subasta:", auction, error)
        return false
      }
    })
  } catch (error) {
    console.error("Error crítico en filterAuctionsByDateRange:", error)
    return []
  }
}

// ==================== INTERFACES Y TIPOS ====================

export interface VehicleDetails {
  ficha: string
  anio: number
  modelo: string
  descripcion: string
  imagen_url: string
}

export interface Auction {
  id_subasta: string
  titulo: string
  descripcion: string
  estado: "Publicada" | "Activa" | "Finalizada" | "Completada"
  inicio: string
  fin: string
  precio_base: number
  monto_minimo_puja: number
  cantidad_max_participantes: number
  cantidad_participantes: number
  vehicleDetails?: VehicleDetails
}

export interface AuctionFilters {
  startDate?: string
  endDate?: string
}

export default supabase
