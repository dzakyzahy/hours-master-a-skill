import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://mcqdqluxprpmrgofynaa.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcWRxbHV4cHJwbXJnb2Z5bmFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NTQzNDgsImV4cCI6MjEwNDIzMDM0OH0.A34z7txUH_JmE9AMkwZtvBIsmnbt0zSv4anYfKW4494';

export const isSupabaseConfigured = true;

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const supabaseUrl = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

