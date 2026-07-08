import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = 'https://lgxtslabmyewqfnbhnly.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHRzbGFibXlld3FmbmJobmx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTY5NTksImV4cCI6MjA4MzM3Mjk1OX0.Sw_F-vZ2rSE8q9MK7KjeKUZ6HxYEWsDl8O9fRopOjjI';

// En nativo, manejamos el callback de OAuth manualmente vía appUrlOpen (App.js),
// por eso deshabilitamos la detección automática de URL. En web, Supabase la
// necesita para leer el #access_token del hash al volver de Google.
const isNative = Capacitor.isNativePlatform();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !isNative,
  },
});
