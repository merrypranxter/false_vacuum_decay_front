# false_vacuum_decay_front

> A lightspeed void-bubble that consumes everything. The universe ends in a blink — and it's beautiful.

## What This Is

In quantum field theory, our vacuum might be **false** — a metastable state that could decay to a lower energy "true vacuum." If this happens, a bubble of true vacuum would expand at lightspeed, rewriting physics as it goes. Inside the bubble: different constants, different chemistry, different existence.

This repo simulates that bubble as a visual effect. It's designed as a **finisher** — a compositable layer that can be dropped onto any scene. The void advances. Everything it touches is transformed.

## Physics (Simplified)

- **Nucleation**: A quantum fluctuation creates a bubble of true vacuum
- **Expansion**: The bubble wall expands at ~lightspeed (or near it)
- **Phase Transition**: Behind the wall, physics has different constants
- **Energy Release**: The wall releases energy (like latent heat) — a shell of fire

Visually: a growing sphere of **wrongness**. The edge is bright. Inside is... other.

## Visual Design

### The Wall
- **Thickness**: ~1-10% of bubble radius
- **Brightness**: Peak luminosity at the wall, falls off both directions
- **Color**: Plasma white → blue → ultraviolet (hottest to coolest)
- **Texture**: Turbulent, fractal, like a burning front

### The Interior (True Vacuum)
- **Wrong Constants**: Different speed of light, different electron charge
- **Visual Language**: 
  - Slower light = blur trails, delayed reflections
  - Different chemistry = impossible colors, inverted spectra
  - Altered gravity = lensing, compression, spatial distortion
- **The Look**: Not "destroyed" but **translated**. Like a JPEG re-encoded with alien DCT tables.

### The Exterior (False Vacuum)
- Normal scene, unaware of impending doom
- Subtle precursors: vacuum fluctuations, Hawking-like radiation from the approaching wall
- Distant objects appear redshifted as space is consumed

## Shader Architecture

```glsl
// False vacuum decay — compositable finisher
uniform float bubble_radius;     // 0 to 1 (screen-space)
uniform vec2 bubble_center;      // Nucleation point
uniform float wall_thickness;    // Sharpness of transition
uniform float time_since_nucleation;

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float dist = length(uv - bubble_center);
    
    // Three zones
    bool inside = dist < bubble_radius - wall_thickness/2.0;
    bool outside = dist > bubble_radius + wall_thickness/2.0;
    bool at_wall = !inside && !outside;
    
    vec3 color;
    if (outside) {
        color = render_false_vacuum(uv, time);
    } else if (at_wall) {
        color = render_decay_front(uv, dist, bubble_radius, wall_thickness);
    } else {
        color = render_true_vacuum(uv, time_since_nucleation);
    }
    
    gl_FragColor = vec4(color, 1.0);
}
```

## Compositing Modes

1. **Full Screen** — The bubble consumes the entire viewport
2. **Picture-in-Picture** — A small bubble nucleates and grows
3. **Multiple Bubbles** — Several decay fronts collide, interfere
4. **Reverse** — True vacuum shrinks, false vacuum reclaims (time-reversed)
5. **Stalled** — The wall hovers at equilibrium, flickering

## Parameters

- `nucleation_point` — where the bubble starts (vec2)
- `expansion_rate` — how fast it grows (0 = static, 1 = lightspeed)
- `wall_temperature` — color temperature of the front
- `interior_wrongness` — how alien the true vacuum looks
- `precursor_intensity` — subtle effects before the wall arrives
- `collision_mode` — what happens when two bubbles meet

## Integration

```glsl
// Drop this into any existing shader as a post-process
vec3 apply_false_vacuum(vec3 original_color, vec2 uv) {
    float bubble = smoothstep(bubble_radius, bubble_radius - 0.01, dist);
    vec3 void_color = render_true_vacuum(uv);
    vec3 wall = render_wall(uv, dist, bubble_radius);
    return mix(original_color, void_color, bubble) + wall;
}
```

## Variations

### `false_vacuum_decay_front/`
```
├── shaders/
│   ├── core/
│   │   ├── bubble_geometry.glsl   # SDF for sphere/cylinder growth
│   │   ├── decay_front.glsl       # wall rendering
│   │   └── true_vacuum.glsl       # interior "wrongness"
│   ├── compositing/
│   │   ├── full_screen.frag       # standalone finisher
│   │   ├── pip_nucleation.frag    # small bubble grows
│   │   └── multi_bubble.frag      # colliding fronts
│   └── demo/
│       ├── universe_death.frag    # full cosmic apocalypse
│       ├── bubble_chamber.frag    # multiple nucleation sites
│       └── stalled_front.frag     # hovering equilibrium
└── docs/
    ├── false_vacuum_theory.md
    └── phase_transitions.md
```

## References

- Coleman & De Luccia (1980). *Gravitational effects on and of vacuum decay*
- Kurki-Suonio (1985). *Phase transitions in the early universe*
- Turner & Wilczek (1982). *Is our vacuum metastable?*

## Related

- `accretion_disk` — shared catastrophic-astronomy visual language
- `thin_film_iridescence` — shared thin-shell optical effects

---

*The universe is not guaranteed to last. But if it ends, it should at least be pretty.*
