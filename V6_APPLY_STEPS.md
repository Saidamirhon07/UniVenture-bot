# Apply UniVentureAI Premium V6

V6 simplifies the frontend while keeping every existing feature, account, payment, profile, and saved-memory system.

## 1. Open the existing repository

In Terminal, type `cd `, drag the outer `UniVenture-bot` folder into Terminal, and press Enter.

```bash
git switch admissions-mini-app
git status
```

If `git status` shows unfinished work, save or commit it before extracting V6.

## 2. Extract V6

If the ZIP is on your Desktop:

```bash
unzip -o ~/Desktop/UniVentureAI_Premium_V6_Simple_Frontend_2026-09-06.zip -d .
```

If it is in Downloads:

```bash
unzip -o ~/Downloads/UniVentureAI_Premium_V6_Simple_Frontend_2026-09-06.zip -d .
```

The files must be placed beside `AIBOT.py`, `backend`, and `frontend`, not inside another folder.

## 3. Verify and deploy

```bash
ls frontend/src/screens/NavigationHubs.tsx
ls frontend/src/data/catalogs.ts
git check-ignore -v frontend/src/data/catalogs.ts
git add -A ':!qa' ':!qa-v2' ':!qa-v3'
git status
git commit -m "Simplify frontend and expose all tools"
git push origin admissions-mini-app
```

`git check-ignore` should print nothing. Before committing, confirm that `HomeScreen.tsx`, `NavigationHubs.tsx`, `App.tsx`, and `index.css` are staged.

## 4. Railway

Keep the current configuration unchanged:

- Branch: `admissions-mini-app`
- Root Directory: blank
- Dockerfile builder
- Volume: `/data`
- Existing variables: unchanged

No data migration or new environment variable is required.

After Railway deploys, test `/api/health`, reopen Telegram, send `/start`, and open the Admissions Hub.

## 5. Quick check

Confirm:

1. Navigation reads **Home · Plan · Tools · Explore · Profile**.
2. Home shows one task, four quick tools, progress, and All Tools.
3. Tools shows all 12 tools without opening filters.
4. EC Evaluation and Recommendation Letters are visible under Profile.
5. Plan shows readiness, XP, streak, five steps, and two weekly tasks.
