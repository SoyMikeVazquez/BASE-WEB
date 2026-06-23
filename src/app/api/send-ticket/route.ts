import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin or service role client if possible, or use standard environment variables.
// Using standard variables is safe since this route runs on the server.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appointmentId } = body;

    if (!appointmentId) {
      return NextResponse.json(
        { error: "appointmentId es requerido" },
        { status: 400 }
      );
    }

    // 1. Fetch appointment details
    const { data: appointment, error: apptErr } = await supabase
      .from("Citas")
      .select("*")
      .eq("created_at", appointmentId) // Wait, is the PK created_at or is there an id? Let's check what the PK is!
      // In Citas schema, we saw: clienteID, barberoID, servicioID, fecha, horaInicio, horaFin, sucursal, estatus, precioFinal, Servicios, created_at, updated_at
      // Let's filter by created_at since it acts as a unique ID, or we can filter by matching fecha, horaInicio, and clienteID
      // Let's search by matching clientID, fecha, and horaInicio to be completely sure.
      .maybeSingle();

    // Wait! Let's check the request body. We can pass all necessary details directly from the frontend to avoid PK lookup mismatch!
    // Yes! The frontend already has the appointment object. We can pass:
    // { appointmentId, clientName, clientEmail, clientPhone, serviceName, date, time, price, branch }
    // This is 100% robust and doesn't depend on database primary keys which might be composite or custom!
    const {
      clientName,
      clientEmail,
      clientPhone,
      serviceName,
      date,
      time,
      price,
      branch
    } = body;

    if (!clientName) {
      return NextResponse.json(
        { error: "clientName es requerido" },
        { status: 400 }
      );
    }

    // 2. Fetch Secrets from database
    const { data: secretsData, error: secretsErr } = await supabase
      .from("Secrets")
      .select("*");

    if (secretsErr) {
      return NextResponse.json(
        { error: "Error al leer la tabla de Secretos de la base de datos." },
        { status: 500 }
      );
    }

    const secrets: Record<string, string> = {};
    if (secretsData) {
      secretsData.forEach((item: { key: string; value: string }) => {
        secrets[item.key] = item.value || "";
      });
    }

    // 3. Fetch General Business Info (for branding)
    const { data: generalData } = await supabase
      .from("General")
      .select("NombreDeLaEmpresa, LogoDeLaEmpresa")
      .limit(1)
      .maybeSingle();

    const businessName = generalData?.NombreDeLaEmpresa || "TOTAL PRO";
    const businessLogo = generalData?.LogoDeLaEmpresa || "";

    // 4. Send via Email (Resend) if email is present
    if (clientEmail && clientEmail.trim()) {
      const customResendKey = secrets["resend_api_key"];
      const resendKey = (customResendKey && customResendKey.trim())
        ? customResendKey.trim()
        : (process.env.RESEND_API_KEY || "").trim();

      if (!resendKey) {
        return NextResponse.json(
          { error: "API Key de Resend no configurada. Ingrese su clave en Configuración o en variables de entorno." },
          { status: 400 }
        );
      }

      const emailHtml = `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 460px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; color: #1e293b; background-color: #ffffff;">
          ${businessLogo ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${businessLogo}" alt="${businessName}" style="max-height: 60px; border-radius: 8px;" /></div>` : ""}
          <h2 style="text-align: center; margin-bottom: 8px; color: #0f172a; font-weight: 800;">Ticket de Servicio</h2>
          <p style="text-align: center; font-size: 13px; color: #64748b; margin-top: 0; margin-bottom: 24px;">¡Gracias por tu preferencia en ${businessName}!</p>
          
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
              <span style="color: #64748b;">Cliente:</span>
              <strong style="color: #0f172a;">${clientName}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
              <span style="color: #64748b;">Servicio:</span>
              <strong style="color: #0f172a;">${serviceName || "Servicio General"}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
              <span style="color: #64748b;">Fecha:</span>
              <strong style="color: #0f172a;">${date} ${time || ""}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
              <span style="color: #64748b;">Sucursal:</span>
              <strong style="color: #0f172a;">${branch || "Sucursal Principal"}</strong>
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 12px 0;" />
            <div style="display: flex; justify-content: space-between; font-size: 16px;">
              <span style="color: #0f172a; font-weight: 700;">Total Cobrado:</span>
              <strong style="color: #000000; font-weight: 800;">$${price || "0.00"}</strong>
            </div>
          </div>
          
          <div style="text-align: center; font-size: 11px; color: #94a3b8;">
            Este es un comprobante de pago digital emitido por ${businessName}.
          </div>
        </div>
      `;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: `${businessName} <onboarding@resend.dev>`, // Resend testing default sender
          to: clientEmail.trim(),
          subject: `Ticket de Compra - ${businessName}`,
          html: emailHtml
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Error al enviar correo vía Resend");
      }

      return NextResponse.json({
        success: true,
        method: "email",
        details: "Ticket enviado con éxito al correo del cliente."
      });
    }

    // 5. Send via WhatsApp if phone is present and email is not
    if (clientPhone && clientPhone.trim()) {
      const customWaToken = secrets["whatsapp_token"] || secrets["whatsapp_api_token"];
      const customWaPhoneId = secrets["whatsapp_phone_number_id"];

      const waToken = (customWaToken && customWaToken.trim())
        ? customWaToken.trim()
        : (process.env.WHATSAPP_API_TOKEN || "").trim();

      const waPhoneId = (customWaPhoneId && customWaPhoneId.trim())
        ? customWaPhoneId.trim()
        : (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();

      if (!waToken || !waPhoneId) {
        return NextResponse.json(
          { error: "Token o Phone ID de WhatsApp Cloud API no configurados. Configure sus claves en Configuración o en variables de entorno." },
          { status: 400 }
        );
      }

      // Format phone to WhatsApp international format (e.g. prefix 52 for Mexico if length is 10)
      let formattedPhone = clientPhone.trim().replace(/\D/g, "");
      if (formattedPhone.length === 10) {
        formattedPhone = `52${formattedPhone}`;
      }

      const textBody = `*Ticket de Servicio - ${businessName}* 🏆\n\n¡Gracias por tu preferencia!\n\n• *Cliente:* ${clientName}\n• *Servicio:* ${serviceName || "Servicio General"}\n• *Fecha/Hora:* ${date} ${time || ""}\n• *Sucursal:* ${branch || "Sucursal Principal"}\n• *Total Cobrado:* $${price || "0.00"}\n\n_Comprobante de pago digital emitido por ${businessName}_`;

      const response = await fetch(`https://graph.facebook.com/v18.0/${waPhoneId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${waToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: {
            body: textBody
          }
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(
          resData.error?.message || "Error al enviar mensaje vía WhatsApp Cloud API"
        );
      }

      return NextResponse.json({
        success: true,
        method: "whatsapp",
        details: "Ticket enviado con éxito vía WhatsApp al número del cliente."
      });
    }

    return NextResponse.json(
      { error: "El cliente no tiene correo electrónico ni número de teléfono registrado." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Error sending ticket API:", err);
    return NextResponse.json(
      { error: err.message || "Error interno del servidor al procesar el ticket" },
      { status: 500 }
    );
  }
}
