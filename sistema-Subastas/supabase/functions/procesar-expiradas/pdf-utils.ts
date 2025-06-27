import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface DatosAdjudicacion {
  nombrePostor: string
  correoPostor: string
  nombreSubastador: string
  nombreVehiculo: string
  precioFinal: number
  fechaAdjudicacion: string // formato YYYY-MM-DD
}

export async function generarPDFAdjudicacion(datos: DatosAdjudicacion): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage()
  const { width, height } = page.getSize()

  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontSize = 12
  const lineHeight = 20
  let y = height - 50

  const drawText = (text: string) => {
    page.drawText(text, {
      x: 50,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    })
    y -= lineHeight
  }

  drawText('CONSTANCIA DE ADJUDICACIÓN')
  y -= 10
  drawText(`Fecha de adjudicación: ${datos.fechaAdjudicacion}`)
  drawText(`Se certifica que el vehículo "${datos.nombreVehiculo}" fue adjudicado al postor:`)
  drawText(`Nombre del postor: ${datos.nombrePostor}`)
  drawText(`Correo del postor: ${datos.correoPostor}`)
  drawText(`Precio final de adjudicación: $${datos.precioFinal.toFixed(2)} MXN`)
  drawText(`Subastador responsable: ${datos.nombreSubastador}`)
  drawText(``)
  drawText(`Esta constancia fue generada automáticamente por el sistema ZAGOOM.`)

  const pdfBytes = await doc.save()
  return new Uint8Array(pdfBytes)
}