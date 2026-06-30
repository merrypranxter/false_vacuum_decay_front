// =============================================================================
// decay_front.glsl  —  the wall. the bright burning shell of released energy.
// -----------------------------------------------------------------------------
// The decay front is where the false vacuum gives up its latent heat. The
// README's brief: peak luminosity at the wall, falloff both directions, plasma
// white -> blue -> ultraviolet, turbulent fractal texture like a burning front.
//
// render_decay_front() returns *additive* emission (HDR, can exceed 1.0) so the
// caller can add it on top of whatever zone color it computed.
//
// Requires: core/common.glsl, core/bubble_geometry.glsl
// =============================================================================

#ifndef FVD_DECAY_FRONT_INCLUDED
#define FVD_DECAY_FRONT_INCLUDED

// Turbulent scalar field along the front. `uv` is the pixel, `radius` sets the
// angular frequency so detail scale stays roughly constant as the bubble grows.
float front_turbulence(vec2 uv, vec2 center, float radius, float t) {
    vec2 d = uv - center;
    float ang = atan(d.y, d.x);
    float rad = length(d);
    // sample noise in (angle, radius) space so filaments wrap around the shell
    vec2 p = vec2(ang * (3.0 + radius * 8.0), rad * 12.0);
    p += vec2(0.0, -t * 1.5);                  // outward-drifting flames
    return ridged_fbm(p + fbm(p * 0.5 + t), 5);
}

// Core wall renderer.
//   sd        : signed distance to the wall surface (negative inside)
//   uv,center : for texturing the front
//   radius    : current bubble radius (for detail scaling + brightness)
//   thickness : wall thickness
//   temp      : wall_temperature uniform (0..1)
//   t         : time (seconds) for animation
vec3 render_decay_front(float sd, vec2 uv, vec2 center,
                        float radius, float thickness,
                        float temp, float t) {
    // Distance through the shell, normalized to [-1 (inner), +1 (outer)].
    float half_t = max(0.5 * thickness, 1e-4);
    float x = sd / half_t;

    // Peak luminosity at the surface, falling off both ways. Inner side decays
    // faster (energy is dumped into the new vacuum); outer side has a longer
    // radiative tail (the pre-heat / Hawking-like glow).
    //
    // The exponent arguments are clamped to the side they belong to (min/max
    // against 0) so the OFF side evaluates exp(0)=1 and is then zeroed by the
    // step(). Without the clamp, exp() of a large wrong-side x overflows to
    // +Inf and Inf*0 == NaN, which then spreads across the whole frame.
    float core   = exp(-x * x * 4.0);                       // tight bright line
    float inner  = exp(min(x, 0.0) * 6.0) * step(x, 0.0);   // quick inner falloff
    float outer  = exp(-max(x, 0.0) * 2.5) * step(0.0, x);  // slow outer tail
    float lum    = core + 0.6 * inner + 0.4 * outer;

    // Turbulence breaks the shell into filaments and licks of flame.
    float turb = front_turbulence(uv, center, radius, t);
    lum *= 0.55 + 0.9 * turb;

    // Hot spots: where turbulence is highest near the core, blow out to white/UV.
    float hot = sat(turb * core * 1.6);

    // Walk the plasma ramp: outer edge cooler (ember/orange), core hotter
    // (white -> blue), brightest knots punch into ultraviolet.
    float ramp = sat(0.35 + 0.5 * core + 0.4 * hot + 0.15 * temp);
    vec3 col = plasma_ramp(ramp, temp);

    // Overall intensity grows a touch with radius — a bigger front releases more.
    float intensity = 2.2 * lum * (0.8 + 0.6 * radius);
    return col * intensity;
}

// A standalone "ring flare" you can add at the exact moment of nucleation or
// when two walls collide — a sharp expanding light shock.
vec3 nucleation_flash(float sd, float thickness, float age, float temp) {
    float ring = exp(-abs(sd) / max(thickness, 1e-4) * 3.0);
    float decay = exp(-age * 3.0);                 // fades over ~1s
    return plasma_ramp(0.9, temp) * ring * decay * 4.0;
}

#endif // FVD_DECAY_FRONT_INCLUDED
