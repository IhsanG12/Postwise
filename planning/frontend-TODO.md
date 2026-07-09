# Larp AI — Frontend Build Plan

Work through these phases in order. Check off as you go.
Reference: web/mockup/index.html is the full visual + behavioral spec.

---

## Phase 0 — Setup (already done)
- [x] Next.js project initialized in /web
- [x] TypeScript configured
- [x] Install dependencies: `npm install`
- [x] Set up fonts: Inter (UI) + Instrument Serif (hero word only)
- [x] Set up global CSS variables:
  - Background: `#FAFAF7` (off-white)
  - Text: `#0B0B0C` (near-black)
  - Accent: `#B8945F` (champagne)
- [x] Replace default page.tsx with blank Larp AI shell
- [x] Remove default Next.js public SVGs

---

## Phase 1 — Auth (Days 1–2)
- [x] Set up Supabase Auth (use same Supabase project as backend)
- [x] Sign up page
- [x] Log in page
- [x] Auth redirect logic (logged out → login, logged in → home)
- [x] Session handling so API calls include auth token

---

## Phase 2 — Mock API Layer (Days 1–2, parallel with auth)
- [x] Create /lib/api.ts with all API call functions
- [x] Create /lib/mock.ts with fake responses matching contract shapes exactly
- [x] Toggle: use mocks when backend isn't ready, real fetch when it is
- [x] Test every mock returns the exact contract shape

---

## Phase 3 — Page 1: Home / Platform Picker (Day 2)
- [x] Platform picker: Instagram or TikTok (big tap targets)
- [x] Format picker: Slideshow or Video
- [x] Face mode toggle: With selfie / Faceless
- [x] "Generate" CTA button
- [x] Credit indicator in nav (calls GET /api/me)
- [x] Block generate if withFace=true and no selfie uploaded yet

---

## Phase 4 — Selfie Upload Flow (Day 3)
- [x] Upload UI: tap to upload photo
- [x] Calls POST /api/uploads (multipart/form-data)
- [x] Show preview thumbnail after upload
- [x] Store uploadId in state
- [x] Privacy note: "Your photo is used only for this generation and deleted immediately after."
- [x] Error handling: wrong file type, too large (size/type validation on client before upload)

---

## Phase 5 — Generation + Loading (Day 3–4)
- [x] On generate: POST /api/generations → get jobId
- [x] Poll GET /api/generations/:jobId every 2 seconds
- [x] Show shimmer skeleton grid while processing
- [x] Update progress if available
- [x] On complete: render results
- [x] On failed: show "Generation hiccuped — try again" with retry button
- [x] On 402: show upgrade prompt modal ("You're out of credits — upgrade to keep larping")

---

## Phase 6 — Results Page (Day 4–5)
- [x] Image grid (slideshow: 6 tiles, video: 1 player)
- [x] Each tile: hover shows download + reroll buttons
- [x] Reroll: POST .../reroll → shimmer just that tile → poll until asset URL changes (max 10 × 2s)
- [x] Captions sidecard: list of captions with tone labels, tap to copy ("Copied!" flash)
- [x] Sounds sidecard: list of sound suggestions with "Open in app" link
- [x] Download button per image (fetch+blob with new-tab fallback)
- [x] "Download all" button (sequential, 300ms gap between files)
- [x] "Generate new" button → home
- [x] rerollsRemaining pulled live from GET /api/me, updated from reroll API response
- [x] Results page at /results/[jobId] — canonical URL; generation page redirects here on complete

---

## Phase 7 — Pricing / Upgrade (Day 5–6)
- [x] Pricing page: Clipper (free), Larper, Pro Larper
- [x] "Upgrade" CTA → calls POST /api/billing/checkout → redirect to Stripe
- [x] Success page after Stripe checkout
- [x] Credits display updates after upgrade (getMe() on success page mount)

---

## Phase 8 — Polish (Day 6–7)
- [ ] Mobile responsive (check mockup — it's already mobile-first)
- [ ] Loading states on all buttons
- [ ] Error states on all API calls
- [x] Empty states
- [ ] Page transitions
- [x] Favicon + meta tags (title: "Larp AI", description: "AI luxury content for Instagram & TikTok")
- [x] Replace "Create Next App" title in layout.tsx with "Larp AI"
- [x] Add Inter + Instrument Serif fonts in layout.tsx

---

## Phase 9 — Integration with real backend (Day 7)
- [x] Swap mock API layer for real fetch calls
- [x] Test full flow end-to-end with backend dev
- [x] Fix any field name mismatches (contract is source of truth)
- [ ] Test on mobile

---

## Design tokens (from mockup)
```css
--bg: #FAFAF7;
--fg: #0B0B0C;
--accent: #B8945F;
--font-ui: 'Inter', sans-serif;
--font-hero: 'Instrument Serif', serif; /* italic, hero word only */
--radius: 12px;
--shimmer: linear-gradient(90deg, #ebebeb 25%, #f5f5f5 50%, #ebebeb 75%);
```
