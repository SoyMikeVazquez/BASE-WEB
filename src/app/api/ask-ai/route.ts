import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Disabled for static export - API routes are skipped during build
// export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para realizar consultas." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { question } = body;

    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: "La pregunta no puede estar vacía." },
        { status: 400 }
      );
    }

    // Initialize Supabase on behalf of the user using their Authorization token
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // 1. Verify user role is admin
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json(
        { error: "Error de autenticación. Inicie sesión nuevamente." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("isAdmin")
      .eq("IDUser", user.id)
      .maybeSingle();

    if (profileErr || !profile || !profile.isAdmin) {
      return NextResponse.json(
        { error: "Acceso denegado. Solo administradores pueden consultar a la IA." },
        { status: 403 }
      );
    }

    // 2. Fetch Secrets
    const { data: secretsData, error: secretsErr } = await supabase
      .from("Secrets")
      .select("*");

    if (secretsErr) {
      return NextResponse.json(
        { error: "Error al leer la configuración de claves API." },
        { status: 500 }
      );
    }

    const secrets: Record<string, string> = {};
    if (secretsData) {
      secretsData.forEach((item: { key: string; value: string }) => {
        secrets[item.key] = item.value || "";
      });
    }

    const geminiKey = secrets["gemini_api_key"]?.trim();
    const chatgptKey = secrets["chatgpt_api_key"]?.trim();

    if (!geminiKey && !chatgptKey) {
      return NextResponse.json(
        {
          error: "API Keys faltantes. Por favor, configure su clave de Gemini o ChatGPT en la sección de Configuración.",
          missingKeys: true
        },
        { status: 400 }
      );
    }

    // 3. Fetch consolidated metrics from Supabase
    // Get current month Swedish locale format YYYY-MM
    const todayDate = new Date();
    const currentMonthStr = todayDate.toLocaleDateString("sv-SE").substring(0, 7);
    const todayStr = todayDate.toLocaleDateString("sv-SE");

    const [
      { data: staff },
      { data: branches },
      { data: products },
      { data: appUsers },
      { data: monthlyCitas }
    ] = await Promise.all([
      supabase.from("Personal").select("userID, nombre, TipoPersonal, sucursal"),
      supabase.from("Sucursales").select("NombreSucursal"),
      supabase.from("Productos").select("nombre, stock"),
      supabase.from("users").select("isPersonal, isAdmin, isRecepcion, isGestor"),
      supabase
        .from("Citas")
        .select("fecha, precioFinal, barberoID, estatus, sucursal")
        .like("fecha", `${currentMonthStr}%`)
    ]);

    // Compute consolidated statistics to minimize prompt tokens
    const staffSummary = staff
      ? staff.map(p => `${p.nombre} (${p.TipoPersonal || 'Personal'}${p.sucursal ? ` - ${p.sucursal}` : ''})`).join(", ")
      : "";

    const branchesList = branches ? branches.map(b => b.NombreSucursal).join(", ") : "";

    const totalProducts = products ? products.length : 0;
    const criticalProducts = products ? products.filter(p => (p.stock || 0) <= 5) : [];
    const criticalSummary = criticalProducts
      ? criticalProducts.map(p => `${p.nombre} (stock: ${p.stock})`).join(", ")
      : "";

    const registeredClientsCount = appUsers
      ? appUsers.filter(u => !u.isPersonal && !u.isAdmin && !u.isRecepcion && !u.isGestor).length
      : 0;

    const activeMonthlyCitas = monthlyCitas
      ? monthlyCitas.filter(c => c.estatus !== "Cancelada")
      : [];

    let totalMonthIncome = 0;
    let cajaRecepcion = 0;
    let cajaPersonal = 0;
    let todayCitasCount = 0;
    let todayIncome = 0;

    activeMonthlyCitas.forEach(c => {
      const amt = Number(c.precioFinal) || 0;
      totalMonthIncome += amt;

      const staffMember = staff?.find(p => p.userID === c.barberoID);
      if (staffMember && staffMember.TipoPersonal === "Recepcionista") {
        cajaRecepcion += amt;
      } else {
        cajaPersonal += amt;
      }

      if (c.fecha === todayStr) {
        todayCitasCount++;
        todayIncome += amt;
      }
    });

    // 4. Construct compact system prompt context
    const systemPrompt = `Eres un asistente de inteligencia artificial exclusivo para el administrador de la plataforma "BASE 2.0" (Barbería y Estética).
Tu tarea es responder preguntas de manera sumamente directa, concisa y profesional en español.
NO utilices introducciones largas, saludos formales redundantes ni conclusiones explicativas. Sé directo y al grano.
Tus respuestas deben limitarse estrictamente a una longitud adecuada, ni muy extensas ni demasiado cortas (máximo de 1 a 4 oraciones).

Aquí tienes los datos consolidados y reales del negocio hoy (${todayStr}):

- Sucursales activas: ${branchesList || "Ninguna registrada"}
- Personal del negocio: ${staffSummary || "Ninguno registrado"}
- Clientes registrados en la app: ${registeredClientsCount}

Métricas del Mes actual (${currentMonthStr}):
- Citas activas: ${activeMonthlyCitas.length} citas
- Ingresos facturados en el mes: $${totalMonthIncome.toFixed(2)}
  * Caja Recepción: $${cajaRecepcion.toFixed(2)}
  * Caja Personal: $${cajaPersonal.toFixed(2)}

Métricas de Hoy:
- Citas programadas para hoy: ${todayCitasCount}
- Ingresos estimados de hoy: $${todayIncome.toFixed(2)}

Inventario:
- Total productos en catálogo: ${totalProducts}
- Productos con bajo stock (5 o menos unidades): ${criticalProducts.length} ${criticalSummary ? `(${criticalSummary})` : ""}

Responde la pregunta del usuario utilizando únicamente la información proporcionada. Si la pregunta no tiene relación con estos datos del negocio o no se puede responder con esta información, indícalo de forma amable pero directa.`;

    let replyText = "";

    // 5. Call API (Gemini preferred, then ChatGPT)
    if (geminiKey) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\nPregunta del usuario: ${question}`
                }
              ]
            }
          ]
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error?.message || "Error al consultar a la API de Gemini.");
      }

      replyText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else if (chatgptKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${chatgptKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question }
          ]
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error?.message || "Error al consultar a la API de ChatGPT.");
      }

      replyText = resData.choices?.[0]?.message?.content || "";
    }

    return NextResponse.json({
      success: true,
      answer: replyText.trim()
    });

  } catch (err: any) {
    console.error("Error ask-ai API route:", err);
    return NextResponse.json(
      { error: err.message || "Error interno del servidor al procesar la pregunta" },
      { status: 500 }
    );
  }
}
