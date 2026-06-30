// =============================================================================
// common.glsl  —  shared toolkit for the false-vacuum-decay finisher
// -----------------------------------------------------------------------------
// Every other shader in this repo assumes this file is prepended (see the
// `#include "core/common.glsl"` lines and tools/build.mjs). It provides:
//
//   - the uniform contract (the parameters from README.md)
//   - hashing / value-noise / fbm
//   - domain warping
//   - a cheap blackbody / plasma color ramp
//   - small math helpers (rotation, remap, sat)
//
// Nothing here renders anything. It is pure, side-effect-free GLSL that targets
// GLSL ES 3.00 (WebGL2 / Shadertoy) but avoids anything version-specific so it
// can be lifted into desktop GL or Godot with trivial edits.
// =============================================================================

#ifndef FVD_COMMON_INCLUDED
#define FVD_COMMON_INCLUDED

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const float PI   = 3.14159265359;
const float TAU  = 6.28318530718;
const float PHI  = 1.61803398875;   // shows up in the interior "wrong" geometry

// ----------------------------------------------------------------------------
// The uniform contract.
//
// These mirror README.md > Parameters. A host (the web demo, three.js, Godot,
// etc.) sets them every frame. Defaults are chosen so that a shader still draws
// something sensible if a uniform is left unbound.
//
// Screen-space convention: bubble_center and all distances are in *normalized*
// coordinates where the SHORTER screen axis spans 0..1 (aspect-corrected), so a
// circle stays a circle. See fvd_uv() below.
// ----------------------------------------------------------------------------
#ifndef FVD_NO_UNIFORMS
uniform vec2  bubble_center;          // nucleation point, aspect-corrected uv
uniform float bubble_radius;          // current radius (aspect-corrected units)
uniform float wall_thickness;         // shell thickness, same units as radius
uniform float time_since_nucleation;  // seconds since the bubble was born
uniform float expansion_rate;         // 0 = static .. 1 = lightspeed-ish
uniform float wall_temperature;       // color temperature knob, 0..1
uniform float interior_wrongness;     // how alien the true vacuum looks, 0..1
uniform float precursor_intensity;    // pre-wall effects in the false vacuum
#endif

// ----------------------------------------------------------------------------
// Tiny helpers
// ----------------------------------------------------------------------------
float sat(float x)            { return clamp(x, 0.0, 1.0); }
vec3  sat(vec3 v)             { return clamp(v, 0.0, 1.0); }

// remap x from [a,b] to [0,1]
float remap01(float x, float a, float b) { return sat((x - a) / (b - a)); }

mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

// Aspect-corrected uv so circles stay circular regardless of viewport shape.
// `frag` is gl_FragCoord.xy, `res` is the viewport resolution in pixels.
vec2 fvd_uv(vec2 frag, vec2 res) {
    // shorter axis maps to 0..1, origin at bottom-left, y up
    return frag / min(res.x, res.y);
}

// ----------------------------------------------------------------------------
// Hashing & noise
// ----------------------------------------------------------------------------
float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

// classic value noise on a grid, smooth interpolation
float value_noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i + vec2(0.0, 0.0));
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// fractional brownian motion — the turbulent texture of the burning front
float fbm(vec2 p, int octaves) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        sum += amp * value_noise(p * freq);
        freq *= 2.0;
        amp  *= 0.5;
    }
    return sum;
}

float fbm(vec2 p) { return fbm(p, 5); }

// Ridged fbm — sharper filaments, good for plasma walls.
float ridged_fbm(vec2 p, int octaves) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        float n = value_noise(p * freq);
        n = 1.0 - abs(2.0 * n - 1.0);   // ridge
        sum += amp * n * n;
        freq *= 2.0;
        amp  *= 0.5;
    }
    return sum;
}

// Domain warp: feed a field back into itself for that "fluid / re-encoded"
// look used heavily by the true-vacuum interior.
vec2 domain_warp(vec2 p, float amount, float t) {
    vec2 q = vec2(fbm(p + vec2(0.0, 0.0) + t),
                  fbm(p + vec2(5.2, 1.3) - t));
    return p + amount * q;
}

// ----------------------------------------------------------------------------
// Color: a cheap, art-directed blackbody / plasma ramp.
//
// `t` in 0..1 walks the ramp from cool to incandescent. `temperature` (0..1)
// pushes the whole ramp hotter (toward blue / ultraviolet), matching the
// README's "Plasma white -> blue -> ultraviolet (hottest to coolest)".
// ----------------------------------------------------------------------------
vec3 plasma_ramp(float t, float temperature) {
    t = sat(t);
    // Anchors: deep ember -> orange -> white-hot -> electric blue -> UV violet.
    vec3 ember  = vec3(0.35, 0.04, 0.02);
    vec3 orange = vec3(1.00, 0.45, 0.10);
    vec3 white  = vec3(1.00, 0.95, 0.90);
    vec3 blue   = vec3(0.55, 0.75, 1.00);
    vec3 violet = vec3(0.65, 0.40, 1.00);

    vec3 c;
    if (t < 0.25)      c = mix(ember,  orange, remap01(t, 0.00, 0.25));
    else if (t < 0.55) c = mix(orange, white,  remap01(t, 0.25, 0.55));
    else if (t < 0.80) c = mix(white,  blue,   remap01(t, 0.55, 0.80));
    else               c = mix(blue,   violet, remap01(t, 0.80, 1.00));

    // temperature shifts mass toward the blue/violet end
    c = mix(c, c.bgr * vec3(0.9, 1.0, 1.2), temperature * 0.5);
    return c;
}

// hue rotation in a cheap YIQ-ish space — the interior uses this to fake
// "different chemistry / inverted spectra".
vec3 hue_rotate(vec3 col, float angle) {
    const vec3 k = vec3(0.57735);   // 1/sqrt(3)
    float c = cos(angle), s = sin(angle);
    return col * c + cross(k, col) * s + k * dot(k, col) * (1.0 - c);
}

// ACES-ish filmic tonemap so the bright wall doesn't just clip to flat white.
vec3 tonemap(vec3 x) {
    const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return sat((x * (a * x + b)) / (x * (c * x + d) + e));
}

#endif // FVD_COMMON_INCLUDED
