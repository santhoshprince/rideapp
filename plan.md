# Ride App — implementation plan

## Product scope

Build a React web application for taxi riders. Riders can enter pickup and drop-off locations, request a ride, review messages received from a driver/service, and see the assigned vehicle's position on a trip map. The experience must work on desktop and mobile web. An actual driver's live GPS device/feed is not included in the confirmed scope; the UI must identify sample/simulated positions as demo data and the backend should provide a clear place to accept driver location updates.

## Design direction

- **Design movement:** Contemporary mobility control-room UI, borrowing the clarity of navigation instruments without imitating a branded product.
- **Core principles:** Route-first, readable at a glance, honest about live/demo data, and comfortable on narrow screens.
- **Color philosophy:** Ink-black/navy surfaces make the map and active-trip state legible; restrained cyan marks route/selection; lime is reserved for live/ready status and amber for demo/simulated or attention states.
- **Layout paradigm:** Compact vertical navigation/utility rail beside a route canvas on desktop; stacked booking and trip cards with map controls on mobile.
- **Signature elements:** Route-line timeline linking pickup to destination; high-contrast vehicle/location marker; small live/demo status pill.
- **Interaction philosophy:** Enter or select origin/destination, see a concise trip estimate, request/cancel a ride, and inspect status/messages without losing current route context.
- **Animation:** Brief, restrained transitions for tabs, status, and the demo vehicle marker; honor reduced-motion preferences and avoid motion that suggests real GPS when the position is simulated.
- **Typography system:** Space Grotesk for headings and compact labels, with a neutral system sans-serif for longer message/body copy; clear numeric hierarchy for ETA and fare.
- **Brand essence:** A straightforward ride companion for riders who want the trip and driver updates in one place; **clear, calm, dependable**.
- **Brand voice:** Short and practical. Examples: “Where should we pick you up?” and “Your driver’s location is a demo position.”
- **Wordmark & logo:** A simple custom route-pin mark paired with the product name “Ride”; use a vector/CSS mark rather than a generic image asset.
- **Signature brand color:** Electric cyan.

## Implementation approach

Use the initialized React + TypeScript + Vite client, Express backend, tRPC API, Drizzle ORM, and the project's managed MySQL database. Add durable ride and message records to the Drizzle schema, queries, and migration; expose validated procedures for requesting/listing/cancelling rides, reading/sending ride messages, and receiving driver location updates. Keep a small seeded/demo ride path available for a usable first-run experience without claiming a real driver is connected. Poll location/status while a trip is active; make the demo state unmistakable. Protect driver-update writes with a server-side authorization boundary and do not expose service credentials in the browser.

For route visualization, first inspect the runtime's browser-safe Maps configuration. Use the platform Maps proxy and Google Maps JavaScript surface when the required browser key is present; preserve the pickup, destination, and vehicle marker even when live route lookup is unavailable. If map credentials are not present, provide a designed schematic trip-map fallback and label it as a preview rather than inventing live coordinates. Keep the UI free of third-party map keys and static stock map images.

## Project structure

- `client/src/pages/Home.tsx`: Rider booking/trip experience and view state.
- `client/src/components/`: Small reusable route, trip-status, and message UI pieces if needed.
- `client/src/lib/`: Existing typed tRPC client and any browser Maps loader/types.
- `client/src/index.css`: App theme, responsive layout, map fallback, and motion rules.
- `server/routers.ts`: Ride and message procedures with input validation.
- `server/db.ts`: Database queries for ride/message persistence and location updates.
- `drizzle/schema.ts` and `drizzle/`: Ride/message/location schema and additive migration.
- `public/manus-routes.json`: Static manifest for the single-page route.

## Dependencies and serving

Reuse existing packages (React, tRPC, Drizzle, lucide-react, and styling already installed). Do not add a third-party maps SDK unless the managed proxy's supported browser surface requires a loader; load it through the documented platform proxy. The app remains served through the existing Express/Vite development entry and the configured managed server runtime.
