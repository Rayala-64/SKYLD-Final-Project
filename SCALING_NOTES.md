# Scaling Notes

As SKYLD Word Vault™ grows beyond the prototype phase, the following areas will require architectural upgrades:

## 1. Google Gemini AI Quotas
**Current State**: We are using the free tier of Google AI Studio (`gemini-1.5-flash`). We enforce a rate limit of 1 submission per student per day in the backend logic, plus an environment variable kill switch (`AI_FEEDBACK_ENABLED`).
**The Risk**: Gemini free-tier quotas are per Google Cloud project and have changed multiple times recently. A sudden influx of users could easily hit the RPM (Requests Per Minute) or RPD (Requests Per Day) limits, causing the app to crash or hang for users.
**The Fix**: 
- Monitor usage closely in the Google Cloud Console.
- Implement robust queueing (e.g., Inngest or Upstash) so if the rate limit is hit, the job is queued and processed later rather than failing synchronously in the user request.
- Upgrade to a paid Google Cloud billing account once funding is secured.

## 2. Database Scaling (Supabase)
**Current State**: Running on Supabase's free tier. 
**The Risk**: The free tier has limits on database size (500MB), storage size (1GB), and concurrent connections. Video files will consume the 1GB storage limit extremely quickly.
**The Fix**:
- Upgrade to a Supabase Pro plan ($25/mo) immediately when transitioning from prototype to production.
- Implement video compression on the client side before uploading to save storage space.
- Introduce a data retention policy (e.g., delete videos older than 30 days) if long-term storage is not required.

## 3. Authentication & Edge
**Current State**: Auth runs through Supabase Auth via standard Next.js Server Actions.
**The Risk**: High latency for global users if the Supabase project is deployed in a single region far from them.
**The Fix**: Move critical route protection to Next.js Edge Middleware for faster redirects, though this requires careful handling of the Supabase client at the edge.

## 4. Real-time Features
**Current State**: Dashboard data relies on page loads and client-side fetching without WebSockets.
**The Fix**: Once on a paid plan, enable Supabase Realtime for the `pod_messages` and `submissions` tables so mentors see new videos instantly without refreshing.
