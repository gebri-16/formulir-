import { useEffect, useMemo, useRef, useState } from "react";

const UNLOCK_AT = 0.55; // 55% area form harus bersih

export default function FoggyWindow() {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const formRef = useRef(null);
  const last = useRef(null);
  const lastCheck = useRef(0);

  const [clear, setClear] = useState(0); // 0..1 seberapa bersih area form
  const [unlocked, setUnlocked] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [sent, setSent] = useState(false);

  // data acak untuk tetesan hujan & lampu kota (dibuat sekali)
  const drops = useMemo(
    () =>
      Array.from({ length: 36 }, () => ({
        left: Math.random() * 100,
        delay: -Math.random() * 6,
        dur: 2.5 + Math.random() * 3.5,
        h: 18 + Math.random() * 34,
      })),
    []
  );
  const lights = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        left: 4 + i * 11 + Math.random() * 5,
        top: 55 + Math.random() * 30,
        size: 26 + Math.random() * 40,
        hue: [38, 28, 205, 340, 48][i % 5],
      })),
    []
  );

  const paintFog = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(188, 205, 222, 0.93)";
    ctx.fillRect(0, 0, c.width, c.height);
    // bintik embun
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.arc(Math.random() * c.width, Math.random() * c.height, Math.random() * 7 + 1, 0, 7);
      ctx.fill();
    }
  };

  // ukuran canvas mengikuti jendela
  useEffect(() => {
    const fit = () => {
      const r = stageRef.current.getBoundingClientRect();
      canvasRef.current.width = r.width;
      canvasRef.current.height = r.height;
      paintFog();
      setClear(0);
      setUnlocked(false);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // hitung seberapa bersih area form
  const measure = () => {
    const c = canvasRef.current;
    const s = stageRef.current.getBoundingClientRect();
    const f = formRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.floor(f.left - s.left));
    const y = Math.max(0, Math.floor(f.top - s.top));
    const w = Math.min(c.width - x, Math.floor(f.width));
    const h = Math.min(c.height - y, Math.floor(f.height));
    if (w <= 0 || h <= 0) return;
    const data = c.getContext("2d").getImageData(x, y, w, h).data;
    let cleared = 0, total = 0;
    for (let i = 3; i < data.length; i += 4 * 12) {
      total++;
      if (data[i] < 90) cleared++;
    }
    const ratio = cleared / total;
    setClear(ratio);
    if (ratio >= UNLOCK_AT) setUnlocked(true);
  };

  const wipe = (e) => {
    if (unlocked || !last.current) return;
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    const ctx = c.getContext("2d");
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = 54;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    const now = performance.now();
    if (now - lastCheck.current > 120) {
      lastCheck.current = now;
      measure();
    }
  };

  const down = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    last.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    e.currentTarget.setPointerCapture(e.pointerId);
    wipe(e);
  };

  const submit = (e) => {
    e.preventDefault();
    if (user && pass) setSent(true);
  };

  const reset = () => {
    paintFog();
    setClear(0);
    setUnlocked(false);
    setSent(false);
    setUser("");
    setPass("");
  };

  const progress = Math.min(1, clear / UNLOCK_AT);

  return (
    <div className="fw-root">
      <style>{css}</style>
      <div className="fw-stage" ref={stageRef}>
        {/* pemandangan di balik kaca */}
        <div className="fw-scene">
          {lights.map((l, i) => (
            <span
              key={i}
              className="fw-bokeh"
              style={{
                left: `${l.left}%`,
                top: `${l.top}%`,
                width: l.size,
                height: l.size,
                background: `hsl(${l.hue} 95% 62%)`,
              }}
            />
          ))}
        </div>

        {/* tetesan hujan */}
        {drops.map((d, i) => (
          <span
            key={i}
            className="fw-drop"
            style={{
              left: `${d.left}%`,
              height: d.h,
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.dur}s`,
            }}
          />
        ))}

        {/* embun (bisa diusap) */}
        <canvas
          ref={canvasRef}
          className="fw-fog"
          style={{ pointerEvents: unlocked ? "none" : "auto" }}
          onPointerDown={down}
          onPointerMove={wipe}
          onPointerUp={() => (last.current = null)}
          onPointerLeave={() => (last.current = null)}
        />

        {/* form: makin jelas saat embun diusap */}
        <form
          ref={formRef}
          className="fw-form"
          onSubmit={submit}
          style={{
            opacity: unlocked ? 1 : 0.15 + progress * 0.7,
            filter: unlocked ? "none" : `blur(${(1 - progress) * 6}px)`,
          }}
        >
          {!sent ? (
            <>
              <h1>Masuk</h1>
              <p className="fw-hint">
                {unlocked ? "Tulis di kaca..." : "Usap kaca untuk melihat formulir"}
              </p>
              <label>
                Nama pengguna
                <input
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  disabled={!unlocked}
                  autoComplete="off"
                />
              </label>
              <label>
                Kata sandi
                <input
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  disabled={!unlocked}
                />
              </label>
              <button className="fw-btn" disabled={!unlocked || !user || !pass}>
                <span>Masuk</span>
              </button>
            </>
          ) : (
            <div className="fw-done">
              <h1>Halo, {user}</h1>
              <p>Kamu sudah masuk. Hangat di dalam, hujan di luar.</p>
              <button type="button" className="fw-link" onClick={reset}>
                Embunkan kaca lagi
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

const css = `
.fw-root{min-height:100vh;display:grid;place-items:center;background:#05080f;padding:16px;box-sizing:border-box;font-family:'Caveat','Segoe Print','Bradley Hand',cursive}
.fw-stage{position:relative;width:min(560px,100%);aspect-ratio:3/4;max-height:92vh;border-radius:18px;overflow:hidden;border:10px solid #2a2f3a;box-shadow:0 0 0 3px #11151d,0 30px 80px rgba(0,0,0,.7);background:linear-gradient(#0a1224,#16233f 70%,#1d2d4d)}
.fw-scene{position:absolute;inset:0}
.fw-bokeh{position:absolute;border-radius:50%;filter:blur(7px);opacity:.75}
.fw-drop{position:absolute;top:-50px;width:3px;border-radius:3px;background:linear-gradient(rgba(255,255,255,0),rgba(255,255,255,.7));animation:fw-fall linear infinite;z-index:1}
@keyframes fw-fall{to{transform:translateY(900px)}}
.fw-fog{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab;z-index:2}
.fw-form{position:absolute;z-index:3;left:50%;top:50%;transform:translate(-50%,-50%);width:78%;color:#f4f8ff;text-shadow:0 1px 6px rgba(0,0,0,.45);transition:opacity .4s,filter .4s;pointer-events:none}
.fw-form>*{pointer-events:auto}
.fw-form h1{font-size:3rem;margin:0;font-weight:700;letter-spacing:.02em}
.fw-hint{margin:0 0 18px;font-size:1.3rem;opacity:.85}
.fw-form label{display:block;font-size:1.35rem;margin-bottom:14px}
.fw-form input{display:block;width:100%;box-sizing:border-box;margin-top:2px;background:transparent;border:0;border-bottom:2px solid rgba(255,255,255,.7);color:#fff;font:inherit;font-size:1.7rem;padding:4px 2px;outline:none}
.fw-form input:focus{border-bottom-color:#9fd3ff}
.fw-form input:disabled{opacity:.6}
.fw-btn{margin:16px auto 0;display:grid;place-items:center;width:84px;height:104px;border:0;cursor:pointer;color:#fff;font:inherit;font-size:1.4rem;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.75),rgba(150,200,255,.35) 45%,rgba(90,150,230,.55));border-radius:50% 50% 50% 50%/62% 62% 38% 38%;box-shadow:inset -4px -6px 12px rgba(0,60,140,.35),0 6px 14px rgba(0,0,0,.35);transition:transform .3s,opacity .3s}
.fw-btn:disabled{opacity:.45;cursor:not-allowed}
.fw-btn:not(:disabled):hover{transform:translateY(8px)}
.fw-btn:not(:disabled):active{transform:translateY(60px) scaleY(1.2)}
.fw-done p{font-size:1.5rem}
.fw-link{background:none;border:0;color:#bfe0ff;font:inherit;font-size:1.3rem;text-decoration:underline;cursor:pointer;padding:0}
@media (prefers-reduced-motion:reduce){.fw-drop{animation:none}}
`;