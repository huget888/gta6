// Solmar Nights — a top-down 2D open-world crime game for make.fun's gta6-01 bounty.
// The entrypoint: copy game/ and screenshots/ from this repository into the output
// directory and write /output/dossier.json with the vendored make.fun library.
//
// The game itself is plain static files under game/ (game/index.html plus ES modules
// under game/src/, vanilla JS, no libraries, no network requests). It runs in desktop
// Chrome from any static file server: `node serve.ts`, then open http://localhost:8080.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The output folder itself is never deleted or recreated here — only the files inside
// it are cleared first, so a grader running as a non-root user can always write into
// a folder it owns (deleting /output itself was the bug that failed STARFORGE's
// round-1 grading). Both runs write byte-identical output.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Clear only the files inside the output folder, never the folder itself.
mkdirSync(out, { recursive: true });
for (const entry of readdirSync(out)) {
  const target = join(out, entry);
  rmSync(target, { recursive: true, force: true });
}

cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (from the bounty rules): only text_max_bytes shapes the
// dossier's bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files in all, or a path under game/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

const gameBytes = statSync(join(out, 'game')).isDirectory()
  ? readdirSync(join(out, 'game')).length
  : 0;
console.log(`Solmar Nights handed in: game/ + screenshots/ + dossier.json written to ${out} (${gameBytes} top-level game entries).`);
