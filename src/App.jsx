import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

/* ---------- Helper ---------- */
const jam = () => new Date().getHours();
const malamSekarang = () => jam() >= 18 || jam() < 5;
const sapa = () => {
  const h = jam();
  if (h >= 4 && h < 11) return "Selamat pagi";
  if (h >= 11 && h < 15) return "Selamat siang";
  if (h >= 15 && h < 18) return "Selamat sore";
  return "Selamat malam";
};
const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const namaDariEmail = (e) => {
  const n = e.split("@")[0].replace(/[._-]+/g, " ").trim();
  return n.charAt(0).toUpperCase() + n.slice(1);
};
const kekuatan = (p) => {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};
const LABEL_KEKUATAN = ["Terlalu pendek", "Lemah", "Cukup", "Kuat", "Sangat kuat"];

/* ---------- Latar: langit, matahari/bulan, kota ---------- */
function Scene() {
  const bintang = useMemo(
    () =>
      Array.from({ length: 70 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 60,
        s: 1 + Math.random() * 2,
        d: Math.random() * 5,
      })),
    []
  );

  const kota = useMemo(() => {
    const out = [];
    let x = 0;
    while (x < 1300) {
      const w = 44 + Math.random() * 50;
      const h = 70 + Math.random() * 130;
      const jendela = [];
      for (let y = 14; y < h - 10; y += 18)
        for (let wx = 9; wx < w - 12; wx += 15)
          jendela.push({ x: wx, y, on: Math.random() > 0.55, d: Math.random() * 6 });
      out.push({ x, w, h, jendela });
      x += w + Math.random() * 8;
    }
    return out;
  }, []);

  return (
    <div className="scene" aria-hidden="true">
      <div className="sky sky-day" />
      <div className="sky sky-night" />

      <div className="stars">
        {bintang.map((b, i) => (
          <i
            key={i}
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: b.s,
              height: b.s,
              animationDelay: `${b.d}s`,
            }}
          />
        ))}
      </div>

      <div className="sun" />
      <div className="moon" />

      <div className="cloud c1" />
      <div className="cloud c2" />
      <div className="cloud c3" />

      <svg className="city" viewBox="0 0 1300 220" preserveAspectRatio="xMidYMax slice">
        {kota.map((b, i) => (
          <g key={i} transform={`translate(${b.x} ${220 - b.h})`}>
            <rect width={b.w} height={b.h + 2} className="bld" />
            {b.jendela.map((j, k) => (
              <rect
                key={k}
                x={j.x}
                y={j.y}
                width="7"
                height="9"
                rx="1"
                className={`win ${j.on ? "on" : ""}`}
                style={{ animationDelay: `${j.d}s` }}
              />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ---------- Konfeti saat berhasil ---------- */
function Confetti() {
  const ref = useRef(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = ref.current;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const warna = ["#FF7A18", "#FFB36B", "#FFD39A", "#FFF4E6", "#E8590C"];
    const ps = Array.from({ length: 170 }, () => {
      const a = Math.random() * Math.PI * 2;
      const v = 6 + Math.random() * 12;
      return {
        x: innerWidth / 2,
        y: innerHeight / 2,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 6,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 5,
        r: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4,
        c: warna[Math.floor(Math.random() * warna.length)],
      };
    });
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach((p) => {
        p.vy += 0.25;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (t - t0 < 4000) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    raf = requestAnimationFrame(tick);
    addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}

/* ---------- Komponen formulir ---------- */
function Field({ id, label, type = "text", value, onChange, error, shake, autoComplete }) {
  const [lihat, setLihat] = useState(false);
  const isPw = type === "password";
  return (
    <div className={`field ${error ? "has-error" : ""}`}>
      <div className={`control ${error && shake ? "shake" : ""}`}>
        <input
          id={id}
          type={isPw && lihat ? "text" : type}
          value={value}
          placeholder=" "
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <label htmlFor={id}>{label}</label>
        <span className="bar" />
        {isPw && (
          <button
            type="button"
            className="eye"
            onClick={() => setLihat((s) => !s)}
            aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}
          >
            {lihat ? "Sembunyikan" : "Lihat"}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-err`} className="err" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Button({ status, children }) {
  const [rip, setRip] = useState(null);
  const down = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setRip({ x: e.clientX - r.left, y: e.clientY - r.top, k: Date.now() });
  };
  return (
    <button type="submit" className={`btn ${status}`} onPointerDown={down} disabled={status !== "idle"}>
      {rip && <span key={rip.k} className="ripple" style={{ left: rip.x, top: rip.y }} />}
      <span className="btn-label">
        {status === "loading" && <span className="spinner" aria-label="Memproses" />}
        {status === "done" && (
          <svg viewBox="0 0 24 24" className="check" aria-label="Berhasil">
            <path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" />
          </svg>
        )}
        {status === "idle" && children}
      </span>
    </button>
  );
}

function useAuthForm(awal, validasi, onSuccess) {
  const [v, setV] = useState(awal);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [shake, setShake] = useState(false);

  const set = (k) => (val) => {
    setV((o) => ({ ...o, [k]: val }));
    setErrors((o) => ({ ...o, [k]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const er = validasi(v);
    setErrors(er);
    if (Object.keys(er).length) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setStatus("loading");
    setTimeout(() => {
      setStatus("done");
      setTimeout(() => {
        onSuccess(v);
        setStatus("idle");
      }, 800);
    }, 1300);
  };
  return { v, set, errors, status, shake, submit };
}

function LoginForm({ onSuccess, keDaftar }) {
  const f = useAuthForm(
    { email: "", password: "" },
    (v) => {
      const e = {};
      if (!emailValid(v.email)) e.email = "Tulis email lengkap, contoh: nama@email.com";
      if (v.password.length < 6) e.password = "Password minimal 6 karakter.";
      return e;
    },
    (v) => onSuccess(namaDariEmail(v.email), "masuk")
  );
  return (
    <form onSubmit={f.submit} noValidate>
      <h1>{sapa()}, masuk dulu yuk</h1>
      <p className="sub">Lanjutkan rutinitasmu dari tempat terakhir.</p>
      <Field id="l-email" label="Email" type="email" autoComplete="email" value={f.v.email} onChange={f.set("email")} error={f.errors.email} shake={f.shake} />
      <Field id="l-pw" label="Password" type="password" autoComplete="current-password" value={f.v.password} onChange={f.set("password")} error={f.errors.password} shake={f.shake} />
      <Button status={f.status}>Masuk</Button>
      <p className="switch">
        Belum punya akun?{" "}
        <button type="button" onClick={keDaftar}>Daftar</button>
      </p>
    </form>
  );
}

function RegisterForm({ onSuccess, keMasuk }) {
  const f = useAuthForm(
    { nama: "", email: "", password: "", ulang: "" },
    (v) => {
      const e = {};
      if (v.nama.trim().length < 2) e.nama = "Nama minimal 2 huruf.";
      if (!emailValid(v.email)) e.email = "Tulis email lengkap, contoh: nama@email.com";
      if (v.password.length < 8) e.password = "Password minimal 8 karakter.";
      if (v.ulang !== v.password) e.ulang = "Password belum sama. Cek lagi ya.";
      return e;
    },
    (v) => onSuccess(v.nama.trim().split(" ")[0], "daftar")
  );
  const s = kekuatan(f.v.password);
  return (
    <form onSubmit={f.submit} noValidate>
      <h1>Buat akun baru</h1>
      <p className="sub">Satu langkah kecil sebelum harimu dimulai.</p>
      <Field id="r-nama" label="Nama" autoComplete="name" value={f.v.nama} onChange={f.set("nama")} error={f.errors.nama} shake={f.shake} />
      <Field id="r-email" label="Email" type="email" autoComplete="email" value={f.v.email} onChange={f.set("email")} error={f.errors.email} shake={f.shake} />
      <Field id="r-pw" label="Password" type="password" autoComplete="new-password" value={f.v.password} onChange={f.set("password")} error={f.errors.password} shake={f.shake} />
      <div className="meter" data-level={f.v.password ? s : -1} aria-live="polite">
        <div className="segs"><i /><i /><i /><i /></div>
        <span>{f.v.password ? LABEL_KEKUATAN[s] : "Kekuatan password"}</span>
      </div>
      <Field id="r-ulang" label="Ulangi password" type="password" autoComplete="new-password" value={f.v.ulang} onChange={f.set("ulang")} error={f.errors.ulang} shake={f.shake} />
      <Button status={f.status}>Daftar</Button>
      <p className="switch">
        Sudah punya akun?{" "}
        <button type="button" onClick={keMasuk}>Masuk</button>
      </p>
    </form>
  );
}

/* ---------- Saklar siang/malam ---------- */
function ThemeSwitch({ night, onToggle }) {
  return (
    <button className="tswitch" role="switch" aria-checked={night} onClick={onToggle}>
      <span className="track">
        <span className="knob" />
      </span>
      <span className="tlabel">{night ? "Malam" : "Siang"}</span>
    </button>
  );
}

/* ---------- Halaman utama ---------- */
export default function App() {
  const [night, setNight] = useState(malamSekarang);
  const [mode, setMode] = useState("masuk");
  const [welcome, setWelcome] = useState(null);
  const root = useRef(null);

  const gerak = (e) => {
    root.current.style.setProperty("--mx", `${e.clientX}px`);
    root.current.style.setProperty("--my", `${e.clientY}px`);
  };
  const berhasil = (nama, jenis) => setWelcome({ nama, jenis });

  return (
    <div ref={root} className="app" data-theme={night ? "night" : "day"} onPointerMove={gerak}>
      <Scene />
      <div className="glow" aria-hidden="true" />

      <main className="stage">
        <header className="top">
          <span className="brand">Harian</span>
          <ThemeSwitch night={night} onToggle={() => setNight((n) => !n)} />
        </header>

        <div className="perspective">
          <div className={`flip ${mode === "daftar" ? "is-daftar" : ""}`}>
            <section className={`face front card ${mode !== "masuk" ? "hidden" : ""}`}>
              <LoginForm onSuccess={berhasil} keDaftar={() => setMode("daftar")} />
            </section>
            <section className={`face back card ${mode !== "daftar" ? "hidden" : ""}`}>
              <RegisterForm onSuccess={berhasil} keMasuk={() => setMode("masuk")} />
            </section>
          </div>
        </div>
      </main>

      {welcome && (
        <div className="welcome" role="dialog" aria-modal="true" aria-label="Berhasil">
          <Confetti />
          <div className="welcome-card">
            <h2>
              {sapa()}, {welcome.nama}!
            </h2>
            <p>
              {welcome.jenis === "daftar"
                ? "Akunmu sudah jadi. Selamat bergabung."
                : "Kamu berhasil masuk. Semoga harimu lancar."}
            </p>
            <button className="btn idle" onClick={() => setWelcome(null)}>
              <span className="btn-label">Kembali ke formulir</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}