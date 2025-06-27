import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

const supabase = createClient(supabaseUrl, supabaseKey)

export async function obtenerNotificaciones(id_postor: string) {
  const { data, error } = await supabase
    .from("notificacion")
    .select("*")
    .eq("id_postor", id_postor)
    .order("fecha_envio", { ascending: false })

  if (error) {
    console.error("Error al obtener notificaciones:", error.message)
    return []
  }

  return data || []
}

export async function marcarComoLeida(id_notificacion: string) {
  const { error } = await supabase.from("notificacion").update({ leida: true }).eq("id_notificacion", id_notificacion)

  if (error) {
    console.error("Error al marcar como leída:", error.message)
    return false
  }

  return true
}
