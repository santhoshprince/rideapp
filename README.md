# Ride App

React / Express / tRPC / Drizzle starter, adapted from the Sandbox web-db-user template.

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:migrate`: apply checked-in migrations. `pnpm db:push`: generate and apply new schema changes.
- `pnpm check` / `pnpm test`: types and application tests.

## Local MySQL setup

Create the database and a dedicated application user in the MySQL client:

```sql
CREATE DATABASE rideapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rideapp_app'@'localhost' IDENTIFIED BY 'your-long-alphanumeric-password';
GRANT ALL PRIVILEGES ON rideapp.* TO 'rideapp_app'@'localhost';
```

Copy `.env.example` to `.env` and set `DATABASE_URL` to use that same password. Keep the password long and alphanumeric, or URL-encode special characters in the connection URL. `.env` is ignored by Git.

Set `LOCAL_AUTH_SECRET` in `.env` to a unique random value of at least 32 characters; it signs local login sessions. Do not share or commit this secret.

Local email/password sign-in requires the latest schema. Run `pnpm db:migrate` after setting the database URL. Accounts can be created from the app's login screen; ride and message data is scoped to the signed-in account.

Apply the schema with `pnpm db:migrate`. On Windows PowerShell, start the development server with:

```powershell
$env:NODE_ENV = "development"
pnpm exec tsx watch server/_core/index.ts
```

### OpenStreetMap and device GPS

The pickup location button requests the browser's device location only after user interaction. Allow location access in the browser; on mobile, enable device location for a more accurate fix. The map uses OpenStreetMap tiles and requires no API key. The GPS marker is shown on the map; this starter does not send location to a geocoding service or provide road-by-road directions. Live driver tracking requires a separate driver location feed.

OpenStreetMap tile attribution is shown on the map. The standard public tile service is intended for reasonable interactive use, not bulk downloads or a high-volume commercial service; use a suitable tile provider or host tiles yourself if deploying at scale.

Start with the Webdev skill's default-template guide. Platform login, storage, payments and service contracts live in its shared references; read the relevant capability before extending its helper.

`server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. The platform serves managed `/manus-storage/` assets; the application does not register a second proxy.

Platform configuration is readable and editable through `webdev.config`. Default settings are initial values, not enforced constraints. The agent may modify the files, commands and configuration or follow the flexible guide for another stack.
