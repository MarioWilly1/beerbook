import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lgxtslabmyewqfnbhnly.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxneHRzbGFibXlld3FmbmJobmx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTY5NTksImV4cCI6MjA4MzM3Mjk1OX0.Sw_F-vZ2rSE8q9MK7KjeKUZ6HxYEWsDl8O9fRopOjjI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
