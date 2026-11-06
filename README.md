# Dice Tavern (web)

Hoja de personaje de D&D 2024 (adaptación casera) + mesa de dados. React + Vite, datos en Supabase.

## Desarrollo
    npm install
    npm run dev      # http://localhost:5173
    npm test

Sin `.env.local` la app funciona en **modo local** (se guarda en el navegador, sin cuentas).

## Conectar Supabase (gratis)
1. Crea un proyecto en supabase.com.
2. SQL Editor → pega y ejecuta `supabase/schema.sql`.
3. Copia `.env.example` a `.env.local` y pon `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Settings → API).

## Publicar en Vercel (gratis)
Importa el repositorio en vercel.com, añade las dos variables de entorno y despliega. Comando: `npm run build`, carpeta: `dist`.

## Datos
`public/data/*.json` se generaron a partir de los PDF del grupo (conjuros, razas, clases, dotes, trasfondos, armas, armaduras y equipo).
