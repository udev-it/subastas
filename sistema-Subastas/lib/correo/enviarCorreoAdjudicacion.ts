"use server"

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
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_REMITENTE,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  })

  const fileName = `Adjudicacion_${nombreVehiculo.replace(/\s+/g, "_")}.pdf`

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

  console.log(`✅ Correo enviado a ${para} con PDF: ${fileName}`)
}
