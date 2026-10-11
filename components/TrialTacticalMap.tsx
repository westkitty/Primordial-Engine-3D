import React from 'react';
import type {TrialView} from '../trial';

/** A material-events map, not fictional telemetry: markers come from current world entities. */
export function TrialTacticalMap({view}: {view: TrialView}) {
  const px=(x:number)=>Math.max(0,Math.min(160,x+80));
  const position={x:px(view.target.x),y:px(view.target.z)};
  const fireCount=view.signals.filter(s=>s.kind==='fire').length;
  const damageCount=view.signals.filter(s=>s.kind==='damage').length;
  const collateralCount=view.signals.filter(s=>s.kind==='collateral').length;
  return <div style={{margin:'9px 0',border:'1px solid rgba(221,190,132,.5)',borderRadius:10,
    padding:9,background:'rgba(15,31,34,.78)'}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:8,fontSize:11,marginBottom:6}}>
      <strong style={{color:'#f2d79c'}}>TACTICAL GROUND</strong>
      <span style={{color:'#d7ded2'}}>Real-time material signals</span>
    </div>
    <svg role="img" aria-label={`Kingdom tactical map. Target at ${Math.round(view.target.x)}, ${Math.round(view.target.z)}. ${fireCount} burning trees, ${damageCount} damaged structures and ${collateralCount} off-target marks shown.`}
      viewBox="0 0 160 160" style={{display:'block',width:'100%',height:132,borderRadius:6,background:'#1b2c30'}}>
      <title>Kingdom tactical map centered on the existing river</title>
      <rect width="160" height="160" fill="#273a34" />
      <g stroke="#789082" strokeWidth=".45" opacity=".4">
        <path d="M40 0V160M80 0V160M120 0V160M0 40H160M0 80H160M0 120H160" fill="none" />
      </g>
      <path d="M77 0Q84 36 77 78Q71 113 79 160" stroke="#477e8b" strokeWidth="7" fill="none" />
      <path d="M4 80H155" stroke="#777d66" strokeWidth="2" strokeDasharray="3 3" />
      <circle cx="102" cy="62" r="5" fill="none" stroke="#b8b6a8" strokeWidth="1.4" />
      <path d="M102 57V67M97 62H107" stroke="#b8b6a8" strokeWidth="1" />
      <circle cx={position.x} cy={position.y} r="15" fill="none" stroke="#f7d68e" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx={position.x} cy={position.y} r="4" fill="#f7c65b" stroke="#101923" strokeWidth="1.7" />
      {view.signals.map((signal,i)=>signal.kind==='collateral'
        ? <path key={`collateral-${i}`} d={`M${px(signal.x)-3} ${px(signal.z)-3}l6 6m0 -6l-6 6`}
          stroke="#f4c578" strokeWidth="1.7" strokeLinecap="round" />
        : <circle key={`${signal.kind}-${i}`} cx={px(signal.x)} cy={px(signal.z)}
          r={signal.kind==='fire'?3:2.8} fill={signal.kind==='fire'?'#ff5f44':'#dbd9d4'}
          stroke="#101923" strokeWidth=".85" />)}
      <text x="7" y="12" fill="#c9d6cc" fontSize="7">N</text>
      <text x="8" y="152" fill="#c9d6cc" fontSize="7">160u kingdom · x,z</text>
    </svg>
    <p style={{fontSize:10,color:'#b8c9d7',margin:'6px 0 0'}}>Gold circle: objective · Red: burning trees · White: damaged structures · Gold crosses: your off-target damage · Blue: river.
      Showing up to 16 live local signals and ten recent off-target sites, not all affected terrain cells.</p>
  </div>;
}
