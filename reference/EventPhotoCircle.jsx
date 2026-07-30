import React, { useState, useEffect, useRef, useCallback } from "react";

// A rotating "photo circle" slideshow for a live event.
// Photos orbit a central featured circle that cross-fades as it advances.
// Add your own photos with the button — the first upload clears the samples.

const SAMPLES = [
  { id: "s1", sample: true, bg: "linear-gradient(135deg,#e8b84b,#e0662f)" },
  { id: "s2", sample: true, bg: "linear-gradient(135deg,#e06a8a,#8a4bd9)" },
  { id: "s3", sample: true, bg: "linear-gradient(135deg,#4bd9c9,#3f7de0)" },
  { id: "s4", sample: true, bg: "linear-gradient(135deg,#f2c14e,#e06a8a)" },
  { id: "s5", sample: true, bg: "linear-gradient(135deg,#8a4bd9,#3f7de0)" },
  { id: "s6", sample: true, bg: "linear-gradient(135deg,#e0662f,#e06a8a)" },
];

const SPEEDS = [
  { label: "Slow", ms: 8000 },
  { label: "Medium", ms: 5000 },
  { label: "Fast", ms: 3000 },
];

export default function EventPhotoCircle() {
  const [photos, setPhotos] = useState(SAMPLES);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [title, setTitle] = useState("Our Event");
  const rootRef = useRef(null);
  const fileRef = useRef(null);

  const N = photos.length;
  const step = N > 0 ? 360 / N : 0;

  const next = useCallback(() => setCurrent((c) => (c + 1) % N), [N]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + N) % N), [N]);

  // Auto-advance
  useEffect(() => {
    if (!playing || N < 2) return;
    const id = setInterval(next, SPEEDS[speedIdx].ms);
    return () => clearInterval(id);
  }, [playing, speedIdx, next, N]);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const addPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const added = files.map((f, i) => ({
      id: `u${Date.now()}_${i}`,
      url: URL.createObjectURL(f),
    }));
    setPhotos((prevPhotos) => {
      const base = prevPhotos.some((p) => p.sample) ? [] : prevPhotos;
      return [...base, ...added];
    });
    setCurrent(0);
    e.target.value = "";
  };

  const toggleFullscreen = () => {
    const el = rootRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const counter = current * step; // keep thumbnails upright as the ring turns

  return (
    <div ref={rootRef} className="pc-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap');

        .pc-root{
          --gold:#e8b84b; --rose:#e06a8a; --ink:#f5eefb; --muted:#a99cb8;
          min-height:100vh; box-sizing:border-box;
          display:flex; flex-direction:column; align-items:center;
          padding:28px 20px 20px;
          background:radial-gradient(120% 90% at 50% -10%, #2c1f3d 0%, #1a1224 55%, #120c1a 100%);
          font-family:'Inter',system-ui,sans-serif; color:var(--ink);
        }
        .pc-root *{box-sizing:border-box;}

        .pc-title{
          font-family:'Fraunces',serif; font-weight:600; font-size:clamp(26px,4.4vw,52px);
          letter-spacing:-0.01em; text-align:center; line-height:1.05;
          background:none; border:none; color:var(--ink); outline:none; width:100%;
          max-width:820px;
        }
        .pc-title::placeholder{color:var(--muted);}
        .pc-eyebrow{
          font-size:12px; letter-spacing:0.32em; text-transform:uppercase;
          color:var(--gold); margin-bottom:10px;
        }

        .pc-stage-wrap{ flex:1; display:flex; align-items:center; justify-content:center; width:100%; }
        .pc-stage{ position:relative; width:min(78vw, 60vh); aspect-ratio:1; }

        .pc-glow{
          position:absolute; inset:12%; border-radius:50%;
          background:radial-gradient(circle, rgba(232,184,75,0.22), transparent 62%);
          filter:blur(14px); animation:pc-spin 26s linear infinite;
        }
        @keyframes pc-spin{ to{ transform:rotate(360deg); } }

        .pc-center{
          position:absolute; left:50%; top:50%; width:44%; height:44%;
          transform:translate(-50%,-50%); border-radius:50%; overflow:hidden;
          box-shadow:0 18px 50px rgba(0,0,0,0.55), 0 0 0 6px rgba(255,255,255,0.06),
                     0 0 0 2px var(--gold);
          background:#241a30;
        }
        .pc-layer{
          position:absolute; inset:0; background-size:cover; background-position:center;
          opacity:0; transition:opacity .9s ease;
        }
        .pc-layer.on{ opacity:1; }

        .pc-ring{
          position:absolute; inset:0;
          transition:transform .9s cubic-bezier(.6,.05,.25,1);
        }
        .pc-thumb{
          position:absolute; width:16%; height:16%; border-radius:50%;
          overflow:hidden; background-size:cover; background-position:center;
          transform:translate(-50%,-50%);
          box-shadow:0 6px 18px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.10);
          cursor:pointer; transition:transform .9s cubic-bezier(.6,.05,.25,1), box-shadow .3s ease;
        }
        .pc-thumb.active{
          box-shadow:0 8px 22px rgba(0,0,0,0.5), 0 0 0 3px var(--gold);
        }

        .pc-controls{
          display:flex; align-items:center; gap:10px; flex-wrap:wrap;
          justify-content:center; margin-top:18px;
        }
        .pc-btn{
          display:inline-flex; align-items:center; gap:8px;
          padding:10px 16px; border-radius:999px; border:1px solid rgba(255,255,255,0.14);
          background:rgba(255,255,255,0.05); color:var(--ink);
          font-size:14px; font-weight:500; cursor:pointer; transition:background .2s ease, border-color .2s ease;
        }
        .pc-btn:hover{ background:rgba(255,255,255,0.1); border-color:rgba(255,255,255,0.24); }
        .pc-btn.primary{ background:var(--gold); color:#241a30; border-color:var(--gold); font-weight:600; }
        .pc-btn.primary:hover{ background:#f2c866; }
        .pc-btn:focus-visible{ outline:2px solid var(--gold); outline-offset:2px; }

        .pc-speed{ display:inline-flex; border:1px solid rgba(255,255,255,0.14); border-radius:999px; overflow:hidden; }
        .pc-speed button{
          padding:10px 14px; background:transparent; border:none; color:var(--muted);
          font-size:13px; font-weight:500; cursor:pointer;
        }
        .pc-speed button.sel{ background:rgba(232,184,75,0.16); color:var(--gold); }

        .pc-hint{ color:var(--muted); font-size:13px; margin-top:12px; text-align:center; }

        @media (prefers-reduced-motion: reduce){
          .pc-ring, .pc-thumb, .pc-layer{ transition:none; }
          .pc-glow{ animation:none; }
        }
      `}</style>

      <div className="pc-eyebrow">Photo Circle</div>
      <input
        className="pc-title"
        value={title}
        placeholder="Name your event"
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Event title"
      />

      <div className="pc-stage-wrap">
        <div className="pc-stage">
          <div className="pc-glow" />

          {/* Center featured circle — layers cross-fade */}
          <div className="pc-center">
            {photos.map((p, i) => (
              <div
                key={p.id}
                className={`pc-layer ${i === current ? "on" : ""}`}
                style={p.sample ? { background: p.bg } : { backgroundImage: `url(${p.url})` }}
              />
            ))}
          </div>

          {/* Orbiting ring */}
          <div className="pc-ring" style={{ transform: `rotate(${-current * step}deg)` }}>
            {photos.map((p, i) => {
              const angle = (i * step - 90) * (Math.PI / 180);
              const left = 50 + 43 * Math.cos(angle);
              const top = 50 + 43 * Math.sin(angle);
              return (
                <div
                  key={p.id}
                  className={`pc-thumb ${i === current ? "active" : ""}`}
                  onClick={() => setCurrent(i)}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    transform: `translate(-50%,-50%) rotate(${counter}deg) scale(${i === current ? 1.18 : 1})`,
                    ...(p.sample ? { background: p.bg } : { backgroundImage: `url(${p.url})` }),
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="pc-controls">
        <button className="pc-btn primary" onClick={() => fileRef.current?.click()}>
          + Add photos
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={addPhotos}
          style={{ display: "none" }}
        />
        <button className="pc-btn" onClick={prev} aria-label="Previous">‹ Prev</button>
        <button className="pc-btn" onClick={() => setPlaying((p) => !p)}>
          {playing ? "❚❚ Pause" : "► Play"}
        </button>
        <button className="pc-btn" onClick={next} aria-label="Next">Next ›</button>

        <div className="pc-speed" role="group" aria-label="Speed">
          {SPEEDS.map((s, i) => (
            <button key={s.label} className={i === speedIdx ? "sel" : ""} onClick={() => setSpeedIdx(i)}>
              {s.label}
            </button>
          ))}
        </div>

        <button className="pc-btn" onClick={toggleFullscreen}>⤢ Fullscreen</button>
      </div>

      <div className="pc-hint">
        {photos.some((p) => p.sample)
          ? "Showing samples — add your event photos to replace them."
          : `${N} photo${N === 1 ? "" : "s"} · arrow keys to move, space to pause/play`}
      </div>
    </div>
  );
}
