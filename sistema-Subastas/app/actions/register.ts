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

interface RegisterResult {
  success: boolean
  message?: string
  error?: string
  isRateLimit?: boolean
}

export async function registerUser(formData: FormData): Promise<RegisterResult> {
  if (!supabase) {
    return {
      success: false,
      error: "Configuración de base de datos no disponible. Contacta al administrador.",
    }
  }
  try {
    console.log("Iniciando registro de usuario...")

    // Verificar que los términos y condiciones estén aceptados
    const termsAccepted = formData.get("terms")
    if (!termsAccepted) {
      return {
        success: false,
        error: "Debes aceptar los Términos y Condiciones para continuar.",
      }
    }

    // Obtener datos del formulario
    const nombre = formData.get("name") as string
    const primerApellido = formData.get("apellido-paterno") as string
    const segundoApellido = (formData.get("apellido-materno") as string) || null
    const correo = formData.get("register-email") as string
    const contrasena = formData.get("register-password") as string
    const telefono = formData.get("telefono") as string

    console.log("Datos del formulario:", { nombre, primerApellido, segundoApellido, correo, telefono })

    // Validar datos básicos
    if (!nombre || !primerApellido || !correo || !contrasena || !telefono) {
      return {
        success: false,
        error: "Por favor completa todos los campos obligatorios.",
      }
    }

    // Validar formato de correo electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(correo)) {
      return {
        success: false,
        error: "Por favor ingresa una dirección de correo electrónico válida.",
      }
    }

    // 1. Registrar al usuario en Supabase Auth
    console.log("Registrando usuario en Supabase Auth...")
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: correo,
      password: contrasena,
      options: {
        emailRedirectTo: `https://v0-subastas-8e.vercel.app/login`,
      },
    })

    if (authError) {
      console.error("Error al registrar usuario en Auth:", authError)

      // Manejar específicamente el error de límite de correos
      if (authError.message.includes("rate limit")) {
        return {
          success: false,
          error:
            "Se ha alcanzado el límite de envío de correos electrónicos. Por favor, intenta nuevamente más tarde o utiliza otro correo electrónico.",
          isRateLimit: true,
        }
      }

      // Si el error es de formato de correo, proporcionamos un mensaje más claro
      if (authError.message.includes("invalid")) {
        return {
          success: false,
          error: "El formato del correo electrónico no es válido o no está permitido por el servidor.",
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
    console.log("Usuario registrado en Auth con ID:", userId)

    // 2. Insertar en la tabla usuario
    console.log("Insertando datos en la tabla usuario...")
    const { error: usuarioError } = await supabase.from("usuario").insert({
      id_usuario: userId,
      nombre,
      primer_apellido: primerApellido,
      segundo_apellido: segundoApellido,
    })

    if (usuarioError) {
      console.error("Error al insertar usuario:", usuarioError)
      return {
        success: false,
        error: `Error al crear perfil de usuario: ${usuarioError.message}`,
      }
    }

    // 3. Insertar en la tabla postor
    console.log("Insertando datos en la tabla postor...")
    const { data: postorData, error: postorError } = await supabase
      .from("postor")
      .insert({
        id_usuario: userId,
        telefono,
      })
      .select("id_postor")
      .single()

    if (postorError) {
      console.error("Error al insertar postor:", postorError)
      return {
        success: false,
        error: `Error al crear postor: ${postorError.message}`,
      }
    }

    if (!postorData || !postorData.id_postor) {
      return {
        success: false,
        error: "No se pudo obtener el ID del postor creado",
      }
    }

    const idPostor = postorData.id_postor
    console.log("Postor creado con ID:", idPostor)

    // 4. Obtener el id_tyc del formulario o consultar el más reciente
    let idTyc = formData.get("tyc-id") as string

    if (!idTyc) {
      console.log("No se proporcionó id_tyc en el formulario, obteniendo el más reciente...")

      // Obtener el id_tyc más reciente
      const { data: tycData, error: tycError } = await supabase
        .from("tyc")
        .select("id_tyc")
        .order("version", { ascending: false })
        .limit(1)
        .single()

      if (tycError) {
        console.error("Error al obtener términos y condiciones:", tycError)
        return {
          success: false,
          error: `Error al obtener términos y condiciones: ${tycError.message}`,
        }
      }

      if (!tycData) {
        return {
          success: false,
          error: "No se encontraron términos y condiciones",
        }
      }

      idTyc = tycData.id_tyc.toString()
    }

    console.log("Usando términos y condiciones con ID:", idTyc)

    // 5. Insertar en la tabla acepta
    console.log("Registrando aceptación de términos y condiciones...")
    const { error: aceptaError } = await supabase.from("acepta").insert({
      id_tyc: idTyc,
      id_postor: idPostor,
    })

    if (aceptaError) {
      console.error("Error al registrar aceptación de términos:", aceptaError)
      return {
        success: false,
        error: `Error al registrar aceptación de términos: ${aceptaError.message}`,
      }
    }

    console.log("Registro completado exitosamente")

    // Todo el proceso se completó exitosamente
    return {
      success: true,
      message: "Registro completado exitosamente",
    }
  } catch (error) {
    console.error("Error en el proceso de registro:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ocurrió un error durante el registro",
    }
  }
}
