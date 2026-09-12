# Apply UniVentureAI V17

Download `UniVentureAI_V17_Mission_Control_Plan_2026-09-12.zip` to your Desktop.

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status

unzip -o ~/Desktop/UniVentureAI_V17_Mission_Control_Plan_2026-09-12.zip -d .

ls frontend/src/lib/planJourney.ts
ls frontend/scripts/test-plan.cjs
git diff --check

npm --prefix frontend ci
npm --prefix frontend run build
node frontend/scripts/test-plan.cjs
node frontend/scripts/test-review.cjs
node frontend/scripts/test-practice.cjs
```

Commit and deploy:

```bash
git add backend frontend/src frontend/scripts frontend/qa tests README.md design-qa.md V16_APPLY_STEPS.md V16_RELEASE_NOTES.md V16_1_APPLY_STEPS.md V16_1_RELEASE_NOTES.md V16_2_APPLY_STEPS.md V16_2_RELEASE_NOTES.md V17_APPLY_STEPS.md V17_RELEASE_NOTES.md
git status
git diff --cached --stat
git commit -m "Redesign Plan as a guided admission journey"
git push origin admissions-mini-app
```

No Railway variables need to change.

## Telegram device check

1. Open **Plan** with the same test account used in the supplied screenshot.
2. Confirm **Current chapter** names the first incomplete stage and its percentage matches that stage.
3. Confirm the next-move button opens the expected tool.
4. Tap each of the five journey chapters and confirm it opens the matching workspace.
5. Confirm all three weekly moves are visible when the API returns three tasks.
6. Check 320–430 px widths: no title, percentage, effort or bottom-navigation overlap.
7. Enable large text once and confirm every control remains tappable.
8. Confirm the purple schedule button opens the detailed Application Plan builder.
