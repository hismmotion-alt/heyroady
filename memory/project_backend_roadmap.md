---
name: Backend Roadmap
description: Planned backend features for Roady in priority order
type: project
---

Roady has no backend yet — all logic runs as Next.js API routes on Vercel.

**Phase 1 (next, after design changes):**
- Save trips — prompt user for email after generating a trip, store in Supabase
- Email subscribers — collect emails, send weekly destination suggestions via Resend
- No auth needed yet; just tie saved trips to an email address

**Phase 2 (later, when user says so):**
- Payments / subscriptions via Stripe
- Supabase tracks who is a paid subscriber
- Launch paid tier to the existing email list

**Stack decided:**
- Database + storage: Supabase (Postgres)
- Email sending: Resend
- Payments: Stripe

**Why:** Email list built before paywall = warm audience when paid launches.

**How to apply:** When user says "let's do the backend", start with Supabase save-trips + Resend email subscriber flow.
