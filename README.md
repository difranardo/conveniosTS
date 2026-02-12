# convenios (TypeScript)

Migracion completa de Python a TypeScript para el proceso de notificaciones de convenios.

## Requisitos

- Node.js 20+
- SQL Server accesible con las credenciales del `.env`

## Instalacion

```bash
npm install
```

## Variables de entorno

Se toman desde `.env`:

- `HAPPEO_API_URL`
- `HAPPEO_API_KEY`
- `HAPPEO_CHANNEL_ID`
- `DB_SERVER`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`
- `SMTP_SERVER`
- `SMTP_PORT`
- `SENDER_EMAIL`
- `SMTP_PASS`
- `SEARCH_WINDOW_HOURS` (opcional, default `24`)

## Ejecutar

```bash
npm run dev
```

Para produccion:

```bash
npm run build
npm start
```
"# conveniosTS" 
