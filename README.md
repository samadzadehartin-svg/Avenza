# AVENZA Collection

Independent retail + wholesale clothing store.

- Frontend: React + Vite
- Hosting: Vercel
- Backend: Supabase (PostgreSQL, Auth, Storage)
- Payments: not enabled yet; orders are registered for manual follow-up
- Admin: authenticated Supabase users whose email exists in `public.admin_users`

## Development

```bash
npm install
npm run dev
```

The app uses the AVENZA Supabase publishable key in the browser. Row Level Security protects management data and write operations.
