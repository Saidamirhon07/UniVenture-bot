// Local UI smoke tests with synthetic API responses. Not a production API test.
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.UV_TEST_URL || 'http://127.0.0.1:5173';
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use a local app, not production, for fixture tests.');
const questions = JSON.parse(await readFile(new URL('../../../backend/practice_bank.json', import.meta.url),'utf8'));
const output = new URL('./output/',import.meta.url);
await mkdir(output,{recursive:true});
const user = {id:101,name:'Alex',has_manual_name:true,onboarding_complete:true,is_admin:true};
const streak = {current_streak:2,longest_streak:2,completed_today:false,today_skills:[],last_completed_date:'2026-09-07',total_sessions:2};
const readiness = {score:48,categories:[{key:'testing',label:'Testing',score:8,max:20},{key:'essays',label:'Essays',score:8,max:20}],blocker:{key:'testing',label:'Testing',score:8,max:20,message:'Keep practising'}};
const dashboard = {name:'Alex',location:'Tashkent',intended_major:'Computer Science',readiness,profile_completeness:{percent:60,filled:6,total:10,missing:[]},today_priority:{title:'Build your SAT algebra foundations',why:'A focused set will make your next practice more useful.',effort:'10 min'},today_action:{mode:'navigate',label:'Open SAT Studio',screen:'sat'},weekly_path:[],trajectory:{now:'Practice algebra',next:'Review essay outline',deadline:'Set an application date'},status_cards:[],practice_streak:streak,notifications:[],unread_notifications:0,subscription:{has_access:true,is_premium:true,tier:'premium',access_type:'paid',remaining_days:10,price:'199,000 UZS',price_uzs:199000}};
const library = {questions,records:{},sessions:[],drafts:{},streak,access:{is_premium:true,daily_limit:null,used_today:0,remaining_today:null}};
const founderAnalytics = {generated_at:'2026-09-08T09:00:00Z',window_days:30,audience:{dau:12,wau:48,mau:120,total_users:150},subscriptions:{active_paid:31,ever_paid:40,churned:9,churn_rate:22.5,cancelled_active:2},funnel:{visitors:120,upgrade_viewed:70,checkout_started:52,paid:31,visitor_to_paid:25.8,visitor_to_upgrade:58.3,visitor_to_checkout:43.3},tools:[{name:'Essay Review',views:96},{name:'SAT Practice',views:72},{name:'School Finder',views:48}],practice:{sat:{sessions:41,students:22,questions:410,correct:315,accuracy:77},ielts:{sessions:28,students:17,questions:140,correct:98,accuracy:70}},revenue_by_source:[{source:'ig_reel01',currency:'UZS',amount:3184000,payments:16,buyers:16},{source:'tg_channel01',currency:'UZS',amount:1990000,payments:10,buyers:10}],timeline:Array.from({length:30},(_,index)=>({date:`2026-09-${String(index+1).padStart(2,'0')}`,active_users:3+(index%10),opens:4+(index%9),tool_views:7+(index%13)})),privacy:'Counts product events only. Essay text, answers, profile content and chats are not stored in analytics.'};
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:390,height:844}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('dialog',dialog=>dialog.accept());
await page.route('**/api/**',async route=>{
  const req=route.request(), path=new URL(req.url()).pathname;
  const body=req.method()==='POST' ? req.postDataJSON() : null;
  let response={};
  if(path==='/api/auth/dev') response={token:'fixture-token',user,subscription:dashboard.subscription};
  else if(path==='/api/me') response={user,readiness,portfolio:{profile:{},application:{}}};
  else if(path==='/api/dashboard') response=dashboard;
  else if(path.startsWith('/api/practice/library')) response=library;
  else if(path==='/api/practice/streak'||path==='/api/practice/complete') response=streak;
  else if(path==='/api/analytics/event') response={recorded:true};
  else if(path==='/api/admin/analytics') response=founderAnalytics;
  else if(path==='/api/practice/draft') {library.drafts[body.key]={prompt:body.prompt,content:body.content};response={saved:true};}
  else if(path==='/api/practice/session') {
    const answers=body.answers.map(a=>({...a,correct:questions.find(q=>q.id===a.question_id).answer===a.choice}));
    const session={id:body.session_id,exam:body.exam,mode:body.mode,seconds:body.seconds,created_at:Math.floor(Date.now()/1000),answers,correct:answers.filter(a=>a.correct).length,total:answers.length};
    if(!library.sessions.some(s=>s.id===session.id)) library.sessions.push(session);
    for(const a of answers) library.records[a.question_id]={attempts:1,correct:Number(a.correct),last_correct:a.correct,last_choice:a.choice,last_seen:'2026-09-08',review_due:'2026-09-09'};
    response={session,records:library.records,streak,access:library.access};
  } else { await route.fulfill({status:501,json:{detail:'Unexpected fixture endpoint: '+path}}); return; }
  await route.fulfill({json:response});
});
const snap=async name=>{await page.screenshot({path:new URL(name+'.png',output).pathname,fullPage:true});};
const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Horizontal overflow');
try {
  await page.goto(base);
  await page.getByRole('heading',{name:'Good',exact:false}).waitFor();
  for(const width of [360,390,430]) {await page.setViewportSize({width,height:844});await noOverflow();await snap('home-'+width);}
  await page.getByRole('navigation').getByRole('button',{name:'Tools',exact:true}).click();
  await page.getByLabel('Search tools').waitFor();
  assert.equal(await page.locator('.simple-tool-card').count(),12);
  await page.getByRole('button',{name:/Open growth analytics/}).click();
  await page.getByRole('heading',{name:'Founder Pulse',exact:true}).waitFor();await noOverflow();await snap('founder-analytics');
  await page.getByRole('button',{name:'Back to tools'}).click();
  await page.getByRole('button',{name:'EC Evaluation Improve activities'}).click();
  await page.getByRole('heading',{name:'EC Evaluation',exact:true}).waitFor();await snap('ec');
  await page.getByRole('navigation').getByRole('button',{name:'Tools',exact:true}).click();
  await page.getByRole('button',{name:'Recommendation Letters Plan stronger letters'}).click();
  await page.getByRole('heading',{name:'Recommendation Letters',exact:true}).waitFor();await snap('letters');
  await page.getByRole('navigation').getByRole('button',{name:'Home',exact:true}).click();
  await page.getByRole('button',{name:/Ready when you are SAT Studio/}).click();
  await page.getByRole('heading',{name:'SAT Studio',exact:true}).waitFor();await snap('sat-studio');
  await page.getByRole('button',{name:'Start a short set'}).click();
  await page.locator('.practice-options button').first().click();
  await page.getByRole('button',{name:'Check answer',exact:true}).click();
  await page.locator('.practice-explanation').waitFor();await snap('sat-feedback');
  await page.getByRole('button',{name:'Finish this set now'}).click();
  await page.getByText('Saved to your practice history.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Back to practice',exact:true}).click();
  await page.getByRole('button',{name:'My progress',exact:true}).click();
  assert.equal(await page.locator('.studio-history').count(),1);
  await page.getByRole('navigation').getByRole('button',{name:'Home',exact:true}).click();
  await page.getByRole('button',{name:/Ready when you are IELTS Studio/}).click();
  await page.getByLabel('Your response',{exact:true}).fill('This is a fixture draft for testing account persistence.');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await page.getByText('Draft saved to your account',{exact:true}).waitFor();await snap('ielts-writing');
  await page.getByRole('button',{name:'Speaking',exact:true}).click();
  await page.getByRole('button',{name:'Start 2-minute response'}).click();
  await page.locator('.workbench-timer strong').waitFor();await snap('ielts-speaking');
  await page.getByRole('button',{name:'Listening',exact:true}).click();
  await page.getByRole('button',{name:'Start a short set'}).click();
  await page.getByRole('button',{name:'Play briefing',exact:true}).waitFor();await snap('ielts-listening');
  await noOverflow();assert.deepEqual(errors,[]);
  console.log('UI fixture smoke checks passed. Screenshots: frontend/qa/output. Inspect them manually; this does not test live AI or payments.');
} finally {await browser.close();}
