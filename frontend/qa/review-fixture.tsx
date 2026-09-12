// Development-only fixture, outside the production Vite entry point.
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import EssayLabScreen from '../src/screens/EssayLabScreen';
import {ECBuilderScreen,RecommendationScreen,PortfolioBuilderScreen} from '../src/screens/FocusedTools';
import '../src/index.css';
function Fixture(){
  const [tool,setTool]=useState('essay');
  const shared={navigate:()=>{},onChanged:()=>{}};
  return <main style={{maxWidth:720,margin:'auto',padding:16}}><nav style={{display:'flex',gap:12,marginBottom:20}}>{['essay','ec','recommendation','portfolio'].map(x=><button key={x} onClick={()=>setTool(x)}>{x}</button>)}</nav>
    {tool==='essay'?<EssayLabScreen {...shared} isPremium={true} onUpgrade={()=>{}}/>:tool==='ec'?<ECBuilderScreen {...shared}/>:tool==='recommendation'?<RecommendationScreen {...shared}/>:<PortfolioBuilderScreen {...shared}/>}
  </main>;
}
if(!['localhost','127.0.0.1'].includes(location.hostname))throw new Error('Local fixture only');
createRoot(document.getElementById('root')!).render(<Fixture/>);
