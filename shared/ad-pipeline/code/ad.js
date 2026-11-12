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
  const bandShape = document.getElementById("band-shape");
  const bandLetter = document.getElementById("band-letter");
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

  function fade(p) {
    if (p <= 0) return "0";
    if (p >= 1) return "1";
    return p.toFixed(3);
  }

  let current = 0;
  let raf = 0;

  function render(t) {
    current = Math.max(0, Math.min(DURATION, t));
    const drift = current / DURATION;
    // Whole pixels only. Sub-pixel translates crawl the brick courses and shimmer type.
    distant.style.transform = `translate(${Math.round(80 * (1 - drift))}px, 0)`;
    terrace.style.transform = `translate(${Math.round(56 * (1 - drift))}px, 0)`;

    const claim = easeOut(seg(current, 2000, 2750));
    const claimY = Math.round((1 - claim) * 16);
    headline.style.opacity = fade(claim);
    headline.style.transform = claimY === 0 ? "none" : `translateY(${claimY}px)`;

    const proof = easeOut(seg(current, 5500, 6020));
    const proofY = Math.round((1 - proof) * 10);
    const scale = proofY === 0 ? 1 : 1.08 - proof * 0.08;
    band.style.opacity = fade(proof);
    band.style.transform = "none";
    bandShape.style.transform = proofY === 0 && scale === 1
      ? "none"
      : `translateY(${proofY}px) scale(${scale.toFixed(4)})`;
    bandLetter.style.top = `${proofY}px`;

    support.style.opacity = fade(easeOut(seg(current, 5800, 6600)));

    const glow = easeOut(seg(current, 5400, 6900));
    heroGlow.style.opacity = (0.16 + glow * 0.42).toFixed(3);

    const lock = easeOut(seg(current, 8500, 9200));
    const lockY = Math.round((1 - lock) * 8);
    cta.style.opacity = fade(lock);
    cta.style.transform = lockY === 0 ? "none" : `translateY(${lockY}px)`;
    const ruleP = easeOut(seg(current, 8680, 9480));
    rule.style.transform = ruleP >= 1 ? "scaleX(1)" : `scaleX(${ruleP.toFixed(4)})`;

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
