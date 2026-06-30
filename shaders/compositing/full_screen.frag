// =============================================================================
// full_screen.frag  —  the bubble consumes the entire viewport.
// -----------------------------------------------------------------------------
// Compositing mode 1. A standalone finisher: nucleate at bubble_center and let
// the front swallow the screen. Includes the exterior PRECURSOR effects the
// README asks for (vacuum fluctuations, approaching-wall redshift / pre-heat).
//
// Convention: Shadertoy-style. Provide iResolution, iTime, iMouse; the host (or
// tools/build.mjs) prepends the core includes below. Set the uniform contract
// from common.glsl, or rely on the fallbacks here.
//
// Build: the core library is prepended via these includes (tools/build.mjs).
// =============================================================================
#include "core/common.glsl"
#include "core/bubble_geometry.glsl"
#include "core/decay_front.glsl"
#include "core/true_vacuum.glsl"

// ---- A throwaway "false vacuum" scene so the finisher shows something to eat.
// Replace render_false_vacuum() with your own scene / input texture sample.
vec3 render_false_vacuum(vec2 uv, float t) {
    // a calm starfield + soft nebula: the universe, oblivious
    vec3 sky = mix(vec3(0.02, 0.03, 0.06), vec3(0.05, 0.04, 0.10),
                   fbm(uv * 2.0 + t * 0.02, 4));
    float stars = pow(hash21(floor(uv * 600.0)), 60.0);
    sky += vec3(stars) * (0.6 + 0.4 * sin(t * 3.0 + uv.x * 50.0));
    return sky;
}

// ---- Precursor effects in the false vacuum, ahead of the wall.
// `sd` is signed distance to the wall (positive = outside). Closer = stronger.
vec3 precursors(vec3 scene, vec2 uv, vec2 center, float sd,
                float thickness, float t, float intensity) {
    // proximity 0..1, only within a few wall-thicknesses ahead of the front
    float reach = thickness * 6.0;
    float prox = sat(1.0 - sd / reach) * step(0.0, sd);

    // 1. vacuum fluctuations: faint boiling noise that intensifies near the wall
    float flux = fbm(uv * 30.0 + t * 2.0, 4) - 0.5;
    scene += vec3(0.15, 0.18, 0.25) * flux * prox * intensity;

    // 2. gravitational redshift: light from beyond is stretched toward red as
    //    space is consumed — desaturate + push hue warm near the front.
    float luma = dot(scene, vec3(0.299, 0.587, 0.114));
    vec3 redshifted = mix(scene, vec3(luma) * vec3(1.3, 0.7, 0.5), prox * 0.8);
    scene = mix(scene, redshifted, intensity);

    // 3. pre-heat glow: the very edge already simmers
    scene += plasma_ramp(0.15, 0.0) * pow(prox, 3.0) * 0.6 * intensity;
    return scene;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fvd_uv(fragCoord, iResolution.xy);
    float t = iTime;

    // Drive the bubble. If a host bound bubble_radius we use it; else integrate
    // a relativistic radius from time. Center follows the mouse if present.
    vec2 center = (iMouse.z > 0.0)
        ? fvd_uv(iMouse.xy, iResolution.xy)
        : vec2(0.5 * iResolution.x / min(iResolution.x, iResolution.y), 0.5);
    float r0   = 0.02;
    float rate = 0.12;
    float radius = fvd_radius_at(t, r0, rate);
    float thick  = max(0.04 * radius, 0.01);   // wall ~ a few % of radius

    float sd = sdf_bubble_sphere(uv, center, radius);
    float interior = fvd_interior_mask(sd, thick);

    // Base zone color.
    vec3 col = render_false_vacuum(uv, t);
    col = precursors(col, uv, center, sd, thick, t, 0.8);

    // Translate the exterior scene into the interior (re-encoded reality).
    vec3 inside = translate_scene(col, uv, center, interior, t, 0.85);
    col = mix(col, inside, interior);

    // Add the wall emission on top of everything.
    col += render_decay_front(sd, uv, center, radius, thick, 0.5, t);

    col = tonemap(col);
    fragColor = vec4(col, 1.0);
}

// ---- Entry point shim for plain WebGL (non-Shadertoy) hosts. -----------------
// The web demo defines iResolution/iTime/iMouse as uniforms and calls mainImage.
#ifdef FVD_STANDALONE
out vec4 fvd_fragColor;
void main() { mainImage(fvd_fragColor, gl_FragCoord.xy); }
#endif
