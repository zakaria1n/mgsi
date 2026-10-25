import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://cdfgnvbcrwplszozfbso.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZmdudmJjcndwbHN6b3pmYnNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODI0MDMsImV4cCI6MjA5OTk1ODQwM30.0AqZJqdf2DBjzBMzgLvORhpQ9FGeFXtoRHA_YOZqmiE',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
};
