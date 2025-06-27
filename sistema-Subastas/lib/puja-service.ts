// services/pujaService.ts
import { createClient } from "@supabase/supabase-js"
import redis from "@/lib/redis";

// Función helper para crear el cliente de Supabase
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Variables de entorno de Supabase no definidas")
  }

  return createClient(supabaseUrl, supabaseKey)
}


export interface PujaData {
  token: string;
  monto: number;
}
export interface PujaResponse {
  success: boolean;
  message?: string;
  data?: {
    id_puja: number;
    id_subasta: number;
    monto: number;
    id_postor: string;
    fecha: string;
  };
}

export const pujaService = {
  async registrarPuja(
    idPostor: string,
    data: PujaData,
    fechaHoraPeticion?: string
  ): Promise<PujaResponse> {
    try {
      const { token, monto } = data;

      // 1) Obtener el payload completo desde "subasta_token_activo:<token>"
      const redisKey = `subasta_token_activo:${token}`;
      const subastaJson = await redis.get(redisKey);
      if (!subastaJson) {
        return { success: false, message: "Token inválido o expirado" };
      }

      // 2) Parseamos el JSON para sacar id_subasta y los campos
      const {
        id_subasta,
        monto_minimo_puja,
        precio_base,
        // inicio, fin, estado  // ya no los necesitamos para validar
      } = JSON.parse(subastaJson) as {
        id_subasta: number;
        monto_minimo_puja: number;
        precio_base: number;
        inicio: string;
        fin: string;
        estado: string;
      };

      // 3) Revisar última puja: buscamos "subasta_ultima_puja:<id_subasta>"
      const ultimaPujaKey = `subasta_ultima_puja:${id_subasta}`;
      const ultimaPujaStr = await redis.get(ultimaPujaKey);
      let montoReferencia: number;

      if (ultimaPujaStr) {
        montoReferencia = Number(ultimaPujaStr) + Number(monto_minimo_puja);
      } else {
        montoReferencia = Number(precio_base);
      }

      // 4) Validar que el monto >= montoReferencia
      if (monto < montoReferencia) {
        return {
          success: false,
          message: ultimaPujaStr
            ? `La puja debe ser al menos ${
                Number(ultimaPujaStr) + Number(monto_minimo_puja)
              }.`
            : `La puja debe ser al menos ${precio_base}.`,
        };
      }

      // 5) Insertar la nueva puja en Supabase
      const supabase = createSupabaseClient();

      const { data: insertData, error: insertError } = await supabase
        .from("puja")
        .insert({
          id_subasta,
          id_postor: idPostor,
          monto,
          fecha: fechaHoraPeticion || new Date().toISOString(),
        })
        .select("id_puja")
        .single();

      if (insertError || !insertData) {
        console.error("Error al insertar puja en Supabase:", insertError);
        return {
          success: false,
          message: "Error interno al procesar la puja",
        };
      }

      const id_puja = insertData.id_puja;

      // 6) Actualizar "subasta_ultima_puja:<id_subasta>" en Redis
      await redis.set(ultimaPujaKey, String(monto));

      return {
        success: true,
        data: {
          id_puja,
          id_subasta,
          id_postor: idPostor,
          monto,
          fecha: fechaHoraPeticion || new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("Error en pujaService.registrarPuja:", error);
      return {
        success: false,
        message: "Error interno al procesar la puja",
      };
    }
  },
};
