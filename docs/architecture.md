# QuickInvoice Architecture

## Overview

QuickInvoice is a small, self-contained invoicing app for a single small seller. It uses a
layered Node.js/Express backend, a SQLite database, and a vanilla HTML/CSS/JS single-page
frontend served as static files. There is no build step — the frontend is loaded directly by
the browser.

## Why this stack

- **Express + better-sqlite3**: the spec calls for SQLite. `better-sqlite3` was chosen over the
  callback-based `sqlite3` package because its synchronous API removes a whole class of
  callback/promise bugs in a small codebase like this, while still being a well-maintained,
  widely used native SQLite driver. For an app this size, synchronous file-backed queries are
  not a performance concern.
- **pdfkit**: a lightweight, dependency-light PDF library that draws directly to a stream. No
  headless browser (e.g. Puppeteer) is needed for a single-page invoice layout.
- **Vanilla JS, no bundler**: the spec explicitly avoids frontend frameworks. The frontend is
  organized as small, single-purpose scripts loaded as browser globals (`api`, `toast`,
  `modal`, `views`, `router`) and a hash-based client-side router. This keeps the app buildless
  while still being modular.

## Backend layers

```
src/
├── server.js          # process entry point
├── app.js              # Express app factory (middleware, routes, error handling)
├── routes/             # thin route -> controller wiring
├── controllers/        # HTTP layer: parse request, call service, shape response
├── services/           # business logic: validation orchestration, calculations, PDF
├── repositories/       # the only layer that touches SQL
├── database/           # connection + schema.sql
├── middleware/          # error handler, 404 handler
└── utils/               # ApiError, asyncHandler, validators
```

Each layer only talks to the layer directly below it. Controllers never touch SQL; repositories
never contain business rules. This keeps the codebase easy to navigate without introducing
unnecessary abstraction (no repository interfaces, no dependency injection framework — just
plain functions and modules).

## Data model

Three tables: `customers`, `invoices`, `invoice_items`. `invoices.customer_id` is a foreign key
with `ON DELETE RESTRICT`, so a customer with invoices cannot be deleted (enforced at both the
database and service layer). `invoice_items.invoice_id` cascades on delete, so removing an
invoice removes its line items.

Line totals, subtotal, and total are computed and stored at creation time rather than derived on
every read — appropriate for an MVP where invoices are immutable snapshots once created, and it
means the PDF/printable invoice always matches what was saved.

## API

A small REST API under `/api`: `/customers`, `/invoices`, `/invoices/:id/status` (PATCH, draft ⇄
paid), `/invoices/:id/pdf`, `/dashboard`. Generated invoice numbers come from SQLite's
`AUTOINCREMENT` sequence rather than a row count, so they stay unique after deletions.
Responses follow a consistent envelope (`{ success, data }` or `{ success: false, message,
errors }`), so the frontend has one error-handling path (`api.js`).

## Frontend

A single HTML shell (`public/pages/index.html`) with a persistent sidebar/topbar and a
`#page-content` region that view scripts render into. `router.js` maps `location.hash` to a
view function. Each view in `public/js/views/` owns its own fetch calls, rendering, and event
wiring — there's no virtual DOM or state management library, since the app's state is simple
enough that re-fetching and re-rendering a view on navigation is fast and easy to reason about.

Because the CSP forbids inline styles and handlers, all presentation lives in `public/css/` and
all behavior is attached with `addEventListener`. On phones (≤640px) data tables switch to
stacked cards and the invoice editor's line items become per-item cards, rather than relying on
horizontal scrolling.

## Security posture

See the README's Security section for the full list. The short version: parameterized SQL
everywhere, server-side validation on every write endpoint, HTML-escaping on every place
user-controlled data is interpolated into the DOM or into PDF text, Helmet for HTTP security
headers, a tight CORS policy (same-origin only), and a rate limiter on `/api`.

## What was deliberately left out

Per the product spec, this is not an accounting system: no tax engine, no multi-currency, no
recurring invoices, no authentication/authorization system, no microservices, no message queue.
A single-user MVP does not need any of that, and adding it would work against the "small,
excellent execution" goal.
