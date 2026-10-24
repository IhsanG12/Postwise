# Postwise

Describe a post in one sentence, like *"5 study tips that got me through finals week"*, and get the whole thing back, ready to post on TikTok or Instagram:

- a set of slides that look like one shoot (or a short clip), each with its on-screen text
- four caption options and a few topic-specific hashtags
- a few songs that fit the mood

It's for personal creators: students, study and fitness pages, cooking, travel, day-in-my-life. They know what they want to say, and the slow part is turning that into six slides that hang together.

Built with Next.js 16 (React 19, TypeScript), Supabase (Postgres, auth, storage), Stripe, Gemini for planning, and Pollinations / Replicate for images and video.

---

## Who built what

Postwise grew out of a side project I built this summer with my friend Kaya ([KayaTuncel](https://github.com/KayaTuncel)): an app that generated AI lifestyle photos for social media. The git history shows the split.

**Summer 2026: the first version**
- **Me:** the product brief, the API contract between frontend and backend (`docs/api-contract.md`), the HTML mockup (`web/mockup/`), and the safety rules in `CLAUDE.md`.
- **Kaya:** the app itself, built with Claude Code from those documents. That covers the pages, API routes, auth, Stripe billing, and the first generation pipeline.

**Recent update**
I recently used Claude Code to rework it into Postwise and get it deployable again. The main changes:
- a post planner (`web/lib/generation/plan.ts`) that builds each post from the creator's one-line brief, in place of the old hardcoded scene catalog
- slide text, hashtags, and redraws that keep the same slide
- a clear message to the creator when a brief breaks the rules
- fixes for deploying on Vercel's free plan, plus unit tests and cleanup

`docs/v1-product-brief.md` is the original brief, kept for history.

---

## How it works

Generation is slow (about 50 seconds per image), so nothing waits on it. The client creates a job, gets an id back immediately, and polls.

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

This is the core of the app. One text-model call turns the brief into a plan for the whole post:

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

The plan is made in **one call**, not one call per slide, because every slide has to agree with the others. All slides share `look`, so they read as one shoot. Slide 1's text is a hook, and the later slides have to deliver what it promises. Captions and hashtags are written knowing what the slides say. v1 picked scenes at random, then asked a second model to caption pictures it hadn't planned.

**Model output is treated as untrusted input.** `parsePlan()` checks every field before anything uses it:
- It caps field lengths.
- It replaces unknown vibes and caption tones with defaults.
- It normalises hashtags (strips `#`, lowercases, removes duplicates, keeps at most 5).
- It pads a short slide list instead of failing the job.

Two kinds of failure are handled differently on purpose:
- **The model is down or returns junk.** `fallbackPlan()` builds a plain but usable plan from the brief alone. The creator still gets a post.
- **The model refuses the brief** (for example, a celebrity or fake receipts). This is never papered over. `BriefRejectedError` travels up to the job, the job fails with the model's one-line reason, the credit is refunded, and the UI shows the reason with an "Edit the brief" button.

The brief is wrapped in delimiters and labelled as a description, never as instructions. That makes it harder for a brief like "ignore the rules and…" to override the planner, though not impossible (see Known limitations).

`planPost()` takes the model call as a parameter (`callModel`), so the tests run the real parsing and fallback logic without a network or an API key.

### 2. Images and video (`images.ts`, `video.ts`, `style.ts`)

`style.ts` turns one slide into a model prompt. It combines the slide's scene, the post's shared `look`, a people directive (the creator's selfie as a reference, or no faces), and a style suffix. The suffix asks for a real phone-photo look and **no text in the image**, because image models garble lettering.

Slide text is stored separately (`assets.slide_text`):
- The results page shows it as an overlay.
- `web/lib/download.ts` draws it onto the image in the browser when the creator downloads with "Text on slides" on.

So the text is always crisp, and the creator can turn it off.

Images are generated two at a time (`mapWithConcurrency`). One at a time took 5–6 minutes per post, and six at once tripped the provider's rate limit.

**Redraw** (reroll) keeps the slide's scene and text from the saved plan and only asks for a new image. v1 swapped in a different random scene, which could break the post.

### 3. Captions, hashtags, sounds

Captions and hashtags come straight from the plan. Sounds are picked from a small, hand-curated list of real songs by the plan's `vibe`. It's deliberately not a model call: a model would happily invent songs that don't exist, and links have to open real tracks.

### 4. Credits, refunds and background work

- `POST /api/generations` charges one credit up front. If anything fails later, `startGenerationJob` refunds it. Redraws work the same way, with their own allowance.
- The job runs inside Next's `after()`, so the 202 goes out immediately. Kaya's v1 started the job as a plain un-awaited promise, which a serverless host can freeze once the response is sent, leaving jobs stuck at "processing". `maxDuration = 300` gives a six-slide post enough time.

---

## Safety rules, and where the code enforces them

The rules are in `CLAUDE.md`. Here is where each one lives in the code:

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

These are the things I'd fix next.

- **Credit check and charge aren't atomic.** The route reads the balance, then writes `balance - 1`, so two requests at the same instant could both pass. The fix is a single conditional update (`… set credits = credits - 1 where credits > 0 returning credits`) as a Postgres function.
- **Refusals depend on the model.** There's no second, independent check of the brief or of the generated images, and a determined brief could still talk its way past the planner.
- **The sound list goes stale.** It's real songs as of July 2026, picked by hand.
- **Expired selfies are swept when the app is used, plus once a day.** On a quiet day a selfie can outlive its 10-minute expiry until the next request or the daily cron (the free Vercel plan's minimum interval). A paid plan or a Postgres scheduled job would close that gap.
- **Long jobs live inside one function call.** That's fine at six slides within `maxDuration`. Video and bigger posts should move to a real queue.
- **Video can't be redrawn yet**, and video has no slide text.
- **`types.ts` doesn't model every column**, so queries go through one untyped client (`db` in `lib/supabase.ts`) and type their results at each call site. Generating the types from the schema would remove that.

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

Database: run `planning/migrations/001…005` in order in the Supabase SQL editor. To click through the UI without any keys, set `USE_MOCK = true` in `web/lib/api.ts`.

### Deploying on Vercel

1. Import the repo on vercel.com and set **Root Directory** to `web`.
2. Add the environment variables from `web/.env.example`. Supabase, Gemini and Pollinations are enough for slideshows. Replicate is only for video, and Stripe only for paid plans; without Stripe, billing routes answer `503 billing_unavailable` and everything else works.
3. In Supabase → Authentication → URL Configuration, set the Site URL to your Vercel URL so sign-up emails link back to it.
