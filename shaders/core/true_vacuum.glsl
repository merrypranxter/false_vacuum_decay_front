// =============================================================================
// true_vacuum.glsl  —  the interior. not destroyed: translated.
// -----------------------------------------------------------------------------
// Behind the wall, the constants are wrong. The README's framing is the key art
// direction: "Not 'destroyed' but translated. Like a JPEG re-encoded with alien
// DCT tables." So the interior is not noise and not black — it's a coherent
// reality running on different rules.
//
// We express "wrong constants" as a set of transforms applied to a base field:
//   - wrong speed of light  -> directional blur / smear / delayed echoes
//   - wrong chemistry       -> hue rotation + spectral inversion
//   - wrong gravity         -> domain-warp lensing toward the nucleation point
//
// render_true_vacuum() can run purely procedurally (no scene) OR translate an
// existing scene color via translate_scene() for the post-process / finisher
// use case.
//
// Requires: core/common.glsl
// =============================================================================

#ifndef FVD_TRUE_VACUUM_INCLUDED
#define FVD_TRUE_VACUUM_INCLUDED

// A procedural "alien field" — banded, blocky, vaguely crystalline. This is the
// stuff the universe is made of on the other side.
vec3 alien_field(vec2 uv, float t, float wrongness) {
    // gravity: warp space toward a lattice that isn't ours
    vec2 p = uv * (3.0 + 4.0 * wrongness);
    p = domain_warp(p, 0.6 + wrongness, t * 0.2);

    // a layered interference pattern — "different chemistry"
    float a = sin(p.x * PHI + t) * cos(p.y * PHI - t * 0.7);
    float b = fbm(p * 1.5 + a, 5);
    float c = ridged_fbm(p.yx * 0.8 - b, 4);

    // blocky DCT-ish quantization that gets coarser with wrongness
    float q = mix(64.0, 6.0, sat(wrongness));
    float field = floor((a * 0.4 + b * 0.6 + c * 0.5) * q) / q;

    // map to an impossible palette: inverted, hue-rotated, slightly self-lit
    vec3 base = plasma_ramp(sat(field * 0.5 + 0.5), 0.2);
    base = 1.0 - base;                                  // spectral inversion
    base = hue_rotate(base, wrongness * TAU + t * 0.1); // wrong chemistry
    base += 0.15 * c;                                   // faint self-illumination
    return base;
}

// "Wrong speed of light": smear the field directionally so light drags. We fake
// motion blur cheaply by averaging a few taps along a flow direction.
vec3 slow_light_smear(vec2 uv, vec2 center, float t, float wrongness) {
    // radial drag outward; guard the nucleation point so normalize() never
    // sees a zero vector (normalize(0) == 0/0 == NaN, which would spread).
    vec2 d = uv - center;
    vec2 flow = length(d) > 1e-5 ? normalize(d) : vec2(0.0);
    vec3 acc = vec3(0.0);
    const int TAPS = 6;
    // NB: not named `step` — that shadows the GLSL built-in step() and some
    // strict drivers reject the redeclaration.
    float step_size = (0.01 + 0.05 * wrongness);
    for (int i = 0; i < TAPS; i++) {
        float k = float(i) / float(TAPS - 1);
        vec2 sp = uv - flow * step_size * k;
        // each echo is older — light arrives delayed
        acc += alien_field(sp, t - k * 0.3 * wrongness, wrongness);
    }
    return acc / float(TAPS);
}

// Procedural interior (no source scene). `depth` is fvd_interior_mask: how far
// into the bubble we are (0 at wall, 1 deep inside). Deeper = more alien.
vec3 render_true_vacuum(vec2 uv, vec2 center, float depth,
                        float t, float wrongness) {
    float w = wrongness * mix(0.4, 1.0, depth);
    vec3 col = slow_light_smear(uv, center, t, w);

    // gravitational lensing pinch near the core — space is compressed inside
    float pinch = 1.0 - 0.4 * depth;
    vec2 luv = center + (uv - center) * pinch;
    col = mix(col, alien_field(luv * 1.3, t * 0.5, w), 0.3 * depth);

    // a cold inner darkness so the deepest interior reads as a true *void*
    col *= mix(1.0, 0.55, depth);
    return col;
}

// Finisher / post-process variant: take the ORIGINAL scene color and re-encode
// it as if it were data read back through alien codec tables. This is what the
// README's apply_false_vacuum() integration calls.
vec3 translate_scene(vec3 scene, vec2 uv, vec2 center,
                     float depth, float t, float wrongness) {
    float w = wrongness * mix(0.5, 1.0, depth);

    // 1. spectral inversion + hue rotation: same image, alien color basis
    vec3 c = mix(scene, 1.0 - scene, sat(w));
    c = hue_rotate(c, w * PI * depth);

    // 2. channel transpose at high wrongness — "alien DCT tables"
    vec3 swapped = c.gbr;
    c = mix(c, swapped, sat((w - 0.5) * 2.0));

    // 3. quantize luma into bands (re-encode artifact)
    float luma = dot(c, vec3(0.299, 0.587, 0.114));
    float q = mix(32.0, 5.0, sat(w));
    float banded = floor(luma * q) / q;
    c *= banded / max(luma, 1e-3);

    // 4. blend toward the fully-procedural void as we go deeper
    vec3 voidc = render_true_vacuum(uv, center, depth, t, wrongness);
    return mix(c, voidc, depth * depth);
}

#endif // FVD_TRUE_VACUUM_INCLUDED
