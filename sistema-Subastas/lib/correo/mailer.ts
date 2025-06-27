"use server"

import { writeFile } from "fs/promises"
import path from "path"
import nodemailer from "nodemailer"
import type { Buffer } from "buffer"

export interface OpcionesCorreoAdjudicacion {
  para: string
  nombrePostor: string
  nombreVehiculo: string
  pdfBuffer: Buffer
}

export async function enviarCorreoAdjudicacion({
  para,
  nombrePostor,
  nombreVehiculo,
  pdfBuffer,
}: OpcionesCorreoAdjudicacion): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_REMITENTE,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  })

  const fileName = `Adjudicacion_${nombreVehiculo.replace(/\s+/g, "_")}.pdf`
  const filePath = path.join("/tmp", fileName)
  await writeFile(filePath, pdfBuffer)

  await transporter.sendMail({
    from: `"ZAGOOM" <${process.env.EMAIL_REMITENTE}>`,
    to: para,
    subject: `Constancia de adjudicación de ${nombreVehiculo}`,
    text: `Hola ${nombrePostor},\n\nAdjunto encontrarás la constancia de adjudicación del vehículo ${nombreVehiculo}.\n\nGracias por participar.\n\nZAGOOM`,
    attachments: [
      {
        filename: fileName,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  })
}
