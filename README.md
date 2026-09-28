# QuickInvoice

A simple invoicing application for small sellers to create customers, generate professional
invoices, and print/download them as PDFs. Built as a small, portfolio-quality MVP — not an
accounting system.

## Features

- **Customers** — create, edit, delete, and search customers; select a customer while creating
  an invoice.
- **Invoices** — create invoices with multiple line items, automatic quantity × price line
  totals, subtotal, and total; view, search, and delete invoices; mark as draft or paid.
- **Invoice preview & export** — a professional, print-ready invoice layout with dedicated print
  CSS, plus one-click PDF download.
- **Dashboard** — total invoices, total customers, total sales, and a recent invoices table.
- **Polished UX** — loading skeletons, empty states, inline form validation, confirmation
  dialogs before deletion, and toast notifications.
- **Responsive** — usable from desktop down to mobile, with a collapsible sidebar and
  horizontally-scrollable tables on small screens.

## Tech Stack

**Frontend:** HTML, CSS (CSS variables, responsive layout), vanilla ES6+ JavaScript (no
framework, no bundler) — a small hash-router driven single-page app.

**Backend:** Node.js, Express.js, layered as routes → controllers → services → repositories.

**Database:** SQLite via `better-sqlite3` (a synchronous, well-maintained SQLite driver — see
[docs/architecture.md](docs/architecture.md) for why this was chosen over the async `sqlite3`
package).

**PDF:** `pdfkit`, generating the invoice PDF directly from invoice data (no headless browser).

**Tooling:** ESLint, Prettier, Jest + Supertest.

## Screenshots

> Screenshots can be added here once the app is running locally — see **Getting Started** below.

- `docs/screenshots/dashboard.png` — Dashboard with KPI cards and recent invoices
- `docs/screenshots/customers.png` — Customer list and add/edit form
- `docs/screenshots/invoice-editor.png` — Invoice creation screen with live totals
- `docs/screenshots/invoice-preview.png` — Print-ready invoice preview

## Getting Started

```bash
git clone <repository-url>
cd quickinvoice
npm install
npm run dev
```

The app runs at `http://localhost:3000` by default. Copy `.env.example` to `.env` to customize
the port or database location:

```bash
cp .env.example .env
```

## Database

QuickInvoice uses a local SQLite database file (`database/quickinvoice.db` by default). The
schema (`src/database/schema.sql`) is applied automatically on server start — no separate
migration step is needed. The database file is git-ignored; each environment gets its own.

## Testing

```bash
npm test
```

36 tests cover customer CRUD and validation, invoice creation and calculations, status changes,
invoice numbering, date validation, dashboard aggregation, and dedicated security scenarios (SQL
injection attempts, XSS payload storage, oversized input, error message safety, and PDF filename
sanitization).

## Security

- **SQL injection** — every query uses parameterized statements (`better-sqlite3` prepared
  statements); no string concatenation into SQL anywhere in the codebase.
- **XSS** — all user-controlled data is escaped before being inserted into the DOM
  (`escapeHtml()` in `public/js/format.js`) and confirmation dialogs build DOM nodes with
  `textContent` rather than interpolated HTML.
- **Input validation** — every write endpoint validates and normalizes its payload server-side
  (`src/utils/validators.js`) before it reaches the database, independent of any client-side
  checks.
- **Content Security Policy** — scripts and styles load only from the app's own origin (plus
  Google Fonts). Inline `<script>`, `style="…"` attributes, and `onclick=` handlers are blocked,
  so the frontend uses CSS classes and `addEventListener` exclusively.
- **HTTP hardening** — Helmet sets standard security headers; CORS is restricted to same-origin
  (the frontend and API are served from the same origin, so no cross-origin API access is
  permitted); request bodies are size-limited; `/api` is rate-limited.
- **Error handling** — a centralized error handler returns human-readable messages and never
  leaks stack traces, database errors, or file paths to the client.
- **PDF/file safety** — the PDF download filename is derived from the invoice number but
  sanitized to a safe character set before being placed in the `Content-Disposition` header, so
  it cannot be used for header or path injection.
- **Dependencies** — `npm audit` reports 0 vulnerabilities at the time of writing.

## Project Structure

```
quickinvoice/
├── src/
│   ├── server.js          # entry point
│   ├── app.js              # Express app wiring
│   ├── routes/             # route -> controller mapping
│   ├── controllers/        # HTTP request/response handling
│   ├── services/           # business logic, validation orchestration, PDF generation
│   ├── repositories/       # SQL access (the only layer that touches the database)
│   ├── database/           # connection + schema.sql
│   ├── middleware/          # error handling
│   └── utils/               # ApiError, asyncHandler, validators
├── public/
│   ├── css/                 # design system (variables, base, layout, components, print)
│   ├── js/                  # api client, toast, modal, router, and views/
│   └── pages/index.html     # single-page app shell
├── tests/                   # Jest + Supertest test suites
├── docs/architecture.md     # architecture decisions
└── database/                 # SQLite file lives here at runtime (git-ignored)
```

See [docs/architecture.md](docs/architecture.md) for the reasoning behind these choices.

## Future Ideas

These are intentionally **not** implemented, to keep this MVP small:

- Taxes and multi-currency support
- Reusable invoice templates
- User authentication and multi-user accounts
- Cloud sync / hosted multi-tenant version
- Recurring invoices and payment reminders

## License

MIT
