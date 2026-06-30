# Examples

Drop-in hosts for the false-vacuum-decay finisher, smallest to largest.

| Example                          | Host         | What it shows                                   |
| -------------------------------- | ------------ | ----------------------------------------------- |
| [`shadertoy.glsl`](shadertoy.glsl) | Shadertoy  | Paste-and-go single file. No build step.        |
| [`regl/finisher.js`](regl/finisher.js) | regl   | Minimal raw-WebGL host, one fullscreen draw.    |
| [`threejs/finisher.js`](threejs/finisher.js) | three.js | Post-process pass that eats your scene texture. |
| [`godot/false_vacuum.gdshader`](godot/false_vacuum.gdshader) | Godot 4 | `canvas_item` shader over a full-rect ColorRect. |

The `examples/*` files are **self-contained compact distillations** so they run
without a build step. The full, modular effect lives in [`../shaders/`](../shaders/);
flatten those with the build tool when you want the complete version:

```bash
node ../tools/build.mjs ../shaders/demo/universe_death.frag out.frag
```

Or just open [`../web/`](../web/) in a local server to see every shader live:

```bash
python3 -m http.server   # then visit http://localhost:8000/web/
```

See [`../docs/integration.md`](../docs/integration.md) for the full walkthrough
and the uniform contract.
