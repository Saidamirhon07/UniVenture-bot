import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.UV_TEST_URL||'http://127.0.0.1:5173';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Local fixture only');
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:390,height:844}});
const failures=[];page.on('pageerror',e=>failures.push(e.message));
const result={headline:'A clear story, ready for deeper reflection',quality_score:72,
  criteria:['Voice','Specificity','Reflection','Structure','Growth'].map((label,i)=>({label,score:60+i*7,evidence:`Evidence for ${label} from your work.`,improvement:`A concrete next step for ${label}.`})),
  sections:{strongest_signal:'Your initiative is concrete and credible.',revision_priority:'Explain the decision behind your action.'},next_step:'Rewrite the turning point using one specific detail.'};
let received=null,failNext=false;
await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname==='/api/evaluate/essay/access'){await route.fulfill({json:{is_premium:true,remaining:null,free_limit:null}});return;}
  received=req.postData();
  if(failNext){failNext=false;await route.fulfill({status:503,json:{detail:'Temporary fixture failure. Try again.'}});return;}
  await route.fulfill({json:{result,can_full_review:false}});
});
await mkdir(new URL('./output/',import.meta.url),{recursive:true});
try{
  await page.goto(base+'/qa/review-fixture.html');
  const text=page.getByLabel('Your draft',{exact:true});
  const draft='My private typed essay. '.repeat(12);
  await text.fill(draft);
  assert.equal(await text.evaluate(el=>getComputedStyle(el).caretColor),'rgb(17, 24, 39)');
  await page.getByRole('button',{name:'Clear',exact:true}).click();assert.equal(await text.inputValue(),'');
  await page.getByRole('button',{name:'Undo clear',exact:true}).click();assert.equal(await text.inputValue(),draft);
  await page.getByRole('button',{name:'Upload file',exact:true}).click();assert.equal(await text.count(),0);
  const analyze=page.getByRole('button',{name:'Analyze My Essay',exact:true});assert.equal(await analyze.isDisabled(),true);
  const upload=page.getByLabel('Upload document');
  await upload.setInputFiles({name:'essay.txt',mimeType:'text/plain',buffer:Buffer.from('My attached essay. '.repeat(12))});
  assert.equal(await analyze.isEnabled(),true);
  const inputBox=await page.locator('.submission-input').boundingBox(),buttonBox=await analyze.boundingBox();
  assert.ok(buttonBox.y-(inputBox.y+inputBox.height)>=16,'Upload and analyze need spacing');
  failNext=true;await analyze.click();await page.getByRole('alert').waitFor();
  assert.equal(await page.getByText('essay.txt',{exact:true}).count(),1,'Failed upload must keep attachment');
  await analyze.click();await page.locator('.evaluation-radar').waitFor();
  assert.match(received,/essay.txt/);assert.doesNotMatch(received,/My private typed essay/);
  await page.getByRole('button',{name:/3\. Reflection/}).click();await page.getByText('A concrete next step for Reflection.',{exact:true}).first().waitFor();
  await page.getByRole('button',{name:'Write or paste',exact:true}).click();assert.equal(await text.inputValue(),draft);
  await analyze.click();await page.locator('.evaluation-radar').waitFor();assert.equal(JSON.parse(received).content,draft);
  for(const width of [320,390,768]){
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
    await page.screenshot({path:new URL(`./output/review-${width}.png`,import.meta.url).pathname,fullPage:true});
  }
  for(const tool of ['ec','recommendation','portfolio']){
    await page.getByRole('button',{name:tool,exact:true}).click();
    if(tool==='ec') await page.getByRole('button',{name:'Full activities list',exact:true}).click();
    await page.getByRole('button',{name:'Upload file',exact:true}).click();
    await upload.setInputFiles({name:'work.txt',mimeType:'text/plain',buffer:Buffer.from('A real example with supporting evidence. '.repeat(4))});
    await page.locator('.card > .button').first().click();await page.locator('.evaluation-radar').waitFor();
  }
  assert.deepEqual(failures,[]);console.log('Review interaction checks passed. Inspect screenshots; live Telegram and AI remain separate checks.');
}finally{await browser.close();}
