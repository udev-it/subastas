"use client"

import { useEffect, useState, useRef } from "react"
import { obtenerNotificaciones, marcarComoLeida } from "@/lib/notifications"
import { X } from "lucide-react"

interface Notification {
  id_notificacion: string
  mensaje: string
  fecha_envio: string
  leida: boolean
  tipo: string
}

export default function NotificationDropdown({ id_postor }: { id_postor: string }) {
  const [notificaciones, setNotificaciones] = useState<Notification[]>([])
  const [popup, setPopup] = useState<Notification | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const cargarNotificaciones = async () => {
    const data = await obtenerNotificaciones(id_postor)
    setNotificaciones(data)
  }

  const marcarLeida = async (id: string) => {
    await marcarComoLeida(id)
    setNotificaciones((prev) => prev.map((n) => (n.id_notificacion === id ? { ...n, leida: true } : n)))
  }

  const marcarTodasComoLeidas = async () => {
    for (const n of notificaciones.filter((n) => !n.leida)) {
      await marcarComoLeida(n.id_notificacion)
    }
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
  }

  useEffect(() => {
    cargarNotificaciones()
  }, [])

  return (
    <>
      <div
        ref={dropdownRef}
        className="absolute right-0 top-full mt-2 w-96 max-h-[26rem] overflow-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md z-50 p-2"
      >
        <div className="flex justify-between items-center px-2 pb-1">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notificaciones</h4>
          <button className="text-xs text-blue-500 hover:underline" onClick={marcarTodasComoLeidas}>
            Marcar todas como leídas
          </button>
        </div>

        {notificaciones.length === 0 && <p className="text-sm text-gray-500 px-2">No tienes notificaciones</p>}

        {notificaciones.map((n) => (
          <div
            key={n.id_notificacion}
            onClick={() => {
              setPopup(n)
              if (!n.leida) marcarLeida(n.id_notificacion)
            }}
            className={`px-3 py-2 rounded-md mb-1 cursor-pointer transition text-sm ${
              n.leida ? "bg-gray-100 dark:bg-gray-800" : "bg-green-50 dark:bg-green-900"
            }`}
          >
            <p className="text-gray-800 dark:text-gray-100 truncate">{n.mensaje}</p>
            <p className="text-xs text-gray-500">{new Date(n.fecha_envio).toLocaleDateString()}</p>
          </div>
        ))}
      </div>

      {popup && (
        <>
          {/* Capa oscura detrás del popup */}
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998]" onClick={() => setPopup(null)} />

          {/* Popup modal encima de todo */}
          <div className="fixed z-[9999] top-[20vh] left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl w-[90%] max-w-md">
            <div className="flex justify-end">
              <button className="text-gray-400 hover:text-red-600" onClick={() => setPopup(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white text-center">Notificación</h3>
            <p className="text-gray-700 dark:text-gray-300 text-center">{popup.mensaje}</p>
            <p className="text-sm text-gray-500 mt-4 text-center">{new Date(popup.fecha_envio).toLocaleString()}</p>
          </div>
        </>
      )}
    </>
  )
}
