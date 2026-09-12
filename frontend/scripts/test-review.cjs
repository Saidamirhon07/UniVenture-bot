// No live server, production account, or AI calls.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const esbuild = require('esbuild');
const root = path.resolve(__dirname,'..');
const out = path.join(root,'qa/output');fs.mkdirSync(out,{recursive:true});
global.sessionStorage={getItem:()=>null};
function bundle(entry,name) {
  esbuild.buildSync({entryPoints:[path.join(root,entry)],bundle:true,platform:'node',format:'cjs',jsx:'automatic',define:{'import.meta.env':'{}'},external:['react','react-dom'],outfile:path.join(out,name)});
  return require(path.join(out,name));
}
const {validCriteria, default:Chart}=bundle('src/components/EvaluationChart.tsx','chart.cjs');
const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
const good=[{label:'Evidence',score:75,evidence:'Specific example',improvement:'Add an outcome'},{label:'Clarity',score:60},{label:'Structure',score:90}];
assert.equal(validCriteria(good).length,3);
for(const score of [null,'75',-1,101,NaN,Infinity])assert.equal(validCriteria([{label:'Evidence',score}])[0].score,null);
assert.equal(validCriteria({}).length,0);
let html=renderToStaticMarkup(React.createElement(Chart,{value:good}));
assert.match(html,/Radar chart/);assert.match(html,/75\/100/);assert.match(html,/Specific example/);assert.doesNotMatch(html,/NaN/);
html=renderToStaticMarkup(React.createElement(Chart,{value:[...good,{label:'Uncertain',score:null}]}));
assert.doesNotMatch(html,/Radar chart/);assert.match(html,/Not assessed/);
const {StructuredResult,resultToText}=bundle('src/components/ResultPanel.tsx','result.cjs');
html=renderToStaticMarkup(React.createElement(StructuredResult,{result:{criteria:good,sections:{elevated_version:'A stronger rewritten essay.'},activity_reviews:[{name:'Robotics',score:82,leadership:'Led five students',impact:'Built a working prototype',main_issue:'Missing user count',stronger_description:'Led five students to build a working prototype.'}],recommended_order:['Robotics — strongest leadership evidence']}}));
assert.match(html,/Leadership &amp; initiative/);assert.match(html,/Robotics/);assert.match(html,/Recommended order/);
assert.match(html,/Copy full feedback/);assert.match(html,/Copy rewrite/);assert.match(html,/aria-label="Copy"/);
assert.match(resultToText({elevated_version:'A stronger rewritten essay.'}),/A stronger rewritten essay/);
let recorded=[];global.fetch=async(path,options)=>{recorded.push({path,...options});return {ok:true,json:async()=>({result:{}})};};
const {api}=bundle('src/api.ts','api.cjs');
(async()=>{
  const payload={content:'PRIVATE HIDDEN DRAFT',school_name:'Example'};
  const file=new File(['original document'],'essay.txt',{type:'text/plain'});
  await api.analyze('/api/evaluate/essay',payload,file);
  assert.equal(recorded[0].path,'/api/files/analyze');
  assert.equal(recorded[0].body.get('file').name,'essay.txt');
  assert.equal(await recorded[0].body.get('file').text(),'original document');
  assert.deepEqual(JSON.parse(recorded[0].body.get('payload')),{school_name:'Example'});
  assert.equal(payload.content,'PRIVATE HIDDEN DRAFT');
  await api.analyze('/api/evaluate/essay',payload,null);
  assert.equal(recorded[1].path,'/api/evaluate/essay');assert.equal(JSON.parse(recorded[1].body).content,payload.content);
  console.log('Review checks passed: chart validation/rendering and separate text/file request payloads.');
})().catch(e=>{console.error(e);process.exitCode=1});
