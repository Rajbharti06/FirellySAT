# FirellySAT

FirellySAT is an open-source SAT preparation platform built with a calm, modern, and distraction-free experience.

## Stack

- Next.js + TypeScript
- Tailwind CSS
- Supabase-ready authentication
- OpenAI API integration for study planning
- Recharts analytics
- Framer Motion animations

## Core Features Included

- Dashboard with score tracking, streaks, and analytics
- Practice Rush mode with SAT-style questions and adaptive recommendations
- AI-powered personalized study plan generation (`/api/study-plan`)
- Calm Mode with breathing exercises and anxiety-support sessions
- Searchable SAT Question Bank
- Auth page with Supabase-backed or demo fallback flow
- Responsive, mobile-friendly design
- Dark/light mode toggle

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Optional environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

Without keys, FirellySAT runs in safe demo mode.

## SAT content safety note

This project should use educational SAT-style content and follow legal usage requirements for official SAT materials.
