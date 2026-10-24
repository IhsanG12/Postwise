# Postwise

**Postwise turns one sentence into a full post. You describe what you want to post, like *"5 study tips that got me through finals week"*, and get the whole thing back ready for TikTok or Instagram.**

What you get back:
- a set of slides that look like one shoot (or a short clip), each with its on-screen text
- four caption options and a few hashtags specific to the topic
- a few songs that fit the mood

It's built for personal creators like students, study and fitness pages, cooking, travel and day-in-my-life accounts. They usually already know what they want to say. The slow part is turning that into six slides that actually go together.

Built with Next.js 16 (React 19, TypeScript), Supabase (Postgres, auth, storage), Stripe, Gemini for planning, and Pollinations / Replicate for images and video.

---

## Who built what

Postwise grew out of a side project I built this summer with my friend Kaya ([KayaTuncel](https://github.com/KayaTuncel)), an app that generated AI lifestyle photos for social media. The git history shows who did what.

**Summer 2026: the first version**
- **Me:** I wrote the product brief, the API contract between the frontend and backend (`docs/api-contract.md`), the HTML mockup (`web/mockup/`) and the safety rules in `CLAUDE.md`.
- **Kaya:** he built the app itself with Claude Code using those documents. This covers the pages, API routes, auth, Stripe billing and the first generation pipeline.

**Recent update**
I recently used Claude Code to rework it into Postwise and get it deployable again. The main changes were:
- a post planner (`web/lib/generation/plan.ts`) that builds each post from the creator's one-line brief, replacing the old hardcoded scene catalog
- slide text, hashtags, and redraws that keep the same slide
- a clear message to the creator when a brief breaks the rules
- fixes for deploying on Vercel's free plan, plus unit tests and cleanup

The original brief is in `docs/v1-product-brief.md`, kept for history.

---

## How it works

Generating images is slow (about 50 seconds each), so nothing in the app waits on it. The browser creates a job, gets an id back right away, and then keeps checking on it until it's done.

```
Browser                        API routes (web/app/api)                Background job (web/lib/generation)
───────                        ───────────────────────                 ───────────────────────────────────
POST /api/generations  ──►  validate brief, charge 1 credit,
{ brief, platform,          insert job row, reply 202 { jobId }
  format, withFace }        └── after(): startGenerationJob ──────►  1. planPost(brief)        plan.ts
                                                                       2. images or video       images.ts / video.ts
GET /api/generations/:id ◄─ every 2s: progress … then the            3. captions + sounds     captions.ts / sounds.ts
                            finished post (slides, text,              4. status = complete
                            captions, hashtags, sounds)               on any failure: status = failed, refund credit
```

### 1. The planner (`web/lib/generation/plan.ts`)

This is the core of the app. One call to a text model turns the brief into a plan for the whole post:

```ts
interface PostPlan {
  title: string;
  look: string;      // shared visual style: setting, palette, light, mood
  vibe: Vibe;        // sound mood, one of a fixed list
  slides: { tag: "slide_01" | …; scene: string; text: string }[];
  captions: { text: string; tone: string }[];
  hashtags: string[];
}
```

The plan is made in **one call** instead of one call per slide because every slide has to agree with the others. All slides share the same `look`, so they read as one shoot. Slide 1's text is the hook and the slides after it have to deliver what it promises. The captions and hashtags are also written knowing what the slides say. v1 picked scenes at random and then asked a second model to caption pictures it never planned.

**Whatever the model sends back is treated as untrusted.** Before anything uses the plan, `parsePlan()` checks every field:
- it caps how long each field can be
- it replaces unknown vibes and caption tones with defaults
- it cleans up hashtags (removes `#`, lowercases them, removes duplicates and keeps at most 5)
- it pads a short slide list instead of failing the whole job

There are two kinds of failure, and they're handled differently on purpose:
- **The model is down or sends back junk.** `fallbackPlan()` builds a plain but usable plan from the brief alone, so the creator still gets a post.
- **The model refuses the brief** (for example a celebrity or fake receipts). This is never covered up. A `BriefRejectedError` goes up to the job, the job fails with the model's one-line reason, the credit is refunded and the creator sees the reason with an "Edit the brief" button.

The brief is wrapped in delimiters and labelled as a description, never as instructions. This makes it harder for a brief like "ignore the rules and…" to take over the planner, but not impossible (see Known limitations).

`planPost()` takes the model call as a parameter (`callModel`). *This is why the tests can run the real parsing and fallback logic without a network or an API key.*

### 2. Images and video (`images.ts`, `video.ts`, `style.ts`)

`style.ts` turns one slide into a prompt for the image model. It puts together the slide's scene, the post's shared `look`, a line about people (the creator's selfie as a reference, or no faces) and a style ending. The ending asks for a real phone-photo look and **no text in the image**, because image models mess up lettering.

Slide text is stored separately (`assets.slide_text`):
- the results page shows it on top of the image
- `web/lib/download.ts` draws it onto the image in the browser when the creator downloads with "Text on slides" on

*This is why the text is always sharp and the creator can turn it off.*

Images are made two at a time (`mapWithConcurrency`). One at a time took 5–6 minutes per post, and six at once hit the provider's rate limit.

**Redraw** (reroll) keeps the slide's scene and text from the saved plan and only asks for a new image. In v1 it swapped in a different random scene, which could break the post.

### 3. Captions, hashtags, sounds

Captions and hashtags come straight from the plan. Sounds are picked by the plan's `vibe` from a small, hand-picked list of real songs. This is on purpose not a model call, because a model would happily make up songs that don't exist and the links have to open real tracks.

### 4. Credits, refunds and background work

- `POST /api/generations` charges one credit up front. If anything fails later, `startGenerationJob` gives it back. Redraws work the same way with their own allowance.
- The job runs inside Next's `after()`, so the response goes out right away. Kaya's v1 started the job as a plain un-awaited promise, which a serverless host can freeze once the response is sent, leaving jobs stuck at "processing". `maxDuration = 300` gives a six-slide post enough time.

---

## Safety rules, and where the code enforces them

The rules are in `CLAUDE.md`, and this is where each one actually lives in the code:

| Rule | Enforced in |
|---|---|
| Selfies are the creator's own face, used once, then deleted | `api/uploads` stores them in the `selfies` bucket with a 10-minute expiry; `images.ts` only signs 5-minute URLs; expired ones are swept after every upload and every new post (`lib/cleanup.ts`), with a daily cron (`vercel.json`) as a backstop |
| No other real people, no impersonation | the planner's refusal rule, which produces a `brief_rejected` failure the creator can read |
| No brand logos or trademarks | planner rules + the image style suffix (`style.ts`) |
| No fake receipts, balances or earnings screenshots | the planner's refusal rule |
| No income or earnings claims in the product | UI copy; pricing sells features, not outcomes |

---

## Code tour

| Path | What's there |
|---|---|
| `docs/api-contract.md` | Every endpoint's request and response shape. Changed first, then code (rule 3 in `CLAUDE.md`). |
| `web/lib/generation/plan.ts` | Brief → post plan: prompt, validation, fallback, refusal |
| `web/lib/generation/job.ts` | Runs a job end to end; refunds on failure |
| `web/lib/generation/style.ts` | Slide → image or video prompt |
| `web/lib/generation/images.ts` | Image generation, storage upload, thumbnails, redraw |
| `web/lib/generation/video.ts` | One clip via Replicate, polled to completion |
| `web/lib/brief.ts` | Brief limits and validation, shared by the home page and the API |
| `web/lib/download.ts` | Text-on-image downloads (canvas) |
| `web/app/page.tsx` | Home: brief → platform → format → selfie or faceless → generate |
| `web/app/results/[jobId]/` | Finished post: slides, text toggle, captions, hashtags, sounds |
| `web/app/api/` | The backend: generations, uploads, billing, Stripe webhook, cron |
| `planning/migrations/` | SQL migrations, applied in order (`005` is the Postwise one) |
| `planning/*-PROMPTS.md` | The Claude Code session prompts used to build v1 |

---

## Known limitations

These are the things I'd fix next:

- **The credit check and charge aren't atomic.** The route reads the balance and then writes `balance - 1`, so two requests at the exact same moment could both get through. The fix would be a single conditional update (`… set credits = credits - 1 where credits > 0 returning credits`) as a Postgres function.
- **Refusals depend on the model.** Nothing checks the brief or the generated images a second time, and a determined brief could still talk its way past the planner.
- **The sound list goes stale.** It's real songs as of July 2026, picked by hand.
- **Expired selfies are only swept when the app is used, plus once a day.** On a quiet day a selfie can stay past its 10-minute expiry until the next request or the daily cron, because the free Vercel plan only allows one a day. A paid plan or a scheduled job in Postgres would close that gap.
- **Long jobs run inside one function call.** That's fine for six slides within `maxDuration`, but video and bigger posts should move to a real queue.
- **Video can't be redrawn yet**, and video doesn't have slide text.
- **`types.ts` doesn't cover every column**, so queries go through one untyped client (`db` in `lib/supabase.ts`) and type their results where they're used. Generating the types from the database schema would fix that.

---

## Running it

```bash
cd web
npm install
cp .env.example .env   # Supabase, Gemini, Pollinations, Replicate, Stripe keys
npm run dev            # http://localhost:3000
npm test               # unit tests (planner, brief validation, links)
npm run lint
```

For the database, run `planning/migrations/001…005` in order in the Supabase SQL editor. To click through the UI without any keys, set `USE_MOCK = true` in `web/lib/api.ts`.

### Deploying on Vercel

1. Import the repo on vercel.com and set **Root Directory** to `web`.
2. Add the environment variables from `web/.env.example`. Supabase, Gemini and Pollinations are enough for slideshows. Replicate is only needed for video and Stripe only for paid plans. Without Stripe, the billing routes answer `503 billing_unavailable` and everything else still works.
3. In Supabase → Authentication → URL Configuration, set the Site URL to your Vercel URL so sign-up emails link back to it.
