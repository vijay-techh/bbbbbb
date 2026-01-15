# Deploying to Vercel

Short steps to deploy this project to Vercel:

- **Environment**: Set `DATABASE_URL` in Vercel Project Settings (Postgres/Neon connection string).
- **Install deps**: Vercel will install dependencies from the root `package.json`.
- **Deploy**: Use the Vercel dashboard or the `vercel` CLI in the repo root.

Example `vercel` CLI flow:

```bash
npm i -g vercel
vercel login
vercel --prod
```

What we added for Vercel:
- `vercel.json` — routes rewrites so `/api/*` maps to serverless functions and the frontend is served from `/frontend`.
- `api/*` — serverless endpoints ported from the Express app (`/api/leads`, `/api/leads/:loanId`, `/api/next-loan-id`, `/api/validate-pincode`, `/api/login`).

Local dev tips:
- To run the original Express server locally (unchanged):

```bash
cd backend
npm install
npm start
```

- To run Vercel serverless functions locally, use the Vercel CLI:

```bash
vercel dev
```

first change from 261 to 295

second change for 58

third change from line 1282 to 1333

fourth change 
remove these page
shared lead 
view lead js and html

and leadform code

added a line at 1288

commented at 1418

seventh change at 168 (major)

316 commented
402 -||-