# Northstar Store — Full-Stack E-Commerce Project

A course-project starter built to match the uploaded IT401W Web Programming and Frameworks requirements:
- React + client-side state management
- Node.js + Express REST API
- PostgreSQL schema and database integration
- JWT authentication and role-based access control (customer/admin)
- Form handling and validation
- Product catalog, search, cart, checkout, orders, and admin product/order management

> This is a learning/demo project. Checkout records an order in the database; it does not process real payments.

## Stack
- Frontend: React, Vite, React Router
- Backend: Node.js, Express, `pg`, JWT, bcrypt
- Database: PostgreSQL
- Optional local services: Docker Compose

## Requirements
- Node.js 20+ and npm
- PostgreSQL 15+ (or Docker Desktop)

## 1. Configure environment
Copy `server/.env.example` to `server/.env` and update values:
```bash
cp server/.env.example server/.env
```
On Windows PowerShell:
```powershell
Copy-Item server/.env.example server/.env
```

Default local DB values are provided for convenience. Change the JWT secret before using this beyond a local demo.

## 2. Start PostgreSQL
### Option A — Docker (recommended)
From the project root:
```bash
docker compose up -d db
```
This creates database `northstar_store`, user `store_user`, password `store_password`.

### Option B — Existing PostgreSQL
Create a database named `northstar_store`, then set `DATABASE_URL` in `server/.env` to your own connection string.

## 3. Install dependencies
Open two terminals from the project root.

Terminal 1:
```bash
cd server
npm install
npm run db:setup
npm run dev
```
`db:setup` creates tables and inserts demo products plus a demo admin account.

Terminal 2:
```bash
cd client
npm install
npm run dev
```
Open the Vite URL printed in the terminal (usually http://localhost:5173).

## Demo admin account
- Email: `admin@northstar.local`
- Password: `Admin123!`

Change or remove this demo account before deploying publicly. You can register a customer account from the site.

## Features
### Customer
- Browse and search products
- View product details
- Add/remove items and change quantities in a persistent browser cart
- Register and sign in
- Checkout with shipping details
- View order history

### Admin
- Manage products (create, edit, delete)
- View all orders and update order status

## API overview
Base URL: `http://localhost:5000/api`

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Health check |
| POST | `/auth/register` | Public | Create customer account |
| POST | `/auth/login` | Public | Login and receive JWT |
| GET | `/auth/me` | Authenticated | Current user |
| GET | `/products` | Public | List/search products |
| GET | `/products/:id` | Public | Product details |
| POST | `/products` | Admin | Create product |
| PUT | `/products/:id` | Admin | Update product |
| DELETE | `/products/:id` | Admin | Delete product |
| POST | `/orders` | Authenticated | Checkout/create order |
| GET | `/orders/my` | Authenticated | Customer order history |
| GET | `/orders` | Admin | List all orders |
| PATCH | `/orders/:id/status` | Admin | Update order status |

## Deployment notes
The assignment asks for a deployed full-stack application. This ZIP is ready to run locally; deployment still requires creating hosted services and setting environment variables:
- PostgreSQL: Neon, Supabase, Render PostgreSQL, or another PostgreSQL provider
- API: Render, Railway, or similar Node hosting
- Frontend: Vercel, Netlify, or similar static hosting
Set the frontend `VITE_API_URL` to your deployed API URL plus `/api`, and set `CLIENT_ORIGIN` on the server to your deployed frontend origin. Never commit `.env` files or production secrets.

## GitHub: upload this project to your new repository
1. Extract `northstar-ecommerce.zip`.
2. Open the extracted `northstar-ecommerce` folder in VS Code.
3. In GitHub, open your newly created **empty** repository and copy its HTTPS URL.
4. In VS Code, open **Terminal → New Terminal** and run:
```bash
git init
git add .
git commit -m "Initial e-commerce project"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```
Replace the URL with your own repository URL. If Git says `remote origin already exists`, run:
```bash
git remote set-url origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```
If GitHub asks to authenticate, complete the browser sign-in or use GitHub's supported credential flow. Your GitHub password itself is not accepted for Git operations.

### If your repository already contains a README
The easiest path is to create an empty repository when possible. If it is not empty, fetch/merge the remote before pushing rather than force-pushing and overwriting files.

## Project structure
```text
northstar-ecommerce/
├── client/                 # React UI
├── server/                 # Express API
│   ├── src/
│   ├── sql/schema.sql
│   └── .env.example
├── docker-compose.yml
└── README.md
```

## Troubleshooting
- **Database connection refused:** confirm PostgreSQL/Docker is running and `DATABASE_URL` is correct.
- **Port in use:** change `PORT` in `server/.env`; update client API URL if needed.
- **CORS error:** set `CLIENT_ORIGIN` to the exact frontend origin (default `http://localhost:5173`).
- **Login fails:** run `npm run db:setup` and use the demo admin credentials above.
- **`git` is not recognized:** install Git for Windows, reopen VS Code, and verify with `git --version`.
