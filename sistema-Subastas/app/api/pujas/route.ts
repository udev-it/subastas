// app/api/pujas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js"
import { pujaService } from "@/lib/puja-service"

// Función helper para crear el cliente de Supabase
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Variables de entorno de Supabase no definidas")
  }

  return createClient(supabaseUrl, supabaseKey)
}

export async function POST(request: NextRequest) {
  // 1) Timestamp exacto de la petición (puede guardar auditoría si quieres)
  const fechaHoraPeticion = new Date().toISOString();

  try {
    // 2) Crear cliente Supabase para auth y operaciones de lectura (no lo pasamos al servicio)
    const supabase = createSupabaseClient();

    // 3) Validar JWT del usuario (header Authorization)
    const authorization = request.headers.get("authorization");
    if (!authorization) {
      return NextResponse.json(
        { success: false, message: "No autorizado. Debe iniciar sesión." },
        { status: 401 }
      );
    }

    const tokenJwt = authorization.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(tokenJwt);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Token inválido. Debe iniciar sesión." },
        { status: 401 }
      );
    }
    const userId = user.id;

    // 4) Verificar que el usuario sea un postor
    const { data: postorData, error: postorError } = await supabase
      .from("postor")
      .select("id_postor")
      .eq("id_usuario", userId)
      .single();

    if (postorError || !postorData) {
      return NextResponse.json(
        { success: false, message: "Solo los postores pueden pujar" },
        { status: 403 }
      );
    }
    const idPostor = postorData.id_postor;

    // 5) Leer body de la petición
    const body = await request.json();
    const { token, monto } = body;
    if (!token || typeof monto !== "number") {
      return NextResponse.json(
        {
          success: false,
          message: "Faltan datos requeridos: { token, monto }",
        },
        { status: 400 }
      );
    }

    // 6) Llamamos al servicio que hace toda la lógica (Redis + Supabase)
    const resultado = await pujaService.registrarPuja(
      idPostor,
      { token, monto },
      fechaHoraPeticion
    );

    if (!resultado.success) {
      return NextResponse.json(resultado, { status: 400 });
    }

    // 7) Si la puja fue exitosa, devolvemos el ID de la puja y demás datos
    return NextResponse.json({
      success: true,
      data: resultado.data, // por ejemplo { id_puja: 123, id_subasta: 77, monto: 5000, ... }
      timestamp_peticion: fechaHoraPeticion,
    });
  } catch (error) {
    console.error("Error en API de pujas:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
