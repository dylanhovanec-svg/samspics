import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './PhotoCircle.css';

const SPEEDS = [
  { label: 'Slow', ms: 8000 },
  { label: 'Medium', ms: 5000 },
  { label: 'Fast', ms: 3000 },
];

// The reference orbits every photo. Past ~14 the thumbnails overlap into an
// unreadable band, and an event can easily produce hundreds, so the ring shows a
// window centred on the active photo instead. Odd number keeps it symmetric.
const RING_SLOTS = 13;

// How long the control bar stays up after the last pointer movement.
const CONTROLS_IDLE_MS = 3000;

function backgroundFor(photo) {
  return photo.bg ? { background: photo.bg } : { backgroundImage: `url(${photo.url})` };
}

export default function PhotoCircle({ photos, title, emptyMessage }) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  // Ring off gives the featured photo the whole stage — for rooms where the
  // screen is far away and the thumbnails are just costing size.
  const [ringOn, setRingOn] = useState(true);
  const rootRef = useRef(null);

  const count = photos.length;

  // Photos stream in while the display is running, and moderation can remove
  // them. Keep the index in range without yanking the viewer somewhere new.
  useEffect(() => {
    if (count === 0) {
      if (current !== 0) setCurrent(0);
    } else if (current >= count) {
      setCurrent(count - 1);
    }
  }, [count, current]);

  const safeCurrent = count === 0 ? 0 : Math.min(current, count - 1);

  const advance = useCallback(
    (delta) => {
      setCurrent((c) => {
        if (count === 0) return 0;
        return (((c + delta) % count) + count) % count;
      });
    },
    [count]
  );

  const next = useCallback(() => advance(1), [advance]);
  const prev = useCallback(() => advance(-1), [advance]);

  // Auto-advance. Runs indefinitely — this sits on a screen for hours.
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
      } else if (e.key === 'r' || e.key === 'R') setRingOn((r) => !r);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  // Fade the controls out on an idle display, back in on any pointer movement.
  useEffect(() => {
    let timer;
    const wake = () => {
      setControlsVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setControlsVisible(false), CONTROLS_IDLE_MS);
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

  // Warm the next image so the cross-fade doesn't land on a blank circle.
  useEffect(() => {
    if (count < 2) return;
    const upcoming = photos[(safeCurrent + 1) % count];
    if (upcoming?.url) {
      const img = new Image();
      img.src = upcoming.url;
    }
  }, [photos, safeCurrent, count]);

  // Two alternating layers give the cross-fade without mounting one element per
  // photo — that mattered once the album grew past a few dozen.
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
      setLayers((prevLayers) => {
        const nextLayers = [...prevLayers];
        nextLayers[back] = active;
        return nextLayers;
      });
      return back;
    });
  }, [active]);

  // Which photos sit on the ring, and where. Each is placed by its offset from
  // the active photo, so advancing never needs a rotation that unwinds
  // backwards through a full turn on wrap-around.
  const ring = useMemo(() => {
    if (count === 0 || !ringOn) return [];
    const visible = Math.min(count, RING_SLOTS);
    const stepDeg = 360 / visible;
    const half = Math.floor((visible - 1) / 2);
    const items = [];
    for (let offset = -half; offset <= visible - 1 - half; offset += 1) {
      const index = (((safeCurrent + offset) % count) + count) % count;
      const angle = (offset * stepDeg - 90) * (Math.PI / 180);
      items.push({
        photo: photos[index],
        index,
        offset,
        // 44% radius + 6% thumb radius lands the outer edge exactly on the
        // stage boundary, so the ring is as wide as it can be.
        left: 50 + 44 * Math.cos(angle),
        top: 50 + 44 * Math.sin(angle),
        // Fade the ends so photos entering and leaving the window don't pop.
        edge: Math.abs(offset) === half && visible === RING_SLOTS,
      });
    }
    return items;
  }, [photos, safeCurrent, count, ringOn]);

  const toggleFullscreen = () => {
    const el = rootRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <div ref={rootRef} className="pc-root">
      <div className="pc-head">
        <div className="eyebrow">Photo Circle</div>
        <h1 className="pc-title">{title}</h1>
      </div>

      <div className="pc-stage-wrap">
        <div className={`pc-stage ${ringOn ? "" : "solo"}`}>
          <div className="pc-glow" />

          <div className="pc-center">
            {layers.map((photo, i) => (
              <div
                key={i}
                className={`pc-layer ${i === front && photo ? 'on' : ''}`}
                style={photo ? backgroundFor(photo) : undefined}
              />
            ))}
            {active?.caption || active?.uploaderName ? (
              <div className="pc-caption">
                {active.caption}
                {active.uploaderName ? <span className="pc-by">— {active.uploaderName}</span> : null}
              </div>
            ) : null}
            {count === 0 ? (
              <div className="pc-empty">
                <div className="eyebrow">Waiting</div>
                <div>{emptyMessage}</div>
              </div>
            ) : null}
          </div>

          {ring.map(({ photo, index, left, top, edge }) => (
            <button
              type="button"
              key={photo.id}
              className={`pc-thumb ${index === safeCurrent ? 'active' : ''}`}
              onClick={() => setCurrent(index)}
              aria-label={`Show photo ${index + 1} of ${count}`}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                opacity: edge ? 0.35 : 1,
                transform: `translate(-50%,-50%) scale(${index === safeCurrent ? 1.18 : 1})`,
                ...backgroundFor(photo),
              }}
            />
          ))}
        </div>
      </div>

      <div className={`pc-controls ${controlsVisible ? '' : 'hidden'}`}>
        <button className="pc-btn" onClick={prev} aria-label="Previous photo">
          ‹ Prev
        </button>
        <button className="pc-btn" onClick={() => setPlaying((p) => !p)}>
          {playing ? '❚❚ Pause' : '► Play'}
        </button>
        <button className="pc-btn" onClick={next} aria-label="Next photo">
          Next ›
        </button>

        <div className="pc-speed" role="group" aria-label="Speed">
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

        <button className="pc-btn" onClick={() => setRingOn((r) => !r)}>
          {ringOn ? '◎ Bigger photo' : '◍ Show ring'}
        </button>
        <button className="pc-btn" onClick={toggleFullscreen}>
          ⤢ Fullscreen
        </button>
      </div>

      <div className={`pc-hint ${controlsVisible ? '' : 'hidden'}`}>
        {count > 0
          ? `${count} photo${count === 1 ? '' : 's'} · arrows to move, space to pause, R for ring`
          : ''}
      </div>
    </div>
  );
}
