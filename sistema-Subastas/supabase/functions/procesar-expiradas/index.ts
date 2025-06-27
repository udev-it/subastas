// @deno-types="deno"
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generarPDFAdjudicacion } from "./pdf-utils.ts";

const enviarCorreo = async (
  destinatario: string,
  archivoPDF: Buffer,
  asunto: string,
  texto: string
) => {
  const usuario = Deno.env.get("CORREO_EMISOR")!;
  const contrasena = Deno.env.get("CONTRASENA_CORREO")!;

  const smtp = await import("npm:nodemailer");
  const transporter = smtp.createTransport({
    service: "gmail",
    auth: {
      user: usuario,
      pass: contrasena,
    },
  });

  await transporter.sendMail({
    from: usuario,
    to: destinatario,
    subject: asunto,
    text: texto,
    attachments: [
      {
        filename: "constancia_adjudicacion.pdf",
        content: archivoPDF,
      },
    ],
  });
};

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    Deno.env.get("CORREO_EMISOR")!
    Deno.env.get("CONTRASENA_CORREO")!
  );

  const ahora = new Date().toISOString();
  const { data: subastas, error } = await supabase
    .from("subasta")
    .select("id_subasta")
    .eq("estado", "Expirada")
    .lte("fin", ahora);

  if (error) {
    console.error("Error al obtener subastas expiradas:", error);
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  for (const subasta of subastas) {
    const { id_subasta } = subasta;

    const { data: pujas, error: errorPujas } = await supabase
      .from("puja")
      .select("id_postor, monto")
      .eq("id_subasta", id_subasta)
      .order("monto", { ascending: false })
      .limit(1);

    if (errorPujas || !pujas?.length) continue;

    const ganador = pujas[0];
    const { error: errorAdj } = await supabase.from("adjudicacion").insert({
      id_subasta: id_subasta,
      id_postor: ganador.id_postor,
      monto_ganador: ganador.monto,
      fecha: ahora,
    });

    if (errorAdj) continue;

    const { data: participantes } = await supabase
      .from("puja")
      .select("id_postor")
      .eq("id_subasta", id_subasta);

    for (const p of participantes || []) {
      const tipo = p.id_postor === ganador.id_postor ? "ganador" : "perdedor";
      await supabase.from("notificacion").insert({
        id_postor: p.id_postor,
        id_subasta: id_subasta,
        mensaje:
          tipo === "ganador"
            ? "¡Felicidades! Ganaste la subasta."
            : "La subasta terminó. No resultaste ganador.",
        tipo: tipo,
        leida: false,
      });
    }

    // PDF y envío por correo al ganador
    const { data: usuarioGanador } = await supabase
      .from("usuario")
      .select("nombre, primer_apellido, segundo_apellido")
      .eq("id_usuario", ganador.id_postor)
      .single();

    const { data: correoAuth } = await supabase.auth.admin.getUserById(
      ganador.id_postor
    );

    const { data: datosVehiculo } = await supabase
      .from("vehiculo")
      .select("nombre")
      .eq("ficha", id_subasta)
      .single();

    const { data: subastaData } = await supabase
      .from("subasta")
      .select("id_subastador")
      .eq("id_subasta", id_subasta)
      .single();

    const { data: usuarioSubastador } = await supabase
      .from("usuario")
      .select("nombre, primer_apellido, segundo_apellido")
      .eq("id_usuario", subastaData.id_subastador)
      .single();

    const pdf = await generarPDFAdjudicacion({
      nombrePostor: `${usuarioGanador.nombre} ${usuarioGanador.primer_apellido} ${usuarioGanador.segundo_apellido}`,
      correoPostor: correoAuth.user.email,
      nombreSubastador: `${usuarioSubastador.nombre} ${usuarioSubastador.primer_apellido} ${usuarioSubastador.segundo_apellido}`,
      nombreVehiculo: datosVehiculo.nombre,
      precioFinal: ganador.monto,
      fechaAdjudicacion: ahora.split("T")[0],
    });

    await enviarCorreo(
      correoAuth.user.email,
      pdf,
      "Constancia de adjudicación",
      "Adjuntamos la constancia de adjudicación del vehículo."
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});