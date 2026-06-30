// =============================================================================
// bubble_chamber.frag  —  many nucleation sites, flickering into being.
// -----------------------------------------------------------------------------
// Named for the particle-physics bubble chamber: a field that keeps sparking new
// micro-bubbles of true vacuum, most of which are sub-critical and collapse, a
// few of which catch and grow. Reads as a boiling, unstable vacuum on the edge
// of a phase transition.
//
// Build: the core library is prepended via these includes (tools/build.mjs).
// =============================================================================
#include "core/common.glsl"
#include "core/bubble_geometry.glsl"
#include "core/decay_front.glsl"
#include "core/true_vacuum.glsl"

const int N_SITES = 12;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fvd_uv(fragCoord, iResolution.xy);
    float t = iTime;
    float aspect = iResolution.x / min(iResolution.x, iResolution.y);

    // a dim but visible superheated vacuum, gently roiling
    vec3 col = vec3(0.02, 0.03, 0.05)
             + 0.05 * vec3(0.4, 0.5, 0.7) * fbm(uv * 6.0 + t * 0.1, 4);

    float merged_sd = 1e9;

    for (int i = 0; i < N_SITES; i++) {
        float fi = float(i);

        // each site fires on its own period with a random phase
        float period = 2.0 + 3.0 * hash11(fi + 0.5);
        float phase  = hash11(fi + 9.0) * period;
        float local  = mod(t + phase, period);

        // position wanders slowly so the chamber feels alive
        vec2 c = vec2(aspect * hash11(fi + 1.2), hash11(fi + 4.7));
        c += 0.02 * vec2(sin(t + fi), cos(t * 1.3 + fi));

        // is this one critical (catches and grows) or sub-critical (pops)?
        bool critical = hash11(fi + 20.0) > 0.6;
        float maxr = critical ? 0.26 : 0.07;

        // grow then (if sub-critical) collapse
        float grow = fvd_radius_at(local, 0.006, 0.09);
        float radius = critical
            ? min(grow, maxr)
            : maxr * sin(sat(local / period) * PI);   // bubble up and pop
        radius = max(radius, 0.0);
        float thick = max(0.12 * radius, 0.004);

        float sd = sdf_bubble_sphere(uv, c, radius);
        col += render_decay_front(sd, uv, c, radius, thick, 0.45, t);

        // soft glow halo so every active site lights its neighborhood — keeps
        // the chamber from ever reading as a dead black field.
        float glow = exp(-max(sd, 0.0) * 14.0) * smoothstep(0.0, 0.02, radius);
        col += plasma_ramp(0.55, 0.3) * glow * 0.6;

        if (critical) merged_sd = sdf_smooth_union(merged_sd, sd, 0.05);
    }

    // translated interior only for the critical, growing bubbles
    float interior = fvd_interior_mask(merged_sd, 0.03);
    vec3 inside = translate_scene(col, uv, vec2(aspect * 0.5, 0.5),
                                  interior, t, 0.7);
    col = mix(col, inside, interior);

    col = tonemap(col);
    fragColor = vec4(col, 1.0);
}

#ifdef FVD_STANDALONE
out vec4 fvd_fragColor;
void main() { mainImage(fvd_fragColor, gl_FragCoord.xy); }
#endif
