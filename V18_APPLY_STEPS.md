# Apply UniVentureAI V18

Download `UniVentureAI_V18_Free_First_Result_2026-09-16.zip` to your Desktop.

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status

unzip -o ~/Desktop/UniVentureAI_V18_Free_First_Result_2026-09-16.zip -d .

git diff --check
git add -A ':!qa' ':!qa-v2' ':!qa-v3' ':!frontend/qa/output'
git status
git diff --cached --stat
git commit -m "Add one free result for every major tool"
git push origin admissions-mini-app
```

If Git opens a long pager showing `(END)`, press `q`.

No new Railway variables are required. Keep your existing payment card, bot token, `SESSION_SECRET`, `ADMIN_IDS`, `/data` volume and all current variables unchanged. Do not delete or recreate the `/data` volume.

## Production acceptance test

Use a new free Telegram account after Railway reports a successful deployment:

1. Open **Tools**. AI tools should say **1 FREE RESULT**, SAT/IELTS should say **DAILY FREE**, and Profile should say **FREE PROFILE**.
2. Add and save one profile detail. Close and reopen the Mini App; confirm it remains saved.
3. Run one Essay Review and one EC Evaluation. Both first results must complete.
4. Try EC Evaluation a second time. The Premium sheet must appear; Essay access must remain independent.
5. Run one Brainstorm and one Rewrite. Each must have its own free result.
6. Complete three SAT questions, then open IELTS. IELTS must still have three questions available for that day.
7. Upload a supported file to an unused review tool. The first successful file analysis must consume that tool's result; a failed/invalid upload must not consume it.
8. Use School Finder once, save a result, and confirm it remains in the profile.
9. Tap the payment button and confirm the bot sends the card details and receipt-upload request.
10. Approve one test receipt as admin and confirm all limits disappear for that user.

Keep the previous production commit available for a normal Git revert until all ten checks pass.
