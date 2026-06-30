// =============================================================================
// pip_nucleation.frag  —  a small bubble nucleates and grows.
// -----------------------------------------------------------------------------
// Compositing mode 2 (picture-in-picture). The scene stays mostly intact while
// a small bubble is born off-center, flashes at nucleation, and slowly creeps
// outward. Good as a "something is wrong in the corner" tension beat before the
// full_screen finisher takes over.
//
// Build: the core library is prepended via these includes (tools/build.mjs).
// =============================================================================
#include "core/common.glsl"
#include "core/bubble_geometry.glsl"
#include "core/decay_front.glsl"
#include "core/true_vacuum.glsl"

vec3 render_false_vacuum(vec2 uv, float t) {
    vec3 sky = mix(vec3(0.03, 0.04, 0.07), vec3(0.06, 0.05, 0.11),
                   fbm(uv * 2.5 - t * 0.03, 4));
    float stars = pow(hash21(floor(uv * 500.0)), 50.0);
    sky += vec3(stars);
    return sky;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fvd_uv(fragCoord, iResolution.xy);
    float t = iTime;
    float aspect = iResolution.x / min(iResolution.x, iResolution.y);

    // Nucleate off-center, lower-right-ish.
    vec2 center = vec2(aspect * 0.68, 0.38);

    // Loop the birth every ~9s so the demo keeps re-nucleating.
    float age = mod(t, 9.0);

    // Relativistic growth, but capped small so it stays "picture-in-picture".
    float radius = min(fvd_radius_at(age, 0.015, 0.06), 0.32);
    float thick  = max(0.06 * radius, 0.008);

    float sd = sdf_bubble_sphere(uv, center, radius);
    float interior = fvd_interior_mask(sd, thick);

    vec3 col = render_false_vacuum(uv, t);

    // interior translation
    vec3 inside = translate_scene(col, uv, center, interior, t, 0.9);
    col = mix(col, inside, interior);

    // wall + a bright flash in the first instant of nucleation
    col += render_decay_front(sd, uv, center, radius, thick, 0.55, t);
    col += nucleation_flash(sd, thick * 4.0, age, 0.6);

    col = tonemap(col);
    fragColor = vec4(col, 1.0);
}

#ifdef FVD_STANDALONE
out vec4 fvd_fragColor;
void main() { mainImage(fvd_fragColor, gl_FragCoord.xy); }
#endif
