"use server"

import { createClient } from "@supabase/supabase-js"

// Verificar variables de entorno con valores por defecto seguros
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Variables de entorno de Supabase no configuradas")
}

// Solo crear el cliente si las variables existen
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

interface LoginResult {
  success: boolean
  message?: string
  error?: string
  userData?: {
    id_postor: number
    email: string
    nombre_completo: string
    id_usuario: string
  }
}

export async function loginUser(formData: FormData): Promise<LoginResult> {
  if (!supabase) {
    return {
      success: false,
      error: "Configuración de base de datos no disponible. Contacta al administrador.",
    }
  }

  try {
    console.log("Iniciando proceso de login...")

    // Obtener datos del formulario
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    console.log("Intentando login para:", email)

    // Validar datos básicos
    if (!email || !password) {
      return {
        success: false,
        error: "Por favor completa todos los campos.",
      }
    }

    // Validar formato de correo electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: "Por favor ingresa una dirección de correo electrónico válida.",
      }
    }

    // 1. Autenticar con Supabase Auth
    console.log("Autenticando con Supabase Auth...")
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error("Error de autenticación:", authError)

      // Manejar diferentes tipos de errores
      if (authError.message.includes("Invalid login credentials")) {
        return {
          success: false,
          error: "Correo electrónico o contraseña incorrectos.",
        }
      }

      if (authError.message.includes("Email not confirmed")) {
        return {
          success: false,
          error: "Por favor confirma tu correo electrónico antes de iniciar sesión.",
        }
      }

      return {
        success: false,
        error: `Error de autenticación: ${authError.message}`,
      }
    }

    if (!authData.user) {
      return {
        success: false,
        error: "No se pudo autenticar al usuario.",
      }
    }

    const userId = authData.user.id
    console.log("Usuario autenticado con ID:", userId)

    // 2. Obtener datos del usuario desde la tabla usuario
    console.log("Obteniendo datos del usuario...")
    const { data: usuarioData, error: usuarioError } = await supabase
      .from("usuario")
      .select("id_usuario, nombre, primer_apellido, segundo_apellido")
      .eq("id_usuario", userId)
      .single()

    if (usuarioError) {
      console.error("Error al obtener datos del usuario:", usuarioError)
      return {
        success: false,
        error: "Error al obtener información del usuario.",
      }
    }

    if (!usuarioData) {
      return {
        success: false,
        error: "No se encontró información del usuario.",
      }
    }

    console.log("Datos del usuario obtenidos:", usuarioData)

    // 3. Obtener datos del postor
    console.log("Obteniendo datos del postor...")
    const { data: postorData, error: postorError } = await supabase
      .from("postor")
      .select("id_postor, telefono")
      .eq("id_usuario", userId)
      .single()

    if (postorError) {
      console.error("Error al obtener datos del postor:", postorError)
      return {
        success: false,
        error: "Error al obtener información del postor.",
      }
    }

    if (!postorData) {
      return {
        success: false,
        error: "No se encontró información del postor.",
      }
    }

    console.log("Datos del postor obtenidos:", postorData)

    // 4. Construir nombre completo
    const nombreCompleto = `${usuarioData.nombre} ${usuarioData.primer_apellido}${
      usuarioData.segundo_apellido ? ` ${usuarioData.segundo_apellido}` : ""
    }`

    console.log("Login completado exitosamente")

    // 5. Retornar datos para guardar en localStorage
    return {
      success: true,
      message: "Inicio de sesión exitoso",
      userData: {
        id_postor: postorData.id_postor,
        email: authData.user.email || email,
        nombre_completo: nombreCompleto,
        id_usuario: userId,
      },
    }
  } catch (error) {
    console.error("Error en el proceso de login:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ocurrió un error durante el inicio de sesión",
    }
  }
}
