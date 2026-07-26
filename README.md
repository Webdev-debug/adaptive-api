# Driftless

**Self-adapting webhook infrastructure that learns your data before it breaks.**

Driftless is a webhook ingestion and forwarding platform that automatically resolves the schema of incoming data — validating, versioning, and relaying every event without manual configuration, even as upstream providers change their payload formats.

Live demo: https://adaptive-api-ky7e.onrender.com/
Dashboard: https://adaptive-api-ky7e.onrender.com/dashboard.html

## What it does

Point any webhook source (Stripe, Shopify, or anything else) at a single endpoint. Driftless:

- Infers schemas automatically from the first payload a source ever sends
- Adapts in real time — new fields are learned and folded into the schema, versioned and timestamped
- Scores confidence per field — fields that appear consistently are promoted to required
- Detects breaking changes — type mismatches are rejected and permanently logged
- Forwards events to any configured downstream URL
- Supports event replay — resend any past event on demand
- Generates live documentation from real traffic
- Isolates tenants via API key authentication

## Why

Webhook integrations break constantly — a provider adds a field, renames one, or ships an update, and downstream systems throw errors until someone manually patches the validation logic. Driftless removes that maintenance burden entirely.

## Tech stack

- Runtime: Node.js and Express
- Storage: JSON-based persistence
- Deployment: Render, auto-deployed from this repository
- Auth: API key based, per-tenant isolation

This entire project — backend, frontend, and deployment pipeline — was built and shipped entirely from a Termux terminal on Android. No laptop, no IDE.

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | /signup | Get a free API key |
| POST | /webhook/:source | Send an event. Validates, adapts, scores, and forwards |
| POST | /configure/:source | Set a forward URL for a source |
| POST | /replay/:eventId | Re-send a previously received event |
| GET | /schema/:resource | Current live schema, including confidence scores |
| GET | /schema/:resource/history | Full version history of a schema's evolution |
| GET | /breaking-changes/:resource | Audit log of detected breaking changes |
| GET | /docs/:resource | Auto-generated JSON Schema documentation |
| GET | /sources | All sources for the authenticated account |
| GET | /history/:userId | Full event history for a user |

All endpoints except /signup require an x-api-key header.

## Getting started locally

git clone https://github.com/Webdev-debug/adaptive-api.git
cd adaptive-api
npm install
node index.js

Visit http://localhost:3000 for the live demo, or http://localhost:3000/dashboard.html for the dashboard.

## Roadmap

- Migrate from JSON file storage to a proper database for safe concurrent writes
- API key management (view, revoke, regenerate)
- Billing and paid tiers
- Configurable rate limits per account

## License

All rights reserved. This code is publicly visible for portfolio and demonstration purposes. Reuse, modification, or redistribution is not permitted without explicit permission.
