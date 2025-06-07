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

export default supabase
