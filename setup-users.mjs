/**
 * setup-users.mjs — Skillo User Setup Script
 * 
 * Script ini digunakan untuk membuat akun pengguna baru di Supabase Auth
 * dan mengatur profil awal mereka.
 * 
 * PENGGUNAAN:
 * ==========
 * 
 * Opsi 1 — Via argumen CLI:
 *   node setup-users.mjs --email=nama@email.com --password=password123 --name=namauser
 * 
 * Opsi 2 — Via environment variables:
 *   SETUP_USER_EMAIL=nama@email.com SETUP_USER_PASSWORD=password123 SETUP_USER_NAME=namauser node setup-users.mjs
 * 
 * Opsi 3 — Interaktif (jika tidak ada argumen):
 *   node setup-users.mjs
 *   (Script akan memandu Anda mengisi data)
 * 
 * PRASYARAT:
 * ==========
 * File .env harus berisi:
 *   VITE_SUPABASE_URL=https://[project-ref].supabase.co
 *   VITE_SUPABASE_ANON_KEY=[anon-key]
 * 
 * CATATAN KEAMANAN:
 * =================
 * - JANGAN hardcode email/password di file ini
 * - JANGAN commit .env ke repository
 * - Gunakan password yang kuat (min 8 karakter)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { createInterface } from 'readline';

dotenv.config();

// ============================================================
// Validasi environment
// ============================================================
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || supabaseUrl.includes('your-project')) {
  console.error('\n❌ ERROR: VITE_SUPABASE_URL tidak dikonfigurasi di file .env');
  console.error('   Buka file .env dan isi dengan URL Supabase project Anda.\n');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('\n❌ ERROR: VITE_SUPABASE_ANON_KEY tidak dikonfigurasi di file .env\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// Parse argumen CLI
// ============================================================
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (const arg of args) {
    const match = arg.match(/^--([^=]+)=(.+)$/);
    if (match) result[match[1]] = match[2];
  }
  return result;
}

// ============================================================
// Input interaktif
// ============================================================
function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function getCredentials() {
  const args = parseArgs();

  // Cek dari CLI args
  if (args.email && args.password && args.name) {
    return { email: args.email, password: args.password, username: args.name };
  }

  // Cek dari environment variables
  if (process.env.SETUP_USER_EMAIL && process.env.SETUP_USER_PASSWORD && process.env.SETUP_USER_NAME) {
    return {
      email: process.env.SETUP_USER_EMAIL,
      password: process.env.SETUP_USER_PASSWORD,
      username: process.env.SETUP_USER_NAME,
    };
  }

  // Mode interaktif
  console.log('\n📋 Mode Interaktif — Isi data pengguna baru:\n');
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const email = await askQuestion(rl, '   Email: ');
  const password = await askQuestion(rl, '   Password (min 8 karakter): ');
  const username = await askQuestion(rl, '   Username (nama tampilan): ');

  rl.close();

  if (!email || !password || !username) {
    console.error('\n❌ Semua field wajib diisi.\n');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('\n❌ Password minimal 8 karakter untuk keamanan.\n');
    process.exit(1);
  }

  return { email, password, username };
}

// ============================================================
// Main setup function
// ============================================================
async function setup() {
  console.log('\n🚀 Skillo — User Setup Script');
  console.log('================================\n');
  console.log(`📡 Menghubungkan ke Supabase: ${supabaseUrl}\n`);

  const { email, password, username } = await getCredentials();

  console.log(`\n⏳ Membuat akun untuk: ${username} (${email})...`);

  // Daftarkan user baru
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.message.includes('already registered')) {
      console.warn(`\n⚠️  Email ${email} sudah terdaftar. Melewati pendaftaran...`);
    } else {
      console.error(`\n❌ Gagal mendaftar: ${error.message}\n`);
      process.exit(1);
    }
  } else {
    console.log(`✅ Akun berhasil dibuat untuk: ${email}`);
  }

  // Update profil username
  const userId = data?.user?.id;
  if (userId) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', userId);

    if (profileError) {
      console.warn(`\n⚠️  Gagal update profil username: ${profileError.message}`);
      console.warn('   (Bisa jadi trigger database belum ada atau tabel profiles belum dibuat)\n');
    } else {
      console.log(`✅ Profil berhasil diset: username = "${username}"`);
    }
  } else {
    console.warn('\n⚠️  Tidak bisa update profil — user mungkin perlu verifikasi email dulu.\n');
  }

  console.log('\n✨ Setup selesai!');
  console.log('   Jika Supabase memerlukan verifikasi email, minta user untuk cek inbox mereka.\n');
}

setup().catch((err) => {
  console.error('\n❌ Setup gagal dengan error tidak terduga:', err.message);
  process.exit(1);
});
