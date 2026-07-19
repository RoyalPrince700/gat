# Growth Analysis Tool (GAT)

A multi-company growth analysis platform for growth officers. Track operational metrics, visualize trends with Recharts, switch between companies, and download reports.

Built with the **MERN** stack: MongoDB, Express, React, Node.js.

---

## Companies

| Company | Type | What users track |
|---------|------|------------------|
| **Smipay** | Fintech | Customers, transaction volume, transaction count, amounts, dates, and related growth metrics |
| **Smart Edu Hub** | School management | Enrollments, fee collections, attendance, and school growth metrics |

More companies can be added later using the same company-scoped data model.

---

## Roles

| Role | Access |
|------|--------|
| **User** | Log in, enter and manage growth data for their assigned company |
| **Admin** (Growth Officer) | Open the companies hub, enter each company workspace, view analytics, manage users/companies, download reports |

---

## Admin company workspaces

Admin is **company-scoped by URL**. `/admin` is the hub for all companies; each company has its own path, sidebar, and theme.

| Path | Purpose |
|------|---------|
| `/admin` | All-companies hub — summary + cards to enter each workspace |
| `/admin/smipay/overview` | Smipay overview |
| `/admin/smipay/analytics` | Smipay deep analytics |
| `/admin/smipay/transactions` | Smipay transactions |
| `/admin/smipay/customers` | Smipay customers |
| `/admin/smipay/social-media` | Smipay social media |
| `/admin/smipay/kpi` | Smipay KPIs |
| `/admin/smarteduhub/overview` | Smart Edu Hub overview |
| `/admin/smarteduhub/analytics` | Smart Edu Hub analytics |
| `/admin/companies` | Manage company records (global) |
| `/admin/users` | Manage users (global) |

- Switching company (hub card, top-bar select, or **All companies** back link) updates the URL and theme.
- Legacy flat paths (e.g. `/admin/analytics`) redirect into the last used company workspace.
- URL path `smarteduhub` maps to the DB slug `smart-edu-hub` (see `frontend/src/constants/themes.js`).

### Per-company themes

Each workspace applies its own CSS theme via `data-theme` on the document root:

| Context | Theme | Accent |
|---------|-------|--------|
| `/admin` hub, companies, users | Platform (neutral) | Near-black `#1d1d1f` |
| Smipay | Orange | `#f26522` |
| Smart Edu Hub | Purple | `#7c3aed` |

Theme tokens live in `frontend/src/index.css` (`[data-theme='smipay']`, `[data-theme='smart-edu-hub']`, `[data-theme='platform']`) and `frontend/src/constants/themes.js`.

---

## Features

- JWT authentication (login / signup with company)
- Company-scoped admin routes (`/admin/:company/...`)
- All-companies hub at `/admin`
- Per-company themes (Smipay orange, Smart Edu Hub purple, platform neutral)
- Sidebar navigation (admin + user); company switcher syncs URL
- Company management (add / edit / delete)
- Admin overview, analytics, users assignment
- Role-based dashboards (data entry vs analysis)
- Charts powered by **Recharts** (trends, volume, counts)
- Filter by date range
- Download reports as CSV
- Auto-creates Smipay + Smart Edu Hub on API start
- Empty start — no demo users or sample transactions

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React (Vite), React Router, Recharts, Lucide icons, Axios |
| Backend | Node.js, Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |

---

## Design system (required)

GAT UI stays **light, calm, and product-grade**, with **brand accents per company workspace**.

### Principles

- **Light first:** Soft canvas, white surfaces, near-black text. Do not default to dark mode.
- **Company brand:** Smipay uses orange; Smart Edu Hub uses a restrained purple; the `/admin` hub stays neutral. Accents drive buttons, links, active nav, and chart primaries — not loud gradients.
- **Restraint:** Generous whitespace, one clear hierarchy, no visual noise. If an element does not improve clarity, remove it.
- **Typography:** Outfit (display) + Manrope (body). Tight letter-spacing on headlines. Avoid Inter, Roboto, Arial, and generic system stacks.
- **Surfaces:** White panels, 1px subtle borders, soft low elevation shadows.
- **Controls:** Soft 10–16px radii (not pill-heavy). Primary buttons use the active company accent.
- **Motion:** Short, ease-based transitions (opacity / subtle scale). Presence over spectacle.
- **Charts:** Use the active theme accent for primary series; light gridlines and white tooltips.
- **Density:** Premium product UI, not a crowded dashboard.

### Do not

- Neon fintech skins or glow effects
- Loud multi-stop AI gradients
- Warm cream + terracotta “AI landing page” look
- Heavy card stacks, emoji decoration, or rounded-full pill clusters

When adding screens or components, use CSS variables from `frontend/src/index.css` and company helpers in `frontend/src/constants/themes.js`.

---

## Project Structure

```
gat/
├── backend/
│   ├── models/          # User, Company, SmipayRecord, EduRecord
│   ├── routes/          # auth, companies, smipay, edu, analytics, reports
│   ├── middleware/      # JWT protect, admin-only
│   ├── seed.js          # Demo companies + admin user
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── pages/       # Login, User data entry, Admin hub / company pages
│   │   ├── components/  # Charts, layout, company route sync
│   │   ├── constants/   # themes.js (routes + palettes), smipay, kpi
│   │   ├── context/     # Auth + active company
│   │   └── api/
│   └── ...
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas URI)

### 1. Clone / open the project

```bash
cd gat
```

### 2. Backend

```bash
cd backend
npm install
```

Copy env example and edit if needed:

```bash
copy .env.example .env
```

Default `.env`:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/gat
JWT_SECRET=gat_dev_secret_change_me
CLIENT_URL=http://localhost:5173
```

Optional — clear all users/transactions and keep company shells only:

```bash
npm run seed
```

Start the API:

```bash
npm run dev
```

API runs at `http://localhost:5000`.

The first signup becomes the **admin** (growth officer). Later signups are company users.

### 3. Frontend

Open a new terminal:

```bash
cd frontend
npm install
```

Copy env example and edit if needed:

```bash
copy .env.example .env
```

Default `.env`:

```
VITE_APP_URL=http://localhost:5173
VITE_API_URL=http://localhost:5000/api
```

Start the app:

```bash
npm run dev
```

App runs at `http://localhost:5173`.

## Smipay data fields

Users can record per-customer / per-period growth rows:

- Customer name
- Number of transactions
- Total transaction amount
- Average / single amount (optional)
- Date
- Channel (optional: app, web, agent, etc.)
- Notes (optional)

Admin analytics for Smipay include:

- Total volume over time
- Transaction count trends
- Top customers by volume
- Period comparisons

---

## Smart Edu Hub data fields

Users can record school growth rows:

- School / campus name
- New enrollments
- Active students
- Fees collected
- Attendance rate (%)
- Date
- Notes (optional)

Admin analytics include enrollment and revenue trends.

---

## Reports

From a company workspace (e.g. `/admin/smipay/analytics`):

1. Open the company from `/admin` (or use the company switcher)
2. Optionally set a date range
3. Click **Download CSV**

Exports match that company’s dataset for offline analysis.

---

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/companies` | List companies |
| GET/POST | `/api/smipay` | List / create Smipay records |
| PUT/DELETE | `/api/smipay/:id` | Update / delete record |
| GET/POST | `/api/edu` | List / create Edu records |
| PUT/DELETE | `/api/edu/:id` | Update / delete record |
| GET | `/api/analytics/:companySlug` | Aggregated chart data (admin) |
| GET | `/api/reports/:companySlug` | CSV download (admin) |

Protected routes require `Authorization: Bearer <token>`.

---

## Roadmap ideas

- PDF report export
- More companies and custom metric schemas
- Email scheduled digests
- Team permissions per company

---

## License

Private / internal use for growth operations.
