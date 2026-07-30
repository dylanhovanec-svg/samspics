import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Slideshow.css';

const SPEEDS = [
  { label: 'Slow', ms: 9000 },
  { label: 'Medium', ms: 6000 },
  { label: 'Fast', ms: 3500 },
];

// Filmstrip only — the main photo is never cropped, so this is the one place
// thumbnails appear. Odd number keeps the active one centred.
const STRIP_SLOTS = 9;

const CHROME_IDLE_MS = 3500;

export default function Slideshow({ photos, title, emptyMessage }) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [chromeVisible, setChromeVisible] = useState(true);
  const rootRef = useRef(null);

  const count = photos.length;

  // Photos arrive while this is running and moderation can remove them; keep
  // the index in range without jumping the viewer somewhere unexpected.
  useEffect(() => {
    if (count === 0) {
      if (current !== 0) setCurrent(0);
    } else if (current >= count) {
      setCurrent(count - 1);
    }
  }, [count, current]);

  const safeCurrent = count === 0 ? 0 : Math.min(current, count - 1);

  const advance = useCallback(
    (delta) =>
      setCurrent((c) => (count === 0 ? 0 : (((c + delta) % count) + count) % count)),
    [count]
  );
  const next = useCallback(() => advance(1), [advance]);
  const prev = useCallback(() => advance(-1), [advance]);

  // Runs indefinitely — this sits on a screen for the whole party.
  useEffect(() => {
    if (!playing || count < 2) return;
    const id = setInterval(next, SPEEDS[speedIdx].ms);
    return () => clearInterval(id);
  }, [playing, speedIdx, next, count]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  // Idle display shows nothing but the photograph.
  useEffect(() => {
    let timer;
    const wake = () => {
      setChromeVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setChromeVisible(false), CHROME_IDLE_MS);
    };
    wake();
    window.addEventListener('pointermove', wake);
    window.addEventListener('keydown', wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  const active = count > 0 ? photos[safeCurrent] : null;

  // Warm the next image so a slow connection doesn't fade to an empty frame.
  useEffect(() => {
    if (count < 2) return;
    const upcoming = photos[(safeCurrent + 1) % count];
    if (upcoming?.url) {
      const img = new Image();
      img.src = upcoming.url;
    }
  }, [photos, safeCurrent, count]);

  // Two alternating layers cross-fade, rather than one element per photo.
  const [layers, setLayers] = useState([null, null]);
  const [front, setFront] = useState(0);
  const lastKeyRef = useRef(null);

  useEffect(() => {
    if (!active) {
      lastKeyRef.current = null;
      setLayers([null, null]);
      return;
    }
    if (active.id === lastKeyRef.current) return;
    lastKeyRef.current = active.id;
    setFront((f) => {
      const back = f === 0 ? 1 : 0;
      setLayers((prev2) => {
        const nextLayers = [...prev2];
        nextLayers[back] = active;
        return nextLayers;
      });
      return back;
    });
  }, [active]);

  const strip = useMemo(() => {
    if (count === 0) return [];
    const visible = Math.min(count, STRIP_SLOTS);
    const half = Math.floor((visible - 1) / 2);
    const items = [];
    for (let offset = -half; offset <= visible - 1 - half; offset += 1) {
      const index = (((safeCurrent + offset) % count) + count) % count;
      items.push({ photo: photos[index], index });
    }
    return items;
  }, [photos, safeCurrent, count]);

  const toggleFullscreen = () => {
    const el = rootRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <div ref={rootRef} className="ss-root">
      <div className="ss-stage">
        {layers.map((photo, i) => (
          <div key={i} className={`ss-slide ${i === front && photo ? 'on' : ''}`}>
            {photo ? (
              <>
                {photo.bg ? (
                  <>
                    <div className="ss-blur" style={{ background: photo.bg }} />
                    <div className="ss-fill" style={{ background: photo.bg }} />
                  </>
                ) : (
                  <>
                    <div
                      className="ss-blur"
                      style={{ backgroundImage: `url("${photo.url}")` }}
                    />
                    <img className="ss-img" src={photo.url} alt={photo.caption || ''} />
                  </>
                )}
              </>
            ) : null}
          </div>
        ))}

        <div className="ss-topbar">
          <div className="eyebrow">Photo Wall</div>
          <h1 className="ss-title">{title}</h1>
        </div>

        {active?.caption || active?.uploaderName ? (
          <div className="ss-caption">
            {active.caption}
            {active.uploaderName ? <span className="ss-by">— {active.uploaderName}</span> : null}
          </div>
        ) : null}

        {count === 0 ? (
          <div className="ss-empty">
            <div className="eyebrow">Waiting</div>
            <div>{emptyMessage}</div>
          </div>
        ) : null}
      </div>

      <div className={`ss-chrome ${chromeVisible ? '' : 'hidden'}`}>
        {count > 1 ? (
          <div className="ss-strip">
            {strip.map(({ photo, index }) => (
              <button
                type="button"
                key={photo.id}
                className={`ss-thumb ${index === safeCurrent ? 'active' : ''}`}
                onClick={() => setCurrent(index)}
                aria-label={`Show photo ${index + 1} of ${count}`}
                style={
                  photo.bg
                    ? { background: photo.bg }
                    : { backgroundImage: `url("${photo.url}")` }
                }
              />
            ))}
          </div>
        ) : null}

        <div className="ss-controls">
          <button className="ss-btn" onClick={prev} aria-label="Previous photo">
            ‹ Prev
          </button>
          <button className="ss-btn" onClick={() => setPlaying((p) => !p)}>
            {playing ? '❚❚ Pause' : '► Play'}
          </button>
          <button className="ss-btn" onClick={next} aria-label="Next photo">
            Next ›
          </button>
          <div className="ss-speed" role="group" aria-label="Speed">
            {SPEEDS.map((s, i) => (
              <button
                key={s.label}
                className={i === speedIdx ? 'sel' : ''}
                onClick={() => setSpeedIdx(i)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button className="ss-btn" onClick={toggleFullscreen}>
            ⤢ Fullscreen
          </button>
        </div>

        <div className="ss-count">
          {count > 0 ? `${safeCurrent + 1} of ${count} · arrows to move, space to pause, F for fullscreen` : ''}
        </div>
      </div>
    </div>
  );
}
