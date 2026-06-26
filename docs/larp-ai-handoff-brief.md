# Larp AI — Project Handoff Brief

A complete summary of the project so anyone (or any new session) can pick it up
cold. Pair this with the three working files: `CLAUDE.md`, the API contract, and
the HTML mockup.

---

## 1. What the product is
Larp AI is a web app (mobile app later) that makes "larp" content — fun,
aspirational, AI-generated luxury photos and short videos for social media.
"Larping" = playfully presenting a fake luxury lifestyle online; it's a real,
current internet trend.

**Positioning:** an entertainment / lifestyle content tool. Voice is fun and
self-aware — "everyone's larping, we made it good," "live your best fake life,"
"larp it till you make it." It is NOT sold as a way to make money or achieve
real-world success (see safety rules).

**The wedge:** competitors (LarpGPT, MWM's LARP, App Store luxury-AI apps,
Telegram prompt-sellers) are either prompt packs or thin one-shot scene
generators. Larp AI is a *platform-tailored content kit* — pick Instagram or
TikTok, get a whole post (photos or video) + captions + sound suggestions, ready
to publish. Easier and more complete than the competition.

## 2. The user flow (built in the mockup)
1. **Home / platform picker** — intro + two big cards: Larp for Instagram /
   Larp for TikTok.
2. **Format select** — Slideshow (6–7 photos, cheap) or Short video (premium).
3. **Selfie step** — upload your own selfie, OR skip for faceless luxury content
   (money/watches/cars/scenery — often the more viral, cheaper, safer path).
4. **Results** — swipeable image set; save each or **reroll a single image**;
   plus caption ideas and trending-sound suggestions, both tailored to the
   platform and to what was actually generated.

## 3. Design direction (approved)
Clean / minimal / Apple-like. Off-white canvas (`#FAFAF7`), near-black ink
(`#0B0B0C`), one restrained champagne accent (`#B8945F`), lots of whitespace.
Type: Inter for UI, Instrument Serif (italic) for the hero word only. The calm
interface intentionally contrasts with the over-the-top content — that contrast
is the credibility and the joke. Full visual reference = the HTML mockup file.

## 4. Tech architecture
Frontend (Next.js/React, TypeScript) → our own backend API → AI providers.

- **Frontend** collects choices + selfie, calls our `/api/...` endpoints, shows
  loading states, renders results. No AI logic, no keys.
- **Backend** holds all secret keys, calls the AI models, runs the generation
  job, returns clean JSON. Owns model choice, cost/credits, storage, safety.
- **AI providers** (backend only): an image model (e.g. Gemini/"Nano Banana"
  class) for stills, a short-video model (e.g. Higgsfield/Veo/Kling class) for
  clips, and a text model for captions. These are swappable behind the backend;
  pick based on current cost/quality/ToS — re-check, they change fast.

**Key technical patterns:**
- Generation is **async**: create job → return `jobId` → client polls until
  complete. (Image/video gen is slow; never block on one long request.)
- **Captions + sounds are generated server-side inside the job**, informed by
  what was generated + the platform, so they're relevant and change every time.
- **Library-first for cost control:** pre-generate and own a library of luxury
  backplates/clips; do light per-user compositing rather than full live
  generation for everything. Reserve full live generation for the premium tier.
  Per-image reroll is metered (credits/limits) because each one costs money.

## 5. Business model
Subscription, three tiers (from the original plan):
- **Clipper** — entry/low; limited generations, watermarked, basic scenes.
- **Larper** — core/hero tier; unlimited photo larps, full library, no
  watermark, captions, dashboard / "larp score."
- **Pro Larper** — premium; video generation, the LinkedIn "professional"
  pack (AI headshots / profile polish, marketed in a genuinely professional
  voice), priority/fastest generation.

## 6. Go-to-market
TikTok-led. A main brand account plus 2 differentiated content accounts: one
clean/aspirational, one comedy/meta (the self-aware "we all know it's fake"
angle, which is what's actually winning). Best single piece of marketing: a
creator posting a great larp then revealing "here's the app I use" — sells the
tool and the fun, never an outcome. LinkedIn gets its own professional persona.
Domain owned: **larpai.app**.

## 7. Safety / legal rules — NON-NEGOTIABLE
These keep the product in the safe "neutral creative tool" lane (like FaceTune)
and out of fraud/deception territory. They're encoded in `CLAUDE.md` too.

1. **Generate fake, never alter real.** Especially: never edit a user's real
   financial document (Stripe dashboard, bank statement, receipt). Generate
   obviously-fictional aspirational scenes instead.
2. **Selfie = the user's own face**, used only to generate their content, then
   deleted. No uploading other people's faces; no impersonating real,
   identifiable individuals (deepfake/likeness risk).
3. **No real brand logos / trademarks** baked into generated images or into
   marketing scene-names. Generic luxury (a supercar, a watch) is fine; badges
   and brand names are the exposure. (Depicting a car *shape* is low-risk;
   logos + using brand names in marketing is the real risk.)
4. **Currency must be obvious prop money**, not faithful reproductions of real
   banknotes (US reproduction rules).
5. **No earnings / income / "this makes you money" claims** anywhere — UI,
   marketing, or the funnel accounts. Reason: an earnings claim attached to a
   product you sell must be substantiable and point at a *legitimate* income
   mechanism. Short larp clips don't qualify for platform creator-payouts
   (those need longer content), so the claim would also be factually false.
   Sell **fun, ease, good-looking content** — not money.
6. **Disclaimer is backup, not defense.** What protects us is the product being
   a genuine neutral tool. Keep one honest disclaimer; don't rely on it to
   excuse a feature whose main use is deception.
7. Taglines like "larp it till you make it" are fine as standalone vibe/wordplay
   — just never pair them with a concrete money/outcome claim.

## 8. The files that go with this brief
- **`CLAUDE.md`** → repo root. Standing instructions both Claude Code sessions
  auto-read every session (project summary, stack, architecture + safety rules).
- **`docs/larp-ai-api-contract.md`** → the frontend↔backend agreement; exact
  request/response shapes. Source of truth. *Change the doc first, then code.*
- **HTML mockup** → the visual + behavioral reference for the frontend. It is a
  prototype with placeholder data, NOT the real frontend. The real frontend gets
  built in Next.js from it.

## 9. Team & workflow
Two people: a frontend dev and a backend dev, both using Claude Code.
- One shared **private** GitHub repo (monorepo): `/frontend`, `/backend`,
  `/docs`.
- Both clone it; **pull before working, commit + push often.**
- Each starts their Claude Code session by telling it to read `/CLAUDE.md` and
  `/docs/larp-ai-api-contract.md`, then build their side to the contract.
- Frontend can build fully against a **mock API layer** that returns the
  contract's shapes, before the backend exists; swap mocks for real `fetch`
  calls when endpoints are live.

## 10. Current status & next steps
- Done: concept, positioning, design direction, interactive mockup, API
  contract, CLAUDE.md, safety rules.
- Next: create the shared private repo; add the three files; each dev opens
  Claude Code on their side and builds to the contract (frontend with a mock API
  layer first). Then connect (swap mocks for real endpoints) and test the full
  async flow end to end.
- Open decisions to settle with the team: auth method (cookie vs token); whether
  reroll polls the whole job or a single-asset endpoint; whether the video format
  is one stitched clip or multiple short clips; which specific AI providers to
  use (decide on current cost/quality/ToS).
