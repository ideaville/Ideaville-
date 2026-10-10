/* Ideaville 10s. Three motions: drift, resolve, lock.
   Times match motion/beat-sheet.md. */
(function () {
  const DURATION = 10000;
  const clean = new URLSearchParams(location.search).has("clean");
  const stage = document.getElementById("stage");
  const distant = document.getElementById("distant");
  const terrace = document.getElementById("terrace");
  const heroGlow = document.getElementById("hero-glow");
  const headline = document.getElementById("headline");
  const support = document.getElementById("support");
  const band = document.getElementById("band");
  const cta = document.getElementById("cta");
  const rule = document.getElementById("rule");
  const playBtn = document.getElementById("play");
  const scrub = document.getElementById("scrub");
  const readout = document.getElementById("readout");

  if (clean) document.body.classList.add("clean");

  function fit() {
    if (clean) {
      stage.style.transform = "none";
      return;
    }
    const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = `scale(${scale})`;
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function seg(t, a, b) {
    return clamp01((t - a) / (b - a));
  }

  function easeOut(p) {
    return 1 - Math.pow(1 - p, 3);
  }

  let current = 0;
  let raf = 0;

  function render(t) {
    current = Math.max(0, Math.min(DURATION, t));
    const drift = current / DURATION;
    // End frame is the drawn composition. The terrace creeps left into that mark.
    distant.style.transform = `translate3d(${(80 * (1 - drift)).toFixed(2)}px,0,0)`;
    terrace.style.transform = `translate3d(${(56 * (1 - drift)).toFixed(2)}px,0,0)`;

    const claim = easeOut(seg(current, 2000, 2750));
    headline.style.opacity = String(claim);
    headline.style.transform = `translateY(${((1 - claim) * 16).toFixed(2)}px)`;

    const proof = easeOut(seg(current, 5500, 6020));
    band.style.opacity = String(proof);
    band.style.transform = `translateY(${((1 - proof) * 10).toFixed(2)}px) scale(${(1.08 - proof * 0.08).toFixed(4)})`;

    support.style.opacity = String(easeOut(seg(current, 5800, 6600)));

    const glow = easeOut(seg(current, 5400, 6900));
    heroGlow.style.opacity = String(0.35 + glow * 0.65);

    const lock = easeOut(seg(current, 8500, 9200));
    cta.style.opacity = String(lock);
    cta.style.transform = `translateY(${((1 - lock) * 8).toFixed(2)}px)`;
    rule.style.transform = `scaleX(${easeOut(seg(current, 8680, 9480)).toFixed(4)})`;

    if (!clean) {
      scrub.value = String(Math.round(current));
      readout.textContent = (current / 1000).toFixed(1) + "s";
      playBtn.textContent = current >= DURATION ? "Replay" : (raf ? "Pause" : "Play");
    }
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function play(from) {
    stop();
    const startAt = from == null ? (current >= DURATION ? 0 : current) : from;
    const origin = performance.now() - startAt;
    function frame(now) {
      const next = now - origin;
      render(next);
      if (next < DURATION) raf = requestAnimationFrame(frame);
      else {
        raf = 0;
        render(DURATION);
      }
    }
    raf = requestAnimationFrame(frame);
  }

  window.__ad = {
    duration: DURATION,
    seek(ms) {
      stop();
      render(ms);
    },
    play,
    current: () => current
  };

  playBtn.addEventListener("click", () => {
    if (raf) stop();
    else play(current >= DURATION ? 0 : current);
    render(current);
  });

  scrub.addEventListener("input", () => {
    stop();
    render(Number(scrub.value));
  });

  window.addEventListener("resize", fit);
  fit();
  render(0);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!clean && !reduce) play(0);
  if (!clean && reduce) render(DURATION);
})();
