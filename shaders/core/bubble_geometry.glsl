// =============================================================================
// bubble_geometry.glsl  —  where is the wall, and which zone am I in?
// -----------------------------------------------------------------------------
// Pure geometry. No color. This file answers three questions for a given pixel:
//
//   1. How big is the bubble right now?            -> fvd_radius_at()
//   2. How far am I from the nucleation point?     -> SDFs below
//   3. Am I outside / at-the-wall / inside?        -> fvd_zone()
//
// The README models the bubble in screen space as a growing circle (a 2D slice
// of the real 3D lightcone). We keep that, and also provide a cylinder/column
// SDF for the "wall sweeps across as a vertical front" variation.
//
// Requires: core/common.glsl
// =============================================================================

#ifndef FVD_BUBBLE_GEOMETRY_INCLUDED
#define FVD_BUBBLE_GEOMETRY_INCLUDED

// Zone ids returned by fvd_zone().
const int ZONE_FALSE_VACUUM = 0;   // outside, oblivious
const int ZONE_WALL         = 1;   // the decay front
const int ZONE_TRUE_VACUUM  = 2;   // inside, translated

// ----------------------------------------------------------------------------
// Radius from time.
//
// Real bubble walls asymptote to lightspeed: r(t) ~ sqrt(r0^2 + (c t)^2) for a
// Coleman-De Luccia bubble (a hyperbola in the t-r plane). We reproduce that
// shape so the growth *feels* relativistic — slow to start, then a hard rush.
//
//   r0   : initial nucleation radius (~the critical bubble size)
//   rate : expansion_rate uniform, 0 = frozen, 1 = lightspeed-ish
// ----------------------------------------------------------------------------
float fvd_radius_at(float t, float r0, float rate) {
    float c = rate;                      // "speed of light" in screen units/sec
    return sqrt(r0 * r0 + (c * t) * (c * t));
}

// Convenience overload using the uniform contract. Only available when the
// uniforms are actually declared (see FVD_NO_UNIFORMS in common.glsl) — the
// flattened standalone demos drive the radius from time directly instead.
#ifndef FVD_NO_UNIFORMS
float fvd_radius() {
    // if a host drives bubble_radius directly, prefer it; otherwise integrate.
    return bubble_radius > 0.0
        ? bubble_radius
        : fvd_radius_at(time_since_nucleation, wall_thickness, expansion_rate);
}
#endif

// ----------------------------------------------------------------------------
// Signed distances. Negative = inside the bubble, positive = outside.
// All in aspect-corrected uv units (see fvd_uv / common.glsl).
// ----------------------------------------------------------------------------

// Spherical bubble (the default): a circle in screen space.
float sdf_bubble_sphere(vec2 uv, vec2 center, float radius) {
    return length(uv - center) - radius;
}

// Cylindrical / planar front: the wall is a vertical line sweeping right.
// `axis` lets you rotate the sweep direction.
float sdf_bubble_cylinder(vec2 uv, vec2 origin, float radius, vec2 axis) {
    float d = dot(uv - origin, normalize(axis));
    return d - radius;
}

// Smooth union of two bubbles — used by multi_bubble for merging fronts.
// k controls how soft the merge seam is.
float sdf_smooth_union(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}

// ----------------------------------------------------------------------------
// Zone classification from a signed distance to the wall surface.
//
// `sd` is the signed distance (e.g. from sdf_bubble_sphere). The wall straddles
// the surface with half-thickness on each side.
// ----------------------------------------------------------------------------
int fvd_zone(float sd, float thickness) {
    float half_t = 0.5 * thickness;
    if (sd >  half_t) return ZONE_FALSE_VACUUM;
    if (sd < -half_t) return ZONE_TRUE_VACUUM;
    return ZONE_WALL;
}

// A soft 0..1 mask of "how much true vacuum" a pixel is. 0 outside, 1 deep
// inside, smooth across the wall. This is the workhorse for compositing.
float fvd_interior_mask(float sd, float thickness) {
    float half_t = 0.5 * thickness;
    return smoothstep(half_t, -half_t, sd);
}

// A 0..1 mask that peaks *at* the wall and falls off both directions. Asymmetric
// falloff: tighter on the inside, with a longer pre-heat glow on the outside so
// the false vacuum gets a warning.
float fvd_wall_mask(float sd, float thickness) {
    float half_t = 0.5 * thickness;
    float inner = smoothstep(-half_t, 0.0, sd);          // ramp up from inside
    float outer = smoothstep(half_t * 3.0, 0.0, sd);     // longer outer glow
    return inner * outer;
}

#endif // FVD_BUBBLE_GEOMETRY_INCLUDED
