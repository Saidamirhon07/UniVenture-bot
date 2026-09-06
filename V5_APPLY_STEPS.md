# Apply UniVentureAI Premium V5

Premium V5 replaces the unclear global navigation with **Today, Roadmap, Tools, Discover, and Profile**, adds the searchable tool directory, and introduces the gamified Admission Roadmap.

## 1. Enter the existing repository

Open Terminal, type `cd ` with a space, drag the outer `UniVenture-bot` folder into Terminal, and press Enter.

```bash
git switch admissions-mini-app
git status
```

If `git status` shows work you have not committed, stop and save that work before extracting V5.

## 2. Extract V5 into the repository root

If the ZIP is in Downloads:

```bash
unzip -o ~/Downloads/UniVentureAI_Premium_V5_Tools_Roadmap_2026-09-06.zip -d .
```

If it is on the Desktop:

```bash
unzip -o ~/Desktop/UniVentureAI_Premium_V5_Tools_Roadmap_2026-09-06.zip -d .
```

Do not create a nested folder. `AIBOT.py`, `backend`, and `frontend` must remain directly inside `UniVenture-bot`.

## 3. Confirm the upgrade

```bash
ls frontend/src/screens/NavigationHubs.tsx
ls frontend/src/data/catalogs.ts
git check-ignore -v frontend/src/data/catalogs.ts
git status --short
```

The `git check-ignore` command should print nothing. That confirms the catalog will reach Railway.

## 4. Commit and push

```bash
git add -A ':!qa' ':!qa-v2' ':!qa-v3'
git status
git commit -m "Add tools hub and admission roadmap"
git push origin admissions-mini-app
```

Before committing, confirm that `frontend/src/screens/NavigationHubs.tsx`, `frontend/src/App.tsx`, `frontend/src/index.css`, and `.dockerignore` appear under **Changes to be committed**.

## 5. Let Railway redeploy

Keep the existing service and settings:

- Branch: `admissions-mini-app`
- Root Directory: blank
- Builder: Dockerfile
- Volume mount: `/data`
- Existing variables: unchanged

No new environment variable or data migration is required.

After deployment succeeds, open:

```text
https://comfortable-recreation-production-b1bc.up.railway.app/api/health
```

Then fully close Telegram, reopen the UniVentureAI bot, send `/start`, and tap **Open Admissions Hub**.

## 6. Quick acceptance check

Confirm these five items:

1. Bottom navigation says **Today · Roadmap · Tools · Discover · Profile**.
2. **Tools** is the elevated center button.
3. Search for `essay`, `rewrite`, and `SAT` returns the correct tools.
4. Brainstorm and Rewrite open in their correct modes.
5. Roadmap shows Momentum XP, streak, Today's Quest, five chapters, and the weekly questline.
