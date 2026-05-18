# The Subtext Dispatch — Site Repo

Weekly newspaper on student-housing development, capital markets, and university market intelligence. Published every Monday.

**Live site:** dispatch.subtextliving.com (pending DNS)

---

## Repo structure

```
dispatch-site/
├── index.html              ← Latest edition (visitors land here)
├── archive.html            ← List of all past editions
├── editions/
│   ├── edition-1/
│   │   └── index.html      ← Edition 1 — 5/12/26
│   └── edition-2/
│       └── index.html      ← Edition 2 — 5/18/26
└── README.md               ← You are here
```

Each edition's HTML is self-contained: the Chomsky masthead font is embedded inline as base64, all other fonts load from Google Fonts. No external assets required.

---

## Publishing a new edition (weekly workflow)

When Phase 9 of the pipeline produces a new edition:

1. Create a new folder: `editions/edition-N/`
2. Place the patched edition HTML inside as `index.html`
3. Copy the same file to root `index.html` (overwriting — root always reflects latest)
4. Update `archive.html` to add the new edition at the top of the list
5. `git add . && git commit -m "Edition N — m/d/yy" && git push`
6. Cloudflare Pages auto-deploys within ~1 minute

A future enhancement: bake steps 1-5 into a single Python script invoked at the end of Phase 9.

---

## Deployment setup (one-time)

### Step 1 — Create the GitHub repo

1. Go to <https://github.com/new>
2. Repository name: `subtext-dispatch` (or similar)
3. Public or Private — both work with Cloudflare Pages
4. Do NOT initialize with a README, .gitignore, or license (we already have these files)
5. Click "Create repository"

From your terminal, in the `dispatch-site/` folder:

```bash
git init
git add .
git commit -m "Initial commit — Editions 1 and 2"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/subtext-dispatch.git
git push -u origin main
```

### Step 2 — Connect Cloudflare Pages

1. Log into <https://dash.cloudflare.com/>
2. Sidebar → Workers & Pages → Create → Pages → Connect to Git
3. Authorize GitHub and pick the `subtext-dispatch` repo
4. Build settings:
   - **Production branch:** `main`
   - **Framework preset:** None
   - **Build command:** (leave blank)
   - **Build output directory:** `/` (root)
5. Click "Save and Deploy"

You'll get a default URL like `subtext-dispatch.pages.dev` within ~1 minute. Use it to verify the site renders correctly.

### Step 3 — Add the custom domain

In the Cloudflare Pages project:

1. Custom domains → Set up a custom domain
2. Enter `dispatch.subtextliving.com`
3. Cloudflare will give you a DNS record to add:
   - If `subtextliving.com` is on Cloudflare DNS: it auto-creates the CNAME
   - If it's on another DNS provider: add a CNAME record manually pointing `dispatch` → `subtext-dispatch.pages.dev`
4. SSL certificate provisions automatically within ~5 minutes

---

## Local preview

The HTML files are fully self-contained — just double-click `index.html` to view in a browser. No build step, no server required.

---

## Files NOT in this repo

By design, the following live outside the public site:

- **Source pipeline scripts** (`dispatch-project/`) — internal build code
- **Pipeline Excel files** (`subtext-dispatch-pipeline-*.xlsx`) — raw data
- **PDF outputs** — kept locally only
- **Research batch CSVs** — internal

Only the published HTML editions are exposed.

---

## Notes on the Chomsky font

The masthead uses [Chomsky](https://github.com/ctrlcctrlv/chomsky) by Fredrick R. Brennan, a free Engravers' Old English clone designed to mimic the NYT masthead. It is licensed under the **SIL Open Font License 1.1** (compatible with commercial use, redistribution permitted). The font file is embedded inline in each HTML — no external font hosting required.
