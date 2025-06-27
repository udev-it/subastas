import { type NextRequest, NextResponse } from "next/server"
import { pujaService } from "@/lib/puja-service"
import { createClient } from "@supabase/supabase-js"

// Función helper para crear el cliente de Supabase
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Variables de entorno de Supabase no definidas")
  }
  return createClient(supabaseUrl, supabaseKey)
}

export async function GET(request: NextRequest, { params }: { params: { idSubasta: string } }) {
  try {
    const supabase = createSupabaseClient()
    const { idSubasta } = params

    if (!idSubasta) {
      return NextResponse.json({ success: false, message: "Falta el ID de la subasta" }, { status: 400 })
    }

    // Validar autenticación (opcional, pero recomendado si la info es sensible)
    const authorization = request.headers.get("authorization")
    if (!authorization) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 })
    }
    const token = authorization.replace("Bearer ", "")
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Token inválido" }, { status: 401 })
    }

    const resultado = await pujaService.obtenerInfoSubasta(idSubasta)

    if (!resultado.success) {
      return NextResponse.json(resultado, { status: 404 }) // O 400 dependiendo del error
    }

    return NextResponse.json(resultado)
  } catch (error) {
    console.error("Error en API de info subasta:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}
