import { useEffect, useRef, useState } from "react";
import "./App.css";

const UNLOCK_AT = 0.45; // porsi area form yang harus bersih

// Kota malam: gedung + lampu bokeh (data acak, dibuat tiap ukuran layar berubah)
function makeCity(w, h) {
  const buildings = [];
  for (let x = 0; x < w; ) {
    const bw = 50 + Math.random() * 90;
    buildings.push({ x, bw, bh: h * (0.18 + Math.random() * 0.32) });
    x += bw - 6;
  }
  const hues = [38, 28, 200, 345, 50, 160];
  const lights = Array.from({ length: 70 }, () => ({
    x: Math.random() * w,
    y: h * (0.55 + Math.random() * 0.4),
    r: 8 + Math.random() * 26,
    hue: hues[Math.floor(Math.random() * hues.length)],
  }));
  return { buildings, lights };
}

// Dipakai dua kali: tajam (pemandangan) dan buram (lapisan embun)
function drawScene(ctx, w, h, city, blur, day = false) {
  ctx.save();
  ctx.filter = blur ? `blur(${blur}px)` : "none";
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const sky = day ? ["#3f9be6", "#8fcaf3", "#ffe6b8"] : ["#050914", "#14213d", "#2a3b5e"];
  g.addColorStop(0, sky[0]);
  g.addColorStop(0.6, sky[1]);
  g.addColorStop(1, sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(-40, -40, w + 80, h + 80);
  city.buildings.forEach((b) => {
    ctx.fillStyle = day ? "#3d5372" : "#0a0f1c";
    ctx.fillRect(b.x, h - b.bh, b.bw, b.bh);
    ctx.fillStyle = day ? "rgba(255,255,255,.35)" : "rgba(255,205,110,.8)";
    for (let wy = h - b.bh + 12; wy < h - 10; wy += 18)
      for (let wx = b.x + 8; wx < b.x + b.bw - 10; wx += 14)
        if ((wx * 7 + wy * 13) % 5 < 2) ctx.fillRect(wx, wy, 6, 9);
  });
  if (day) {
    // siang: matahari bersinar, lampu kota tidak perlu
    const sx = w * 0.75, sy = h * 0.2;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 220);
    sg.addColorStop(0, "rgba(255,250,220,1)");
    sg.addColorStop(0.15, "rgba(255,240,190,.85)");
    sg.addColorStop(1, "rgba(255,230,170,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(sx - 220, sy - 220, 440, 440);
    ctx.restore();
    return;
  }
  city.lights.forEach((l) => {
    const rg = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    rg.addColorStop(0, `hsla(${l.hue},95%,65%,.75)`);
    rg.addColorStop(1, `hsla(${l.hue},95%,65%,0)`);
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, 7);
    ctx.fill();
  });
  ctx.restore();
}

const newDrop = (w, randomY) => ({
  x: Math.random() * w,
  y: randomY ? Math.random() * innerHeight : -20,
  r: 2 + Math.random() * 3.5,
  v: 0.6 + Math.random() * 1.8,
  wob: Math.random() * 6,
  pause: 0,
});

export default function App() {
  const sharpRef = useRef(null);
  const dayRef = useRef(null);
  const fogRef = useRef(null);
  const formRef = useRef(null);
  const baseRef = useRef(null);
  const dropsRef = useRef([]);
  const lockRef = useRef(false);
  const last = useRef(null);
  const audioRef = useRef(null);
  const setupRef = useRef(null);
  const modeRef = useRef(1); // 0 reda, 1 rintik, 2 lebat

  const [clear, setClear] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [touched, setTouched] = useState(false);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [flash, setFlash] = useState(false);
  const [sound, setSound] = useState(false);

  // Kaca, hujan, dan pengukur embun
  useEffect(() => {
    let raf, frame = 0, lastW = innerWidth;
    const fogCtx = fogRef.current.getContext("2d", { willReadFrequently: true });

    const setup = () => {
      const w = innerWidth, h = innerHeight;
      sharpRef.current.width = fogRef.current.width = w;
      sharpRef.current.height = fogRef.current.height = h;
      const city = makeCity(w, h);
      drawScene(sharpRef.current.getContext("2d"), w, h, city, 0.6);
      dayRef.current.width = w;
      dayRef.current.height = h;
      drawScene(dayRef.current.getContext("2d"), w, h, city, 0.6, true); // versi siang
      const base = document.createElement("canvas");
      base.width = w;
      base.height = h;
      const b = base.getContext("2d");
      drawScene(b, w, h, city, 18);
      b.fillStyle = "rgba(205,220,240,.38)"; // lapisan embun
      b.fillRect(0, 0, w, h);
      baseRef.current = base;
      fogCtx.globalCompositeOperation = "source-over";
      fogCtx.drawImage(base, 0, 0);
      dropsRef.current = Array.from({ length: Math.round(w / 40) }, () => newDrop(w, true));
      lockRef.current = false;
      setUnlocked(false);
      setClear(0);
    };
    setupRef.current = setup;
    setup();

    const loop = () => {
      frame++;
      const w = fogRef.current.width, h = fogRef.current.height;

      // tetesan meluncur dan menghapus embun di jalurnya
      fogCtx.globalCompositeOperation = "destination-out";
      fogCtx.strokeStyle = fogCtx.fillStyle = "#000";
      fogCtx.lineCap = "round";
      dropsRef.current.forEach((d, i) => {
        if (Math.random() < 0.008) d.pause = 40 + Math.random() * 80;
        const step = d.pause > 0 ? (d.pause--, 0) : d.v * (modeRef.current === 2 ? 1.7 : 1);
        const ny = d.y + step;
        const nx = d.x + Math.sin((d.y + d.wob) / 40) * 0.35;
        fogCtx.lineWidth = d.r * 1.1;
        fogCtx.beginPath();
        fogCtx.moveTo(d.x, d.y);
        fogCtx.lineTo(nx, ny);
        fogCtx.stroke();
        fogCtx.beginPath();
        fogCtx.arc(nx, ny, d.r, 0, 7);
        fogCtx.fill();
        d.x = nx;
        d.y = ny;
        if (d.y > h + 10) dropsRef.current[i] = newDrop(w, false);
      });

      // jumlah tetesan mengikuti mode: reda / rintik / lebat
      if (frame % 20 === 0) {
        const target = [0, w / 85, w / 14][modeRef.current] | 0;
        const arr = dropsRef.current;
        if (arr.length < target) {
          for (let k = 0; k < 3 && arr.length < target; k++) arr.push(newDrop(w, false));
        } else if (arr.length > target) {
          arr.length = Math.max(target, Math.floor(arr.length * 0.85));
        }
      }
      if (modeRef.current === 2) {
        // hujan lebat: percikan kecil menghantam kaca
        for (let k = 0; k < 3; k++) {
          fogCtx.beginPath();
          fogCtx.arc(Math.random() * w, Math.random() * h, 1.5 + Math.random() * 3, 0, 7);
          fogCtx.fill();
        }
      }

      // embun pelan-pelan menutup lagi selama form masih terkunci
      if (!lockRef.current && frame % 6 === 0) {
        fogCtx.globalCompositeOperation = "source-over";
        fogCtx.globalAlpha = 0.012;
        fogCtx.drawImage(baseRef.current, 0, 0);
        fogCtx.globalAlpha = 1;
      }

      // ukur seberapa bersih area form
      if (!lockRef.current && frame % 12 === 0 && formRef.current) {
        const f = formRef.current.getBoundingClientRect();
        const x = Math.max(0, f.left | 0), y = Math.max(0, f.top | 0);
        const fw = Math.min(w - x, f.width | 0), fh = Math.min(h - y, f.height | 0);
        if (fw > 0 && fh > 0) {
          const px = fogCtx.getImageData(x, y, fw, fh).data;
          let c = 0, t = 0;
          for (let i = 3; i < px.length; i += 48) {
            t++;
            if (px[i] < 110) c++;
          }
          const r = c / t;
          setClear((p) => (Math.abs(p - r) > 0.02 ? r : p));
          if (r >= UNLOCK_AT) {
            lockRef.current = true;
            setUnlocked(true);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      if (innerWidth !== lastW) {
        lastW = innerWidth;
        setup();
      }
    };
    addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
    };
  }, []);

  // Petir sesekali
  useEffect(() => {
    let t;
    const go = () => {
      t = setTimeout(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 800);
        go();
      }, 8000 + Math.random() * 12000);
    };
    go();
    return () => clearTimeout(t);
  }, []);

  // Mode hujan: rintik (default), lebat (suara menyala), reda (setelah login)
  useEffect(() => {
    modeRef.current = sent ? 0 : sound ? 2 : 1;
    const a = audioRef.current;
    if (a) a.gain.gain.setTargetAtTime(sent ? 0.05 : sound ? 0.5 : 0, a.ac.currentTime, 0.8);
  }, [sound, sent]);

  // Mengusap kaca
  const wipe = (e) => {
    if (!last.current) return;
    const c = fogRef.current;
    const ctx = c.getContext("2d");
    const p = { x: e.clientX, y: e.clientY };
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 70;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const down = (e) => {
    setTouched(true);
    last.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    wipe(e);
  };
  const clearAll = () => {
    const c = fogRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    lockRef.current = true;
    setUnlocked(true);
    setClear(1);
  };

  // Suara hujan (noise coklat lewat Web Audio, perlu klik dulu agar boleh bunyi)
  const toggleSound = () => {
    if (!audioRef.current) {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = buf.getChannelData(0);
      let lastV = 0;
      for (let i = 0; i < d.length; i++) {
        lastV = (lastV + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = lastV * 3.5;
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1400;
      const gain = ac.createGain();
      gain.gain.value = 0;
      src.connect(lp).connect(gain).connect(ac.destination);
      src.start();
      audioRef.current = { ac, gain };
    }
    const { ac, gain } = audioRef.current;
    const on = !sound;
    ac.resume();
    gain.gain.setTargetAtTime(on ? 0.5 : 0, ac.currentTime, 0.3);
    setSound(on);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!user.trim()) return setErr("Isi nama pengguna dulu");
    if (pass.length < 4) return setErr("Kata sandi minimal 4 karakter");
    setErr("");
    setSent(true); // kaca mencair, sambutan muncul
  };
  const reset = () => {
    setSent(false);
    setUser("");
    setPass("");
    setErr("");
    setTouched(false);
    setupRef.current();
  };

  const p = unlocked ? 1 : Math.min(1, clear / UNLOCK_AT);
  const hr = new Date().getHours();
  const waktu = hr < 11 ? "pagi" : hr < 15 ? "siang" : hr < 18 ? "sore" : "malam";
  const sparks = useRef(
    Array.from({ length: 26 }, () => ({
      l: Math.random() * 100,
      d: Math.random() * 4,
      t: 5 + Math.random() * 5,
      s: 3 + Math.random() * 5,
    }))
  ).current;

  return (
    <div className={`win${sound ? " heavy" : ""}${sent ? " sent" : ""}`}>
      <canvas ref={sharpRef} aria-hidden="true" />
      <canvas ref={dayRef} aria-hidden="true" className="day" />
      <div className="rainbow" />
      <canvas
        ref={fogRef}
        aria-hidden="true"
        className={`fog${sent ? " melt" : ""}`}
        style={{ pointerEvents: unlocked ? "none" : "auto" }}
        onPointerDown={down}
        onPointerMove={wipe}
        onPointerUp={() => (last.current = null)}
        onPointerLeave={() => (last.current = null)}
      />
      <div className="rain a" />
      <div className="rain b" />
      <div className="glow" />
      {sent &&
        sparks.map((sp, i) => (
          <span key={i} className="spark" style={{ left: `${sp.l}%`, width: sp.s, height: sp.s, animationDelay: `${sp.d}s`, animationDuration: `${sp.t}s` }} />
        ))}
      <div className={`flash${flash ? " on" : ""}`} />

      <form
        ref={formRef}
        className="form"
        onSubmit={submit}
        style={{
          opacity: unlocked ? 1 : 0.12 + p * 0.7,
          filter: unlocked ? "none" : `blur(${(1 - p) * 7}px)`,
        }}
      >
        {!sent ? (
          <>
            <h1>Masuk</h1>
            <p className="sub">{unlocked ? "Tulis di kaca..." : "Ada sesuatu di balik embun"}</p>
            <label>
              Nama pengguna
              <input value={user} onChange={(e) => setUser(e.target.value)} disabled={!unlocked} autoComplete="off" />
            </label>
            <label>
              Kata sandi
              <span className="pw">
                <input type={show ? "text" : "password"} value={pass} onChange={(e) => setPass(e.target.value)} disabled={!unlocked} />
                <button type="button" className="eye" onClick={() => setShow(!show)} disabled={!unlocked}>
                  {show ? "sembunyikan" : "lihat"}
                </button>
              </span>
            </label>
            {err && <p key={err} className="err">{err}</p>}
            <button className="drop" disabled={!unlocked}>Masuk</button>
          </>
        ) : (
          <div className="done">
            <h1 className="write">Selamat {waktu},<br />{user}</h1>
            <p className="rise">Hujannya reda. Lihat, ada pelangi.</p>
            <button type="button" className="link rise2" onClick={reset}>Embunkan kaca lagi</button>
          </div>
        )}
      </form>

      {!unlocked && (
        <div className="bar">
          <span className={touched ? "hint off" : "hint"}>Usap kaca dengan mouse atau jari</span>
          <button className="link" onClick={clearAll}>lap semua</button>
        </div>
      )}
      <button className="sound" onClick={toggleSound}>{sound ? "Matikan suara hujan" : "Nyalakan suara hujan"}</button>
      <div className="frame" />
    </div>
  );
}