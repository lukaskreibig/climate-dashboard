# What has to be done by hand

## The short version

Everything below this section is reference. This is the part you act on.

```bash
# 1  Rotate the Copernicus credentials at the provider.       BEFORE anything else.
#    They were pushed to a remote, so they are compromised whether or not the
#    history is rewritten. See docs/SECRET_HISTORY_REWRITE.md for the rewrite.

# 2  Start the reprocess. About two hours, unattended.
cd ~/Developer/uummannaq-ice-from-space && source .venv/bin/activate
mkdir -p out/archive
AWS_NO_SIGN_REQUEST=YES python3 scripts/preflight.py \
    --start 2017-01-01 --end 2026-12-31 --out out/archive/preflight.json
caffeinate -is scripts/run_archive.sh 2>&1 | tee out/archive/run.log

# 3  While it runs: GitHub repo variables (section 4), Railway redeploy (section 5).

# 4  When it finishes, gate the result. Non-zero exit means do not publish.
python3 scripts/check_summary.py out/archive/summary.csv \
    --expect out/archive/preflight.json \
    --baseline archive/legacy_pipeline/ice-final/summary_test.csv

# 5  Turn the scene archive into the daily series the API serves.
cd ~/Developer/climate-dashboard/data-pipeline
~/Developer/climate-dashboard/backend/.venv/bin/python refresh_fjord_season.py \
    --clean-only --raw ~/Developer/uummannaq-ice-from-space/out/archive/summary.csv
rm ~/Developer/climate-dashboard/backend/data/fjord_data.json   # stale shadow copy

# 6  Then re-check every published number against the new series (section 7).
```

Three traps, all confirmed on this machine:

* **`python3` is 3.14.6 here and has none of the dependencies.** Every command in
  the runbooks assumes the virtual environment is active. `source .venv/bin/activate`
  is not optional.
* **A Start Command set in the Railway dashboard silently overrides
  `railway.toml`**, and there is evidence that already happened once.
* **`backend/data/fjord_data.json` shadows the CSV.** If it exists and the
  database is unreachable, the API keeps serving it whatever the new series says.

What is NOT in this list, because it is a decision rather than an action: whether
to publish before the Sentinel-1 cross-check, how to word the core claim now that
it sits at p = 0.056, and whether `ndsi_solid` stays at 0.70. Section 9.

---


Everything that a human has to do before SCHMELZPUNKT can be published with the
corrected classifier behind it, in the order it has to happen, with the traps
that are known to be waiting.

Written 2026-08-04. It covers two repositories:

| | |
|---|---|
| `~/Developer/climate-dashboard` | the story, the API, the daily pipeline, the workflows |
| `~/Developer/uummannaq-ice-from-space` | the Sentinel-2 classifier that produces the fjord series |

**Every number and every path below came from a command run on this machine on
2026-08-04.** Section 11 is the verification appendix and holds the raw output.
Where something could not be verified from here, a dashboard setting or an
account state, it says so and asks you to check rather than asserting.

Companion documents, all of which stay authoritative for their own subject:

* `~/Developer/uummannaq-ice-from-space/docs/reprocessing-runbook.md`, how the archive run behaves
* `~/Developer/uummannaq-ice-from-space/docs/handoff-to-story.md`, how a finished archive reaches the API
* `~/Developer/uummannaq-ice-from-space/docs/methods.md`, what the classifier does and why
* `~/Developer/uummannaq-ice-from-space/docs/limitations.md`, what it cannot do
* `~/Developer/uummannaq-ice-from-space/docs/investigation-log.md`, how the corrections were found
* `~/Developer/uummannaq-ice-from-space/docs/generalisation.md`, what a general tool would need

---

## 0. Where things actually stand, measured today

Read this first. Several of these are worse than they look from the working
tree, and two of them are better.

| | measured state on 2026-08-04 |
|---|---|
| Repository `climate-dashboard` | public, default branch `main`, issues enabled |
| The three new workflows | **untracked**, they exist only on this machine |
| `.github/workflows/update-data.yml` | still on `origin/main`, still a daily cron that pushes to `main` |
| Live workflow state on GitHub | one workflow, `Update Data`, state **`disabled_inactivity`** |
| Repository variables | **0** |
| Repository secrets | **0** |
| Default `GITHUB_TOKEN` permission | `read` |
| Actions may create pull requests | **no** (`can_approve_pull_request_reviews: false`) |
| Deployed backend `/data` | HTTP 200, source `json-fallback`, db status **`error`** |
| Newest sea ice value served in production | **2025-07-26**, which is **374 days** old |
| Deployed backend `/uummannaq` | **HTTP 404**, on staging1 and on `https://arctic.rip/api/uummannaq` |
| NSIDC upstream | alive, newest row **2026-08-02**, so the staleness is ours, not theirs |
| GISTEMP upstream | connection refused from this machine today, see section 5.4 |
| `backend/data/fjord_data.json` | present, 241 527 bytes, untracked, and it shadows the CSV |
| Local API `/uummannaq` source header | `json-fallback`, so the local API is serving that file, not the CSV |
| Thresholds re-derived | **yes**, `config/baseline.yaml` carries the corrected values |
| Classifier test suite | **98 passed** |
| Frontend typecheck | **clean** |
| Archive reprocess | **not started**, `out/archive/` does not exist |
| Scenes the reprocess would touch | **1103** in the default window, **87.1 GB** |
| Foreign tiles the catalogue still offers | rejected now, `foreign_tiles: []` |
| Tile the run would choose | **22WDD on 99 percent of days**, matching the published archive |
| Seasons available | **2017 to 2026**, so a tenth season now exists |

Two things in that table are the whole reason this document exists.

**The story is serving data from 2025 and nothing is complaining.** The
production API falls back to a committed JSON file because the Postgres read
fails, and the fjord endpoint returns 404 outright. Nobody finds out, because
the watchdog that would find out is not on GitHub yet.

**The reprocess has not started.** Everything in section 7 depends on it.

---

## 1. The order

Dependencies first, long-running things early, irreversible things last.

```
1  Credentials                       section 2   blocks 4 and 5
2  Start the archive reprocess       section 3   about 2 hours, runs unattended
3  GitHub, while the reprocess runs  section 4
4  Railway, while it still runs      section 5
5  Verify the reprocess              section 6
6  Publish it to the story           section 6
7  Rewrite the story numbers         section 7
8  Fix the stale repository docs     section 8
9  Decide the open questions         section 9
10 Commit, deliberately              section 10
```

Steps 3 and 4 are independent of the reprocess and of each other. Step 7 cannot
start before step 5 has passed, because the numbers are its input.

---

## 2. Credentials

### 2.1 Read stream B's runbook first, if it exists

At the moment this document was written, `docs/` contained
`ARCHITECTURE.md`, `CMS_SANITY.md`, `DATA_PIPELINE.md`, `DEVELOPMENT.md`,
`FRONTEND_RUNTIME.md`, `OPERATIONS.md` and this file, and **no credential
rotation runbook**. If one has appeared since, it is the authority on which
keys rotate and in what order, and this section is only the part that touches
deployment.

### 2.2 What is where, measured

Key names only. No value was read, printed or copied anywhere.

| file | keys | tracked by git |
|---|---|---|
| `backend/.env` | `OPENROUTER_API_KEY` | no, ignored by `.gitignore:50` |
| `frontend/.env.local` | `BACKEND_INTERNAL_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_MAPTILER_KEY`, `BACKEND_PUBLIC_URL` | no, ignored by `.gitignore:51` |
| `docker/.env.dev` | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `OPENAI_API_KEY`, `PORT`, `SEAICE_*`, `BACKEND_INTERNAL_URL` | no, ignored by `.gitignore:51` |
| `docker/.env.dev.example` | same key names, example values | yes, and it is meant to be |

`git ls-files` matches none of the three real files, and `git check-ignore`
confirms each one. A token-shaped scan over the last 40 commits of the source,
docs, workflow and configuration files found nothing. That is not proof of
absence: a scan of the entire history timed out and was not completed, so if
the rotation is being driven by a suspected leak, treat the history as unproven
rather than clean.

### 2.3 The two that cannot be secret, by construction

`NEXT_PUBLIC_MAPBOX_TOKEN` and `NEXT_PUBLIC_MAPTILER_KEY` are read at
`frontend/components/MapFlyScene.tsx:28`, `frontend/lib/mapboxWarmup.ts:14` and
`frontend/lib/mapTilerLayers.ts:7`. Next.js inlines every `NEXT_PUBLIC_`
variable into the browser bundle, so both values are public the moment the site
is served. Rotating them changes the value and nothing else.

The protection for those two is a URL restriction in the Mapbox and MapTiler
dashboards, not secrecy. **I cannot see those dashboards. Check that both
tokens are scoped to `arctic.rip` and to `localhost` and to nothing else.**

`OPENROUTER_API_KEY` is different: it is read server side only
(`backend/main.py:1100` names it in the error message when it is absent) and it
is the one that costs money if it leaks.

### 2.4 After rotating

Every place a rotated value has to be re-entered:

1. The local `.env` files above.
2. Railway, per service and **per environment**. The project is `arctic change`
   and it has three environments, `production`, `staging` and `staging1`. See
   section 5.1 for the service list.
3. GitHub, only if you decide to add secrets. There are none today and none of
   the three workflows needs one: they all use the built in `GITHUB_TOKEN`.

Then redeploy. A Railway service does not pick up a changed variable until it
is redeployed.

---

## 3. Start the archive reprocess

Start this before sections 4 and 5. It takes about two hours of wall clock and
it needs nothing from you while it runs.

### 3.1 The preconditions, and which are already met

| | state |
|---|---|
| thresholds re-derived on corrected reflectance | **done**, `config/baseline.yaml` holds `ndsi_solid 0.70`, `ndsi_light 0.40`, `ndwi 0.20`, `vis_bright_min 0.10`, `nir_bright_min 0.17` |
| land mask derived from imagery | **done**, `src/uummannaq_ice/assets/landmask.tif` exists |
| the installed package is the working tree | **done**, the venv install is editable and resolves to `src/uummannaq_ice/` |
| tests pass | **done**, 98 passed |

The threshold precondition is the one the runbook warns about in bold, and it
is satisfied. Running against the old `0.52` and `0.31` would have produced an
archive to throw away.

### 3.2 The trap that will bite first

**`python3` on this machine is 3.14.6 and has no pandas, no rasterio and no
`uummannaq_ice`.** Every command in `docs/reprocessing-runbook.md` and every
recipe in the `Makefile` is written as bare `python3`. They fail immediately
unless the virtual environment is active:

```bash
cd ~/Developer/uummannaq-ice-from-space
source .venv/bin/activate
```

`scripts/run_archive.sh` additionally needs `uummannaq-ice` on `PATH`, and it
is only on `PATH` inside that venv. Without it the script exits 127 with a
clear message, which is the good case.

### 3.3 Preflight

```bash
cd ~/Developer/uummannaq-ice-from-space
source .venv/bin/activate
mkdir -p out/archive
AWS_NO_SIGN_REQUEST=YES python3 scripts/preflight.py \
    --start 2017-01-01 --end 2026-12-31 \
    --out out/archive/preflight.json
```

This downloads no pixels. Measured today: the STAC query took 210.3 s and the
whole command 3 min 35 s.

What it reported today, which differs from `docs/reprocessing-runbook.md`
section 2 in two ways that matter:

| | measured 2026-08-04 |
|---|---|
| scenes offered, whole calendar 2017 to 2026 | 1803 |
| scenes inside 1 February to 15 July, the run window | **1103** |
| scenes inside day of year 45 to 180 | 965 |
| tile mix | `22WDD: 1785, 21WXU: 18` |
| processing baselines present | 13 distinct, `02.04` through `05.12` |
| `foreign_tiles` | **`[]`** |
| `wraparound_bboxes` | **0** |
| scenes in the sun window per year | 2017 **39**, 2018 81, 2019 102, 2020 106, 2021 106, 2022 107, 2023 93, 2024 107, 2025 112, **2026 112** |

**Both warnings the runbook tells you to read are now resolved, and the runbook
has not caught up.** The foreign scenes from West Africa and the North Pacific
are rejected at the catalogue stage, with a `WARNING Rejecting ...` line each,
including `S2A_60UXB_20190418_0_L1C`, the one that had landed inside a
published season. And the tile choice no longer falls to the alphabet: the run
would be 99 percent `22WDD`, matching the published archive rather than
diverging from it. The runbook's prediction of "98 percent 21WXU" is out of
date. Fix that section when you next touch it.

The third finding is new and is a decision, not an action. See section 9.1:
**2026 offers a full tenth season, 127 scenes inside the run window.**

### 3.4 The run

```bash
caffeinate -is scripts/run_archive.sh 2>&1 | tee out/archive/run.log
```

Defaults: seasons 2017 to the current year, 1 February to 15 July of each,
output into `out/archive/`, device pinned to CPU, four attempts per season.

`caffeinate` keeps the machine awake. `mkdir -p out/archive` in section 3.3
matters here: `tee` into a directory that does not exist fails before the
script's own `mkdir` runs, and you lose the combined log.

To run 2017 to 2025 only and leave the 2026 decision for later:

```bash
caffeinate -is scripts/run_archive.sh 2017 2025 2>&1 | tee out/archive/run.log
```

### 3.5 How long, how much

Derived from today's preflight inventory at the rates measured in
`docs/reprocessing-runbook.md` section 3, which are 6.1 s and 79 MB per scene
on a clean connection:

| | 2017 to 2026 | 2017 to 2025 |
|---|---|---|
| scenes | 1103 | 976 |
| download | **87.1 GB** | 77.1 GB |
| wall clock at 12.9 MB/s | **about 1.9 h** | about 1.7 h |
| wall clock at 3 MB/s | about 8.1 h | about 7.2 h |
| PNG output on disk | about 1.0 GB | about 0.9 GB |

**The job is bounded by bandwidth, not by the classifier.** The `ETA` the
pipeline prints measures classification only and will always look faster than
the clock on the wall. If the connection is metered, 87 GB is the number that
matters.

### 3.6 Resume

Resume is the CSV. Re-run the identical command:

```bash
caffeinate -is scripts/run_archive.sh 2>&1 | tee -a out/archive/run.log
```

`SummaryWriter` skips any `(tile_id, timestamp)` already present, and the skip
happens after the metadata query and before any pixel is fetched. A resume of a
nearly finished archive costs one metadata query per season and nothing else. A
CSV torn mid row by a `SIGKILL` is trimmed on open. Nothing already downloaded
is downloaded twice.

Failure table, log locations and the per season retry behaviour are in
`docs/reprocessing-runbook.md` section 4. The one worth memorising: a `403` on
every band read means `AWS_NO_SIGN_REQUEST` is not set, and the run does not
crash, it finishes fast with an almost empty CSV.

### 3.7 Do not commit `out/`

`out/` is covered by `.gitignore:17`. Confirmed with `git check-ignore`. The
87 GB of downloads are transient and the 1 GB of PNGs stays local.

---

## 4. GitHub

None of this is live. The three workflows exist only on this machine.

### 4.1 Create the repository variables

There are zero repository variables today. `Settings > Secrets and variables >
Actions > Variables`.

| variable | needed by | if you leave it unset |
|---|---|---|
| `BACKEND_PUBLIC_URL` | `data-freshness.yml:47` | the watchdog probes `https://fastapi-backend-staging1.up.railway.app`, which is the staging backend, not production |
| `SEAICE_MAX_AGE_DAYS` | `data-freshness.yml:48` | defaults to `5`, which is fine |
| `FJORD_FRESHNESS_REQUIRED` | `data-freshness.yml:52` | defaults to `false`, so a missing fjord season warns instead of failing |
| `SEA_ICE_DAILY_CSV_URL` | `fallback-refresh.yml:71` | the two verified URLs baked into `update_pipeline.py` are used, which is fine |

Only the first one really needs setting, and it needs setting **before** the
first scheduled run, otherwise the watchdog reports on the wrong service.

`FJORD_FRESHNESS_REQUIRED` should stay `false` until the Sentinel-2 pipeline
runs on a schedule, which it does not. The comment in the workflow says the
same.

### 4.2 The setting that will silently break the pull request

Measured: `default_workflow_permissions: read` and
`can_approve_pull_request_reviews: false`.

The second one is the checkbox **`Settings > Actions > General > Workflow
permissions > Allow GitHub Actions to create and approve pull requests`**, and
it is off. `fallback-refresh.yml` ends in `gh pr create`. With that box off,
the API rejects the call and the workflow fails on its last step after doing
all its work correctly.

Two ways out, both acceptable:

* tick the box, or
* leave it off and run the workflow with `open_pull_request: false`, then open
  the pull request by hand from the branch it pushed. The branch is named
  `data/fallback-refresh-<run id>` and the run also uploads the file as an
  artifact called `backend-data-fallback`.

The first setting, the read-only default token, does **not** need changing.
Each of the three workflows declares its own `permissions:` block
(`issues: write` and `contents: read`, `contents: write` and
`pull-requests: write`, `actions: write`), which is what those blocks are for.
If a workflow nevertheless fails with a 403 on its first real run, that
assumption is the thing to revisit.

### 4.3 The ordering trap in the push itself

This one is measured and it is easy to get wrong.

`Update Data` is live on GitHub right now in state `disabled_inactivity`. Its
file is still on `origin/main` and its cron is `0 0 * * *`. It runs
`backend/update_data.py`, the second divergent copy of the pipeline, and
commits `backend/data/data.json` straight to `main`.

`schedule-keepalive.yml` walks every workflow and re-enables anything in state
`disabled_inactivity`. It does not, and cannot, distinguish the watchdog you
want back from the daily writer you are deleting.

**So delete `update-data.yml` in the same push that adds `schedule-keepalive.yml`,
or before it.** If keepalive lands first, its very first run resurrects the old
cron. With today's read-only default token the resurrected job would fail at
its `git push` step rather than write anything, so the damage is noise and a
daily red X rather than a rogue commit, but there is no reason to accept even
that.

The deletion is currently unstaged. `git status` shows ` D
.github/workflows/update-data.yml`, which means the file is gone locally and
still tracked. It has to be staged and pushed for GitHub to stop seeing it.

### 4.4 What a schedule disabled for inactivity does not do

GitHub disables scheduled workflows in a public repository after 60 days
without repository activity and **does not re-enable them when activity
resumes**. That already happened here: `Update Data` is in exactly that state.

Nothing in a workflow file prevents this, because a disabled workflow does not
run. `schedule-keepalive.yml` works around it by being `push` triggered, so
GitHub never disables it, and by calling the enable endpoint on every push to
`main`. That repairs a schedule that has already been switched off and resets
the 60 day clock.

Two consequences to keep in mind:

* A workflow you disable **by hand** shows state `disabled_manually`, not
  `disabled_inactivity`, and keepalive leaves it alone. That is deliberate.
* If the repository goes quiet for 60 days again, keepalive cannot save itself,
  because it needs a push to run. The first push after a quiet period repairs
  everything. Until that push, the schedules are dead.

### 4.5 Expect the watchdog to fail on its first run

This is correct behaviour, not a bug in the workflow. Given today's measured
production state, `data-freshness.yml` will report:

* `API health` pass
* `NSIDC daily sea ice` **FAIL**, newest value 2025-07-26, 374 days old against
  a 5 day budget
* `GISTEMP annual temperature` **WARN**, ends 2024
* `Uummannaq fjord` **WARN** by default, because `/uummannaq` returns 404

and open a GitHub issue labelled `data-freshness`. If section 5 has already
fixed the deployment, the first two go green and the issue closes itself.

---

## 5. Railway

### 5.1 What is deployed, as far as it can be seen from here

The GitHub deployment records name a project called `arctic change` with three
environments, `production`, `staging` and `staging1`, and these service names:

```
Arctic Dashboard
Arctic Project Production
Arctic Project Testserver
fastAPI backend / fastAPI Backend
Next.js Frontend
update data cron job
```

Two further projects appear, `climate-dashboard (fulfilling-charm / production)`
and `climate-dashboard (lavish-contentment / production)`. Whether those are
live or leftovers **cannot be determined from here and needs checking in the
dashboard.** Six services and three environments is a lot of surface for one
story, and every one of them is a place a rotated credential has to be
re-entered.

The Railway CLI is installed locally, version 4.35.0, if you prefer
`railway status` and `railway variables` to clicking.

### 5.2 What has to be redeployed, and why

| service | why |
|---|---|
| the data pipeline cron | `data-pipeline/railway.toml` changed: `startCommand`, `restartPolicyType`, `restartPolicyMaxRetries`. `data-pipeline/Dockerfile` changed too, it now bakes `PIPELINE_SINGLE_STAGE=1` and drops the `ENTRYPOINT`. None of that is live until a new deploy. |
| the backend | `backend/main.py` grew 415 lines and `backend/schemas.py` 39. The deployed image predates the per season sampling error, the freshness block and the `X-Climate-*` source headers. |
| the frontend | only if the story text changes land, which they will, see section 7. |

The concrete change in the cron service:

```toml
# before
restartPolicyType = "ON_FAILURE"
startCommand = "bash -lc \"python3 wait_for_db.py && PIPELINE_SINGLE_STAGE=1 python3 -u update_pipeline.py && PIPELINE_SINGLE_STAGE=1 python3 -u update_fjord_data.py\""

# after
startCommand = "sh -c \"python3 -u wait_for_db.py && python3 -u update_pipeline.py && python3 -u update_fjord_data.py\""
cronSchedule = "0 6 * * *"
restartPolicyType = "NEVER"
restartPolicyMaxRetries = 0
```

`ON_FAILURE` is the dangerous one. Railway skips the next scheduled execution
while a previous one is still `Active`, so a restart policy that keeps a failed
run alive can wedge the cron permanently after one bad day. `NEVER` lets a
failed run die and lets tomorrow's tick start clean.

### 5.3 The trap: a Start Command in the dashboard silently wins

**A Start Command set in the Railway service settings overrides `startCommand`
in `railway.toml`, and nothing tells you.** No warning in the build log, no
diff, no note in the deployment. The file says one thing, the service runs
another, and you debug the file.

That is exactly how this service drifted before. The `Dockerfile` comment
records the shape of it: a bare `ENTRYPOINT ["python3"]` turns any platform
level start command into arguments of `python3`, which is why the `ENTRYPOINT`
is gone and only a `CMD` remains.

**Open the cron service in the Railway dashboard and clear the Start Command
field so `railway.toml` is the only source.** I cannot read that field from
here. If you would rather leave it set, then set it to exactly the string
above, byte for byte, because the `Dockerfile` `CMD` and the `railway.toml`
`startCommand` are already identical to each other on purpose.

Two more dashboard settings that cannot be checked from here and can each break
the deploy quietly:

* **Root Directory.** `railway.toml` is at `data-pipeline/railway.toml`, not at
  the repository root. Railway looks for the config file relative to the
  service's root directory, so the service must have its root set to
  `data-pipeline` or the whole file is ignored, including the cron schedule.
  The same applies to `backend/railway.toml` and `frontend/railway.toml`.
* **Watch patterns.** `data-pipeline/railway.toml` declares
  `watchPatterns = ["data-pipeline/**"]`, which is repository root relative. If
  the service's root directory is `data-pipeline`, confirm the pattern still
  matches, otherwise a change to the pipeline never triggers a build.

### 5.4 Why the deployed backend is broken today, and what it is not

Measured, on `https://fastapi-backend-staging1.up.railway.app`:

```
/health      200, {"status":"ok","checks":{"database":{"status":"ok"}}}
/data        200, x-climate-data-source: json-fallback
                  x-climate-db-status: error
                  x-climate-db-host: postgres.railway.internal
/uummannaq   404
```

So `/health` says the database is fine and `/data` says the read failed. Those
two disagree and the disagreement is worth ten minutes on its own.

`/uummannaq` returning 404 follows from the code path at
`backend/main.py:971`: the database read raised, `backend/data/fjord_data.json`
is not in the image, and the CSV fallback found no CSV either, because the
backend image only carries `backend/` and the series lives in
`data-pipeline/data/` and `frontend/public/data/`. So the endpoint has nothing
to serve and raises.

**This is not an upstream problem.** The NSIDC source is alive and its newest
row is 2026-08-02, two days old. The 374 day old value the story serves is
entirely a deployment and database problem on our side.

GISTEMP is the one genuine upstream doubt: `data.giss.nasa.gov` refused the
connection from this machine today, twice, at port 443. That may be a NASA
outage or a block on this network, **it needs re-checking from the Railway
runner rather than from here.** It does not block the pipeline either way:
`fetch_annual_source` degrades to the cached copy and `check_annual_freshness`
records the lag instead of raising. Only the NSIDC daily series can abort a
run.

### 5.5 The order for this section

1. Clear or align the Start Command on the cron service (5.3).
2. Confirm the root directory of each of the three services (5.3).
3. Re-enter any rotated credential, per service, per environment (2.4).
4. Redeploy the cron service and watch one execution end to end.
5. Redeploy the backend.
6. Re-probe:

```bash
curl -sI https://fastapi-backend-staging1.up.railway.app/uummannaq | grep -i '^x-climate\|HTTP/'
curl -s  https://fastapi-backend-staging1.up.railway.app/data | python3 -c 'import json,sys;print(json.load(sys.stdin)["meta"])'
```

A good result is `x-climate-data-source: database`, `x-climate-db-status: ok`,
and a `latestSeaIceDate` within a few days of today. Anything else and the cron
did not write, whatever its log said.

---

## 6. When the reprocess finishes

### 6.1 Verify before believing it

```bash
cd ~/Developer/uummannaq-ice-from-space
source .venv/bin/activate
python3 scripts/check_summary.py out/archive/summary.csv \
    --expect out/archive/preflight.json \
    --baseline archive/legacy_pipeline/ice-final/summary_test.csv
```

Exit 0 on ACCEPT, 1 on REJECT. Fourteen gates.

To see what a real failure looks like, the same checker on the currently
published archive reports, measured today:

```
[FAIL] tiles            scenes from tile(s) that do not see this fjord: {'30QUL': 1, '60UXB': 1}
[FAIL] ranges           unknown_px: 383 negative count(s)
[FAIL] grid_accounting  368 row(s) claim more cells than the grid holds, up to 117.8% of it
REJECT: 3 failed, 6 warned, 14 gates
```

The gates are not decorative. A good result is ACCEPT, or a REVIEW you can
explain, with `season_shape` passing for every year, `scene_counts` complete
against the preflight inventory, and a `baseline` table that moves in a
direction you can account for.

Expect `header` to differ from the published file: the new layout has 25
columns including `usable`, `solid_pct_clear`, `light_pct_clear` and
`water_pct_clear`, and the published one has 22. That difference is the point
of the exercise.

### 6.2 Hand it to the story

```bash
cd ~/Developer/climate-dashboard/data-pipeline
~/Developer/climate-dashboard/backend/.venv/bin/python refresh_fjord_season.py \
    --clean-only \
    --raw ~/Developer/uummannaq-ice-from-space/out/archive/summary.csv
```

Note the interpreter. Bare `python3` has no pandas on this machine and there is
no venv under `data-pipeline/`; the backend venv has pandas 3.0.2 and numpy
2.4.4.

This turns one row per scene into one row per day, writes
`data-pipeline/data/summary_test_cleaned.csv`, copies it to
`frontend/public/data/summary_test_cleaned.csv`, prints a per season before and
after table, and recomputes the derived database tables if `DATABASE_URL` is
set.

**Read the per season table before anything else.** It is the only place the
size of the correction becomes visible in one screen.

Flags: `--no-public-copy`, `--skip-aggregate`, `--csv <path>` to write the
series somewhere else and look at it first.

### 6.3 Delete the file that shadows everything

```bash
rm ~/Developer/climate-dashboard/backend/data/fjord_data.json
```

`backend/data/fjord_data.json` exists, is 241 527 bytes, is untracked, and
**no script in either repository writes it**. `backend/main.py:971` prefers it
over the CSV and reads it at line 989. Measured right now on the local API:

```
x-climate-data-source: json-fallback
```

So the local API is serving that file today. If you update the CSV and leave
the file there, nothing changes and nothing errors.

`refresh_fjord_season.py` warns about it. Delete it, then confirm:

```bash
curl -sI http://localhost:8000/uummannaq | grep -i x-climate-data-source
```

`csv-fallback` or `database` is what you want. `json-fallback` means the file
is back.

### 6.4 The checklist

```
[ ] thresholds re-derived                                  DONE, config/baseline.yaml
[ ] preflight run, inventory saved                          out/archive/preflight.json
[ ] run_archive.sh finished, exit 0
[ ] check_summary.py ACCEPT, or an explained REVIEW
[ ] refresh_fjord_season.py --clean-only, per season table read
[ ] backend/data/fjord_data.json deleted
[ ] frontend/public/data/summary_test_cleaned.csv refreshed (the script does it)
[ ] update_fjord_data.py FJORD_KM2 and the frozen year lists reconciled
[ ] every hardcoded number in section 7 rechecked, in en.json AND de.json
[ ] scenesConfig.tsx:916 value={11} recomputed
```

---

## 7. The story

Nothing here can be done before section 6 passes, because the new numbers are
the input.

### 7.1 The two constants that are already wrong

Both in `data-pipeline/update_fjord_data.py`, which serves the database path,
and both disagree with `backend/main.py`, which serves the CSV path.

| | `update_fjord_data.py` | `backend/main.py` |
|---|---|---|
| fjord area | `FJORD_KM2 = 3450` (line 22) | `FJORD_KM2 = 257` (line 96) |
| period groups | `EARLY_YRS` and `LATE_YRS`, frozen lists (lines 20 and 21) | derived from `FJORD_LATE_START_YEAR = 2021` (line 74) |

The area is a factor of 13.4 apart and 257 is the right one: the AOI is 14.3 by
17.8 km. The wrong constant also scaled the spring anomaly, which is how the
published series came to report anomalies of up to 1367 km² over an area of
257 km².

The frozen year lists stop at 2025. **This stopped being hypothetical today:**
the catalogue offers a full 2026 season. On the database path a 2026 season
would silently vanish from `fjord_season_band`, `fjord_spring_anomaly` and
`fjord_mean_fraction` while appearing on the CSV path. Two code paths, two
answers, no error.

### 7.2 Numbers that recompute themselves

These come out of `backend/main.py` at request time and need no editing. They
need **checking**, because they are what the story shows.

| number | value today | computed at |
|---|---|---|
| season loss, early against late | **32.4 %** | `main.py:701` (CSV) and `:942` (database) |
| mean ice fraction per season | 2017 0.5904, 2018 0.6158, 2019 0.4263, 2020 0.5160, 2021 0.2194, 2022 0.5118, 2023 0.3260, 2024 0.4490, 2025 0.3235 | `main.py:661` |
| per season sampling error | now in the payload as `standardError` and `ci95` | `main.py:427`, attached at `:662` |
| freeze and breakup day | 2017 50/157, 2018 45/155, and so on | `main.py:672` |
| spring anomaly per year | 2021 the largest negative | `main.py:651`, scaled by `FJORD_KM2` |

The line numbers in `docs/handoff-to-story.md` section 5 for these were
`596`, `560`, `571` and `556`. `backend/main.py` has grown since and they no
longer point at the right code. The ones above were read out of the file today.

The 32.4 percent will move a long way. `docs/limitations.md` puts the honest
figure at about 20 percent on the cloud independent metric, with p = 0.056 over
nine seasons, and no detectable monotone trend.

### 7.3 Numbers somebody has to retype, in both languages

| what | where |
|---|---|
| `value={11}`, the breakup shift chip | `frontend/components/scenes/scenesConfig.tsx:916` |
| "about eleven days earlier" / "rund elf Tage früher" | `scenes.breakup.shift.description` in `en.json` and `de.json` |
| "about eleven days earlier on average" | `charts.ariaSummaries.breakupTiming`, both files |
| "32% less ice" / "32 % weniger Eis" | `scenes.newAbnormal.percentage`, both files |
| "about 32 percent lower" | `charts.ariaSummaries.earlyLateSeason`, both files |
| "Ice fraction, 91% maximum" / "Eisanteil, Maximum 91 %" | `charts.memoryMeasurement.legend.iceScale`, both files |
| the whole methodology box | `scenes.measurement.learnMoreContent`, both files |
| "2017 to 2025" year spans | `charts.ariaSummaries.breakupTiming` and the `charts.earlyLateSeason.*` titles |

### 7.4 The methodology box is not a number swap, it is a rewrite

`scenes.measurement.learnMoreContent` is 2839 characters in English and 3184 in
German, and it currently describes a pipeline that no longer exists in at least
six places. Listing them so none is missed:

1. **The cloud mask.** The text says four classes are output, "exactly one of
   them is used, dense cloud, at probability 0.5 and above", and "thin cloud
   and cloud shadow stay unflagged". `processing.compute_cloud_mask` now takes
   the argmax over all four classes and masks everything that is not `CLEAR`.
   Thin cloud and shadow **are** flagged, and there is no 0.5 threshold left.
   The later bullet, that they "pass straight into the ice/water decision",
   contradicts the code as well.
2. **The land mask.** The text says "a static coastline excludes rock and
   tundra". It is now derived from imagery, ships as a GeoTIFF with its own CRS
   and is reprojected per scene.
3. **The thresholds.** The text states `NDSI > 0.52`, `0.31 to 0.52` and
   `NDWI > 0.25`. The corrected values are `0.70`, `0.40 to 0.70` and `0.20`,
   and the brightness gate, `green > 0.10` and `nir > 0.17`, is missing from the
   box entirely. It should not be: it is the thing that actually separates ice
   from water, because open water's NDSI at top of atmosphere is about 0.82,
   which is **higher** than April fast ice at 0.72.
4. **The denominator.** The text says "the denominator is the whole grid, land,
   cloud and data gaps included" and draws two consequences from it. The new
   series divides by the clear cells, so the paragraph is not just numerically
   stale, it describes the opposite choice.
5. **The 91 percent ceiling and the 9 percent land share.** Both follow from
   the whole grid denominator and from the painted mask. Measured land share is
   **5.15 percent**, and with a clear-sky denominator there is no land-driven
   ceiling at all. This appears twice, in the box and in
   `charts.memoryMeasurement.legend.iceScale`.
6. **"day 45 to 181"**, in both languages. The code uses 45 to 180
   (`refresh_fjord_season.py:77` and `:78`, mirrored by `FJORD_SUN_START` and
   `FJORD_SUN_END` in `backend/main.py`). Off by one, and it was already off by
   one before any of this.

The four measured bullets in the box, which were 17.3 percent, 2 percent,
69.3 percent, 39 of 137 and 68.6 percent, all have to be recomputed from the
new series. `docs/handoff-to-story.md` section 5 shows they had already drifted
against the **old** archive; after the reprocess, and especially for the cloud
numbers, they will be far off, because changing what counts as cloud is the
point.

### 7.5 The claim itself

The honest position after all the corrections, from
`docs/investigation-log.md`:

* Direction: the later seasons have less spring ice than the earlier ones, by
  about **20 percent** on the cloud independent metric.
* Confidence: **p = 0.056** over nine seasons, below the conventional
  threshold. A monotone trend is not detectable at all, p = 0.348.
* Interannual spread, 0.111 early and 0.142 late, is nearly as large as the
  difference between the period means, 0.217.
* The result depends on two analysis choices, and across defensible choices the
  loss runs from **16 to 36 percent**.

That is a weaker claim than "32 percent less ice" and it is the one the data
support. It also matches what residents describe, which is not a steady decline
but a loss of reliability. The range across defensible choices belongs on the
page, not only in the repository.

### 7.6 German

The German text is a first-class version, not a translation. Decimal comma,
space before the percent sign, "0,70" and "32 %". And no dash used as
punctuation in either language: comma, colon, or a new sentence.

### 7.7 After editing

```bash
cd ~/Developer/climate-dashboard/frontend
yarn tsc --noEmit
yarn test --run
```

`yarn tsc --noEmit` is clean today, so any error afterwards is yours.

---

## 8. Repository documents that are now wrong

Not blocking, but this is a work sample, and a reviewer who opens `docs/` finds
these before finding the good ones.

**`docs/OPERATIONS.md`** contradicts the code in five places: it names Vercel as
the frontend host while `frontend/railway.toml` exists and `arctic.rip` resolves
to Railway; it puts the cron at 03:00 and 03:10 UTC where `railway.toml` says
`0 6 * * *`; it says "GitHub Actions mirror the daily ingest as a safety net",
which is the arrangement that was just dismantled; it still recommends
"regenerate it via `update_pipeline.py`" and committing the JSON by hand; and
its "trigger full data refresh" command is the old `bash -lc` form with the
inline `PIPELINE_SINGLE_STAGE=1`.

**`docs/DATA_PIPELINE.md`** documents `FJORD_KM2 = 3450` as if it were correct,
repeats the 03:00 and 03:10 schedule, and says the GitHub Action "commits
generated JSON when schemas change".

**`~/Developer/uummannaq-ice-from-space/docs/reprocessing-runbook.md`** section 2
warns about two things that today's preflight shows are fixed: the foreign
tiles are rejected and the tile choice now lands on 22WDD. Its scene counts
1804 and 1101 are 1803 and 1103 today, and its commands assume `python3` has
the dependencies. Section 3.3 of this document has the current numbers.

---

## 9. Open decisions, not actions

Nothing here has a right answer that can be looked up. Each one changes what
the story says.

### 9.1 Does the story include 2026?

New today. The catalogue offers **127 scenes** inside the run window for 2026
and **112** inside day 45 to 180, which is a fuller season than 2017's 39. The
published record stops at 2025-06-23.

Including it means: ten seasons instead of nine, a real gain when the whole
statistical problem is that nine is few. It also means the frozen `LATE_YRS`
list in `update_fjord_data.py` must be fixed or 2026 vanishes on the database
path (7.1), the label `"baselineYears": "2017-2020 vs 2021-2025"` at
`backend/main.py:546` becomes wrong, and every chart title and aria summary
that says "2017 to 2025" has to change.

Excluding it means saying so on the page, because the data exist.

### 9.2 Which denominator does the published number use?

The classifier now writes both. `refresh_fjord_season.py` prefers the clear-sky
columns. The whole-grid number is 35.7 percent and the clear-sky one is 22.7
percent on the published archive, and the clear-sky one is the defensible
choice. This is effectively decided, but it has never been written down as a
decision, and it is the single largest change to the headline. It belongs in
the methodology box as a stated choice with the other number named.

### 9.3 The period boundary and the season window

`docs/limitations.md` puts numbers on it:

| boundary | loss | p | | window (doy) | loss | p |
|---|---|---|---|---|---|---|
| from 2019 | 35.5 % | 0.028 | | 45 to 181 | 30.4 % | 0.032 |
| **from 2021** | **32.6 %** | **0.040** | | **60 to 151** | **32.6 %** | **0.040** |
| from 2022 | 15.7 % | 0.214 | | 60 to 120 | 26.6 % | 0.008 |
| from 2024 | 16.4 % | 0.278 | | 100 to 151 | 35.8 % | 0.056 |

The 2021 boundary has a substantive justification. The published combination
also sits near the favourable end of a range that runs from 16 to 36 percent.
Decide whether the range goes on the page or stays in the repository. It is the
first thing a hostile reviewer will look for.

### 9.4 The solid against light split

`ndsi_solid` is 0.70. The derivation over eighteen scenes argued for 0.83.
Measured against a completely frozen fjord, NDSI runs 0.687 at the 1st
percentile to 0.755 at the 99th, so at 0.83 not one cell of a frozen fjord is
solid ice. The published series is `solid + light`, so this moves no number.
It decides only what the two class names mean.

Until it is settled, **the split must not be presented as thick against thin
ice** anywhere in the story.

### 9.5 Sentinel-1

`docs/limitations.md` calls the SAR cross-check load-bearing rather than
optional, because cloud detection is the largest remaining error and radar is
the only practical way to bound it rather than estimate it. That is a project,
not a step. The decision is whether the story says "not yet validated against
an independent product" (which it already does, in the last bullet of the
methodology box) or whether publication waits.

### 9.6 How many Railway services should exist

Six services across three environments, plus two further projects named
`climate-dashboard`, for one story. Each one is a place a rotated credential
has to be re-entered and a place a stale deployment can serve old numbers.
Worth pruning, and it needs the dashboard.

---

## 10. Committing

The author commits. Two things to be deliberate about.

**`src/uummannaq_ice/assets/landmask.tif` is untracked and must be committed.**
`assets.default_landmask_path()` returns `landmask.tif` if it exists and
**silently falls back to `landmask_template.png` if it does not**. The template
is the painted 512 by 512 file that covered a constant 9.00 percent of every
frame. A clone without the GeoTIFF reintroduces the exact bug that was just
fixed, without an error, without a warning, and with plausible numbers.
`pyproject.toml` already packages `assets/*`, so the only missing step is the
commit.

Other untracked files in the classifier repository that belong in the commit:
`docs/generalisation.md`, `docs/handoff-to-story.md`,
`docs/investigation-log.md`, `docs/limitations.md`, `docs/methods.md`,
`docs/reprocessing-runbook.md`, `scripts/check_summary.py`,
`scripts/derive_landmask.py`, `scripts/derive_thresholds.py`,
`scripts/preflight.py`, `scripts/run_archive.sh`, `src/uummannaq_ice/assets/landmask.png`,
`tests/test_derive_thresholds.py`, `tests/test_partial_reads.py`,
`tests/test_reflectance.py`, `tests/test_stac.py`.

`.coverage` is untracked and **not** in `.gitignore`. Do not commit it.

In the story repository, the three workflow files and
`data-pipeline/refresh_fjord_season.py` are untracked, and the deletion of
`.github/workflows/update-data.yml` and `backend/update_data.py` has to be
staged. Section 4.3 explains why the deletion and `schedule-keepalive.yml` must
travel in the same push.

---

## 11. Verification appendix

Every path and command this document names was checked. Raw output.

### 11.1 Files exist

```
$ bash verify.sh
== files referenced by this document ==
OK      .../uummannaq-ice-from-space/docs/reprocessing-runbook.md
OK      .../uummannaq-ice-from-space/docs/handoff-to-story.md
OK      .../uummannaq-ice-from-space/docs/methods.md
OK      .../uummannaq-ice-from-space/docs/limitations.md
OK      .../uummannaq-ice-from-space/docs/investigation-log.md
OK      .../uummannaq-ice-from-space/docs/generalisation.md
OK      .../uummannaq-ice-from-space/Makefile
OK      .../uummannaq-ice-from-space/config/baseline.yaml
OK      .../uummannaq-ice-from-space/scripts/preflight.py
OK      .../uummannaq-ice-from-space/scripts/run_archive.sh
OK      .../uummannaq-ice-from-space/scripts/check_summary.py
OK      .../uummannaq-ice-from-space/scripts/derive_landmask.py
OK      .../uummannaq-ice-from-space/scripts/derive_thresholds.py
OK      .../uummannaq-ice-from-space/src/uummannaq_ice/assets/landmask.tif
OK      .../uummannaq-ice-from-space/archive/legacy_pipeline/ice-final/summary_test.csv
OK      .../climate-dashboard/.github/workflows/data-freshness.yml
OK      .../climate-dashboard/.github/workflows/fallback-refresh.yml
OK      .../climate-dashboard/.github/workflows/schedule-keepalive.yml
OK      .../climate-dashboard/data-pipeline/railway.toml
OK      .../climate-dashboard/backend/railway.toml
OK      .../climate-dashboard/frontend/railway.toml
OK      .../climate-dashboard/data-pipeline/refresh_fjord_season.py
OK      .../climate-dashboard/data-pipeline/update_pipeline.py
OK      .../climate-dashboard/data-pipeline/update_fjord_data.py
OK      .../climate-dashboard/data-pipeline/Dockerfile
OK      .../climate-dashboard/backend/data/fjord_data.json
OK      .../climate-dashboard/data-pipeline/data/summary_test_cleaned.csv
OK      .../climate-dashboard/frontend/public/data/summary_test_cleaned.csv
OK      .../climate-dashboard/frontend/locales/en.json
OK      .../climate-dashboard/frontend/locales/de.json
OK      .../climate-dashboard/frontend/components/scenes/scenesConfig.tsx

== interpreters ==
uummannaq venv 3.13.12 .../uummannaq-ice-from-space/src/uummannaq_ice/__init__.py
dashboard venv 3.13.12 pandas 3.0.2
system python3: ModuleNotFoundError: No module named 'pandas'
```

The editable install resolving to `src/uummannaq_ice/` is what guarantees the
archive run uses the corrected working tree and not an older wheel.

### 11.2 The workflows parse, and so do the Railway configs

```
$ python -c "import yaml, pathlib; ..."
.github/workflows/data-freshness.yml    OK  name='Data freshness watchdog'
    triggers=['schedule', 'workflow_dispatch']  schedule: [{'cron': '30 7 * * *'}]  jobs: ['check']
.github/workflows/fallback-refresh.yml  OK  name='Refresh JSON fallback'
    triggers=['workflow_dispatch']  jobs: ['refresh']
.github/workflows/schedule-keepalive.yml OK name='Schedule keepalive'
    triggers=['push', 'workflow_dispatch']  jobs: ['reenable']

$ python -c "import tomllib, pathlib; ..."
backend/railway.toml OK
   deploy: {'startCommand': './docker-entrypoint.sh', 'restartPolicyType': 'ALWAYS',
            'healthcheckPath': '/health', 'healthcheckTimeout': 600}
data-pipeline/railway.toml OK
   build : {'builder': 'DOCKERFILE', 'watchPatterns': ['data-pipeline/**']}
   deploy: {'startCommand': 'sh -c "python3 -u wait_for_db.py && python3 -u update_pipeline.py
             && python3 -u update_fjord_data.py"', 'cronSchedule': '0 6 * * *',
            'restartPolicyType': 'NEVER', 'restartPolicyMaxRetries': 0}
frontend/railway.toml OK
   build : {'builder': 'RAILPACK', 'buildCommand': 'npm run build', ...}

$ bash -n scripts/run_archive.sh
run_archive.sh parses OK
```

### 11.3 Every command answers to `--help`

`scripts/preflight.py`, `scripts/check_summary.py`, `scripts/derive_landmask.py`,
`scripts/derive_thresholds.py` and `data-pipeline/refresh_fjord_season.py` all
print usage. `refresh_fjord_season.py` in full, because section 6.2 depends on
the flags:

```
usage: refresh_fjord_season.py [-h] [--start START] [--end END] [--raw RAW]
                               [--csv CSV] [--dry-run] [--clean-only]
                               [--skip-aggregate] [--no-public-copy]
                               [--today TODAY]
  --clean-only      Skip the classifier; just rebuild the daily series from --raw.
  --skip-aggregate  Classify and clean but do not recompute the derived tables.
  --no-public-copy  Do not copy the result into frontend/public/data.
```

And the interpreter trap:

```
$ python3 scripts/preflight.py --help
ModuleNotFoundError: No module named 'uummannaq_ice'
$ command -v uummannaq-ice
(nothing)
$ PATH=.venv/bin:$PATH command -v uummannaq-ice
/Users/lukaskreibig/Developer/uummannaq-ice-from-space/.venv/bin/uummannaq-ice
```

### 11.4 GitHub, read from the API

```
$ gh repo view lukaskreibig/climate-dashboard --json name,visibility,defaultBranchRef,hasIssuesEnabled,isArchived
{"defaultBranchRef":{"name":"main"},"hasIssuesEnabled":true,"isArchived":false,
 "name":"climate-dashboard","visibility":"PUBLIC"}

$ gh api repos/lukaskreibig/climate-dashboard/actions/workflows --jq '.workflows[] | [.id,.state,.name,.path] | @tsv'
148190363	disabled_inactivity	Update Data	.github/workflows/update-data.yml

$ gh api repos/lukaskreibig/climate-dashboard/actions/variables --jq '.total_count'
0

$ gh api repos/lukaskreibig/climate-dashboard/actions/secrets
{"total_count":0,"secrets":[]}

$ gh api repos/lukaskreibig/climate-dashboard/actions/permissions/workflow
{"default_workflow_permissions":"read","can_approve_pull_request_reviews":false}

$ git status --short .github/
 D .github/workflows/update-data.yml
?? .github/workflows/data-freshness.yml
?? .github/workflows/fallback-refresh.yml
?? .github/workflows/schedule-keepalive.yml

$ git show origin/main:.github/workflows/update-data.yml | head -6
name: Update Data
on:
  schedule:
    - cron: '0 0 * * *'  # Runs every day at midnight UTC
  workflow_dispatch:
```

### 11.5 The deployed services

```
$ curl -sI .../fastapi-backend-staging1.up.railway.app/uummannaq
HTTP/2 404

$ curl -sD- -o/dev/null .../fastapi-backend-staging1.up.railway.app/data | grep -i '^x-climate'
x-climate-data-source: json-fallback
x-climate-db-host: postgres.railway.internal
x-climate-db-status: error
x-climate-route: /data

$ curl -s .../data | python -c 'json meta'
{"latestSeaIceDate": "2025-07-26", "latestSeaIceYear": 2025, "latestAnnualYear": 2025,
 "latestTemperatureYear": 2024, ...}

$ curl -sL -o/dev/null -w '%{url_effective} %{http_code}' https://arctic.rip
https://arctic.rip/en 200
$ /api/data       -> 200
$ /api/uummannaq  -> 404
$ /data/summary_test_cleaned.csv -> 200, 152379 bytes

$ python -c "from datetime import date; print((date(2026,8,4)-date(2025,7,26)).days)"
374
```

Local API, showing the shadowing file in action:

```
$ curl -sD- -o/dev/null http://localhost:8000/uummannaq | grep -i '^x-'
x-climate-route: /uummannaq
x-climate-data-source: json-fallback
x-climate-db-status: not-configured
```

### 11.6 Upstream sources

```
$ curl .../noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv
http=200 bytes=1884237   last row: 2026,    08,  02,      6.479, ...

$ curl .../ourworldindata.org/grapher/annual-co-emissions-by-region.csv?...
owid http=200 bytes=833069

$ curl -v https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv
* connect to 129.164.141.233 port 443 ... failed: Connection refused
* Immediate connect fail for 2001:4d0:2310:151::233: No route to host
```

Tried twice, at 45 s and 60 s timeouts. Whether this is a NASA outage or a
block on this network cannot be told from here.

### 11.7 The reprocess inventory, run today

```
$ AWS_NO_SIGN_REQUEST=YES python scripts/preflight.py --start 2017-01-01 --end 2026-12-31 --out ...
WARNING Rejecting S2B_30QUL_20200313_1_L1C: bounding box [-180, -90, 180, 90] is too large to be a granule
WARNING Rejecting S2A_60UXB_20190418_0_L1C: bounding box [-180, 51.06, 180, 90] is too large to be a granule
  ... eleven such rejections in total ...
STAC query took 210.3s
scenes offered          1803
scenes in the sun window 965  (day of year 45 to 180)
tile mix                 {'22WDD': 1785, '21WXU': 18}
per year (sun window)    {2017: 39, 2018: 81, 2019: 102, 2020: 106, 2021: 106,
                          2022: 107, 2023: 93, 2024: 107, 2025: 112, 2026: 112}
estimated wall clock     3.1 h at 6.1 s per scene
estimated download       142 GB at 79 MB per scene
!! the run would mix 2 MGRS tiles, 22WDD on 99% of days

real 3m34.63s

$ python -c "read the inventory, count 1 Feb to 15 Jul"
foreign_tiles: []
wraparound_bboxes: 0
processing_baselines: 13 distinct, 02.04 through 05.12
scenes inside 1 Feb to 15 Jul (run_archive.sh default window): 1103
per year: {2017:50, 2018:94, 2019:115, 2020:120, 2021:121, 2022:121,
           2023:106, 2024:121, 2025:128, 2026:127}
  1103 scenes at 6.1 s -> 1.87 h;  at 79 MB -> 87.1 GB;  at 3 MB/s -> 8.1 h
  976 scenes (2017 to 2025) -> 1.65 h, 77.1 GB
```

### 11.8 The validator, and the suites

```
$ python scripts/check_summary.py archive/legacy_pipeline/ice-final/summary_test.csv
[FAIL] tiles            scenes from tile(s) that do not see this fjord: {'30QUL': 1, '60UXB': 1}
[FAIL] ranges           unknown_px: 383 negative count(s)
[FAIL] grid_accounting  368 row(s) claim more cells than the grid holds, up to 117.8% of it
[PASS] season_shape     winter high, summer low in every season
REJECT: 3 failed, 6 warned, 14 gates

$ python -m pytest -q          (uummannaq-ice-from-space)
98 passed in 7.53s

$ yarn tsc --noEmit            (climate-dashboard/frontend)
exit 0, no output
```

### 11.9 Credentials, key names only

```
$ cut -d= -f1 backend/.env          -> OPENROUTER_API_KEY
$ cut -d= -f1 frontend/.env.local   -> BACKEND_INTERNAL_URL, NEXT_PUBLIC_MAPBOX_TOKEN,
                                       NEXT_PUBLIC_MAPTILER_KEY, BACKEND_PUBLIC_URL
$ cut -d= -f1 docker/.env.dev       -> POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD,
                                       OPENAI_API_KEY, PORT, SEAICE_*, BACKEND_INTERNAL_URL

$ git check-ignore -v backend/.env docker/.env.dev frontend/.env.local
.gitignore:50:.env	backend/.env
.gitignore:51:.env.*	docker/.env.dev
.gitignore:51:.env.*	frontend/.env.local

$ git ls-files --error-unmatch backend/.env docker/.env.dev frontend/.env.local
error: pathspec ... did not match any file known to git   (all three)
```

No value was read or printed. A token-shaped scan over the last 40 commits
found nothing; a scan of the whole history timed out and was not completed, so
absence is not established.
