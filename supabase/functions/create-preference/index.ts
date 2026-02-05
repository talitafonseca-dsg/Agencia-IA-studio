import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PlanInfo {
    id: string;
    title: string;
    price: number;
    duration: string;
}

const PLANS: Record<string, PlanInfo> = {
    semestral: {
        id: "semestral",
        title: "Agência IA Studio - Plano Semestral",
        price: 157,
        duration: "6 meses",
    },
    anual: {
        id: "anual",
        title: "Agência IA Studio - Plano Anual",
        price: 197,
        duration: "12 meses",
    },
    teste: {
        id: "teste",
        title: "Plano de Teste - Agência IA Studio",
        price: 1,
        duration: "1 dia",
    },
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    try {
        const { plan, payer_email } = await req.json();

        if (!plan || !PLANS[plan]) {
            return new Response(
                JSON.stringify({ error: "Plano inválido. Use 'semestral', 'anual' ou 'teste'" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!payer_email) {
            return new Response(
                JSON.stringify({ error: "Email do comprador é obrigatório" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const selectedPlan = PLANS[plan];

        // Criar preferência no Mercado Pago
        const preferenceData = {
            items: [
                {
                    id: selectedPlan.id,
                    title: selectedPlan.title,
                    description: `Acesso completo à plataforma por ${selectedPlan.duration}`,
                    quantity: 1,
                    currency_id: "BRL",
                    unit_price: selectedPlan.price,
                },
            ],
            payer: {
                email: payer_email,
            },
            back_urls: {
                success: `${req.headers.get("origin") || "https://agencia-ia-studio.vercel.app"}/checkout/success`,
                failure: `${req.headers.get("origin") || "https://agencia-ia-studio.vercel.app"}/checkout/failure`,
                pending: `${req.headers.get("origin") || "https://agencia-ia-studio.vercel.app"}/checkout/pending`,
            },
            auto_return: "approved",
            notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
            external_reference: JSON.stringify({ plan: plan, email: payer_email }),
            statement_descriptor: "AGENCIA IA STUDIO",
        };

        const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(preferenceData),
        });

        if (!mpResponse.ok) {
            const errorData = await mpResponse.text();
            console.error("Mercado Pago error:", errorData);
            return new Response(
                JSON.stringify({ error: "Erro ao criar preferência de pagamento" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const preference = await mpResponse.json();

        return new Response(
            JSON.stringify({
                preference_id: preference.id,
                init_point: preference.init_point,
                sandbox_init_point: preference.sandbox_init_point,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: "Erro interno do servidor" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
