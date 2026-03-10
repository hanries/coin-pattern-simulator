import { useState, useRef } from "react";

const PATTERNS = { HTH: ["H","T","H"], HTHH: ["H","T","H","H"] };
const THEORY = { HTH: 10, HTHH: 18 };

function matchLength(seq, pattern) {
  for (let len = Math.min(seq.length, pattern.length); len > 0; len--) {
    if (pattern.slice(0,len).every((v,i) => v === seq[seq.length-len+i])) return len;
  }
  return 0;
}

function runOneTrial(pattern) {
  let seq = [], progress = 0;
  while (progress < pattern.length) {
    const flip = Math.random() < 0.5 ? "H" : "T";
    seq.push(flip);
    progress = matchLength(seq, pattern);
  }
  return seq.length;
}

export default function App() {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress2, setProgress2] = useState(0);
  const [trials, setTrials] = useState(100000);
  const [liveSeq, setLiveSeq] = useState([]);
  const [livePattern, setLivePattern] = useState("HTH");
  const [liveRunning, setLiveRunning] = useState(false);
  const liveRef = useRef(false);
  const runKey = useRef(0);

  // Chunked async simulation to avoid blocking UI
  const runSim = async () => {
    setRunning(true);
    setResults(null);
    setProgress2(0);
    const CHUNK = 2000;
    const totals = { HTH: 0, HTHH: 0 };
    let done = 0;
    while (done < trials) {
      const batch = Math.min(CHUNK, trials - done);
      await new Promise(r => setTimeout(r, 0));
      for (let i = 0; i < batch; i++) {
        totals.HTH += runOneTrial(PATTERNS.HTH);
        totals.HTHH += runOneTrial(PATTERNS.HTHH);
      }
      done += batch;
      setProgress2(Math.round((done / trials) * 100));
    }
    setResults({ hth: totals.HTH / trials, hthh: totals.HTHH / trials });
    setRunning(false);
  };

  const runLive = async (patternKey) => {
    if (liveRunning) return;
    runKey.current += 1;
    const myKey = runKey.current;
    liveRef.current = true;
    setLiveRunning(true);
    setLivePattern(patternKey);
    setLiveSeq([]);
    const pattern = PATTERNS[patternKey];
    const seq = [];
    let prog = 0;
    // Cap display at 300 flips to avoid infinite loop in UI
    while (prog < pattern.length && liveRef.current && seq.length < 300) {
      await new Promise(r => setTimeout(r, 80));
      if (runKey.current !== myKey) return;
      const flip = Math.random() < 0.5 ? "H" : "T";
      seq.push(flip);
      prog = matchLength(seq, pattern);
      setLiveSeq([...seq]);
    }
    // If we hit cap without finishing, fast-complete silently
    if (prog < pattern.length) {
      while (prog < pattern.length) {
        const flip = Math.random() < 0.5 ? "H" : "T";
        seq.push(flip);
        prog = matchLength(seq, pattern);
      }
      setLiveSeq([...seq]);
    }
    setLiveRunning(false);
    liveRef.current = false;
  };

  const stopLive = () => { liveRef.current = false; setLiveRunning(false); };

  const pat = PATTERNS[livePattern];
  const prog = liveSeq.length > 0 ? matchLength(liveSeq, pat) : 0;
  const done = prog === pat.length && liveSeq.length > 0;

  return (
    <div style={{
      minHeight:"100vh", background:"#07080f", fontFamily:"'Courier New',monospace",
      color:"#ccc", padding:"28px 16px", display:"flex", flexDirection:"column",
      alignItems:"center", gap:"20px"
    }}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"10px",letterSpacing:"5px",color:"#444",marginBottom:"6px"}}>MARKOV CHAIN VERIFIER</div>
        <h1 style={{margin:0,fontSize:"20px",color:"#fff",letterSpacing:"1px"}}>Coin Pattern Simulator</h1>
        <p style={{margin:"6px 0 0",fontSize:"11px",color:"#555"}}>Verifying E[HTH] = 10 · E[HTHH] = 18</p>
      </div>

      {/* BULK */}
      <div style={{background:"#0d0e18",border:"1px solid #1e2030",borderRadius:"10px",padding:"22px",width:"100%",maxWidth:"460px"}}>
        <div style={{fontSize:"10px",letterSpacing:"4px",color:"#555",marginBottom:"14px"}}>BULK SIMULATION</div>
        <div style={{display:"flex",gap:"8px",marginBottom:"14px",alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:"11px",color:"#555"}}>TRIALS:</span>
          {[10000,100000,500000].map(n=>(
            <button key={n} onClick={()=>setTrials(n)} style={{
              padding:"4px 11px",borderRadius:"5px",cursor:"pointer",fontSize:"11px",
              border:trials===n?"1px solid #4a7cf7":"1px solid #252535",
              background:trials===n?"#0f1a3a":"transparent",
              color:trials===n?"#7aacff":"#555"
            }}>{n.toLocaleString()}</button>
          ))}
        </div>

        <button onClick={runSim} disabled={running} style={{
          width:"100%",padding:"10px",borderRadius:"7px",cursor:running?"not-allowed":"pointer",
          background:running?"#111":"#0a1a40",border:"1px solid #2a4aaf",
          color:running?"#333":"#7aacff",fontSize:"12px",letterSpacing:"3px",marginBottom:"14px"
        }}>
          {running ? `RUNNING... ${progress2}%` : "▶  RUN"}
        </button>

        {running && (
          <div style={{height:"3px",background:"#1a1b2e",borderRadius:"2px",marginBottom:"14px"}}>
            <div style={{height:"100%",background:"#4a7cf7",borderRadius:"2px",width:`${progress2}%`,transition:"width 0.2s"}}/>
          </div>
        )}

        {results && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
            {[{key:"HTH",val:results.hth},{key:"HTHH",val:results.hthh}].map(({key,val})=>{
              const theory=THEORY[key], err=Math.abs(val-theory), pct=((err/theory)*100).toFixed(2);
              return (
                <div key={key} style={{background:"#090a12",border:"1px solid #1a1b2e",borderRadius:"8px",padding:"14px",textAlign:"center"}}>
                  <div style={{fontSize:"13px",letterSpacing:"3px",color:"#7aacff",marginBottom:"10px",fontWeight:"700"}}>{key}</div>
                  <div style={{fontSize:"10px",color:"#444",marginBottom:"2px"}}>SIMULATED</div>
                  <div style={{fontSize:"22px",fontWeight:"700",color:"#fff",marginBottom:"8px"}}>{val.toFixed(2)}</div>
                  <div style={{fontSize:"10px",color:"#444",marginBottom:"2px"}}>THEORY</div>
                  <div style={{fontSize:"22px",fontWeight:"700",color:"#4a7cf7",marginBottom:"8px"}}>{theory}</div>
                  <div style={{
                    fontSize:"10px",padding:"3px 8px",borderRadius:"4px",display:"inline-block",
                    background:err<0.3?"#0a2a18":"#2a0f0a",
                    color:err<0.3?"#4caf82":"#f07060",
                    border:`1px solid ${err<0.3?"#2a6a48":"#6a2a20"}`
                  }}>{pct}% error</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LIVE */}
      <div style={{background:"#0d0e18",border:"1px solid #1e2030",borderRadius:"10px",padding:"22px",width:"100%",maxWidth:"460px"}}>
        <div style={{fontSize:"10px",letterSpacing:"4px",color:"#555",marginBottom:"14px"}}>LIVE RUN</div>
        <div style={{display:"flex",gap:"10px",marginBottom:"14px"}}>
          {["HTH","HTHH"].map(p=>(
            <button key={p} onClick={()=>runLive(p)} disabled={liveRunning} style={{
              flex:1,padding:"8px",borderRadius:"7px",cursor:liveRunning?"not-allowed":"pointer",
              background:livePattern===p&&liveSeq.length>0?"#0a1628":"transparent",
              border:`1px solid ${livePattern===p&&liveSeq.length>0?"#4a7cf7":"#252535"}`,
              color:livePattern===p&&liveSeq.length>0?"#7aacff":"#555",
              fontSize:"14px",fontWeight:"700",letterSpacing:"3px"
            }}>{p}</button>
          ))}
          {liveRunning&&<button onClick={stopLive} style={{padding:"8px 14px",borderRadius:"7px",cursor:"pointer",background:"transparent",border:"1px solid #4a2020",color:"#f07060",fontSize:"12px"}}>■</button>}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"12px"}}>
          <span style={{fontSize:"10px",color:"#444",letterSpacing:"2px"}}>TARGET</span>
          {pat.map((c,i)=>(
            <div key={i} style={{width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid #2a3a6a",borderRadius:"5px",background:"#0a1028",color:"#7aacff",fontSize:"12px",fontWeight:"700"}}>{c}</div>
          ))}
        </div>

        {liveSeq.length>0&&(
          <div style={{marginBottom:"10px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"4px"}}>
              <span style={{fontSize:"11px",color:"#555"}}>PROGRESS <span style={{color:"#7aacff"}}>{prog}/{pat.length}</span></span>
              <span style={{fontSize:"11px",color:done?"#4caf82":"#555"}}>{liveSeq.length} tosses {done?"✓ FOUND!":""}</span>
            </div>
            <div style={{height:"3px",background:"#1a1b2e",borderRadius:"2px"}}>
              <div style={{height:"100%",borderRadius:"2px",background:done?"#4caf82":"#4a7cf7",width:`${(prog/pat.length)*100}%`,transition:"width 0.15s"}}/>
            </div>
          </div>
        )}

        <div style={{
          minHeight:"60px",background:"#090a12",border:"1px solid #141520",
          borderRadius:"7px",padding:"8px",display:"flex",flexWrap:"wrap",
          gap:"3px",alignContent:"flex-start",maxHeight:"130px",overflowY:"auto"
        }}>
          {liveSeq.map((c,i)=>{
            const isMatch = i>=liveSeq.length-prog;
            const color = isMatch?(done?"done":"active"):"neutral";
            return (
              <div key={i} style={{
                width:"22px",height:"22px",display:"flex",alignItems:"center",justifyContent:"center",
                borderRadius:"3px",fontSize:"10px",fontWeight:"700",
                background:color==="done"?"#0d2a18":color==="active"?"#0d1a38":"#0f0f18",
                border:`1px solid ${color==="done"?"#3a8a58":color==="active"?"#3a5aaf":"#1a1a28"}`,
                color:color==="done"?"#4caf82":color==="active"?"#7aacff":"#444"
              }}>{c}</div>
            );
          })}
          {liveRunning&&<div style={{width:"22px",height:"22px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"3px",border:"1px solid #222",color:"#333",fontSize:"16px",animation:"blink 0.5s infinite alternate"}}>·</div>}
          {liveSeq.length===0&&!liveRunning&&<div style={{color:"#333",fontSize:"12px",padding:"6px"}}>Click HTH or HTHH to start...</div>}
        </div>
      </div>

      <div style={{fontSize:"10px",color:"#333",letterSpacing:"2px"}}>E[HTH] = 10 · E[HTHH] = 18</div>
      <style>{`@keyframes blink{from{opacity:0.1}to{opacity:1}}`}</style>
    </div>
  );
}