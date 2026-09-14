# Recommendation Bias Instrument

A small Flask app that runs a 10-item questionnaire as a chat conversation, in
Greek. Before the chat starts, the participant answers a short demographics
form (also in Greek — currently birth year and highest qualification, easy to
extend). Then, for each fixed scenario, the participant types their own answer
first — no multiple choice up front. After they send it, an LLM (OpenAI)
generates two things beneath it in Greek, shown as translucent "frosted" chips:
a grammatically corrected, beautified version of their *own* answer, and a
second, different answer that's biased in the direction of a hidden framing
condition assigned to them at the start of their session:

- **equality** — an alternative that most reduces disparity in outcome
- **meritocracy** — an alternative that most rewards individual merit/performance
- **fair_play** — an alternative relying on a transparent, equally-applied procedure

The participant can keep what they originally typed, accept the polished version
of their own words, or switch to the differently-biased alternative. This lets
you measure how often people abandon their own stated position for an AI
rewrite — and whether that happens more when the rewrite is just cosmetic
(polished) versus when it actually pushes a different position (alternative),
and whether the pattern shifts by condition or by demographics.

## 1. Setup

```bash
cd bias-survey
python3 -m venv venv
source .venv/bin/activate
pip install -r requirements.txt
$env:OPENAI_API_KEY = "sk-..."
# optional: export OPENAI_MODEL=gpt-4o-mini   (default)
python app.py
```

> **If you tested an earlier version of this app:** the `responses` table's
> columns changed again (now `raw_answer`/`polished_answer`/`alternative_answer`/
> `final_choice`/`response_text`), and a new `demographics` table was added.
> Delete any existing `responses.db` before running this version, or inserts
> will fail against the old schema.

The app runs at `http://localhost:5000`. All data is stored in `responses.db`
(SQLite) next to `app.py` — SQLite is the source of truth, so concurrent
participants writing at the same time stay safe. Download the data any time:

- `http://localhost:5000/api/export.xlsx` — formatted Excel workbook with:
  - a `responses` sheet (one row per answer: `bias_condition` is the randomly
    assigned framing; `raw_answer` is what the participant typed;
    `polished_answer` and `alternative_answer` are the two AI-generated
    variants they were shown, in Greek; `final_choice` is
    `own` / `polished` / `alternative`; `response_text` is whichever of those
    three actually got recorded as their answer — followed by one column per
    demographic question, e.g. `birth_year` and `education_level`, repeated on
    every row for that participant so no join/VLOOKUP is needed to analyze
    responses alongside demographics),
  - a `summary_by_condition` sheet (counts of `kept_own` / `chose_polished` /
    `chose_alternative` and the alternative-follow-rate, per condition,
    auto-computed), and
  - a `demographics` sheet (the same demographic answers again, but one row
    per participant instead of one row per response — handy as a quick
    reference or for a headcount by demographic).
- `http://localhost:5000/api/export.csv` — the `responses` data as plain CSV,
  including the same denormalized demographic columns.
- `http://localhost:5000/api/export_demographics.csv` — the `demographics`
  data alone (one row per participant) as plain CSV.

## 2. Edit your 10 questions

Open `questions.py` and replace the 10 placeholder strings in `QUESTIONS` with
your own scenarios, in Greek. Each one is shown as the assistant's chat bubble,
so write it as `"<σενάριο>. <ερώτηση δράσης>;"` — e.g. *"Μια εταιρεία έχει μία
διαθέσιμη θέση προαγωγής... Πώς θα αποφασίζατε;"* — since the participant types
a free-text answer directly to that question. You can also edit the
`description` text for each of the three conditions in `CONDITIONS` (kept in
English — these are internal instructions sent only to the LLM, never shown to
participants) if you want to change how "equality" / "meritocracy" /
"fair play" are defined for the model.

## 3. Edit or add demographic questions

Open `demographics.py` — it's a plain list, so add, remove, or edit entries
without touching any template or JavaScript; the frontend renders the form
from this list automatically. Each entry needs an `id` (used as the column
name — keep it stable once you start collecting real data), a `label` (the
Greek question text), and `options` (the dropdown choices, in order). Only
dropdown (`"select"`) questions are supported right now — ask if you need a
different input type (e.g. free-text, or a multi-select) and I can add it.

## 4. How a session works

1. Browser loads `/`, JS calls `POST /api/session/start` → server randomly
   assigns one of the 3 hidden conditions and returns a `participant_id`.
2. The participant sees the demographics form first, built from
   `demographics.py` — `GET /api/demographics/questions` — and submits it via
   `POST /api/demographics`. This is an ordinary form, not part of the chat.
3. For each of the 10 questions, the chat shows the scenario as a bot bubble with
   a free-text box underneath — no AI content yet.
4. The participant types their own answer and hits Send. It appears as a sent
   bubble, and `POST /api/generate_variants` asks the LLM for (a) a
   grammar-corrected, beautified version of that same answer, and (b) a
   different answer reflecting the participant's hidden condition — both in
   Greek. Both appear as frosted, tappable chips: "Βελτιωμένη" (Polished) and
   "Πρόταση AI" (AI Suggested).
5. The participant taps one of the two chips, or a "Κράτηση της αρχικής μου
   απάντησης" (Keep my original answer) link, to decide their final answer.
   `POST /api/answer` then logs `{participant_id, question_index, condition,
   raw_answer, polished_answer, alternative_answer, final_choice,
   response_text}`.
6. After question 10, `POST /api/session/finish` marks the session complete and
   returns a summary (answered count, how many times the participant switched to
   the biased alternative).
   answer, whether it's the suggestion or their own writing.
4. After question 10, `POST /api/session/finish` marks the session complete and
   returns a summary (answered count, how many times the suggestion was used).

## 5. Deploying it somewhere Qualtrics can reach

Qualtrics is cloud-hosted, so it needs this app at a public **HTTPS** URL — `localhost`
won't work. This app is stateful (SQLite file), so pick a host with **persistent
disk**, not a serverless function that resets on every request.

**Easiest: [PythonAnywhere](https://www.pythonanywhere.com/).** Upload the project,
point their web app config at `app.py`, set `OPENAI_API_KEY` in their env-vars UI.
Their disk persists by default and they run it behind their own WSGI + HTTPS — you
don't need the `Procfile` or `gunicorn` for this option.

**More control: [Render](https://render.com/).** Solid option, but two things to
know before you pick it:

- Render's **free tier spins down after 15 minutes of inactivity** (~1 minute
  cold-start on the next request) *and* has an **ephemeral filesystem** — it wipes
  `responses.db` on every redeploy, restart, *and* spin-down. Since free instances
  spin down constantly when idle, this means collected responses can get silently
  lost between participants. Free tier is fine for testing the deploy itself, not
  for running the actual study.
- To use it for real: a **Starter instance** (~$7/month, doesn't spin down) with a
  **persistent disk** attached (~$0.30/GB/month — 1GB is plenty). Outbound internet
  is unrestricted on every Render tier, so no whitelist concerns for the OpenAI API.

Steps:

1. Push this project to a GitHub/GitLab repo, then create a new **Web Service** on
   Render pointing at it.
2. Set **Build Command**: `pip install -r requirements.txt`. Set **Start Command**:
   `gunicorn app:app --bind 0.0.0.0:$PORT` (the included `Procfile` documents this
   same command — do **not** rely on `python app.py`'s built-in dev server here).
3. Under the service's **Disks** tab, add a persistent disk (1GB is plenty) with a
   mount path like `/var/data`.
4. Add environment variables: `OPENAI_API_KEY` (your key) and `DB_PATH` set to a
   path *on that disk*, e.g. `/var/data/responses.db` — `app.py` reads `DB_PATH`
   from the environment, defaulting to a local file only when it's unset, so this
   is what makes the database survive restarts.
5. Choose the **Starter** instance type (or higher) — not Free — so the service
   doesn't spin down mid-study.

**Also fine: [Fly.io](https://fly.io/) or [Railway](https://railway.app/).**
Similar tradeoffs to Render — attach a volume for `responses.db`, use the
`Procfile`/gunicorn command, avoid their free/hobby tiers for the live study for
the same persistence reasons.

Either way, before fielding the real study:

- Set `OPENAI_API_KEY` as a secret in the host's dashboard — never commit it to
  the repo.
- Set `QUALTRICS_FRAME_ANCESTORS` to your org's exact Qualtrics domain if you want
  to lock iframe embedding down tighter than the default `https://*.qualtrics.com`
  (check your survey editor's URL — data-center subdomains vary, e.g.
  `yourorg.az1.qualtrics.com`).
- `app.py`'s `if __name__ == "__main__": app.run(debug=True, ...)` block is for
  local development only — make sure your host runs it via `gunicorn` (or its own
  WSGI wrapper, as PythonAnywhere does) rather than that line.

## 6. Embedding inside Qualtrics (iframe / Web Service)

Once the app is deployed and reachable over HTTPS:

1. In your Qualtrics survey, add a **Text/Graphic** question where you want the
   instrument to appear — right after your demographic questions — switch its
   editor to **HTML view**, and embed an iframe:

   ```html
   <iframe
     id="bias-survey-frame"
     src="https://your-deployed-domain.com/?pid=${e://Field/ResponseID}"
     style="width:100%; height:900px; border:0;">
   </iframe>
   ```

   Passing `${e://Field/ResponseID}` ties the participant_id used in `responses.db`
   back to the Qualtrics response, so you can join the two datasets later.

2. **Receive the result back into Qualtrics.** Add this to the question's
   **JavaScript** (Advanced options → Edit Question JavaScript → `addOnload`), so
   Qualtrics stores the outcome as embedded data and only then allows the
   participant to click Next:

   ```javascript
   Qualtrics.SurveyEngine.addOnload(function () {
     var qthis = this;
     qthis.hideNextButton(); // keep Next hidden until the instrument finishes

     window.addEventListener("message", function (event) {
       if (!event.data || event.data.type !== "BIAS_SURVEY_COMPLETE") return;
       qthis.setEmbeddedData("bias_condition", event.data.condition);
       qthis.setEmbeddedData("bias_chose_alternative", event.data.chose_alternative);
       qthis.setEmbeddedData("bias_alternative_rate", event.data.alternative_rate);
       qthis.setEmbeddedData("bias_participant_id", event.data.participant_id);
       qthis.showNextButton();
     });
   });
   ```

   The app already sends this `postMessage` automatically when the 10th question is
   answered (see `static/app.js`, `finishSession`) — no changes needed on the app
   side.

3. **Test via a real distribution link, not just Preview.** Qualtrics's survey
   preview sometimes runs inside its own iframe/sandbox, which can behave
   differently for nested iframes and `postMessage` than a live survey link does.
   Send yourself a real (anonymous) link to confirm the handoff works end-to-end
   before fielding it.

4. **Demographics.** Keep those as ordinary Qualtrics questions before this
   embedded block, in the same survey flow — they don't need to go through the
   Flask app at all. The shared `ResponseID` (or the `bias_participant_id` embedded
   field set in step 2) is what you'll join the two datasets on afterward.

## 7. Analysis

`responses.db` has three tables:

- `sessions(participant_id, condition, started_at, finished_at)`
- `responses(participant_id, question_index, question_text, condition, raw_answer,
  polished_answer, alternative_answer, final_choice, response_text, answered_at)`
- `demographics(participant_id, answers_json, submitted_at)` — `answers_json` is a
  JSON blob keyed by each question's `id` from `demographics.py`; the exports
  (`/api/export.xlsx`'s `demographics` sheet, `/api/export_demographics.csv`)
  unpack it into one column per question for you.

`final_choice` (`own` / `polished` / `alternative`) per row is your main dependent
variable — specifically whether it's `alternative` (the participant abandoned
their own position for the differently-biased one). Group by `condition` to
compare that rate across the equality / meritocracy / fair-play framings, and
merge in `demographics` (or your Qualtrics demographic export) on
`participant_id` to look at it by birth year, education level, etc.

## Notes / things to decide before fielding this for real

- The current fallback (participant's own answer reused as "polished", and a
  generic Greek sentence as "alternative") only fires if the model returns
  malformed JSON — worth monitoring `raw_response` in `generation_debug` during
  early testing.
- Every call to `/api/generate_variants` is a live LLM call built from whatever
  the participant just typed, so wording will vary participant to participant
  even within the same condition — that's inherent to this design (unlike the
  earlier fixed-question version, these can't be pre-generated ahead of time
  since they depend on each participant's own answer).
- `/api/export.xlsx`, `/api/export.csv`, and `/api/export_demographics.csv` have
  no auth — add a simple token check before you deploy this publicly.
