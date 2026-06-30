// =============================================================================
// stalled_front.frag  —  the wall hovers at equilibrium, flickering.
// -----------------------------------------------------------------------------
// Compositing mode 5 as a demo. The energy released by the wall is (barely)
// balanced against the pressure difference, so the front neither advances nor
// retreats — it sits at a radius and seethes. Tension without resolution: the
// most unsettling mode, because the apocalypse is *right there* and paused.
//
// Build: the core library is prepended via these includes (tools/build.mjs).
// =============================================================================
#include "core/common.glsl"
#include "core/bubble_geometry.glsl"
#include "core/decay_front.glsl"
#include "core/true_vacuum.glsl"

vec3 render_false_vacuum(vec2 uv, float t) {
    vec3 sky = mix(vec3(0.02, 0.03, 0.06), vec3(0.04, 0.04, 0.09),
                   fbm(uv * 2.0 + t * 0.02, 4));
    sky += vec3(pow(hash21(floor(uv * 600.0)), 60.0));
    return sky;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fvd_uv(fragCoord, iResolution.xy);
    float t = iTime;
    float aspect = iResolution.x / min(iResolution.x, iResolution.y);
    vec2 center = vec2(aspect * 0.5, 0.5);

    // Equilibrium radius with a small unstable flicker — it breathes but never
    // commits. The flicker is multi-frequency so it never looks periodic.
    float flicker = 0.012 * (sin(t * 7.0) + 0.5 * sin(t * 13.3 + 1.0)
                            + 0.3 * fbm(vec2(t * 2.0, 0.0), 3));
    float radius = 0.33 + flicker;
    float thick  = max(0.06 * radius, 0.012)
                 * (1.0 + 0.3 * sin(t * 11.0));   // the wall itself shudders

    float sd = sdf_bubble_sphere(uv, center, radius);
    float interior = fvd_interior_mask(sd, thick);

    vec3 col = render_false_vacuum(uv, t);

    // The interior is "stuck" — wrongness pulses but stays bounded.
    float wrongness = 0.6 + 0.2 * sin(t * 0.7);
    vec3 inside = translate_scene(col, uv, center, interior, t, wrongness);
    col = mix(col, inside, interior);

    // Wall flares brighter on the flicker peaks — energy sloshing at equilibrium.
    float surge = 0.5 + 0.5 * sin(t * 7.0);
    col += render_decay_front(sd, uv, center, radius, thick,
                              0.4 + 0.2 * surge, t) * (0.8 + 0.5 * surge);

    col = tonemap(col);
    fragColor = vec4(col, 1.0);
}

#ifdef FVD_STANDALONE
out vec4 fvd_fragColor;
void main() { mainImage(fvd_fragColor, gl_FragCoord.xy); }
#endif
