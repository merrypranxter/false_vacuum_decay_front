// =============================================================================
// multi_bubble.frag  —  several decay fronts collide and interfere.
// -----------------------------------------------------------------------------
// Compositing mode 3. Multiple nucleation sites, each a Coleman-De Luccia bubble
// born at a different time. Their walls merge via a smooth-union SDF; where two
// fronts collide the released energy constructively spikes (a collision flare).
//
// Build: the core library is prepended via these includes (tools/build.mjs).
// =============================================================================
#include "core/common.glsl"
#include "core/bubble_geometry.glsl"
#include "core/decay_front.glsl"
#include "core/true_vacuum.glsl"

const int N_BUBBLES = 4;

vec3 render_false_vacuum(vec2 uv, float t) {
    vec3 sky = mix(vec3(0.02, 0.02, 0.05), vec3(0.05, 0.04, 0.09),
                   fbm(uv * 2.0 + t * 0.02, 4));
    sky += vec3(pow(hash21(floor(uv * 550.0)), 55.0));
    return sky;
}

// per-bubble parameters, pseudo-randomized from an index
void bubble_params(int i, float aspect, out vec2 c, out float birth) {
    float fi = float(i);
    c = vec2(aspect * (0.2 + 0.6 * hash11(fi + 0.1)),
                       (0.2 + 0.6 * hash11(fi + 7.3)));
    birth = 1.5 * fi;             // staggered nucleation times
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fvd_uv(fragCoord, iResolution.xy);
    float t = iTime;
    float aspect = iResolution.x / min(iResolution.x, iResolution.y);

    // Accumulate the merged field and the brightest individual wall.
    float merged_sd = 1e9;
    float prev_sd   = 1e9;
    vec3  walls = vec3(0.0);
    float collision = 0.0;

    for (int i = 0; i < N_BUBBLES; i++) {
        vec2 c; float birth;
        bubble_params(i, aspect, c, birth);
        float age = max(t - birth, 0.0);
        float radius = fvd_radius_at(age, 0.015, 0.05);
        float thick  = max(0.05 * radius, 0.008);

        float sd = sdf_bubble_sphere(uv, c, radius);
        walls += render_decay_front(sd, uv, c, radius, thick, 0.5, t);

        // collision detector: two walls near zero at the same pixel
        if (i > 0) {
            float overlap = (1.0 - sat(abs(sd) / thick)) *
                            (1.0 - sat(abs(prev_sd) / thick));
            collision += overlap;
        }
        prev_sd = sd;

        merged_sd = sdf_smooth_union(merged_sd, sd, 0.06);
    }

    float interior = fvd_interior_mask(merged_sd, 0.04);

    vec3 col = render_false_vacuum(uv, t);
    vec3 inside = translate_scene(col, uv, vec2(aspect * 0.5, 0.5),
                                  interior, t, 0.8);
    col = mix(col, inside, interior);

    col += walls;
    // collision flare: constructive interference dumps extra energy
    col += plasma_ramp(0.95, 0.6) * sat(collision) * 3.0;

    col = tonemap(col);
    fragColor = vec4(col, 1.0);
}

#ifdef FVD_STANDALONE
out vec4 fvd_fragColor;
void main() { mainImage(fvd_fragColor, gl_FragCoord.xy); }
#endif
