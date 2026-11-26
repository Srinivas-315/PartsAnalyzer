# PartsAnalyzer – Additive Manufacturing Feasibility Platform

A full-stack web app that tells a customer whether their part is worth producing by **metal additive manufacturing (3D printing)**, and at what cost.

I first built this kind of feasibility tool during my internship at **Wipro 3D Addwize (2024)**. PartsAnalyzer is my independent rebuild of the idea as a standalone product.

## What it does
- **Customers** submit part specifications (single part or bulk upload) and get a feasibility analysis.
- **Feasibility engine** scores each part on:
  - **Technical fit**: material suitability, part size vs. machine build volume
  - **Economic fit**: estimated AM cost vs. the customer's current cost
  - **Implementation effort**: design complexity / time
- **Machine recommendation** based on material and part size.
- **Service providers** review submissions; **admins** manage users, roles and platform stats.

## Tech stack
- **Frontend:** React + TypeScript, Tailwind CSS, shadcn/ui (Radix), TanStack Query, React Hook Form + Zod, Chart.js
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Drizzle ORM (tables: `users`, `materials`, `machines`, `submissions`)
- **Auth:** OpenID Connect sessions stored in PostgreSQL, role-based access (customer / service provider / admin)

## API overview
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/auth/user` | Current user |
| GET/POST | `/api/materials` | List / add AM materials |
| GET | `/api/machines` | AM machine catalogue |
| POST | `/api/submissions` | Submit a part for analysis |
| POST | `/api/submissions/bulk` | Bulk part submission |
| GET | `/api/submissions`, `/api/submissions/:id` | View results |
| GET | `/api/admin/users`, `/api/admin/stats` | Admin dashboard |
| PATCH | `/api/admin/users/:id/role`, `/api/admin/users/:id/deactivate` | User management |

## Run locally
```bash
npm install
cp .env.example .env   # fill in your PostgreSQL URL and a session secret
npx drizzle-kit push   # create tables
npm run dev            # http://localhost:5000
```

## Author
**Bhukya Srinivasa Naik** – B.Tech, NIT Delhi (2027) · [LinkedIn](https://www.linkedin.com/in/srinivasa-bhukya) · [GitHub](https://github.com/Srinivas-315)
