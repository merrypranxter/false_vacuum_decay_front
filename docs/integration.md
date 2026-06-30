# Integration

How to drop the false-vacuum-decay finisher onto your own scene, in four
environments. All of them boil down to the same idea from the README:

```glsl
vec3 apply_false_vacuum(vec3 original_color, vec2 uv) {
    float interior = fvd_interior_mask(sd, thick);
    vec3 inside = translate_scene(original_color, uv, center, interior, t, wrongness);
    vec3 col = mix(original_color, inside, interior);
    col += render_decay_front(sd, uv, center, radius, thick, temp, t);
    return col;
}
```

You provide `original_color` (your rendered scene, or a texture sample); the
finisher eats it.

## 0. The flattening step

The modular shaders use `#include "core/*.glsl"`. WebGL/Shadertoy/Godot have no
native include, so flatten first:

```bash
node tools/build.mjs shaders/compositing/full_screen.frag dist/full_screen.frag
# or build them all into build/
node tools/build.mjs --all
```

The web demo (`web/index.html`) resolves includes in-browser instead, so for a
quick look you can skip the build entirely:

```bash
python3 -m http.server   # then open http://localhost:8000/web/
```

## 1. Shadertoy

The compositing/demo shaders are already Shadertoy-flavored (`mainImage`,
`iResolution`, `iTime`, `iMouse`). Paste a flattened file into a new Shadertoy.
See [`examples/shadertoy.glsl`](../examples/shadertoy.glsl) for a minimal,
already-flattened single-file version you can copy directly.

## 2. three.js (ShaderMaterial / post-process)

Render your scene to a `WebGLRenderTarget`, then run a fullscreen pass that feeds
the scene texture in as `original_color`. Full example:
[`examples/threejs/finisher.js`](../examples/threejs/finisher.js).

Key bindings:

```js
uniforms = {
  tScene:   { value: renderTarget.texture },
  iResolution: { value: new THREE.Vector3() },
  iTime:    { value: 0 },
  bubble_center: { value: new THREE.Vector2(0.5, 0.5) },
  bubble_radius: { value: 0.0 },
  wall_thickness:{ value: 0.04 },
  // ... rest of the uniform contract
};
```

## 3. Godot 4 (CanvasItem / spatial shader)

Godot's shading language is GLSL-like but not identical (`COLOR`, `UV`,
`TIME`, `SCREEN_TEXTURE`). A ported `canvas_item` shader that uses the same math
is in [`examples/godot/false_vacuum.gdshader`](../examples/godot/false_vacuum.gdshader).
Attach it to a full-rect `ColorRect` over your scene.

## 4. regl / raw WebGL

`examples/regl/finisher.js` shows the smallest possible host: one fullscreen
draw, the uniform contract wired up, mouse for the nucleation point. Good
starting point if you're not on a framework.

## The uniform contract

Every host sets the same parameters (defined in `core/common.glsl`):

| uniform                | type  | meaning                                       |
| ---------------------- | ----- | --------------------------------------------- |
| `bubble_center`        | vec2  | nucleation point (aspect-corrected uv)        |
| `bubble_radius`        | float | current radius; if 0, integrated from time    |
| `wall_thickness`       | float | shell thickness                               |
| `time_since_nucleation`| float | seconds since birth                           |
| `expansion_rate`       | float | 0 static … 1 lightspeed-ish                   |
| `wall_temperature`     | float | 0 cool … 1 hot (pushes color toward UV)       |
| `interior_wrongness`   | float | 0 normal … 1 fully alien                      |
| `precursor_intensity`  | float | strength of pre-wall effects                  |

Aspect-correction convention: divide `gl_FragCoord.xy` by `min(res.x, res.y)`
(`fvd_uv()`), so the shorter axis spans 0..1 and circles stay circular.
