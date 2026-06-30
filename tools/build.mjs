#!/usr/bin/env node
// =============================================================================
// tools/build.mjs  —  resolve `#include "..."` and flatten shaders.
// -----------------------------------------------------------------------------
// The shaders in this repo are written modularly: compositing/demo .frag files
// pull in core/*.glsl via `#include "core/foo.glsl"` lines. WebGL/Shadertoy have
// no native #include, so this tiny preprocessor flattens a shader into a single
// self-contained GLSL string.
//
// Usage:
//   node tools/build.mjs shaders/demo/universe_death.frag        # -> stdout
//   node tools/build.mjs shaders/demo/universe_death.frag out.frag
//   node tools/build.mjs --all                                   # build/ dir
//
// Features:
//   - recursive includes, resolved relative to the repo's `shaders/` root
//   - include guards honored (a file is inlined at most once)
//   - prepends `#version 300 es` + precision + the FVD_STANDALONE main() shim
//     so the output runs as a raw WebGL2 fragment shader.
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO   = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHADERS = join(REPO, "shaders");

const INCLUDE_RE = /^\s*#include\s+"([^"]+)"\s*$/;

function flatten(entryPath, seen = new Set()) {
  const abs = resolve(entryPath);
  if (seen.has(abs)) return "";          // already inlined (acts as a guard)
  seen.add(abs);

  const src = readFileSync(abs, "utf8");
  const out = [];
  for (const line of src.split("\n")) {
    const m = line.match(INCLUDE_RE);
    if (m) {
      // includes are resolved relative to shaders/ (e.g. "core/common.glsl")
      const incl = join(SHADERS, m[1]);
      out.push(`// ---- begin ${m[1]} ----`);
      out.push(flatten(incl, seen));
      out.push(`// ---- end ${m[1]} ----`);
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}

const HEADER = `#version 300 es
precision highp float;
precision highp int;

// Shadertoy-compatible uniforms supplied by the host.
uniform vec3  iResolution;
uniform float iTime;
uniform vec4  iMouse;

#define FVD_STANDALONE 1
#define FVD_NO_UNIFORMS 1   // the demos drive params internally, not via uniforms
`;

function build(entry) {
  const body = flatten(entry);
  return `${HEADER}\n${body}\n`;
}

function buildAll() {
  const outDir = join(REPO, "build");
  mkdirSync(outDir, { recursive: true });
  const dirs = ["compositing", "demo"];
  let n = 0;
  for (const d of dirs) {
    const full = join(SHADERS, d);
    for (const f of readdirSync(full)) {
      if (!f.endsWith(".frag")) continue;
      const out = build(join(full, f));
      const name = `${d}__${f.replace(/\.frag$/, "")}.frag`;
      writeFileSync(join(outDir, name), out);
      console.error(`built ${relative(REPO, join(outDir, name))}`);
      n++;
    }
  }
  console.error(`\n${n} shaders flattened into ${relative(REPO, outDir)}/`);
}

// ---- CLI -------------------------------------------------------------------
const args = process.argv.slice(2);
if (args[0] === "--all") {
  buildAll();
} else if (args.length >= 1) {
  const out = build(args[0]);
  if (args[1]) {
    writeFileSync(args[1], out);
    console.error(`wrote ${args[1]}`);
  } else {
    process.stdout.write(out);
  }
} else {
  console.error(`usage:
  node tools/build.mjs <shader.frag> [out.frag]   flatten one shader
  node tools/build.mjs --all                       flatten all into build/`);
  process.exit(1);
}
