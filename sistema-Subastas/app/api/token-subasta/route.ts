import { NextRequest, NextResponse } from "next/server"
import redis from "@/lib/redis"
import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"

// Función helper para crear el cliente de Supabase
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Variables de entorno de Supabase no definidas")
  }

  return createClient(supabaseUrl, supabaseKey)
}

/**
 * Recibe un string del tipo "YYYY-MM-DD HH:mm:SS" (hora de CDMX)
 * y devuelve un objeto Date en UTC, asumiendo offset -06:00.
 * Si la fecha cae en horario de verano (UTC-5), reemplaza "-06:00" por "-05:00".
 */
function mexicoToUtc(dateTimeMX: string): Date {
  // dateTimeMX = "2023-06-03 11:00:00"
  // Reemplazamos el espacio por 'T' y añadimos "-06:00".
  // Ejemplo resultante: "2023-06-03T11:00:00-06:00"
  const isoWithOffset = dateTimeMX.replace(" ", "T") + "-06:00";
  return new Date(isoWithOffset);
}

export async function POST(req: NextRequest) {
  try {
    const { id_subasta } = await req.json();
    if (!id_subasta) {
      return NextResponse.json(
        { error: "Falta el campo id_subasta" },
        { status: 400 }
      );
    }

    // 1) Traer datos de la subasta desde Supabase
    const supabase = createSupabaseClient();

    const { data: subastaData, error: subastaError } = await supabase
      .from("subasta")
      .select("monto_minimo_puja, precio_base, inicio, fin, estado")
      .eq("id_subasta", id_subasta)
      .single();

    if (subastaError || !subastaData) {
      return NextResponse.json(
        { error: "No se encontró la subasta" },
        { status: 404 }
      );
    }

    // 2) Extraer valores y convertirlos de hora local MX (CDMX) → UTC
    const {
      monto_minimo_puja,
      precio_base,
      inicio: inicioRaw, // p.e. "2023-06-03 11:00:00"
      fin: finRaw,       // p.e. "2023-06-03 15:00:00"
      estado,
    } = subastaData;

    // Convertir usando offset -06:00. Si fuese horario de verano, cambiar a "-05:00".
    const startUtcDate = mexicoToUtc(inicioRaw);
    const endUtcDate = mexicoToUtc(finRaw);
    const now = new Date();

    // 3) Validar estado y que aún no termine
    /*if (estado !== "activa") {
      return NextResponse.json(
        { error: "La subasta no está en estado 'activa'" },
        { status: 400 }
      );
    }*/
    if (endUtcDate <= now) {
      return NextResponse.json(
        { error: "La subasta ya terminó" },
        { status: 400 }
      );
    }

    // 4) Generar token y calcular cuánto falta para el inicio + TTL
    const token = uuidv4();
    const msParaIniciar = startUtcDate.getTime() - now.getTime();
    const ttlEnSegundos = Math.floor(
      (endUtcDate.getTime() - startUtcDate.getTime()) / 1000
    );

    // 5) Payload completo que guardaremos en Redis al activar el token
    const payload = {
      id_subasta,
      monto_minimo_puja,
      precio_base,
      inicio: startUtcDate.toISOString(), // en UTC
      fin: endUtcDate.toISOString(),
      estado,
    };

    // 6) Programar (o crear inmediatamente) la clave "subasta_token_activo:<token>"
    if (msParaIniciar > 0) {
      setTimeout(async () => {
        await redis.set(
          `subasta_token_activo:${token}`,
          JSON.stringify(payload),
          "EX",
          ttlEnSegundos
        );
        console.log(`🔐 Token activado: ${token} para subasta ${id_subasta}`);
      }, msParaIniciar);
    } else {
      // Si ya estamos dentro de la ventana, lo creamos de una vez
      await redis.set(
        `subasta_token_activo:${token}`,
        JSON.stringify(payload),
        "EX",
        ttlEnSegundos
      );
      console.log(`🔐 Token activado inmediatamente: ${token}`);
    }

    // 7) Devolver token y datos
    return NextResponse.json({
      token,
      subasta: payload,
      mensaje: "Token creado y programado en Redis.",
    });
  } catch (error) {
    console.error("Error interno al crear token de subasta:", error);
    return NextResponse.json(
      { error: "Error interno al crear token" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // 1) Leer id_subasta de query param
  const idSubastaParam = searchParams.get("id_subasta");
  if (!idSubastaParam) {
    return NextResponse.json(
      { error: "Falta el parámetro id_subasta" },
      { status: 400 }
    );
  }
  const id_subasta = idSubastaParam;

  try {
    // 2) Listar todas las claves que comienzan con "subasta_token_activo:"
    //    (si tienes muchos keys, podrías usar SCAN en lugar de KEYS para no bloquear Redis)
    const keys = await redis.keys("subasta_token_activo:*");

    // 3) Iterar sobre cada clave, buscando el JSON que contenga nuestro id_subasta
    for (const fullKey of keys) {
      const jsonString = await redis.get(fullKey);
      if (!jsonString) continue;

      // El valor de fullKey es algo como "subasta_token_activo:<TOKEN>"
      // Suponemos que jsonString es un JSON con campo "id_subasta"
      try {
        const payload = JSON.parse(jsonString) as { id_subasta: string; [k: string]: any };
        if (payload.id_subasta === id_subasta) {
          // 4) Si coincide, extraemos el token (parte después de los dos puntos)
          const token = fullKey.split("subasta_token_activo:")[1];
          return NextResponse.json({ token });
        }
      } catch {
        // Si el JSON no es válido, omitimos esta clave
        continue;
      }
    }

    // 5) Si no encontramos ningún token cuyo payload.id_subasta coincida
    return NextResponse.json(
      { error: "No se encontró ningún token activo para esa subasta" },
      { status: 404 }
    );
  } catch (err) {
    console.error("Error buscando token de subasta:", err);
    return NextResponse.json(
      { error: "Error interno al buscar token" },
      { status: 500 }
    );
  }
}
