// =============================================================================
// reverse.frag  —  the false vacuum reclaims. (compositing mode 4)
// -----------------------------------------------------------------------------
// AUDIT NOTE: README.md > Compositing Modes lists five modes, but the original
// file tree only shipped three composites + a stalled demo. This is mode 4:
// time-reversed decay. The true-vacuum bubble *shrinks*, the wall implodes, and
// normal physics floods back in behind it. Physically dubious (the true vacuum
// is lower energy, so this won't happen spontaneously) but a great "undo the
// apocalypse" rewind beat.
//
// Implemented as full_screen run with a collapsing radius and an inward-licking
// front. The interior heals back into the original scene as the wall passes.
//
// Build: the core library is prepended via these includes (tools/build.mjs).
// =============================================================================
#include "core/common.glsl"
#include "core/bubble_geometry.glsl"
#include "core/decay_front.glsl"
#include "core/true_vacuum.glsl"

vec3 render_false_vacuum(vec2 uv, float t) {
    vec3 sky = mix(vec3(0.02, 0.03, 0.06), vec3(0.05, 0.04, 0.10),
                   fbm(uv * 2.0 + t * 0.02, 4));
    sky += vec3(pow(hash21(floor(uv * 600.0)), 60.0));
    return sky;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fvd_uv(fragCoord, iResolution.xy);
    float t = iTime;
    float aspect = iResolution.x / min(iResolution.x, iResolution.y);
    vec2 center = vec2(aspect * 0.5, 0.5);

    // Start fully consumed, collapse to nothing over ~8s, then loop.
    float cycle = mod(t, 8.0);
    float rmax  = 0.9;
    float radius = rmax * (1.0 - smoothstep(0.0, 8.0, cycle)); // shrink
    float thick  = max(0.05 * max(radius, 0.05), 0.01);

    float sd = sdf_bubble_sphere(uv, center, radius);
    float interior = fvd_interior_mask(sd, thick);

    vec3 scene = render_false_vacuum(uv, t);

    // Interior wrongness DECREASES over the cycle — reality is healing.
    float wrongness = 0.9 * sat(radius / rmax);
    vec3 inside = translate_scene(scene, uv, center, interior, t, wrongness);
    vec3 col = mix(scene, inside, interior);

    // The imploding wall: still bright, but cooler (energy is being re-absorbed).
    col += render_decay_front(sd, uv, center, max(radius, 0.05), thick, 0.25, -t);

    col = tonemap(col);
    fragColor = vec4(col, 1.0);
}

#ifdef FVD_STANDALONE
out vec4 fvd_fragColor;
void main() { mainImage(fvd_fragColor, gl_FragCoord.xy); }
#endif
