// =============================================================================
// universe_death.frag  —  the full cosmic apocalypse.
// -----------------------------------------------------------------------------
// The showpiece. A populated cosmos — stars, a galactic band, drifting dust —
// nucleates a single bubble that grows relativistically until it swallows the
// whole sky. Watch the redshift precursor race ahead of the wall, the white-hot
// front, and the translated interior left behind.
//
// Build: the core library is prepended via these includes (tools/build.mjs).
// =============================================================================
#include "core/common.glsl"
#include "core/bubble_geometry.glsl"
#include "core/decay_front.glsl"
#include "core/true_vacuum.glsl"

// A richer "scene" than the compositing stubs: layered starfields + a milky band.
vec3 cosmos(vec2 uv, float t) {
    vec3 col = vec3(0.01, 0.012, 0.02);

    // nebular dust band across the middle
    float band = exp(-pow((uv.y - 0.5) * 4.0, 2.0));
    float dust = fbm(uv * vec2(3.0, 6.0) + vec2(t * 0.01, 0.0), 6);
    col += mix(vec3(0.06, 0.03, 0.10), vec3(0.10, 0.07, 0.14), dust) * band * 0.8;

    // three star layers at different densities/brightness for parallax depth
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float scale = 300.0 + fi * 350.0;
        vec2 g = floor(uv * scale);
        float s = pow(hash21(g + fi * 13.0), 70.0 - fi * 10.0);
        float tw = 0.7 + 0.3 * sin(t * (2.0 + fi) + hash21(g) * TAU);
        vec3 tint = mix(vec3(1.0, 0.9, 0.8), vec3(0.8, 0.9, 1.0), hash21(g + 5.0));
        col += s * tw * tint * (1.0 - fi * 0.25);
    }
    return col;
}

vec3 render_false_vacuum(vec2 uv, float t) { return cosmos(uv, t); }

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fvd_uv(fragCoord, iResolution.xy);
    float t = iTime;
    float aspect = iResolution.x / min(iResolution.x, iResolution.y);

    // Nucleate slightly off-center for drama; grow over a ~16s cycle then loop.
    vec2 center = vec2(aspect * 0.42, 0.55);
    float age = mod(t, 16.0);
    float radius = fvd_radius_at(age, 0.01, 0.11);
    float thick  = max(0.035 * radius, 0.008);

    float sd = sdf_bubble_sphere(uv, center, radius);
    float interior = fvd_interior_mask(sd, thick);

    vec3 col = cosmos(uv, t);

    // precursor redshift ahead of the wall
    float reach = thick * 8.0;
    float prox = sat(1.0 - sd / reach) * step(0.0, sd);
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(luma) * vec3(1.4, 0.6, 0.45), prox * 0.85);

    // translated interior
    vec3 inside = translate_scene(col, uv, center, interior, t, 0.9);
    col = mix(col, inside, interior);

    // the front
    col += render_decay_front(sd, uv, center, radius, thick, 0.5, t);
    col += nucleation_flash(sd, thick * 3.0, age, 0.7);

    // a slow vignette so the eye stays on the front
    float vig = 1.0 - 0.25 * length((uv - center));
    col *= vig;

    col = tonemap(col);
    fragColor = vec4(col, 1.0);
}

#ifdef FVD_STANDALONE
out vec4 fvd_fragColor;
void main() { mainImage(fvd_fragColor, gl_FragCoord.xy); }
#endif
