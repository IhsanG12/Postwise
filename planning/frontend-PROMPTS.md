# Claude Code Prompts — Larp AI Frontend

Copy-paste these into Claude Code in order. Each one is a full session.
Always read CLAUDE.md and docs/larp-ai-api-contract.md at the start of every session.
Visual reference: web/mockup/index.html — this is the source of truth for design.

---

## SESSION 1 — Orientation

Read CLAUDE.md, docs/larp-ai-api-contract.md, and web/mockup/index.html fully.

Then tell me:
1. What pages and UI states exist in the mockup
2. What components will need to be built
3. What the mockup uses for colors, fonts, spacing
4. What API calls the frontend needs to make (list every endpoint from the contract we'll call)
5. Recommended component folder structure for this app

Don't write any code yet. Just give me the full picture.

---

## SESSION 2 — Foundation + Design System

Read CLAUDE.md and docs/larp-ai-api-contract.md.
Visual reference: web/mockup/index.html.

Set up the design foundation:
1. Install fonts: Inter (Google Fonts) and Instrument Serif (Google Fonts)
2. Set up global CSS in app/globals.css with these exact tokens:
   - --bg: #FAFAF7
   - --fg: #0B0B0C
   - --accent: #B8945F
   - --radius: 12px
   - Font: Inter for all UI, Instrument Serif italic for the hero word only
3. Update app/layout.tsx:
   - Title: "Larp AI"
   - Description: "AI luxury content for Instagram & TikTok"
   - Load both fonts
   - Background color: #FAFAF7
4. Replace app/page.tsx with a blank Larp AI shell (just the background color, no content yet)
5. Delete the default Next.js SVGs from public/
6. Create components/ folder structure:
   - components/ui/ — reusable primitives (Button, Card, Shimmer)
   - components/layout/ — Nav, PageWrapper
   - components/generation/ — GenerationFlow, ResultsGrid, CaptionCard, SoundCard

Build the Nav component:
- Logo "larp ai" left-aligned (Inter, near-black)
- Credits indicator right-aligned (calls GET /api/me, shows "7 credits")
- Clean, minimal, off-white background

---

## SESSION 3 — Mock API Layer + Auth Setup

Read CLAUDE.md and docs/larp-ai-api-contract.md.

Build the API layer:
1. Create lib/api.ts with typed functions for every endpoint:
   - getMe() → GET /api/me
   - uploadSelfie(file: File) → POST /api/uploads
   - createGeneration(params) → POST /api/generations
   - pollGeneration(jobId: string) → GET /api/generations/:jobId
   - rerollAsset(jobId: string, assetId: string) → POST .../reroll
   - createCheckout(plan: string) → POST /api/billing/checkout

2. Create lib/mock.ts with fake responses matching the contract EXACTLY:
   - mockMe: { userId, plan, credits, rerollsRemaining, unlimited }
   - mockJob (processing): { jobId, status: "processing", progress: 0.5 }
   - mockJob (complete): full response with assets, captions, sounds arrays
   - mockUpload: { uploadId: "upl_mock123", expiresInSeconds: 600 }

3. Add a USE_MOCK flag in lib/api.ts — when true, return mock data instead of fetching.
   Set it to true for now.

4. Set up Supabase Auth:
   - Install @supabase/supabase-js
   - Create lib/supabase.ts client (uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Create a useAuth() hook in lib/hooks/useAuth.ts
   - Protect routes: if not logged in, redirect to /login

5. Create basic /login and /signup pages (minimal, clean, matches design system)

---

## SESSION 4 — Page 1: Platform + Format Picker

Read CLAUDE.md and docs/larp-ai-api-contract.md.
Visual reference: web/mockup/index.html — look at the home/picker screen.

Build the main generation picker page at app/page.tsx:

1. Platform picker — two large cards:
   - Instagram (photo grid icon)
   - TikTok (video icon)
   - Selected state: champagne accent border (#B8945F)

2. Format picker (shows after platform selected):
   - Slideshow
   - Video
   - Same card style

3. Face mode toggle:
   - "Add my face" / "Go faceless" toggle
   - If "Add my face" selected → show selfie upload zone (see SESSION 5)

4. Generate button:
   - Disabled until platform + format selected
   - If withFace=true: also disabled until selfie uploaded
   - Shows current credit cost ("Uses 1 credit")

5. State management: use React useState for { platform, format, withFace, uploadId }

Match the mockup layout and spacing exactly.

---

## SESSION 5 — Selfie Upload

Read CLAUDE.md and docs/larp-ai-api-contract.md.
Visual reference: web/mockup/index.html — look at the selfie upload screen.

Build the selfie upload component at components/generation/SelfieUpload.tsx:

1. Upload zone: tap/click to open file picker, or drag and drop
2. Accept: jpg, png, webp only. Max 10MB. Show error if wrong type or too large.
3. On file selected:
   - Show preview thumbnail
   - Call uploadSelfie(file) from lib/api.ts → POST /api/uploads
   - Show loading spinner while uploading
   - On success: store uploadId, show checkmark
   - On error: show "Upload failed, try again"
4. Privacy note below the upload zone:
   "Your photo is used only for this generation and deleted immediately after."
   Style it small and muted (not alarming, just honest).
5. Allow re-upload: tap thumbnail to replace

---

## SESSION 6 — Generation Flow + Loading State

Read CLAUDE.md and docs/larp-ai-api-contract.md.
Visual reference: web/mockup/index.html — look at the loading/shimmer screen.

Build the generation flow:

1. On "Generate" button press:
   - Call createGeneration({ platform, format, withFace, selfieUploadId, count: 6 })
   - Get jobId back
   - Navigate to /results/:jobId (or show results panel)

2. Polling logic in lib/hooks/useGeneration.ts:
   - Poll GET /api/generations/:jobId every 2 seconds
   - Stop polling when status is "complete" or "failed"
   - Expose: { status, progress, assets, captions, sounds, error }

3. Loading state — shimmer skeleton grid:
   - 6 shimmer tiles in the same grid layout as results
   - Animated shimmer effect (CSS animation, gradient sweep)
   - Match the mockup shimmer exactly

4. Error state:
   - "Generation hiccuped — try again" with a retry button
   - Retry calls createGeneration again with same params

5. 402 handling:
   - Show upgrade prompt modal
   - "You're out of credits — upgrade to keep larping"
   - CTA: "Upgrade" button → /pricing

---

## SESSION 7 — Results Page

Read CLAUDE.md and docs/larp-ai-api-contract.md.
Visual reference: web/mockup/index.html — look at the results screen carefully.

Build the results page at app/results/[jobId]/page.tsx:

1. Image grid:
   - 6 tiles for slideshow, 1 video player for video format
   - Each tile: show thumbUrl, hover reveals full controls
   - Hover controls: Download button, Reroll button

2. Reroll flow:
   - On reroll click: POST .../reroll → shimmer JUST that one tile
   - Keep polling the job until that asset updates
   - Show rerollsRemaining somewhere subtle

3. Captions sidecard (right side on desktop, bottom sheet on mobile):
   - List all captions from job response
   - Show tone label (understated, aspirational, etc.)
   - Tap caption → copy to clipboard → show "Copied!" toast

4. Sounds sidecard:
   - List all sounds
   - Show title + meta ("trending · +340% this week")
   - "Open in app" link → opens openUrl in new tab

5. Action bar at bottom:
   - "Download all" button
   - "Generate new" button → back to home

Match the mockup layout exactly. Mobile responsive.

---

## SESSION 8 — Pricing Page

Read CLAUDE.md and docs/larp-ai-api-contract.md.

Build the pricing page at app/pricing/page.tsx:

1. Three plan cards: Clipper (free), Larper, Pro Larper
2. Each card: plan name, price, credit amount, key features
3. CTA button per paid plan → calls createCheckout(plan) → redirects to Stripe checkout URL
4. Free plan: "Current plan" if already on free, no CTA needed
5. Success page at app/pricing/success/page.tsx:
   - "You're a larper now 🤍"
   - Show new credit balance (call getMe())
   - CTA: "Start larping" → home

Important: Never make earnings or income claims in the copy.
Sell fun, ease, and good-looking content — not money or success.

---

## SESSION 9 — Polish + Mobile

Read CLAUDE.md and docs/larp-ai-api-contract.md.
Visual reference: web/mockup/index.html.

Polish pass:
1. Check every page is mobile responsive (375px min width)
2. Add loading states to every button (spinner, disabled while in flight)
3. Add error boundaries — no white screens on unexpected errors
4. Empty states: what shows if getMe() fails, if no credits, etc.
5. Toast notifications for: copy caption, download complete, reroll started
6. Page transitions (subtle fade or slide)
7. Check all font usage: Inter everywhere, Instrument Serif italic ONLY on hero word
8. Favicon: use a simple "L" or larp icon
9. Check contrast ratios — #0B0B0C on #FAFAF7 is fine, check accent usage

---

## SESSION 10 — Swap Mocks for Real API

Read CLAUDE.md and docs/larp-ai-api-contract.md.

The backend is live. Swap mocks for real API calls:
1. Set USE_MOCK = false in lib/api.ts
2. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env
3. Test every flow end-to-end:
   - Sign up → logged in → credits show correctly
   - Upload selfie → uploadId returned
   - Generate → job created → polling works → results render
   - Reroll → single tile updates
   - Upgrade → Stripe checkout → credits update
4. Fix any field name mismatches (contract is source of truth)
5. Test on mobile (use Chrome devtools device mode)
6. Report any backend issues to backend dev

---

## ANYTIME — Bug fix

Read CLAUDE.md and docs/larp-ai-api-contract.md.

I'm getting this error:
[PASTE ERROR]

This happens when:
[DESCRIBE WHAT YOU WERE DOING]

File is at:
[FILE PATH]

Find and fix the bug. Tell me what was wrong in one sentence.

---

## ANYTIME — New UI component

Read CLAUDE.md and docs/larp-ai-api-contract.md.
Visual reference: web/mockup/index.html.

Build a new component: [DESCRIBE WHAT IT SHOULD DO]

Requirements:
- Match the design system (off-white bg, near-black text, champagne accent)
- Mobile responsive
- Use Inter font, Instrument Serif only for hero text
- No inline styles — use CSS modules or Tailwind
