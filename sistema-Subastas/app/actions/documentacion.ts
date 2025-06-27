"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan las variables de entorno de Supabase. Asegúrate de configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  )
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface UploadDocumentResult {
  success: boolean
  message?: string
  error?: string
  documentId?: number
}

export async function uploadDocument(postorId: number, file: File, tipo: string): Promise<UploadDocumentResult> {
  try {
    // 1. Subir el archivo a Supabase Storage
    const fileName = `${Date.now()}_${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documentos")
      .upload(`postores/${postorId}/${fileName}`, file)

    if (uploadError) {
      console.error("Error al subir documento:", uploadError)
      return {
        success: false,
        error: `Error al subir documento: ${uploadError.message}`,
      }
    }

    // 2. Obtener la URL pública del archivo
    const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(uploadData.path)

    if (!urlData || !urlData.publicUrl) {
      return {
        success: false,
        error: "No se pudo obtener la URL del documento",
      }
    }

    // 3. Registrar el documento en la tabla documentacion
    const { data: docData, error: docError } = await supabase
      .from("documentacion")
      .insert({
        id_postor: postorId,
        archivo_url: urlData.publicUrl,
        fecha_subida: new Date().toISOString(),
        estado: "pendiente", // Estado inicial: pendiente de revisión
        tipo: tipo, // Tipo de documento: INE, pasaporte, etc.
      })
      .select("id_documentacion")
      .single()

    if (docError) {
      console.error("Error al registrar documento:", docError)
      return {
        success: false,
        error: `Error al registrar documento: ${docError.message}`,
      }
    }

    return {
      success: true,
      message: "Documento subido exitosamente",
      documentId: docData.id_documentacion,
    }
  } catch (error) {
    console.error("Error en el proceso de subida de documento:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Ocurrió un error durante la subida del documento",
    }
  }
}
