const { useState, useEffect } = React;

// ── Colour System (from brand doc) ───────────────────────────────────────────
const C = {
  pageBg:        "#07003A",        // Pages background (purple, op 83)
  pageBgSolid:   "#07003Ad4",
  sidebar:       "#1C0859",        // Side menu bar navy blue (op 15 over page bg)
  sidebarBorder: "rgba(255,255,255,0.08)",
  navText:       "rgba(255,255,255,0.73)",   // Nav labels white 73
  navActive:     "#DE5C5C",        // Active nav orange
  searchBar:     "#D9D9D9",        // Search bar ash
  logo:          "#AFAED7",        // Budget flow logo light purple
  white70:       "rgba(255,255,255,0.70)",
  // Budget
  budgetOrange:  "#E7AEAE",
  budgetGreen:   "#4CAF81",
  // Add transaction
  txRed:         "#F72424",
  txGreen:       "#00D472",
  txPurple:      "#816DBC",
  // Activity
  actGenerate:   "#9673FF",
  actButton:     "#7D63CC",
  actPurpleLight:"#816DBC",
  // Dashboard
  dashGreen:     "#00FC11",
  dashRed:       "#FF0808",
  dashLowest:    "#4CAF81",
  // Savings progress
  savingsBar:    "#7DF094",
  // Financial report
  reportRed:     "#FF0808",
  reportGreen:   "#00FC11",
  // Profile boxes
  profileBox:    "rgba(217,217,217,0.50)",
  editBox:       "#FFF1F1",
};

// ── Sample Data ───────────────────────────────────────────────────────────────
const TRANSACTIONS = [
  { id:1, type:"expense", category:"Food",       desc:"Grocery Store",    amount:84.50,   date:"Mar 10" },
  { id:2, type:"income",  category:"Salary",     desc:"Monthly Pay",      amount:3200.00, date:"Mar 01" },
  { id:3, type:"expense", category:"Transport",  desc:"Uber Ride",        amount:14.75,   date:"Mar 09" },
  { id:4, type:"expense", category:"Shopping",   desc:"Amazon Order",     amount:126.00,  date:"Mar 08" },
  { id:5, type:"expense", category:"Bills",      desc:"Electricity Bill", amount:67.30,   date:"Mar 05" },
  { id:6, type:"income",  category:"Freelance",  desc:"Design Project",   amount:850.00,  date:"Mar 07" },
  { id:7, type:"expense", category:"Health",     desc:"Pharmacy",         amount:22.00,   date:"Mar 06" },
  { id:8, type:"expense", category:"Food",       desc:"Restaurant",       amount:48.90,   date:"Mar 04" },
];

const BUDGETS = [
  { id:1, category:"Food",      limit:400, spent:133.40, color: C.budgetOrange },
  { id:2, category:"Transport", limit:150, spent:14.75,  color: C.actPurpleLight },
  { id:3, category:"Shopping",  limit:300, spent:126.00, color: C.txPurple },
  { id:4, category:"Bills",     limit:200, spent:67.30,  color: C.logo },
  { id:5, category:"Health",    limit:100, spent:22.00,  color: C.budgetGreen },
];

const CAT_COLORS = {
  Food:"#E7AEAE", Transport:"#816DBC", Shopping:"#9673FF",
  Bills:"#AFAED7", Health:"#4CAF81", Salary:"#00FC11", Freelance:"#00D472", Other:"#D9D9D9",
};

const WEEK = [
  {d:"M",v:42},{d:"T",v:85},{d:"W",v:30},
  {d:"T",v:110},{d:"F",v:67},{d:"S",v:95},{d:"S",v:23},
];

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ico = ({ n, s = 18 }) => {
  const map = {
    grid:   <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    bars:   <><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></>,
    plus:   <><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
    pulse:  <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    trend:  <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    cog:    <><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>,
    up:     <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    down:   <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>,
    wallet: <><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></>,
    x:      <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    trash:  <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    user:   <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    save:   <><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>,
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {map[n]}
    </svg>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n => `$${Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

// ── Donut Chart ───────────────────────────────────────────────────────────────
function Donut({ segments, size=120 }) {
  const r=46, cx=60, cy=60, circ=2*Math.PI*r;
  const total = segments.reduce((s,x)=>s+x.v,0)||1;
  let off=0;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={18}/>
      {segments.map((seg,i)=>{
        const dash=(seg.v/total)*circ;
        const el=<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={18}
          strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={-off}
          style={{transform:"rotate(-90deg)",transformOrigin:"60px 60px"}}/>;
        off+=dash; return el;
      })}
      <text x={cx} y={cy-4} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="800" fontFamily="'Syne',sans-serif">{segments.length}</text>
      <text x={cx} y={cy+12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8.5" fontFamily="'DM Sans',sans-serif">CATEGORIES</text>
    </svg>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ data }) {
  const max=Math.max(...data.map(d=>d.v));
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:8,height:72,padding:"0 2px"}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
          <div style={{
            width:"100%", height:`${(d.v/max)*58}px`,
            background: i===3 ? `linear-gradient(180deg,${C.navActive},#c43a3a)` : "rgba(222,92,92,0.22)",
            borderRadius:"4px 4px 2px 2px", transition:"height 0.5s cubic-bezier(.4,0,.2,1)",
          }}/>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontWeight:500}}>{d.d}</span>
        </div>
      ))}
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, color, over }) {
  return (
    <div style={{background:"rgba(255,255,255,0.07)",borderRadius:999,height:7,overflow:"hidden"}}>
      <div style={{
        width:`${Math.min(pct,100)}%`, height:"100%", borderRadius:999,
        background: over ? C.dashRed : color,
        transition:"width 0.7s cubic-bezier(.4,0,.2,1)",
      }}/>
    </div>
  );
}

// ── Tag ───────────────────────────────────────────────────────────────────────
function Tag({ cat }) {
  const c = CAT_COLORS[cat] || "#D9D9D9";
  return (
    <span style={{
      background:c+"22", color:c, border:`1px solid ${c}40`,
      borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:600, whiteSpace:"nowrap",
    }}>{cat}</span>
  );
}

// ── Glass Card ────────────────────────────────────────────────────────────────
const cardStyle = {
  background:"rgba(28,8,89,0.55)",
  border:"1px solid rgba(255,255,255,0.10)",
  borderRadius:16,
  padding:20,
  backdropFilter:"blur(12px)",
};

// ── Add Transaction Modal ─────────────────────────────────────────────────────
function AddModal({ onClose, onAdd }) {
  const [form,setForm]=useState({type:"expense",desc:"",amount:"",category:"Food",date:"2026-03-11"});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const inp = {
    width:"100%", background:"rgba(255,255,255,0.06)",
    border:"1px solid rgba(255,255,255,0.12)", color:"#fff",
    borderRadius:10, padding:"11px 14px", fontSize:14,
    fontFamily:"'DM Sans',sans-serif", outline:"none",
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(7,0,58,0.85)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
      <div style={{...cardStyle,width:"100%",maxWidth:400,animation:"fadeUp 0.22s ease",boxShadow:"0 24px 64px rgba(0,0,0,0.6)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:19,fontWeight:800,color:"#fff"}}>New Transaction</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",padding:4}}><Ico n="x" s={18}/></button>
        </div>

        {/* Type Toggle */}
        <div style={{display:"flex",background:"rgba(255,255,255,0.06)",borderRadius:11,padding:3,marginBottom:20,gap:3}}>
          {[["expense",C.txRed],["income",C.txGreen]].map(([t,col])=>(
            <button key={t} onClick={()=>set("type",t)} style={{
              flex:1,padding:"9px",borderRadius:9,border:"none",cursor:"pointer",
              fontWeight:600,fontSize:13,fontFamily:"'DM Sans',sans-serif",textTransform:"capitalize",
              background:form.type===t ? col : "transparent",
              color:form.type===t ? "#fff" : "rgba(255,255,255,0.4)",
              transition:"all 0.18s",
            }}>{t}</button>
          ))}
        </div>

        {[
          {label:"Description",key:"desc",  type:"text",  ph:"e.g. Coffee"},
          {label:"Amount",     key:"amount",type:"number",ph:"0.00"},
          {label:"Date",       key:"date",  type:"date",  ph:""},
        ].map(f=>(
          <div key={f.key} style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>{f.label}</label>
            <input style={inp} type={f.type} value={form[f.key]} placeholder={f.ph} onChange={e=>set(f.key,e.target.value)}/>
          </div>
        ))}

        <div style={{marginBottom:20}}>
          <label style={{display:"block",fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Category</label>
          <select style={inp} value={form.category} onChange={e=>set("category",e.target.value)}>
            {Object.keys(CAT_COLORS).map(c=><option key={c}>{c}</option>)}
          </select>
        </div>

        <button onClick={()=>form.desc&&form.amount&&onAdd(form)} style={{
          width:"100%",background:`linear-gradient(135deg,${C.txPurple},${C.actButton})`,
          border:"none",color:"#fff",borderRadius:11,padding:"13px",fontSize:15,fontWeight:700,
          fontFamily:"'DM Sans',sans-serif",cursor:"pointer",
          boxShadow:`0 4px 20px rgba(129,109,188,0.4)`,
        }}>Add Transaction</button>
      </div>
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────
function Dashboard({ setPage }) {
  const income  = TRANSACTIONS.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expense = TRANSACTIONS.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const balance = income - expense;
  const catSpend={};
  TRANSACTIONS.filter(t=>t.type==="expense").forEach(t=>{catSpend[t.category]=(catSpend[t.category]||0)+t.amount;});
  const donutSegs=Object.entries(catSpend).map(([k,v])=>({v,color:CAT_COLORS[k]||"#D9D9D9"}));

  return (
    <div className="page">
      <div style={{marginBottom:28}}>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,margin:0,color:"#fff"}}>Dashboard</h1>
        <p style={{color:"rgba(255,255,255,0.4)",fontSize:13,margin:"5px 0 0"}}>March 2026 — financial overview</p>
      </div>

      {/* Stat Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
        {[
          {label:"Net Balance",val:fmt(balance),color:C.navActive,  icon:"wallet"},
          {label:"Income",     val:fmt(income), color:C.dashGreen,  icon:"up"},
          {label:"Expenses",   val:fmt(expense),color:C.dashRed,    icon:"down"},
        ].map(c=>(
          <div key={c.label} style={{...cardStyle,transition:"transform 0.16s,box-shadow 0.16s"}} className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.45)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>{c.label}</span>
              <div style={{width:34,height:34,borderRadius:9,background:c.color+"22",display:"flex",alignItems:"center",justifyContent:"center",color:c.color}}>
                <Ico n={c.icon} s={16}/>
              </div>
            </div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:c.color}}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:14,marginBottom:20}}>
        <div style={cardStyle} className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <span style={{fontWeight:600,fontSize:14,color:"rgba(255,255,255,0.85)"}}>Weekly Spending</span>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.06)",padding:"4px 10px",borderRadius:20}}>This Week</span>
          </div>
          <BarChart data={WEEK}/>
        </div>
        <div style={cardStyle} className="card">
          <div style={{fontWeight:600,fontSize:14,color:"rgba(255,255,255,0.85)",marginBottom:14}}>By Category</div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
            <Donut segments={donutSegs} size={110}/>
            <div style={{width:"100%",display:"flex",flexDirection:"column",gap:7}}>
              {Object.entries(catSpend).slice(0,3).map(([k,v])=>(
                <div key={k} style={{display:"flex",alignItems:"center",gap:7}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:CAT_COLORS[k]||"#D9D9D9",flexShrink:0}}/>
                  <span style={{flex:1,fontSize:11,color:"rgba(255,255,255,0.4)"}}>{k}</span>
                  <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.8)"}}>${v.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={cardStyle} className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{fontWeight:600,fontSize:14,color:"rgba(255,255,255,0.85)"}}>Recent Transactions</span>
          <button onClick={()=>setPage("activity")} style={{background:"none",border:"none",color:C.navActive,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
            View All →
          </button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          {TRANSACTIONS.slice(0,5).map(tx=>(
            <div key={tx.id} className="tx-row" style={{display:"flex",alignItems:"center",gap:12,padding:"9px 8px",borderRadius:10}}>
              <div style={{
                width:34,height:34,borderRadius:9,flexShrink:0,
                background:tx.type==="income" ? C.dashGreen+"18" : C.dashRed+"18",
                color:tx.type==="income" ? C.dashGreen : C.dashRed,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                <Ico n={tx.type==="income"?"up":"down"} s={15}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.85)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.desc}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.3)"}}>{tx.date}</div>
              </div>
              <Tag cat={tx.category}/>
              <div style={{fontSize:14,fontWeight:700,color:tx.type==="income"?C.dashGreen:C.dashRed,whiteSpace:"nowrap"}}>
                {tx.type==="income"?"+":"-"}{fmt(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Budget Page ───────────────────────────────────────────────────────────────
function BudgetPage() {
  return (
    <div className="page">
      <div style={{marginBottom:28}}>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,margin:0,color:"#fff"}}>Budget</h1>
        <p style={{color:"rgba(255,255,255,0.4)",fontSize:13,margin:"5px 0 0"}}>Monthly spending limits</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
        {BUDGETS.map(b=>{
          const pct=(b.spent/b.limit)*100;
          const over=b.spent>b.limit;
          return (
            <div key={b.id} style={cardStyle} className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:b.color}}/>
                  <span style={{fontWeight:600,fontSize:15,color:"rgba(255,255,255,0.9)"}}>{b.category}</span>
                </div>
                <span style={{fontSize:11,color:over?C.dashRed:C.budgetGreen,fontWeight:500}}>
                  {over?"⚠ Over budget":`${fmt(b.limit-b.spent)} left`}
                </span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
                <span style={{fontFamily:"'Syne',sans-serif",fontSize:21,fontWeight:800,color:over?C.dashRed:"#fff"}}>{fmt(b.spent)}</span>
                <span style={{fontSize:12,color:"rgba(255,255,255,0.35)"}}>/ {fmt(b.limit)}</span>
              </div>
              <ProgressBar pct={pct} color={b.color} over={over}/>
              <div style={{marginTop:7,fontSize:11,color:"rgba(255,255,255,0.3)"}}>{pct.toFixed(0)}% used</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Activity Page ─────────────────────────────────────────────────────────────
function ActivityPage() {
  const [txs,setTxs]=useState(TRANSACTIONS);
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");

  const visible=txs.filter(tx=>{
    if(filter!=="all"&&tx.type!==filter) return false;
    if(search&&!tx.desc.toLowerCase().includes(search.toLowerCase())&&!tx.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page">
      <div style={{marginBottom:28}}>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,margin:0,color:"#fff"}}>Activity</h1>
        <p style={{color:"rgba(255,255,255,0.4)",fontSize:13,margin:"5px 0 0"}}>All transactions</p>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        {/* Search bar — Ash #D9D9D9 */}
        <div style={{flex:1,minWidth:160,position:"relative",display:"flex",alignItems:"center"}}>
          <span style={{position:"absolute",left:12,color:"rgba(0,0,0,0.4)"}}><Ico n="search" s={15}/></span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search transactions…" style={{
            width:"100%",background:C.searchBar,border:"none",color:"#07003A",
            borderRadius:10,padding:"10px 14px 10px 36px",fontSize:13,
            fontFamily:"'DM Sans',sans-serif",outline:"none",
          }}/>
        </div>
        {["all","income","expense"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            background:filter===f ? C.actButton : "rgba(255,255,255,0.07)",
            border:`1px solid ${filter===f?C.actButton:"rgba(255,255,255,0.1)"}`,
            color:filter===f?"#fff":"rgba(255,255,255,0.5)",
            borderRadius:10,padding:"10px 16px",fontSize:12,fontWeight:600,
            textTransform:"capitalize",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
            transition:"all 0.15s",
          }}>{f}</button>
        ))}
        <button style={{
          background:C.actGenerate, border:"none",
          color:"#fff", borderRadius:10,padding:"10px 16px",
          fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
        }}>Generate Report</button>
      </div>

      <div style={{...cardStyle,padding:0,overflow:"hidden"}}>
        <div style={{padding:"13px 20px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"grid",gridTemplateColumns:"2fr 1fr 0.8fr 1fr 36px",gap:10}}>
          {["Description","Category","Date","Amount",""].map((h,i)=>(
            <span key={i} style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px"}}>{h}</span>
          ))}
        </div>
        {visible.length===0&&(
          <div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.3)",fontSize:13}}>No transactions found</div>
        )}
        {visible.map(tx=>(
          <div key={tx.id} className="tx-row" style={{
            padding:"12px 20px",display:"grid",gridTemplateColumns:"2fr 1fr 0.8fr 1fr 36px",
            gap:10,alignItems:"center",borderBottom:"1px solid rgba(255,255,255,0.05)",
          }}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{
                width:30,height:30,borderRadius:8,flexShrink:0,
                background:tx.type==="income"?C.dashGreen+"18":C.dashRed+"18",
                color:tx.type==="income"?C.dashGreen:C.dashRed,
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                <Ico n={tx.type==="income"?"up":"down"} s={13}/>
              </div>
              <span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.85)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.desc}</span>
            </div>
            <Tag cat={tx.category}/>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.35)"}}>{tx.date}</span>
            <span style={{fontSize:13,fontWeight:700,color:tx.type==="income"?C.dashGreen:C.dashRed}}>
              {tx.type==="income"?"+":"-"}{fmt(tx.amount)}
            </span>
            <button onClick={()=>setTxs(t=>t.filter(x=>x.id!==tx.id))} style={{
              background:"none",border:"none",color:"rgba(255,255,255,0.2)",cursor:"pointer",padding:4,borderRadius:6,transition:"color 0.15s",
            }}
              onMouseEnter={e=>e.currentTarget.style.color=C.dashRed}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.2)"}
            ><Ico n="trash" s={14}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Financial Report Page ─────────────────────────────────────────────────────
function ReportPage() {
  const income  = TRANSACTIONS.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expense = TRANSACTIONS.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const savings = income>0?((income-expense)/income*100).toFixed(1):0;
  const catSpend={};
  TRANSACTIONS.filter(t=>t.type==="expense").forEach(t=>{catSpend[t.category]=(catSpend[t.category]||0)+t.amount;});
  const topCat=Object.entries(catSpend).sort((a,b)=>b[1]-a[1])[0];
  const maxSpend=Math.max(...Object.values(catSpend));

  return (
    <div className="page">
      <div style={{marginBottom:28}}>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,margin:0,color:"#fff"}}>Financial Report</h1>
        <p style={{color:"rgba(255,255,255,0.4)",fontSize:13,margin:"5px 0 0"}}>Your financial health summary</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14,marginBottom:20}}>
        {[
          {label:"Savings Rate",      val:`${savings}%`,          sub:"of income saved",  color:C.reportGreen},
          {label:"Top Spending",       val:topCat?topCat[0]:"—",  sub:topCat?fmt(topCat[1]):"", color:C.reportRed},
          {label:"Total Transactions", val:TRANSACTIONS.length,   sub:"this period",      color:C.actPurpleLight},
          {label:"Budget Categories",  val:BUDGETS.length,        sub:"being tracked",    color:C.logo},
        ].map(s=>(
          <div key={s.label} style={cardStyle} className="card">
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>{s.label}</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:s.color}}>{s.val}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={cardStyle} className="card">
        <div style={{fontWeight:600,fontSize:14,color:"rgba(255,255,255,0.85)",marginBottom:20}}>Category Breakdown</div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {Object.entries(catSpend).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>{
            const bud=BUDGETS.find(b=>b.category===cat);
            const pct=bud?(amt/bud.limit)*100:(amt/maxSpend)*100;
            const color=CAT_COLORS[cat]||"#D9D9D9";
            return (
              <div key={cat}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:color}}/>
                    <span style={{fontSize:13,fontWeight:500,color:"rgba(255,255,255,0.85)"}}>{cat}</span>
                  </div>
                  <div style={{display:"flex",gap:14}}>
                    {bud&&<span style={{fontSize:12,color:"rgba(255,255,255,0.3)"}}>Budget: {fmt(bud.limit)}</span>}
                    <span style={{fontSize:13,fontWeight:700,color:amt>(bud?.limit||Infinity)?C.reportRed:C.reportGreen}}>{fmt(amt)}</span>
                  </div>
                </div>
                <ProgressBar pct={pct} color={color} over={bud&&amt>bud.limit}/>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Settings Page ─────────────────────────────────────────────────────────────
function SettingsPage() {
  const [currency,setCurrency]=useState("USD");
  const [alerts,setAlerts]=useState(true);
  const [notifs,setNotifs]=useState(true);

  const Toggle=({on,toggle})=>(
    <div onClick={toggle} style={{cursor:"pointer"}}>
      <div style={{width:42,height:23,borderRadius:12,position:"relative",background:on?C.actButton:"rgba(255,255,255,0.1)",transition:"background 0.2s"}}>
        <div style={{width:17,height:17,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:on?22:3,transition:"left 0.2s"}}/>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div style={{marginBottom:28}}>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,margin:0,color:"#fff"}}>Settings</h1>
        <p style={{color:"rgba(255,255,255,0.4)",fontSize:13,margin:"5px 0 0"}}>Preferences & configuration</p>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:480}}>
        {/* Currency */}
        <div style={{...cardStyle,display:"flex",justifyContent:"space-between",alignItems:"center"}} className="card">
          <div>
            <div style={{fontWeight:600,fontSize:14,color:"rgba(255,255,255,0.9)"}}>Currency</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:2}}>Default display currency</div>
          </div>
          <select value={currency} onChange={e=>setCurrency(e.target.value)} style={{
            background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",
            color:"#fff",borderRadius:8,padding:"7px 12px",fontSize:13,
            fontFamily:"'DM Sans',sans-serif",outline:"none",
          }}>
            {["USD","EUR","GBP","GHS"].map(c=><option key={c} style={{background:"#1C0859"}}>{c}</option>)}
          </select>
        </div>

        {/* Profile box — D9D9D9 at 50% */}
        <div style={{...cardStyle,background:C.profileBox,border:"1px solid rgba(255,255,255,0.15)"}} className="card">
          <div style={{fontWeight:600,fontSize:14,color:"#07003A",marginBottom:14}}>Profile</div>
          {["Name","Email","Currency"].map(f=>(
            <div key={f} style={{marginBottom:10}}>
              <label style={{fontSize:11,color:"rgba(7,0,58,0.5)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px",display:"block",marginBottom:5}}>{f}</label>
              <div style={{background:C.editBox,borderRadius:8,padding:"10px 14px",fontSize:13,color:"#07003A",fontWeight:500}}>
                {f==="Name"?"John Doe":f==="Email"?"john@example.com":"USD"}
              </div>
            </div>
          ))}
        </div>

        {[
          {label:"Budget Alerts",   sub:"Notify when near limit",    on:alerts,  fn:()=>setAlerts(a=>!a)},
          {label:"Push Notifications",sub:"App notifications",       on:notifs,  fn:()=>setNotifs(n=>!n)},
        ].map(row=>(
          <div key={row.label} style={{...cardStyle,display:"flex",justifyContent:"space-between",alignItems:"center"}} className="card">
            <div>
              <div style={{fontWeight:600,fontSize:14,color:"rgba(255,255,255,0.9)"}}>{row.label}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:2}}>{row.sub}</div>
            </div>
            <Toggle on={row.on} toggle={row.fn}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
function App() {
  const [page,setPage]=useState("dashboard");
  const [collapsed,setCollapsed]=useState(false);
  const [modal,setModal]=useState(false);
  const [toast,setToast]=useState(null);

  const fireToast=msg=>{setToast(msg);setTimeout(()=>setToast(null),2600);};

  const navItems=[
    {id:"dashboard",label:"Dashboard",       icon:"grid"},
    {id:"budget",   label:"Budget",           icon:"bars"},
    {id:"add",      label:"Add Transaction",  icon:"plus",  special:true},
    {id:"activity", label:"Activity",         icon:"pulse"},
    {id:"report",   label:"Financial Report", icon:"trend"},
  ];

  return (
    <div style={{display:"flex",height:"100vh",background:C.pageBg,fontFamily:"'DM Sans','Segoe UI',sans-serif",overflow:"hidden",position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:${C.pageBg};}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px;}
        .card{transition:transform 0.16s ease,box-shadow 0.16s ease;}
        .card:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(0,0,0,0.4)!important;}
        .tx-row{transition:background 0.12s;cursor:default;}
        .tx-row:hover{background:rgba(255,255,255,0.03);}
        .nav-btn{transition:all 0.15s ease;cursor:pointer;border:none;background:none;text-align:left;}
        .page{animation:fadeUp 0.28s cubic-bezier(.4,0,.2,1);}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
        @keyframes toastPop{from{opacity:0;transform:translateY(16px) scale(.96);}to{opacity:1;transform:translateY(0) scale(1);}}
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{
        width:collapsed?64:230, minWidth:collapsed?64:230,
        background:`rgba(28,8,89,0.92)`,
        borderRight:"1px solid rgba(255,255,255,0.07)",
        backdropFilter:"blur(16px)",
        display:"flex",flexDirection:"column",
        transition:"width 0.22s ease,min-width 0.22s ease",
        overflow:"hidden", zIndex:10,
      }}>
        {/* Logo */}
        <div style={{padding:collapsed?"22px 14px":"22px 18px",display:"flex",alignItems:"center",gap:11,cursor:"pointer"}}
          onClick={()=>setCollapsed(c=>!c)}>
          <div style={{
            width:36,height:36,borderRadius:10,flexShrink:0,
            background:`linear-gradient(135deg,${C.logo},${C.txPurple})`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,
          }}>💸</div>
          {!collapsed&&<span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:C.logo,whiteSpace:"nowrap",letterSpacing:"-0.3px"}}>Budget-Flow</span>}
        </div>

        {/* Nav Items */}
        <nav style={{flex:1,padding:"6px 10px",display:"flex",flexDirection:"column",gap:3}}>
          {navItems.map(item=>{
            const active=page===item.id;
            if(item.special) return (
              <button key="add" className="nav-btn" onClick={()=>setModal(true)} style={{
                display:"flex",alignItems:"center",gap:10,
                padding:"11px 13px",borderRadius:11,
                color:C.navActive,
                background:"rgba(222,92,92,0.1)",
                border:`1px dashed rgba(222,92,92,0.35)`,
                margin:"4px 0",cursor:"pointer",width:"100%",
              }}>
                <span style={{flexShrink:0,color:C.navActive}}><Ico n={item.icon} s={18}/></span>
                {!collapsed&&<span style={{fontWeight:600,fontSize:13,color:C.navActive,whiteSpace:"nowrap"}}>{item.label}</span>}
              </button>
            );
            return (
              <button key={item.id} className="nav-btn" onClick={()=>setPage(item.id)} style={{
                display:"flex",alignItems:"center",gap:10,
                padding:"11px 13px",borderRadius:11,borderRadius:11,
                background:active?"rgba(222,92,92,0.15)":"transparent",
                color:active?C.navActive:C.navText,
                width:"100%",
              }}>
                <span style={{flexShrink:0}}><Ico n={item.icon} s={18}/></span>
                {!collapsed&&<span style={{fontWeight:active?600:400,fontSize:13,whiteSpace:"nowrap"}}>{item.label}</span>}
                {active&&!collapsed&&<div style={{marginLeft:"auto",width:5,height:5,borderRadius:"50%",background:C.navActive}}/>}
              </button>
            );
          })}
        </nav>

        {/* Settings */}
        <div style={{padding:"10px 10px 18px",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
          <button className="nav-btn" onClick={()=>setPage("settings")} style={{
            display:"flex",alignItems:"center",gap:10,
            padding:"11px 13px",borderRadius:11,width:"100%",
            background:page==="settings"?"rgba(222,92,92,0.15)":"transparent",
            color:page==="settings"?C.navActive:C.navText,
          }}>
            <span style={{flexShrink:0}}><Ico n="cog" s={18}/></span>
            {!collapsed&&<span style={{fontWeight:page==="settings"?600:400,fontSize:13}}>Settings</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{flex:1,overflow:"auto",padding:"30px 34px",minWidth:0}}>
        {page==="dashboard"&&<Dashboard setPage={setPage}/>}
        {page==="budget"   &&<BudgetPage/>}
        {page==="activity" &&<ActivityPage/>}
        {page==="report"   &&<ReportPage/>}
        {page==="settings" &&<SettingsPage/>}
      </main>

      {/* ── Modal ── */}
      {modal&&(
        <AddModal onClose={()=>setModal(false)} onAdd={tx=>{
          fireToast(`✓ ${tx.type==="income"?"Income":"Expense"} added`);
          setModal(false);
        }}/>
      )}

      {/* ── Toast ── */}
      {toast&&(
        <div style={{
          position:"fixed",bottom:26,right:26,zIndex:9999,
          background:C.txPurple,border:"1px solid rgba(255,255,255,0.2)",
          borderRadius:12,padding:"11px 18px",color:"#fff",
          fontSize:13,fontWeight:600,
          boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
          animation:"toastPop 0.25s ease",
        }}>{toast}</div>
      )}
    </div>
  );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
