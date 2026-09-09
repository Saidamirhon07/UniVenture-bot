# Apply UniVentureAI V14

## Install

```bash
cd /Users/saidamirkhon.yusupov/Desktop/UniVenture-bot
git switch admissions-mini-app
git status

unzip -o ~/Desktop/UniVentureAI_Premium_V14_Question_Factory_Portfolio_Fix_2026-09-09.zip -d .

git diff --check
git add -A ':!frontend/qa/output' ':!qa' ':!qa-v2' ':!qa-v3'
git status
git commit -m "Add reviewed question factory and fix portfolio loading"
git push origin admissions-mini-app
```

If Terminal displays `(END)`, press `q`.

## Railway

Add this variable in **Variables → Raw Editor**:

```env
QUESTION_BANK_PATH=/data/generated_question_bank.json
```

Keep the existing `/data` volume and all existing variables. No database migration is required.

## Build the reviewed bank

1. Open **Tools** as the admin.
2. Open **Founder Pulse**.
3. Scroll to **Reviewed question factory**.
4. Select `+ 5 checked` for one category.
5. Wait for both the generation and independent review calls.
6. Expand **Inspect verified questions**.
7. Read each question and use **Publish** or **Reject**.
8. Repeat in balanced batches until the displayed targets are reached.

Do not press **Publish all verified questions** unless you have inspected the batch. Each generated batch uses OpenAI API credits.

## Live acceptance test

1. Open Profile as a Premium/admin account; it must load instead of remaining on the loader.
2. Temporarily interrupt the connection and confirm Profile shows a retry state.
3. Generate one SAT Math batch and confirm invalid or low-confidence items are not queued.
4. Inspect and publish one verified question.
5. Open SAT Studio and confirm the published question is available and graded correctly.
6. Generate and publish one IELTS Writing prompt; confirm it appears in Writing Room.
7. Generate and publish one IELTS Speaking prompt; confirm it appears in Speaking Room.
8. Complete a practice set, reopen the studio, and confirm unseen questions are prioritized.
9. Confirm `/data/generated_question_bank.json` exists through Railway storage/console tooling.
10. Confirm `.bak1.gz` appears after the next bank write.

Do not invite public traffic until the portfolio, generation, publication and grading checks pass with the live Telegram bot.
