# Leaked credentials in git history: findings and rewrite runbook

**Status: investigation and plan only. Nothing has been rewritten, nothing has been
force-pushed, no credential has been rotated.** Every number below comes from a command
that was run against the two repositories on 2026-08-04. The commands are reproduced in
the appendix so the findings can be re-checked.

Two repositories are affected:

| Repository | Remote | Visibility | Forks |
| --- | --- | --- | --- |
| `climate-dashboard` | `git@github.com:lukaskreibig/climate-dashboard.git` | public | 1 |
| `uummannaq-ice-from-space` | `git@github.com:lukaskreibig/uummannaq-ice-from-space.git` | public | 0 |

---

## 0. The short version

1. **Rotate both credentials at the provider. Today, before anything else.** Section 4.
2. Back up both repositories as bare mirrors. Section 6.
3. Rewrite history with `git filter-repo --replace-text`. Section 7.
4. Verify the secret is gone from every ref, every reflog and every packed object. Section 8.
5. Force-push branches, not `--mirror`. Section 9.
6. Re-clone every working copy. Delete the old ones. Section 10.
7. Accept that one public fork and eight GitHub pull request refs will still hold the old
   objects. Only rotation fixes that. Section 3.3.

The rewrite is cosmetic hygiene. Rotation is the actual remediation.

---

## 1. What leaked

### 1.1 Copernicus Data Space OAuth client (both repositories)

A Sentinel Hub style OAuth client id and its client secret, assigned as plain string
literals in a notebook code cell:

```
client_id     = "sh-<uuid, 39 characters in total>"
client_secret = "<32 characters, mixed case and digits>"
```

Neither the values nor their opening characters are written into this document, because it
lives in a public repository and a prefix of a live credential is still a piece of one.
Recover them from history when you build the replacement file in section 7.

**In `climate-dashboard`, at `final-project-submission/ice_classification_final.ipynb`:**

| Fact | Value |
| --- | --- |
| Introducing commits | `0af0cbed2888157c62844530f4b5dd234375f686` and `e7926aa62308dce0f2abbcbe83814b6ccf06ac47`, both 2025-04-21, both "final project submission" |
| Distinct blobs carrying the secret | `46972f4f97d33a043bda6e8d1caed8e625ea51c0` and `80686579379d53d09004011d02c33e525988859a`, 26 184 332 bytes each |
| Commits whose tree contains one of those blobs | **151** |
| Total commits reachable from all local refs | 281 |
| Commits that would get a new SHA after rewrite | **151** |
| Commits that keep their SHA | 130 |
| Days of public exposure as of 2026-08-04 | **470** |

The two introducing commits share the same message and the same date. Their merge base is
`b077c4fa7019c6f6e8f44abbe51f8c08b50b6b0d`; each has 83 ancestors. They are two copies of
the same submission landed on two lines of development.

The working copy has already been changed to `os.environ["CDSE_CLIENT_ID"]` and
`os.environ["CDSE_CLIENT_SECRET"]`, but **that change is not committed**
(`git status --porcelain` reports `M final-project-submission/ice_classification_final.ipynb`).
`HEAD` still carries the plaintext. Commit the cleanup before you rewrite, otherwise the
rewrite will replace the literal with a placeholder and leave the notebook broken at the tip.

**In `uummannaq-ice-from-space`, at `archive/legacy_pipeline/ice-final/ice_classification_final.ipynb`:**

| Fact | Value |
| --- | --- |
| Blob | `4eb90bcb648a28c98379791d89ad9c4cdd42ebe7`, 231 160 bytes |
| Lines | 2928 and 2929 of the notebook JSON |
| Commits containing it | **all 11**, including the root commit `9274e2afb3580594671be638f4159671b1019b47` "Initial clean history", 2025-10-24 |
| Commits that keep their SHA after rewrite | **0** |
| Days of public exposure as of 2026-08-04 | **284** |

This is the finding nobody had noticed. The commit that founded this repository is called
"Initial clean history", and it is not clean. The working tree still contains the plaintext
too: the file is unmodified relative to `HEAD`, so it must be fixed in the working copy as
well as in history.

It is a different, smaller notebook than the one in `climate-dashboard` (231 KB with outputs
stripped, versus 26 MB with outputs), but the same code cell with the same credentials.

### 1.2 OpenAI API key (`climate-dashboard` only)

A previously unnoticed second secret, found by the history-wide scan:

```
docker-compose.yml, line 23:   OPENAI_API_KEY: "<the OpenAI key>"   (1327 byte blob)
```

| Fact | Value |
| --- | --- |
| Blob | `767f7fbc40c95dbcdf99e9088c5a929f655c69f6` |
| Introduced by | `251f96cb52c16ba0bddc371b49263b5396f6bd9e`, 2025-10-21 07:55:16Z, "update data-pipeline and align it with new backend logic" |
| Also present in | `33272b5b56036c394c3b0c6abfe668553ef65056`, 2025-10-21, "add overhauled data handling to backend/frontend/pipeline" |
| Removed by | `3328915f1299eef2672f4fb2dbd7c6f7dc009dc0` (same day, replaced by `${OPENAI_API_KEY}`) |
| Commits whose tree contains the blob | 2 |
| Days of public exposure as of 2026-08-04 | **287** |

**GitHub already knows.** Secret scanning alert #1 on `lukaskreibig/climate-dashboard` has
been **open since 2025-10-21T11:46:25Z**, three hours and fifty-one minutes after the commit
was authored at 07:55:16Z (the alert fires on push, and the push time itself is not recorded
in anything visible to us). GitHub classifies it as `openai_api_key` with
`publicly_leaked: true`. It has been
sitting unresolved for 287 days. Treat this key as fully compromised: the alert being public
metadata means anyone scraping GitHub advisory surfaces has had a pointer to it.

Alert URL: `https://github.com/lukaskreibig/climate-dashboard/security/secret-scanning/1`

The blob is still fetchable right now:

```
$ gh api 'repos/lukaskreibig/climate-dashboard/git/blobs/767f7fbc…' --jq .size
1327
```

GitHub secret scanning did **not** flag the Copernicus credentials. There is no partner
pattern for Copernicus Data Space, so the 470 day exposure of the fjord pipeline credentials
went entirely unnoticed by the platform. Do not treat the absence of an alert as evidence of
safety anywhere.

### 1.3 What did not turn up

The scan covered 8821 blob and path pairs in `climate-dashboard` and 164 in
`uummannaq-ice-from-space`, across every reachable object in every ref, using both a
tight pattern set (provider-shaped keys, private key headers, JWTs, credentialed database
URLs) and a deliberately loose one (any `key`, `token`, `secret`, `password` or `auth`
assignment followed by twenty or more token characters). Everything else that matched was
noise, and was checked by hand:

- `postgresql://user:pass@` in `README.md` and `docs/DATA_PIPELINE.md`: documentation
  placeholders, not credentials.
- `POSTGRES_PASSWORD: climate` in `docker-compose.yml`: the local development database
  password, published on purpose, never reachable from outside the compose network.
- Thousands of `tokenValue = …` and `key: "…"` hits inside `node_modules/`,
  `.yarn/releases/yarn-3.2.3.cjs`, and the Plotly bundle embedded in the notebook outputs:
  minified JavaScript identifiers and React keys.
- `access_token = token_response.json()['access_token']` in the notebook: the variable
  assignment, not a value. No OAuth access token or refresh token value is present in any
  cell output in either repository.
- No `.env`, `.pem`, `.key`, `.netrc`, `.npmrc` or service account file has ever been
  committed to either repository.

Neither repository uses git-lfs, submodules, `.gitattributes` filters or `git replace` refs,
which removes three classes of complication from the rewrite.

---

## 2. How the history was searched

Three independent methods, so a miss by one is caught by another.

1. **Change detection.** `git log --all -S<literal>` finds the commits where the number of
   occurrences of a string changed. This is what identifies the introducing and removing
   commits. It does **not** enumerate every commit that carries the secret, because a commit
   that leaves a blob untouched is not a change point. Relying on `-S` alone is the classic
   way to undercount an exposure.

2. **Tree walk.** For every commit reachable from every ref, resolve the path and compare
   the resulting blob id. This is what produced the counts of 151 and 11.

3. **Whole object store scan.** `git cat-file --batch-all-objects` enumerates every object
   in the repository, including objects that no ref reaches, joined against
   `git rev-list --objects --all` for path attribution. Every non-binary blob was piped
   through a pattern grep. This is the method that found the OpenAI key, which the tree
   walk would never have surfaced because nobody was looking at `docker-compose.yml`.

Method 3 is also the post-rewrite verification in section 8. It was validated against the
current state of both repositories: it currently reports the secrets as present, which is
what proves the check is capable of detecting them.

---

## 3. Blast radius

### 3.1 `climate-dashboard`

**Refs on the remote:** 11 branches, 8 pull request refs, 0 tags, 0 releases.

Seventeen of eighteen local and remote-tracking refs carry the notebook blob **at their tip**.
The one exception is `origin/fastapisetup` (`a714a0fc…`), which branched before 2025-04-21
and contains zero affected commits.

| Ref group | Affected |
| --- | --- |
| `refs/heads/*` on origin (11) | 10 of 11 |
| Local branches (6) | 6 of 6 |
| Stashes (3) | 3 of 3, all pinning blob `46972f4f…` |

**Pull requests.** All 8 are merged. 7 of the 8 merge commits are in the rewrite set and
would change SHA:

| PR | Merge commit | Fate |
| --- | --- | --- |
| #8 | `41b7bf83…` (current `main`) | new SHA |
| #7 | `47c3defd…` | new SHA |
| #6 | `0cba9a0e…` | new SHA |
| #5 | `2f2d06f5…` | new SHA |
| #4 | `6450763c…` | new SHA |
| #3 | `6fdf418c…` | new SHA |
| #2 | `b8c7becd…` | new SHA |
| #1 | `06b55151…` | SHA preserved |

Every commit link, review comment anchor and "this commit is in" reference in PRs 2 through
8 will 404 or detach after the rewrite. The PR pages themselves survive; the commit history
shown inside them does not.

**GitHub Actions.** Four workflows exist (`data-freshness.yml`, `fallback-refresh.yml`,
`schedule-keepalive.yml`, `update-data.yml`). A force-push to `main` will retrigger anything
that keys on `push`, and any Railway deployment wired to `main` or `production` will
redeploy. Plan for that, or pause the integrations for the duration.

**Repository size.** `.git` is 260 MB, pack 240.80 MiB. The notebook accounts for roughly
52 MB of that on its own, because two 26 MB copies exist. `node_modules/` was also committed
at some point in the past. Neither is in scope here, but a rewrite is the one moment when
dropping them is free.

### 3.2 `uummannaq-ice-from-space`

Much simpler and much more total. One branch, no forks, no pull requests, no tags, no
releases. All 11 commits are affected, including the root, so every SHA changes and no
history is preserved. `.git` is 683 MB, pack 682.49 MiB.

**The local clone is one commit behind the remote.** Local `origin/main` is
`ff8547722b5dbb099e6440111491cd99e0d0b3a0`; the remote is
`acdfe17cdbf27395279be9a8a777e4f9865ef0ad` ("Update README.md", 2026-05-26). The delta is
one commit touching only `README.md`, and it still carries blob `4eb90bcb…`. Rewrite from a
fresh mirror clone of the remote, not from this local copy, or that commit will be lost.

### 3.3 What a rewrite cannot reach

This is the part that determines whether the rewrite is worth doing at all.

**A public fork exists.** `Ali-Newaz/climate-dashboard`, created 2026-05-11, public, default
branch `main` at `0cba9a0e5eb826bd9fa8b9140c720fa0044ebd56`. Verified by API:

- Its `final-project-submission/ice_classification_final.ipynb` is blob
  `46972f4f97d33a043bda6e8d1caed8e625ea51c0`. That is the exact leaked blob.
- The OpenAI key commit `251f96cb…` is an ancestor of that fork's tip, so blob
  `767f7fbc…` is reachable through the fork's history as well.

You have no write access to that repository. You cannot rewrite it, and GitHub will not
purge objects from a fork network on your request while the fork exists. You could ask the
fork owner to delete it, and you could ask GitHub Support to garbage-collect the network,
but neither is under your control and neither is fast.

**GitHub pull request refs cannot be rewritten.** `refs/pull/N/head` is a hidden ref that
GitHub owns and refuses pushes to. Measured state:

- `refs/pull/2/head` through `refs/pull/8/head` all resolve to trees containing notebook
  blob `46972f4f…`.
- The OpenAI key commit `251f96cb…` is an ancestor of `refs/pull/2/head` through
  `refs/pull/8/head` (checked individually for 2, 3, 4, 5, 6, 7 and 8).
- `refs/pull/1/head` (`a714a0fc…`) is clean.

After a perfect rewrite and force-push, `git fetch origin 'refs/pull/*/head:refs/pull/*'`
still retrieves both secrets from your own repository. Only GitHub Support can remove them,
and they will decline while the fork exists.

**Every existing clone still has everything.** Anyone who cloned either repository at any
point since 2025-04-21 has the objects on disk, and reflogs keep them alive locally for 90
days by default even after a `git pull`.

**Conclusion:** the secrets have been publicly readable for 470 and 287 days respectively,
in a public repository, with a public fork and eight immutable pull request refs. They are
compromised. The history rewrite is worth doing because a hostile reviewer will run
`git log -S` on a work sample and because leaving a live-looking key in a public repository
is itself the finding. It is not, and must not be described as, containment.

---

## 4. Step 1: rotate. First, and not optional

**Do this before touching git. A secret that has been pushed to a remote is compromised
whether or not the history is rewritten.** The rewrite changes what a future reader can see.
It does nothing about anyone who already looked, and for this repository "already looked"
includes GitHub's own scanner, which filed an alert 231 minutes after the key was pushed
and has had it open for 287 days.

If you rewrite first and rotate later, you spend a day of irreversible surgery while the
credential is still live. If you rotate first and never rewrite, you are safe and untidy.
The ordering is not a preference.

**Copernicus Data Space (`<the client id>`).**
Sign in at `https://dataspace.copernicus.eu/`, open the account dashboard, go to the OAuth
clients section, delete the client with id `<the client id>` outright rather than only
regenerating the secret. The client id itself is in the leak, so a fresh client with a new
id is cleaner. Create the replacement, then set `CDSE_CLIENT_ID` and `CDSE_CLIENT_SECRET`
in your local environment, in the classifier repository's environment file, and in Railway.
Review the account's request logs for the exposure window if the portal exposes them.

**OpenAI (`<the OpenAI key>`).**
Sign in at `https://platform.openai.com/api-keys`, revoke that key, create a replacement,
update Railway and any local `.env`. Then check `https://platform.openai.com/usage` for the
entire window since 2025-10-21 for spend you do not recognise. A project-scoped key that has
been public for nine months on a repository with an open secret scanning alert is a realistic
target. Note that the backend has since moved to OpenRouter, so this key may simply be
deleted rather than replaced.

**Close the alert afterwards.** Once the key is revoked, resolve secret scanning alert #1 as
`revoked`. Do not resolve it as a false positive, and do not resolve it before revoking:
resolving is a claim about the key's state, and an unresolved alert on a public repository is
exactly the kind of thing a reviewer of a work sample will notice.

Only when both credentials are dead does the rest of this document apply.

---

## 5. Before you start: prerequisites

**Tooling, as measured on this machine:**

```
$ git --version
git version 2.53.0
$ brew list --versions git-filter-repo
git-filter-repo 2.47.0
$ which git-filter-repo
/opt/homebrew/bin/git-filter-repo
```

Both are current. Nothing needs installing.

**Why `git filter-repo` and not BFG, and not `git filter-branch`.**

`git filter-branch` is deprecated. Git's own documentation recommends against it; it is
quadratically slow, its `--tree-filter` forks a shell per commit, it silently leaves
`refs/original/*` behind, and it does not rewrite tags or notes correctly. On a 240 MB
repository with 281 commits it would take hours.

BFG Repo-Cleaner is fast and was the right answer around 2015. It is essentially unmaintained
now, requires a JVM, and by design **refuses to touch the tip commit** of your default
branch, on the theory that your working copy is already clean. That assumption does not hold
here: `HEAD` in `climate-dashboard` still contains the plaintext, because the notebook fix is
uncommitted. BFG would leave the secret in the one commit anyone reads first.

`git filter-repo` is the tool the git project points at, it is a single Python file, it is
what `git filter-branch` prints in its own deprecation warning, and version 2.47 has
`--sensitive-data-removal`, which exists precisely for this job: it fetches all refs so that
non-branch refs holding the data are caught, reports the first changed commit so you can
verify its disappearance, and prints tailored cleanup instructions for other clones.

**Deal with your uncommitted work first.** `git status --porcelain` currently reports 99
entries in `climate-dashboard` (35 modified, 53 deleted, 11 untracked) and 35 in
`uummannaq-ice-from-space` (17 modified, 18 untracked, including all of this session's new
`docs/*.md` and `scripts/*.py`). The procedure below works on a fresh mirror clone and never
touches these working trees, but section 10 asks you to re-clone afterwards, so anything not
committed and pushed before the rewrite has to be carried across by hand. Commit and push it
now, or accept that you will be copying files between directories at the end.

**Deal with your stashes.** `climate-dashboard` has three, all pinning the leaked blob:

```
stash@{0}  WIP on staging: b853644 enhanced preload of pictures/map        (3 files)
stash@{1}  WIP on main: 4918fd7 add partner repository in docs             (1 file)
stash@{2}  WIP on staging: 295ffae add extensive docs, add first testing…  (7 files)
```

Stashes live only in `refs/stash` and are never pushed, so a mirror clone will not contain
them and a re-clone will destroy them. If any of that work matters, export it before you
start:

```bash
cd /Users/lukaskreibig/Developer/climate-dashboard
mkdir -p ~/secret-rewrite-backup/stashes
for i in 0 1 2; do
  git stash show -p "stash@{$i}" > ~/secret-rewrite-backup/stashes/stash-$i.patch
done
```

Those patches apply cleanly to a fresh clone as long as the underlying files still exist.

---

## 6. Step 2: back up, so the rewrite can be undone

A history rewrite is irreversible in the sense that the old commits stop being reachable and
get garbage collected. It is perfectly reversible if you kept a copy. Keep a copy.

```bash
mkdir -p ~/secret-rewrite-backup
cd ~/secret-rewrite-backup

# Bare mirrors of the remotes as they stand right now.
git clone --mirror git@github.com:lukaskreibig/climate-dashboard.git \
  climate-dashboard-backup-$(date +%Y%m%d).git
git clone --mirror git@github.com:lukaskreibig/uummannaq-ice-from-space.git \
  uummannaq-backup-$(date +%Y%m%d).git

# And a copy of the local .git directories, which hold the stashes and reflogs
# that the mirrors do not.
tar -czf climate-dashboard-local-git-$(date +%Y%m%d).tar.gz \
  -C /Users/lukaskreibig/Developer/climate-dashboard .git
tar -czf uummannaq-local-git-$(date +%Y%m%d).tar.gz \
  -C /Users/lukaskreibig/Developer/uummannaq-ice-from-space .git
```

Budget roughly 1 GB for the mirrors and another 950 MB for the tarballs. Record the
pre-rewrite tips so you can prove later what you restored to:

```bash
git ls-remote git@github.com:lukaskreibig/climate-dashboard.git \
  > ~/secret-rewrite-backup/climate-dashboard-refs-before.txt
git ls-remote git@github.com:lukaskreibig/uummannaq-ice-from-space.git \
  > ~/secret-rewrite-backup/uummannaq-refs-before.txt
```

For reference, the current tips are `41b7bf837d6a5c6c8c74748582a61fdf7f8bb7d8` and
`acdfe17cdbf27395279be9a8a777e4f9865ef0ad`.

**Keep these backups until the credentials have been rotated, the rewrite has been verified,
and you have lived with the result for a week.** Then delete them, because they contain the
plaintext secrets.

---

## 7. Step 3: the rewrite

### 7.1 Commit the working copy cleanup first

In `climate-dashboard`, the notebook fix is uncommitted. Commit and push it before the
rewrite so that the rewritten tip is a working notebook rather than one containing
`CDSE_CLIENT_ID_REMOVED`:

```bash
cd /Users/lukaskreibig/Developer/climate-dashboard
git add final-project-submission/ice_classification_final.ipynb
git commit -m "Read Copernicus credentials from the environment"
git push origin main
```

In `uummannaq-ice-from-space`, the archived notebook still contains the plaintext in the
working tree. Decide what that file is for. It is a legacy copy under
`archive/legacy_pipeline/`, so the honest options are to apply the same `os.environ` fix, or
to delete the archived notebook entirely. Either way, commit and push before rewriting.

### 7.2 Build the replacement file, outside both repositories

`--replace-text` takes a file of expressions. That file necessarily contains the plaintext
secrets, so it must never live inside a repository you are going to push.

```bash
mkdir -p ~/secret-rewrite-work && cd ~/secret-rewrite-work

# Recover the exact values from history rather than retyping them.
cd /Users/lukaskreibig/Developer/climate-dashboard
git cat-file -p e7926aa62308dce0f2abbcbe83814b6ccf06ac47:final-project-submission/ice_classification_final.ipynb \
  | grep -n 'client_id = \|client_secret = '
git cat-file -p 767f7fbc40c95dbcdf99e9088c5a929f655c69f6 | grep OPENAI_API_KEY
```

Write `~/secret-rewrite-work/replacements.txt` with one expression per line, substituting the
real values for the ellipses:

```
literal:<the client id>==>CDSE_CLIENT_ID_REMOVED
literal:<the client secret>==>CDSE_CLIENT_SECRET_REMOVED
literal:<the OpenAI key>==>OPENAI_API_KEY_REMOVED
```

Each angle bracket stands for a value this document does not carry. Take them from what the
two `git cat-file` commands above print. This file stays in `~/secret-rewrite-work/` and is
never committed.

`literal:` means no regex interpretation, which matters because the notebook stores these
inside JSON strings with escaped quotes around them. `--replace-text` operates on raw blob
bytes, so a literal match on the bare secret hits regardless of the surrounding escaping.
Verified: the values appear in the notebook as `client_id = \"<the client id>\"`, and the bare
substring is present in the byte stream.

The same file works for both repositories. Expressions that match nothing are simply not
applied, so the OpenAI line is harmless in the classifier repository.

### 7.3 Rewrite `climate-dashboard`

Work on a fresh mirror clone. Never run `filter-repo --force` on your working repository:
that is how uncommitted work and stashes disappear.

```bash
mkdir -p ~/secret-rewrite-work && cd ~/secret-rewrite-work
git clone --mirror git@github.com:lukaskreibig/climate-dashboard.git cd-rewrite.git
cd cd-rewrite.git
```

A mirror clone of a GitHub repository copies `refs/pull/*` as well as branches. This was
measured: `git clone --mirror` configures `fetch = +refs/*:refs/*`, and a synthetic
`refs/pull/1/head` in a test upstream came across intact. Those refs can never be pushed
back, so delete them before rewriting to keep the rewrite graph limited to real branches:

```bash
git for-each-ref --format='%(refname)' 'refs/pull/*' | while read r; do
  git update-ref -d "$r"
done
git for-each-ref --format='%(refname)'      # expect 11 refs/heads/*, nothing else
```

Now rewrite:

```bash
git filter-repo --replace-text ~/secret-rewrite-work/replacements.txt --sensitive-data-removal
```

Expect it to report the first changed commits. They should be
`0af0cbed2888157c62844530f4b5dd234375f686` and
`e7926aa62308dce0f2abbcbe83814b6ccf06ac47`. Write down whatever it prints; section 8 uses it.

`filter-repo` removes the `origin` remote when it finishes, deliberately, so that you cannot
push before you have looked at the result. That is a feature. Do not add it back until
section 8 passes.

It also runs `git reflog expire --expire=now --all` followed by `git gc --prune=now` itself
(confirmed in the source of version 2.47), so the old objects are already gone from this
mirror when it returns.

**Optional, and worth considering while you are here.** The two 26 MB notebook blobs and the
committed `node_modules/` are most of the 240 MB pack. If you want the repository to look
like a work sample rather than a scratch directory, this is the only moment when removing
them is free:

```bash
# adds to, does not replace, the --replace-text run above
git filter-repo --path node_modules --invert-paths --force
```

Decide this deliberately. It changes what a reader can check out at old commits.

### 7.4 Rewrite `uummannaq-ice-from-space`

```bash
cd ~/secret-rewrite-work
git clone --mirror git@github.com:lukaskreibig/uummannaq-ice-from-space.git uu-rewrite.git
cd uu-rewrite.git
git for-each-ref --format='%(refname)'      # expect only refs/heads/main
git filter-repo --replace-text ~/secret-rewrite-work/replacements.txt --sensitive-data-removal
```

The first changed commit here is the root commit `9274e2afb3580594671be638f4159671b1019b47`,
so all 11 commits get new SHAs. There are no pull request refs, no tags and no forks, so this
one is genuinely clean afterwards apart from existing clones.

---

## 8. Step 4: verify

Run all four checks in each rewritten mirror. Do not push until all four pass.

**Check 1: the known blobs no longer exist.**

```bash
for b in 46972f4f97d33a043bda6e8d1caed8e625ea51c0 \
         80686579379d53d09004011d02c33e525988859a \
         767f7fbc40c95dbcdf99e9088c5a929f655c69f6; do
  git cat-file -e "$b" 2>/dev/null && echo "STILL PRESENT $b" || echo "gone $b"
done
```

Expect three `gone` lines. In `uu-rewrite.git` check `4eb90bcb648a28c98379791d89ad9c4cdd42ebe7`
instead. Run against the current repositories today, this same check prints `PRESENT` for all
three, which is what demonstrates it is capable of detecting them.

**Check 2: no object anywhere contains the string.** This is the important one, because it
covers unreachable objects, dangling objects and anything the tree walk would miss.

```bash
# The needles come out of the replacement file from section 7, so the real values
# enter neither this document nor your shell history.
sed -E 's/^literal:(.*)==>.*/\1/' ~/secret-rewrite-work/replacements.txt \
  > ~/secret-rewrite-work/needles.txt

git cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype)' \
  | awk '$2=="blob"{print $1}' \
  | git cat-file --batch \
  | LC_ALL=C grep -c -a -F -f ~/secret-rewrite-work/needles.txt
```

Expect `0`. Against `climate-dashboard` today this prints `3`, and against
`uummannaq-ice-from-space` it prints `2`.

**Check 3: the first changed commit is unreachable.**

```bash
git cat-file -t 0af0cbed2888157c62844530f4b5dd234375f686   # expect: fatal
git cat-file -t e7926aa62308dce0f2abbcbe83814b6ccf06ac47   # expect: fatal
git cat-file -t 251f96cb52c16ba0bddc371b49263b5396f6bd9e   # expect: fatal
git for-each-ref --contains 0af0cbed2888157c62844530f4b5dd234375f686   # expect: empty or error
```

Every one of these must fail. A success means an object survived.

**Check 4: reflogs and packs are actually clean.**

```bash
git reflog --all | wc -l          # expect 0 in a freshly filtered mirror
git count-objects -vH             # note the new pack size
git fsck --unreachable --no-progress | wc -l   # expect 0
```

`filter-repo` should already have done the reflog expiry and prune. If any of these are
non-zero, run the cleanup by hand and re-check:

```bash
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Check 5: the content still makes sense.** Verification that the secret is gone is not
verification that the repository is intact.

```bash
git log --oneline | head -20
git show HEAD:final-project-submission/ice_classification_final.ipynb \
  | grep -n 'client_id\|client_secret'          # expect the os.environ lines
git show HEAD:docker-compose.yml | grep -i openai   # expect ${OPENAI_API_KEY}
git rev-list --all | wc -l                       # expect 281 in cd-rewrite.git
```

The commit count must not change. A rewrite that drops commits is a bug, not a cleanup.

---

## 9. Step 5: push

**Do not use `git push --mirror`.** A mirror push tries to update every ref including
`refs/pull/*`, which GitHub rejects as hidden refs, and it deletes remote refs that are
absent locally. Push branches explicitly:

```bash
cd ~/secret-rewrite-work/cd-rewrite.git
git remote add origin git@github.com:lukaskreibig/climate-dashboard.git

# Look before you leap.
git push --force --dry-run origin 'refs/heads/*:refs/heads/*'

# Then for real.
git push --force origin 'refs/heads/*:refs/heads/*'
```

There are no tags in either repository, so no tag push is needed. The branch set is unchanged
(11 branches before, 11 after), so no remote branch deletions are needed either.

Same for the classifier:

```bash
cd ~/secret-rewrite-work/uu-rewrite.git
git remote add origin git@github.com:lukaskreibig/uummannaq-ice-from-space.git
git push --force --dry-run origin 'refs/heads/*:refs/heads/*'
git push --force origin 'refs/heads/*:refs/heads/*'
```

**Before you push, consider branch protection.** If `main` or `production` is protected,
the force-push will be rejected. Lift the protection, push, restore it. Do not leave it off.

**After you push:**

1. Confirm the remote moved: `git ls-remote origin | diff - ~/secret-rewrite-backup/climate-dashboard-refs-before.txt`
   should show every branch changed except `fastapisetup`.
2. Watch the four GitHub Actions workflows and any Railway deployment. A force-push to `main`
   and `production` will trigger them.
3. Resolve secret scanning alert #1 as `revoked`, assuming section 4 is done.
4. Open a GitHub Support request asking for garbage collection of unreachable objects in the
   repository network, and say plainly that a public fork exists. They will likely tell you
   the fork blocks it. Ask anyway, and keep the answer.
5. Contact the fork owner (`Ali-Newaz`) and ask them to delete
   `https://github.com/Ali-Newaz/climate-dashboard`. They are under no obligation. If they
   decline, the objects stay public and rotation is the only thing that ever protected you.

---

## 10. Step 6: your own clones, and anyone else's

**Every clone that existed before the rewrite must be replaced, not updated.** A `git pull`
into an old clone merges the old history back in, and a subsequent push re-contaminates the
remote. This is the single most common way a history rewrite gets silently undone.

The safe procedure for your two working copies:

```bash
# 1. Make sure nothing uncommitted is left. Export patches if it is.
cd /Users/lukaskreibig/Developer/climate-dashboard && git status --porcelain
cd /Users/lukaskreibig/Developer/uummannaq-ice-from-space && git status --porcelain

# 2. Move the old clones aside. Do not delete them until the new ones work.
mv /Users/lukaskreibig/Developer/climate-dashboard \
   /Users/lukaskreibig/Developer/climate-dashboard.old
mv /Users/lukaskreibig/Developer/uummannaq-ice-from-space \
   /Users/lukaskreibig/Developer/uummannaq-ice-from-space.old

# 3. Fresh clones.
cd /Users/lukaskreibig/Developer
git clone git@github.com:lukaskreibig/climate-dashboard.git
git clone git@github.com:lukaskreibig/uummannaq-ice-from-space.git

# 4. Carry across the things git does not: untracked files, .env files, virtualenvs.
#    Both repositories have local .venv directories and untracked working files.
```

The old clones still contain the secrets in their object stores. Once the new clones are
working, delete them properly:

```bash
rm -rf /Users/lukaskreibig/Developer/climate-dashboard.old
rm -rf /Users/lukaskreibig/Developer/uummannaq-ice-from-space.old
```

**If you would rather not re-clone,** the in-place recipe is stricter and easier to get wrong:

```bash
git fetch origin
git reset --hard origin/<branch>          # for every branch you have locally
git for-each-ref --format='%(refname)' refs/original | xargs -n1 git update-ref -d
git stash clear                            # the stashes pin the old blobs
git reflog expire --expire=now --all
git gc --prune=now --aggressive
# then run verification checks 1 and 2 from section 8 in the working clone
```

Re-cloning is less work and less risk. Prefer it.

**For collaborators, and for the fork owner if they cooperate:** send them section 10 of this
document verbatim, plus the first changed commit ids. Their instruction is: do not pull, do
not push, delete the clone, clone again. If they have unpushed work, it must be exported as
patches first, because their local branches are built on commits that no longer exist.

---

## 11. Rollback

You kept mirrors in section 6. Restoring is a force-push in the other direction.

```bash
cd ~/secret-rewrite-backup/climate-dashboard-backup-YYYYMMDD.git
git push --force origin 'refs/heads/*:refs/heads/*'
```

If the mirror's `origin` no longer points where you want, set it explicitly first with
`git remote set-url origin git@github.com:lukaskreibig/climate-dashboard.git`.

Then compare against the recorded pre-rewrite state:

```bash
git ls-remote origin | diff - ~/secret-rewrite-backup/climate-dashboard-refs-before.txt
```

An empty diff means you are exactly back where you started. The pre-rewrite tips were
`41b7bf837d6a5c6c8c74748582a61fdf7f8bb7d8` for `climate-dashboard` and
`acdfe17cdbf27395279be9a8a777e4f9865ef0ad` for `uummannaq-ice-from-space`.

Note what rollback does **not** restore: `refs/pull/*` were never rewritten so they are
unaffected; local stashes in your working clones are gone once cleared; and any commits
pushed by anyone between the rewrite and the rollback are lost. Rollback is a way to recover
from a botched rewrite in the first hours, not a general undo.

---

## 12. Prevention

The rewrite is the expensive fix for a cheap mistake, and it is the second time these
credentials have been committed. Some of this is already true; confirm rather than assume.

1. **Turn on push protection.** Repository settings, Code security, Secret scanning, Push
   protection. Secret scanning is clearly already active on `climate-dashboard`, since it
   filed alert #1. Push protection blocks the commit at push time rather than filing an alert
   afterwards, which is the difference between a nuisance and 287 days of exposure.

2. **Strip notebook outputs and clear cells before committing.** Both leaks were in
   notebooks. A pre-commit hook using `nbstripout` would have caught neither, since these were
   in source cells rather than outputs, but the 26 MB of embedded Plotly bundles in
   `ice_classification_final.ipynb` is its own problem and `nbstripout` fixes that.

3. **Add a pre-commit secret scan.** `gitleaks protect --staged` or the `detect-secrets`
   pre-commit hook. Either would have caught both of these before they left the machine.
   Neither has a Copernicus rule out of the box; add a custom rule for `sh-[0-9a-f]{8}-`
   prefixed client ids, since GitHub's scanner demonstrably has none.

4. **Never put a value in `docker-compose.yml`.** Use `${VAR}` and a gitignored `.env`. The
   file that leaked already used `${OPENAI_API_KEY}` before and after; the plaintext was a
   single-day regression that survived nine months.

5. **Re-run the section 2 method 3 scan before publishing.** It takes minutes and it is the
   check that found the key nobody was looking for.

---

## Appendix: the commands behind every number

Run from the repository root unless stated otherwise. Dates are as of 2026-08-04.

**Which commits carry the notebook secret, and how many:**

```bash
git rev-list --all | while read c; do
  git rev-parse -q --verify "$c:final-project-submission/ice_classification_final.ipynb" \
    >/dev/null 2>&1 && echo "$c"
done | wc -l
# → 151    (out of `git rev-list --all | wc -l` → 281)
```

**Which SHAs would change:**

```bash
A=0af0cbed2888157c62844530f4b5dd234375f686
B=e7926aa62308dce0f2abbcbe83814b6ccf06ac47
git rev-list --all | while read c; do
  if git merge-base --is-ancestor $A $c || git merge-base --is-ancestor $B $c
  then echo CHANGE; else echo KEEP; fi
done | sort | uniq -c
# → 151 CHANGE, 130 KEEP
```

**The whole-object-store scan that found the OpenAI key:**

```bash
git rev-list --objects --all | awk 'NF>1 {print $1"\t"$2}' | sort -u -k1,1 > objpaths.tsv
git cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype) %(objectsize)' \
  | awk '$2=="blob"{print $1"\t"$3}' | sort -k1,1 > blobs.tsv
join -t $'\t' -a 1 -o 0,1.2,2.2 blobs.tsv objpaths.tsv > blobpaths.tsv
# → 8821 blob/path pairs in climate-dashboard, 164 in uummannaq-ice-from-space
# then: for each non-binary blob, `git cat-file blob $sha | grep -aoE "$PATTERNS"`
```

**GitHub state:**

```bash
gh repo view --json visibility,forkCount,isPrivate
# → {"forkCount":1,"isPrivate":false,"visibility":"PUBLIC"}

gh api repos/lukaskreibig/climate-dashboard/forks \
  --jq '.[] | {full_name, private, created_at}'
# → {"full_name":"Ali-Newaz/climate-dashboard","private":false,
#    "created_at":"2026-05-11T20:22:51Z"}

gh api 'repos/Ali-Newaz/climate-dashboard/contents/final-project-submission?ref=main' \
  --jq '.[] | "\(.name) \(.sha)"'
# → ice_classification_final.ipynb 46972f4f97d33a043bda6e8d1caed8e625ea51c0

gh api 'repos/lukaskreibig/climate-dashboard/secret-scanning/alerts?state=open' \
  --jq '.[] | "#\(.number) \(.secret_type) publicly_leaked=\(.publicly_leaked) created=\(.created_at)"'
# → #1 openai_api_key publicly_leaked=true created=2025-10-21T11:46:25Z

git ls-remote origin
# → 11 refs/heads/*, 8 refs/pull/N/head, 0 tags
```

**Which pull request refs carry the secrets:**

```bash
for sha in 295ffae3… c2740ca9… 6fdf418c… b8536446… 2f2d06f5… 8945f544… 26a522d0…; do
  git rev-parse -q --verify "$sha:final-project-submission/ice_classification_final.ipynb"
  git merge-base --is-ancestor 251f96cb52c16ba0bddc371b49263b5396f6bd9e $sha && echo ancestor
done
# → refs/pull/2..8 all resolve to blob 46972f4f…, and 251f96cb… is an ancestor of all seven.
#   refs/pull/1/head (a714a0fc…) is clean on both counts.
```

**That `clone --mirror` copies `refs/pull/*`:**

```bash
# in a throwaway directory
git init -q --bare upstream.git
# … push one commit, then:
git -C upstream.git update-ref refs/pull/1/head $(git -C work rev-parse HEAD)
git clone -q --mirror upstream.git mirror.git
git -C mirror.git for-each-ref --format='%(refname)'
# → refs/heads/main
#   refs/pull/1/head
git -C mirror.git config --get remote.origin.fetch
# → +refs/*:refs/*
```

**Verification commands proving they can detect the secret today:**

```bash
git cat-file -e 46972f4f97d33a043bda6e8d1caed8e625ea51c0 && echo PRESENT
# → PRESENT

git cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype)' \
  | awk '$2=="blob"{print $1}' | git cat-file --batch \
  | LC_ALL=C grep -c -a -e '<secret-fragment-1>' -e '<secret-fragment-2>'
# → 3   in climate-dashboard
# → 2   in uummannaq-ice-from-space
```

**Tooling and sizes:**

```bash
git --version                              # → 2.53.0
brew list --versions git-filter-repo       # → git-filter-repo 2.47.0
git count-objects -vH | grep size-pack     # → 240.80 MiB (cd) / 682.49 MiB (uu)
du -sh .git                                # → 260M (cd) / 683M (uu)
```
