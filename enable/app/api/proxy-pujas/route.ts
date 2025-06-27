import { type NextRequest, NextResponse } from "next/server"

// Configuración CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Proxy: Recibiendo petición POST")

    // Obtener el cuerpo de la petición
    const body = await request.json()
    console.log("📦 Proxy: Body recibido:", body)

    // Obtener el token de autorización
    const authorization = request.headers.get("authorization")
    console.log("🔑 Proxy: Authorization header:", authorization ? "Presente" : "Ausente")

    if (!authorization) {
      return NextResponse.json(
        { error: "Token de autorización requerido" },
        {
          status: 401,
          headers: corsHeaders,
        },
      )
    }

    // URL de la API externa - IMPORTANTE: Asegurar que termine sin slash
    let externalApiUrl = process.env.NEXT_PUBLIC_API_URL || "https://pruebasubastas.vercel.app/api/pujas"

    // Remover slash final si existe para evitar redirects
    if (externalApiUrl.endsWith("/")) {
      externalApiUrl = externalApiUrl.slice(0, -1)
    }

    console.log("🌐 Proxy: Llamando a API externa:", externalApiUrl)

    // Hacer la petición a la API externa con seguimiento de redirects
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      const externalResponse = await fetch(externalApiUrl, {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "NextJS-Proxy/1.0",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        redirect: "follow", // Seguir redirects automáticamente
        follow: 10, // Máximo 10 redirects
      })

      clearTimeout(timeoutId)

      console.log("📥 Proxy: Respuesta de API externa:", {
        status: externalResponse.status,
        statusText: externalResponse.statusText,
        url: externalResponse.url, // URL final después de redirects
        redirected: externalResponse.redirected,
        headers: Object.fromEntries(externalResponse.headers.entries()),
      })

      // Si es un redirect que no se siguió automáticamente, manejarlo manualmente
      if (externalResponse.status >= 300 && externalResponse.status < 400) {
        const location = externalResponse.headers.get("location")
        console.log("🔄 Proxy: Redirect detectado a:", location)

        if (location) {
          // Construir URL completa si es relativa
          const redirectUrl = location.startsWith("http") ? location : new URL(location, externalApiUrl).toString()

          console.log("🔄 Proxy: Siguiendo redirect a:", redirectUrl)

          // Hacer nueva petición a la URL de redirect
          const redirectResponse = await fetch(redirectUrl, {
            method: "POST",
            headers: {
              Authorization: authorization,
              "Content-Type": "application/json",
              Accept: "application/json",
              "User-Agent": "NextJS-Proxy/1.0",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          })

          const redirectResponseText = await redirectResponse.text()
          console.log("📄 Proxy: Respuesta después de redirect:", redirectResponseText)

          let redirectResponseData
          try {
            redirectResponseData = redirectResponseText ? JSON.parse(redirectResponseText) : null
          } catch (jsonError) {
            redirectResponseData = {
              error: "Respuesta no es JSON válido después de redirect",
              rawResponse: redirectResponseText,
              parseError: jsonError.message,
            }
          }

          return NextResponse.json(redirectResponseData, {
            status: redirectResponse.status,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          })
        }
      }

      // Obtener el contenido de la respuesta
      const responseText = await externalResponse.text()
      console.log("📄 Proxy: Respuesta cruda:", responseText)

      // Intentar parsear como JSON
      let responseData
      try {
        responseData = responseText ? JSON.parse(responseText) : null
      } catch (jsonError) {
        console.error("❌ Proxy: Error al parsear JSON:", jsonError)
        responseData = {
          error: "Respuesta no es JSON válido",
          rawResponse: responseText,
          parseError: jsonError.message,
        }
      }

      // Retornar la respuesta con CORS headers
      return NextResponse.json(responseData, {
        status: externalResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)

      console.error("💥 Proxy: Error en fetch:", fetchError)

      let errorMessage = "Error de conectividad"
      let errorType = "fetch_error"

      if (fetchError.name === "AbortError") {
        errorMessage = "Timeout - La petición tardó más de 30 segundos"
        errorType = "timeout_error"
      } else if (fetchError.message.includes("ENOTFOUND")) {
        errorMessage = "No se pudo resolver el dominio de la API"
        errorType = "dns_error"
      } else if (fetchError.message.includes("ECONNREFUSED")) {
        errorMessage = "Conexión rechazada por la API"
        errorType = "connection_refused"
      }

      return NextResponse.json(
        {
          error: errorMessage,
          type: errorType,
          details: fetchError.message,
          apiUrl: externalApiUrl,
        },
        {
          status: 500,
          headers: corsHeaders,
        },
      )
    }
  } catch (error) {
    console.error("💥 Proxy: Error general:", error)
    return NextResponse.json(
      {
        error: "Error interno del proxy",
        details: error.message,
        type: "proxy_error",
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    )
  }
}

// Manejar otros métodos HTTP
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: "Proxy API para pujas",
      status: "active",
      methods: ["POST"],
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: corsHeaders,
    },
  )
}
