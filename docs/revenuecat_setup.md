# Panduan RevenueCat Android — Skillo
## Test → Sandbox → Production

Dokumen ini adalah panduan step-by-step untuk setup sistem pembayaran In-App Purchase menggunakan RevenueCat di platform Android.

---

## Arsitektur Pembayaran (Wajib Dipahami)

```
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   User/App  │───▶│  RevenueCat  │───▶│  Google Play /   │    │ Supabase         │
│  (Frontend) │    │   (SDK)      │    │  Apple App Store │    │ Edge Function    │
└─────────────┘    └──────────────┘    └──────────────────┘    └──────────────────┘
                          │                      │                        ▲
                          │   Verifikasi Resi     │                        │
                          │◀─────────────────────┘                        │
                          │                                                │
                          │         WEBHOOK (Server-to-Server)             │
                          └────────────────────────────────────────────────┘
                               POST /functions/v1/revenuecat-webhook

PENTING: Frontend TIDAK boleh langsung update saldo/token user!
Semua perubahan database dilakukan oleh Edge Function yang menerima
webhook dari RevenueCat setelah verifikasi pembayaran berhasil.
```

---

## TAHAP 1 — TEST MODE (Development)

### Kondisi Saat Ini
- Key: `test_zikjOUsZaSTGGTgzcyeiFZnJEEz` sudah ada di `.env`
- Mode test tidak terhubung ke Google Play
- Cocok untuk: debugging UI, testing flow, dan verifikasi webhook

### Yang Harus Dilakukan di Tahap Ini

#### A. Buat Product di RevenueCat Dashboard
1. Buka [app.revenuecat.com](https://app.revenuecat.com)
2. Login / buat akun
3. Buat project baru → nama: **Skillo**
4. Pilih platform: **Google Play**
5. Masukkan package name: `com.hoursmaster.app`
6. **Entitlements** → Create → ID: `ai_tokens`, Display: "AI Tokens"
7. **Products** → Create:
   - ID: `skillo_tokens_100`, Display: "100 AI Tokens"
   - Hubungkan ke Entitlement `ai_tokens`
8. **Offerings** → Create:
   - ID: `default`, tampilkan Package berisi product di atas

#### B. Test dari Aplikasi (Tanpa Play Store)
Di mode `test_`, panggil `Purchases.getOfferings()` akan mengembalikan offering yang sudah dikonfigurasi. Tampilkan di UI dan test flow pembelian.

#### C. Setup Webhook (Opsional di tahap ini, wajib sebelum sandbox)
1. Deploy Supabase Edge Function dulu (lihat bagian Edge Function di bawah)
2. Di RC Dashboard → **Integrations** → **Webhooks**
3. Tambah endpoint: `https://mcqdqluxprpmrgofynaa.supabase.co/functions/v1/revenuecat-webhook`
4. Salin **Webhook Secret** → simpan ke Supabase Edge Function secrets

---

## TAHAP 2 — SANDBOX MODE (Pre-Release Testing)

### Syarat Sebelum Mulai
- [ ] App sudah terdaftar di [Google Play Console](https://play.google.com/console)
- [ ] APK release sudah di-upload ke Internal Testing track
- [ ] Sudah ada Google Play **License Tester** account

### Langkah Setup Google Play

#### A. Buat Produk di Google Play Console
1. Buka Play Console → pilih app Skillo
2. **Monetize** → **In-App Products** → Create
3. Product ID: `skillo_tokens_100` (harus sama dengan di RevenueCat!)
4. Status: **Active**
5. Harga: sesuaikan (mis. IDR 15.000)
6. Simpan

#### B. Link Product ke RevenueCat
1. Di RC Dashboard → **Products** → edit `skillo_tokens_100`
2. Store: **Google Play**, Store Product ID: `skillo_tokens_100`
3. Simpan

#### C. Setup License Tester
1. Play Console → **Setup** → **License Testing**
2. Tambahkan email akun Google test Anda
3. Akun ini bisa "beli" produk tanpa dicharge

#### D. Ganti Key ke Sandbox/Production Key
1. Di RC Dashboard → **Apps** → **Google Play** → **API Keys**
2. Salin **Google Play API Key**
3. Update `.env`:
   ```env
   VITE_RC_GOOGLE_API_KEY=goog_xxxxx
   ```
4. Build release APK baru dan upload ke Internal Testing

---

## TAHAP 3 — PRODUCTION (Rilis Publik)

### Checklist Sebelum Go-Live
- [ ] Semua item dari Tahap 2 sudah ditest dan berfungsi
- [ ] Supabase Edge Function `revenuecat-webhook` sudah deployed dan live
- [ ] Test webhook dari RC Dashboard berhasil update database
- [ ] `versionCode` di `android/app/build.gradle` sudah dinaikkan
- [ ] APK sudah di-sign dengan Release Keystore (bukan debug keystore)
- [ ] Tidak ada credentials hardcoded di source code

### Cara Build Release APK (Signed)
1. Buka Android Studio → **Build** → **Generate Signed Bundle/APK**
2. Pilih **APK** → pilih keystore Anda (buat baru jika belum ada)
3. Pilih **release** build type
4. Upload ke Play Console → **Production** track

---

## Setup Supabase Edge Function (Webhook Handler)

### Deploy via Supabase Dashboard

1. Buka [supabase.com/dashboard](https://supabase.com/dashboard) → project Skillo
2. **Edge Functions** → **Deploy new function**
3. Nama function: `revenuecat-webhook`
4. Paste kode berikut:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Hanya terima POST request
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Validasi webhook secret dari RevenueCat
  const authHeader = req.headers.get('Authorization')
  const expectedSecret = Deno.env.get('RC_WEBHOOK_SECRET')
  
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    console.error('Unauthorized webhook request')
    return new Response('Unauthorized', { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const event = await req.json()
  const eventType = event.event?.type
  const appUserId = event.event?.app_user_id

  console.log(`RevenueCat event: ${eventType} for user: ${appUserId}`)

  if (!appUserId) {
    return new Response('Missing user ID', { status: 400 })
  }

  try {
    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL': {
        // Tambahkan token AI ke user
        const { error } = await supabase
          .from('profiles')
          .update({ 
            ai_tokens: 100, // atau increment: rpc('increment_tokens', { amount: 100 })
            subscription_status: 'active',
            subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', appUserId)
        
        if (error) {
          console.error('Failed to update tokens:', error)
          return new Response('Database error', { status: 500 })
        }
        break
      }

      case 'CANCELLATION':
        await supabase.from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('id', appUserId)
        break

      case 'EXPIRATION':
        await supabase.from('profiles')
          .update({ subscription_status: 'expired', ai_tokens: 0 })
          .eq('id', appUserId)
        break
      
      default:
        console.log(`Unhandled event type: ${eventType}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    console.error('Edge function error:', e)
    return new Response('Internal error', { status: 500 })
  }
})
```

5. **Set Secrets** di Supabase Dashboard → **Edge Functions** → **Secrets**:
   - `RC_WEBHOOK_SECRET` → paste dari RevenueCat Dashboard (Integrations → Webhooks → Secret)

---

## Troubleshooting

| Masalah | Kemungkinan Penyebab | Solusi |
|---------|---------------------|--------|
| `getOfferings()` kosong | Product belum dikonfigurasi di RC | Buat product dan offering di RC Dashboard |
| Webhook 401 | Secret tidak match | Pastikan `RC_WEBHOOK_SECRET` sama di RC dan Supabase |
| Token tidak bertambah | Edge Function error | Cek log di Supabase Dashboard → Edge Functions → Logs |
| "Product not available" | Product belum Active di Play Console | Aktifkan product di Google Play Console |
