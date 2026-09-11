# Apply UniVentureAI V15

V15 adds a swipeable Home showcase and a coherent illustrated icon system across Home and Tools. It does not change payments, permissions, saved profiles, questions, analytics, or Railway variables.

## Install

Open Terminal and run each line:

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
unzip -o ~/Desktop/UniVentureAI_Premium_V15_Visual_Tools_Carousel_2026-09-12.zip -d .
git diff --check
git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3'
git status
git commit -m "Add visual tool cards and swipe carousel"
git push origin admissions-mini-app
```

If Terminal displays `(END)`, press `q`.

## Check after Railway succeeds

1. Fully close UniVentureAI in Telegram and reopen it from **🚀 Open UniVentureAI**.
2. On Home, swipe the featured card horizontally and confirm the pagination indicator changes.
3. Tap each featured card and confirm it opens Plan, Essay Review, SAT, or School Finder.
4. Open **Tools** and confirm all 12 illustrated cards appear without cropped text.
5. Test at least one free tool and one Premium tool with a free account; existing limits must still apply.
6. Open Tools with the `ADMIN_IDS` account and confirm **Analytics & Question Factory** remains visible.
7. Check Home and Tools on one narrow phone and one larger phone.

No new Railway variable or data migration is required.
