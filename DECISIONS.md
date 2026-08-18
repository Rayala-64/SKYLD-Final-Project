# Architectural Decisions

This document outlines key technical decisions made during the initial build of SKYLD Word Vault™.

## 1. Zero Paid Services (Free Tier First)
**Decision**: The entire stack is built to run on free tiers (Vercel for hosting, Supabase for DB/Auth/Storage, Gemini API for AI).
**Reasoning**: Required by stakeholder constraints for the initial prototype.
**Implications**: 
- We cap AI usage via UI limits and kill switches.
- We rely on Supabase Storage without a CDN layer initially.

## 2. Gemini as the AI Provider
**Decision**: Shifted from Anthropic Claude to Google Gemini (`gemini-1.5-flash`).
**Reasoning**: Gemini provides a generous free tier for Flash models through Google AI Studio, unlike Anthropic which currently requires paid credits.
**Implications**: The `analyzeReflection` and `analyzeSpeech` functions in `gemini.ts` utilize `@google/generative-ai` and enforce a 1-per-day limit on the server-side before calling the model to prevent quota exhaustion.

## 3. Storage Privacy & Consent
**Decision**: Videos are stored in a private Supabase bucket (`videos`). Row Level Security (RLS) policies guarantee that students can only insert and read their own videos, while mentors can only read videos from students in their assigned pods. Admins can read all.
**Reasoning**: Video submissions are highly sensitive data. Public buckets are unacceptable.
**Implications**: Accessing videos requires the Supabase client to fetch signed URLs or authenticate the request.

## 4. Polling over Realtime WebSockets
**Decision**: Opted out of Supabase Realtime subscriptions for this iteration, relying instead on standard REST fetching and route-based data refreshing.
**Reasoning**: Realtime WebSocket connections count heavily against free tier connection limits and concurrent limits. For a prototype, standard polling or manual refresh is significantly safer for scaling on the free tier.

## 5. UI/UX: Shadcn + Framer Motion
**Decision**: Built the UI using a custom implementation of Shadcn components (Tailwind CSS) integrated with Framer Motion for micro-interactions and page transitions.
**Reasoning**: The stakeholder required a "premium SaaS" feel rather than a "college project." Deeply integrating animations and a polished design system achieves this without heavy external dependencies.
