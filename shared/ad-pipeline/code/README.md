# Ideaville 10s — implementation

Open `index.html` to play the cut. Scrub the bar under the frame. `?clean=1` hides the controls and turns off scaling for a 1920×1080 capture.

```bash
npm install
npm run stills   # four key frames into ../exports/stills
npm run render   # stills plus ../exports/ideaville-10s.mp4
```

Uses the system Chrome at `/usr/bin/google-chrome` (`CHROME_PATH` overrides). Frame PNGs go to `/tmp/ideaville-frames` and are not part of the cut.

Copy, timing, and palette are locked in `../motion/`. Change them only through a note in `../handoffs/`.
