// Supabase Edge Function: revenuecat-webhook
// 
// Cara deploy:
//   supabase functions deploy revenuecat-webhook
// 
// Atau via Supabase Dashboard:
//   Edge Functions → Deploy new function → paste kode ini
//
// Secrets yang diperlukan (set di Dashboard → Edge Functions → Secrets):
//   RC_WEBHOOK_SECRET  = dari RevenueCat Dashboard → Integrations → Webhooks → Secret
//   (SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY otomatis tersedia)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tipe event RevenueCat yang kita tangani
type RCEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'NON_RENEWING_PURCHASE'
  | 'CANCELLATION'
  | 'EXPIRATION'
  | 'PRODUCT_CHANGE'
  | 'BILLING_ISSUE'
  | 'SUBSCRIBER_ALIAS';

interface RCWebhookEvent {
  event: {
    type: RCEventType;
    app_user_id: string;
    original_app_user_id: string;
    product_id: string;
    purchased_at_ms?: number;
    expiration_at_ms?: number;
    period_type?: 'NORMAL' | 'TRIAL' | 'INTRO';
  };
  api_version: string;
}

// Mapping product_id ke jumlah token yang diberikan
// Sesuaikan dengan product_id yang dibuat di RevenueCat Dashboard
const TOKEN_MAP: Record<string, number> = {
  'skillo_tokens_100': 100,
  'skillo_tokens_500': 500,
  'skillo_tokens_1000': 1000,
  'skillo_premium_monthly': 200, // 200 token per bulan untuk subscriber
};

serve(async (req) => {
  // === HANYA TERIMA POST ===
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // === VALIDASI WEBHOOK SECRET ===
  const authHeader = req.headers.get('Authorization');
  const expectedSecret = Deno.env.get('RC_WEBHOOK_SECRET');

  if (!expectedSecret) {
    console.error('RC_WEBHOOK_SECRET tidak dikonfigurasi di secrets Edge Function!');
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
    console.error('Unauthorized webhook request — secret tidak cocok');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // === PARSE BODY ===
  let webhook: RCWebhookEvent;
  try {
    webhook = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { type: eventType, app_user_id, product_id } = webhook.event;
  const expiresAt = webhook.event.expiration_at_ms
    ? new Date(webhook.event.expiration_at_ms).toISOString()
    : null;

  console.log(`[RC Webhook] Event: ${eventType} | User: ${app_user_id} | Product: ${product_id}`);

  // === KONEKSI SUPABASE (gunakan service role untuk bypass RLS) ===
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // app_user_id dari RevenueCat = UUID user Supabase (set di PaymentService.ts saat logIn)
  const userId = app_user_id;

  try {
    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'NON_RENEWING_PURCHASE': {
        // Pembelian token one-time
        const tokensToAdd = TOKEN_MAP[product_id] ?? 100;

        // Gunakan RPC function yang aman (increment, bukan set langsung)
        const { error } = await supabase.rpc('increment_ai_tokens', {
          user_uuid: userId,
          amount: tokensToAdd,
        });

        if (error) {
          console.error('Gagal tambah token:', error);
          throw error;
        }

        console.log(`[RC Webhook] ✅ Tambah ${tokensToAdd} token untuk user ${userId}`);
        break;
      }

      case 'RENEWAL': {
        // Renewal subscription — reset token bulanan
        const tokensToAdd = TOKEN_MAP[product_id] ?? 200;

        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_expires_at: expiresAt,
          })
          .eq('id', userId);

        if (error) throw error;

        // Tambah token bulanan
        await supabase.rpc('increment_ai_tokens', {
          user_uuid: userId,
          amount: tokensToAdd,
        });

        console.log(`[RC Webhook] ✅ Renewal — ${tokensToAdd} token ditambah untuk ${userId}`);
        break;
      }

      case 'CANCELLATION': {
        const { error } = await supabase
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('id', userId);

        if (error) throw error;
        console.log(`[RC Webhook] ℹ️ Subscription cancelled untuk user ${userId}`);
        break;
      }

      case 'EXPIRATION': {
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'expired',
            subscription_expires_at: expiresAt,
          })
          .eq('id', userId);

        if (error) throw error;
        console.log(`[RC Webhook] ℹ️ Subscription expired untuk user ${userId}`);
        break;
      }

      case 'BILLING_ISSUE': {
        // Notifikasi masalah billing — jangan langsung revoke, tunggu EXPIRATION
        console.warn(`[RC Webhook] ⚠️ Billing issue untuk user ${userId}`);
        break;
      }

      default: {
        console.log(`[RC Webhook] Event tidak ditangani: ${eventType}`);
      }
    }

    // === RESPONSE SUKSES ===
    return new Response(
      JSON.stringify({ success: true, event: eventType }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[RC Webhook] Error saat proses event:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
