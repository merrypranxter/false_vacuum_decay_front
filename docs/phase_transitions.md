# Phase Transitions & the Wall

> How the decay front is structured, and how that structure maps onto pixels.

A vacuum decay is a **first-order phase transition** — like water flashing to
ice, it proceeds by nucleation and the growth of bubbles, with a sharp interface
(the wall) separating the two phases. This doc is about that interface: its
internal structure, its temperature, and the rendering choices in
[`core/decay_front.glsl`](../shaders/core/decay_front.glsl).

## Anatomy of the wall

Crossing the wall from outside (false vacuum) to inside (true vacuum) you pass
through three sub-regions:

```
        false vacuum │  PRE-HEAT  │ WALL │  REHEAT  │ true vacuum
   (oblivious, cold) │  ~redshift │ core │  plasma  │ (translated)
 ────────────────────┼────────────┼──────┼──────────┼──────────────►  radius
                     │            │  ↑   │          │
                     │            │ peak luminosity  │
```

- **Pre-heat (outer tail).** Just ahead of the wall, radiation leaking forward
  warms the medium. We model this as a *longer, dimmer* falloff on the outside
  (`outer = exp(-x*2.5)`), plus the precursor redshift in the compositing
  shaders. In `decay_front.glsl` the outer side deliberately decays slower than
  the inner side.

- **Wall core.** The field is mid-climb over the potential barrier; gradient
  energy density peaks here. This is the brightest line — `core = exp(-x²·4)`.

- **Reheat (inner tail).** Behind the wall the released latent heat thermalizes
  into a plasma before settling into the translated interior. Modeled as a fast
  inner falloff (`inner = exp(x*6)`), so the brightness collapses quickly once
  you're inside.

The three terms are summed and then **modulated by turbulence** so the shell
isn't a clean ring but a churning, filamented burning front.

## Wall thickness

The physical wall thickness is set by the field's correlation length — roughly
`1/m` for the field of mass `m`. Relative to a macroscopic bubble that is
*absurdly* thin. Visually that reads as a hard, infinitely sharp edge, which is
boring and aliases badly.

So we scale thickness to the radius: **~1–10% of the bubble radius** (the README
spec). `thick = 0.04 * radius` in most shaders. As the bubble grows the wall
grows with it, keeping the filament detail readable at every scale and giving the
front weight.

## Temperature & color

The wall is *hot* — easily the hottest thing on screen. The README's palette is
a blackbody-ish progression run backwards from how stars usually read:

```
   ember → orange → white-hot → electric blue → ultraviolet violet
   (cool, outer tail)        (core)            (hottest knots)
```

This is implemented in `plasma_ramp(t, temperature)` in
[`core/common.glsl`](../shaders/core/common.glsl):

- The **outer tail** sits low on the ramp (ember/orange).
- The **core** climbs to white then blue.
- **Turbulent hot-spots** near the core punch all the way into UV violet.
- The `wall_temperature` uniform shifts the entire ramp hotter (toward blue/UV).

Real blackbody radiation never looks violet (it goes white→blue and the
perceived color saturates), so the ultraviolet is a deliberate *unphysical*
signal: "this is hotter than anything you have words for." It doubles as a visual
rhyme with the alien interior, hinting the wall is already partway to elsewhere.

## Turbulence: why the front churns

A real relativistic wall is hydrodynamically unstable; it wrinkles, develops
fingers, and sheds turbulence into the plasma behind it. We approximate that with
**ridged fbm sampled in (angle, radius) space** (`front_turbulence()`), so the
filaments wrap *around* the shell and drift outward with time rather than sliding
across the screen. Layering `ridged_fbm(p + fbm(p))` (a cheap domain warp) gives
the licking, flame-like quality without a fluid sim.

## Collisions

When two bubbles meet (`multi_bubble.frag`), their walls don't pass through each
other — the phase is already converted in the overlap, so the walls *annihilate*
along the contact surface, dumping their kinetic energy into a bright collision
flare and leaving a single merged region of true vacuum. We detect the overlap
(both signed distances near zero at one pixel) and add a constructive flare,
while the geometry merges via `sdf_smooth_union()`.

In the real early universe these collisions are a candidate source of a
**stochastic gravitational-wave background** — the colliding walls shake
spacetime. We don't render gravitational waves, but the collision flare is a nod
to where that energy goes.

## Mapping parameters to physics

| Uniform                | Physical analogue                                  |
| ---------------------- | -------------------------------------------------- |
| `expansion_rate`       | wall velocity as a fraction of `c`                 |
| `wall_thickness`       | field correlation length `~1/m` (rescaled for art) |
| `wall_temperature`     | latent heat released / reheat temperature          |
| `interior_wrongness`   | how different the true-vacuum constants are        |
| `precursor_intensity`  | forward-leaked radiation (mostly artistic license) |

See [`false_vacuum_theory.md`](false_vacuum_theory.md) for the nucleation side of
the story.
