# False Vacuum Theory

> The physics this effect is pretending to be. Enough to make the art honest;
> not enough to publish.

## The vacuum is not empty, and may not be safe

In quantum field theory the "vacuum" is the lowest-energy configuration of all
the fields that fill space — the Higgs field foremost among them. Empty space is
not *nothing*; it is a field sitting at the bottom of its potential well.

The unsettling possibility: the well we sit in might not be the *deepest* one. If
the Higgs potential has another minimum at lower energy, our vacuum is
**metastable** — a *false vacuum*. It looks stable, it has been stable for 13.8
billion years, but it is one quantum tunnelling event away from rolling down to
the *true vacuum*.

```
 V(φ)
  │      ___
  │     /   \           ← false vacuum (us): stable-looking, but not the bottom
  │    /     \_____
  │   /            \
  │  /              \__   ← true vacuum: the real minimum
  └──────────────────────► φ
```

Measurements of the Higgs (~125 GeV) and top quark masses put the Standard Model
suspiciously close to the boundary between "stable" and "metastable." The honest
answer is: *we don't know which side of the line we're on.*

## Nucleation: how the end begins

The transition does not happen everywhere at once. It happens at a **point**, via
quantum tunnelling, creating a tiny bubble of true vacuum. This is the
**Coleman–De Luccia instanton** (Coleman & De Luccia, 1980).

There is a competition:

- The bubble **interior** is at lower energy → a *volume* term that pays you
  energy, growing as `r³`.
- The bubble **wall** costs surface energy (the field has to climb over the
  barrier in between) → a *surface* term, growing as `r²`.

Below a **critical radius** the surface cost dominates and the bubble collapses
back (sub-critical — our `bubble_chamber.frag` "pops"). Above it, the volume gain
wins and the bubble grows without bound (critical — it "catches"). The critical
bubble is the saddle point the system has to tunnel to.

> In the shaders, `fvd_radius_at(t, r0, rate)` starts at `r0` ≈ the critical
> radius and grows from there. The `bubble_chamber` demo explicitly models both
> outcomes: most sites are sub-critical and collapse; a few catch.

## Expansion: a lightspeed wall

Once super-critical, the bubble wall accelerates and asymptotes to the speed of
light. In the rest frame of the nucleation point, the wall radius traces a
hyperbola:

```
r(t) ≈ sqrt(r₀² + (c·t)²)
```

This is exactly `fvd_radius_at()`. The visual consequence is the eerie one:
because the wall travels at (nearly) lightspeed, **you get no warning**. The
first photons announcing the wall's approach arrive essentially *with* the wall.
The universe outside is genuinely oblivious until it isn't — which is why the
exterior in these shaders stays calm, with only the faintest precursor.

(The `precursor_intensity` parameter is an artistic license: a real wall would
give almost none. We cheat for drama.)

## The wall: a shell of released energy

As the field rolls from false to true vacuum across the wall, the energy
difference between the two vacua has to go *somewhere*. It is dumped into the
wall as kinetic energy and radiation — a thin, blazing shell, like the latent
heat released when water freezes, except the "freezing" is of spacetime's ground
state.

That shell is the brightest thing in the effect. See
[`phase_transitions.md`](phase_transitions.md) for the wall's internal structure
and why we color it the way we do.

## The interior: not destroyed, translated

Inside the bubble the constants of nature are different — a different effective
speed of light, different particle masses, possibly a different number of stable
elements. Ordinary matter from our vacuum cannot exist there in the same form.

It is tempting to render the interior as destruction (black, fire, rubble). The
core art decision of this repo is to reject that. The interior is a *working*
universe running on different rules — coherent, structured, and **wrong**. The
README's framing says it best: *"like a JPEG re-encoded with alien DCT tables."*
The same information, decoded through a different basis. That is what
`true_vacuum.glsl`'s `translate_scene()` literally does to the incoming pixels.

## What this effect gets wrong (on purpose)

- **Precursors.** A lightspeed wall gives no advance notice. We add some anyway.
- **3D → 2D.** We render a 2D screen-space slice of a 3D lightcone. A real bubble
  intersecting your view would not be a clean circle unless it nucleated exactly
  on your line of sight.
- **Reverse mode.** The true vacuum is *lower* energy; it will not spontaneously
  un-decay. `reverse.frag` is pure rewind fantasy.
- **Stalled mode.** A super-critical wall does not stop. Equilibrium is unstable;
  `stalled_front.frag` is holding a ball on a hilltop for the tension.

## Further reading

- Coleman, S. & De Luccia, F. (1980). *Gravitational effects on and of vacuum
  decay.* Phys. Rev. D 21, 3305.
- Turner, M. & Wilczek, F. (1982). *Is our vacuum metastable?* Nature 298, 633.
- Coleman, S. (1977). *Fate of the false vacuum: Semiclassical theory.* Phys.
  Rev. D 15, 2929.
- Degrassi, G. et al. (2012). *Higgs mass and vacuum stability in the Standard
  Model at NNLO.* JHEP 08, 098.
