import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@3.2.0";

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULT_PASSWORD = "agia123456";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

Deno.serve(async (req: Request) => {
    // Mercado Pago envia notificações via POST
    if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    try {
        const body = await req.json();
        console.log("Webhook received:", JSON.stringify(body));

        // Mercado Pago envia diferentes tipos de notificação
        // Queremos apenas notificações de pagamento
        if (body.type !== "payment" && body.action !== "payment.created" && body.action !== "payment.updated") {
            console.log("Ignoring non-payment notification:", body.type || body.action);
            return new Response("OK", { status: 200 });
        }

        // Obter ID do pagamento
        const paymentId = body.data?.id || body.id;

        if (!paymentId) {
            console.error("No payment ID found in webhook");
            return new Response("OK", { status: 200 });
        }

        // Buscar detalhes do pagamento no Mercado Pago
        const paymentResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            {
                headers: {
                    Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
                },
            }
        );

        if (!paymentResponse.ok) {
            console.error("Failed to fetch payment details:", await paymentResponse.text());
            return new Response("OK", { status: 200 });
        }

        const payment = await paymentResponse.json();
        console.log("Payment details:", JSON.stringify(payment));

        // Só processamos pagamentos aprovados
        if (payment.status !== "approved") {
            console.log("Payment not approved, status:", payment.status);

            // Salvar registro do pagamento mesmo se não aprovado
            await supabaseAdmin.from("payments").upsert({
                mercadopago_payment_id: paymentId.toString(),
                mercadopago_preference_id: payment.preference_id,
                payer_email: payment.payer?.email || "unknown",
                plan_type: getPlanFromReference(payment.external_reference),
                amount: payment.transaction_amount,
                status: payment.status,
                metadata: payment,
            }, { onConflict: "mercadopago_payment_id" });

            return new Response("OK", { status: 200 });
        }

        // Extrair informações do pagamento
        let payerEmail = payment.payer?.email;
        const externalRef = payment.external_reference;
        let planType = "semestral";
        let payerName = "";

        try {
            const refData = JSON.parse(externalRef);
            planType = refData.plan || "semestral";
            payerName = refData.name || "";
            // Se o email não vier no payer (ex: pagou deslogado), usamos o do checkout
            if (!payerEmail && refData.email) {
                payerEmail = refData.email;
                console.log("Using email from external_reference:", payerEmail);
            } else if (!payerEmail || payerEmail === "XXXXXXXXXXX") {
                // Mercado Pago às vezes mascara o email
                if (refData.email) {
                    payerEmail = refData.email;
                    console.log("Using email from external_reference (masked payer):", payerEmail);
                }
            }
        } catch {
            console.log("Could not parse external_reference, using default plan");
        }

        if (!payerEmail || payerEmail === "XXXXXXXXXXX") {
            console.error("No payer email found in payment or external_reference");
            return new Response("OK", { status: 200 });
        }

        // Verificar se já criamos usuário para este pagamento
        const { data: existingPayment } = await supabaseAdmin
            .from("payments")
            .select("user_created")
            .eq("mercadopago_payment_id", paymentId.toString())
            .single();

        if (existingPayment?.user_created) {
            console.log("User already created for this payment");
            return new Response("OK", { status: 200 });
        }

        // Criar usuário no Supabase Auth
        console.log("Creating user for:", payerEmail);

        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: payerEmail,
            password: DEFAULT_PASSWORD,
            email_confirm: true, // Auto-confirma o email
            user_metadata: {
                plan_type: planType,
                payment_id: paymentId,
                purchase_date: new Date().toISOString(),
            },
        });

        let userId = userData?.user?.id || null;

        if (userError) {
            // Se usuário já existe, apenas atualiza os metadados
            if (userError.message.includes("already been registered")) {
                console.log("User already exists, updating metadata");

                // Buscar usuário existente
                const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
                const existingUser = existingUsers?.users?.find(u => u.email === payerEmail);

                if (existingUser) {
                    userId = existingUser.id;
                    await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                        user_metadata: {
                            ...existingUser.user_metadata,
                            plan_type: planType,
                            payment_id: paymentId,
                            last_payment_date: new Date().toISOString(),
                        },
                    });
                }
            } else {
                console.error("Error creating user:", userError);
                return new Response("OK", { status: 200 });
            }
        }

        // Registrar pagamento no banco
        const { error: insertError } = await supabaseAdmin.from("payments").upsert({
            mercadopago_payment_id: paymentId.toString(),
            mercadopago_preference_id: payment.preference_id,
            payer_email: payerEmail,
            plan_type: planType,
            amount: payment.transaction_amount,
            status: "approved",
            user_id: userId,
            user_created: true,
            metadata: payment,
        }, { onConflict: "mercadopago_payment_id" });

        if (insertError) {
            console.error("Error inserting payment:", insertError);
        }

        // Enviar email de boas-vindas com instruções
        try {
            console.log("Sending welcome email via Resend...");
            const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

            const { data: emailData, error: emailError } = await resend.emails.send({
                from: "Agência IA Studio <noreply@agenciaiastudio.online>",
                to: [payerEmail],
                subject: "Bem-vindo à Agência IA Studio! 🚀",
                html: `
                    <h1>Parabéns pela sua compra, ${payerName || payment.payer?.first_name || "Criador"}!</h1>
                    <p>Seu acesso à <strong>Agência IA Studio</strong> foi liberado com sucesso.</p>
                    <p>Aqui estão seus dados de acesso:</p>
                    <ul>
                        <li><strong>Email:</strong> ${payerEmail}</li>
                        <li><strong>Senha Temporária:</strong> ${DEFAULT_PASSWORD}</li>
                        <li><strong>Plano:</strong> ${planType}</li>
                    </ul>
                    <p>Acesse agora: <a href="https://www.agenciaiastudio.online">https://www.agenciaiastudio.online</a></p>
                    <p>Recomendamos que você altere sua senha após o primeiro login.</p>
                    <br>
                    <p>Atenciosamente,<br>Equipe Agência IA Studio</p>
                `,
            });

            if (emailError) {
                console.error("Error sending email:", emailError);
            } else {
                console.log("Welcome email sent:", emailData);
            }
        } catch (err) {
            console.error("Unexpected error sending email:", err);
        }

        console.log(`✅ User created successfully: ${payerEmail}`);
        console.log(`📧 Default password: ${DEFAULT_PASSWORD}`);
        console.log(`📋 Plan: ${planType}`);

        return new Response("OK", { status: 200 });
    } catch (error) {
        console.error("Webhook error:", error);
        // Sempre retorna 200 para o Mercado Pago não reenviar
        return new Response("OK", { status: 200 });
    }
});

function getPlanFromReference(ref: string): string {
    try {
        const data = JSON.parse(ref);
        return data.plan || "semestral";
    } catch {
        return "semestral";
    }
}
