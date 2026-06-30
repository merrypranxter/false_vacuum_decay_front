// =============================================================================
// Godot 4 — false-vacuum-decay finisher (canvas_item shader)
// -----------------------------------------------------------------------------
// Attach to a full-rect ColorRect placed over your scene, OR use as a
// CanvasItem material with screen_texture for a true post-process.
//
// Setup:
//   1. Add a ColorRect, anchor it full-rect (Layout > Full Rect).
//   2. Create a new ShaderMaterial, paste this in.
//   3. Drive the params from a script (see _process below the shader).
//
// Godot notes: UV is top-left origin (0..1), TIME is seconds, COLOR is output.
// SCREEN_TEXTURE/screen_uv give you the scene beneath for the post-process path.
// =============================================================================
shader_type canvas_item;

uniform vec2  bubble_center      = vec2(0.5, 0.5);
uniform float bubble_radius      = 0.0;
uniform float wall_thickness     = 0.04;
uniform float wall_temperature   = 0.5;
uniform float interior_wrongness = 0.85;
uniform vec2  resolution         = vec2(1920.0, 1080.0);
uniform sampler2D scene_tex : hint_screen_texture, filter_linear;

const float PI = 3.14159265;

float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1,0)), u.x),
               mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), u.x), u.y);
}
float ridged(vec2 p){
    float s = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { float n = 1.0 - abs(2.0 * vnoise(p) - 1.0); s += a * n * n; p *= 2.0; a *= 0.5; }
    return s;
}
vec3 hue_rot(vec3 c, float a){
    vec3 k = vec3(0.57735); float co = cos(a); float si = sin(a);
    return c * co + cross(k, c) * si + k * dot(k, c) * (1.0 - co);
}
vec3 plasma(float t){
    t = clamp(t, 0.0, 1.0);
    vec3 e = vec3(0.35,0.04,0.02), o = vec3(1.0,0.45,0.1), w = vec3(1.0,0.95,0.9), b = vec3(0.55,0.75,1.0), v = vec3(0.65,0.4,1.0);
    if (t < 0.25) { return mix(e, o, t / 0.25); }
    if (t < 0.55) { return mix(o, w, (t - 0.25) / 0.3); }
    if (t < 0.80) { return mix(w, b, (t - 0.55) / 0.25); }
    return mix(b, v, (t - 0.8) / 0.2);
}

void fragment() {
    float aspect = resolution.x / min(resolution.x, resolution.y);
    // Godot UV is y-down; flip so the math matches the rest of the repo.
    vec2 uv = vec2(UV.x * aspect, 1.0 - UV.y);
    vec2 center = vec2(bubble_center.x * aspect, bubble_center.y);

    vec3 scene = texture(scene_tex, SCREEN_UV).rgb;

    float d = length(uv - center) - bubble_radius;
    float thick = max(wall_thickness, 0.004);
    float interior = smoothstep(thick * 0.5, -thick * 0.5, d);
    float luma = dot(scene, vec3(0.299, 0.587, 0.114));

    vec3 inside = hue_rot(mix(scene, vec3(1.0) - scene, interior_wrongness), interior * PI);
    float q = mix(32.0, 5.0, interior_wrongness * interior);
    inside *= floor(luma * q) / q / max(luma, 1e-3);
    vec3 col = mix(scene, inside, interior);

    float x = d / max(thick * 0.5, 1e-4);
    float lum = exp(-x * x * 4.0) + 0.6 * exp(x * 6.0) * step(x, 0.0) + 0.4 * exp(-x * 2.5) * step(0.0, x);
    float ang = atan(uv.y - center.y, uv.x - center.x);
    lum *= 0.55 + 0.9 * ridged(vec2(ang * (3.0 + bubble_radius * 8.0), length(uv - center) * 12.0) - vec2(0.0, TIME * 1.5));
    col += plasma(clamp(0.4 + exp(-x * x * 4.0) * 0.5 + 0.15 * wall_temperature, 0.0, 1.0)) * lum * 2.2 * (0.8 + 0.6 * bubble_radius);

    COLOR = vec4(col, 1.0);
}

// -----------------------------------------------------------------------------
// Driver script (GDScript) — attach to the ColorRect:
//
//   extends ColorRect
//   var t := 0.0
//   func _process(delta):
//       t += delta
//       var rate := 0.12
//       var r := sqrt(0.02*0.02 + pow(rate*t, 2.0))
//       material.set_shader_parameter("bubble_radius", r)
//       material.set_shader_parameter("wall_thickness", max(0.04*r, 0.01))
//       material.set_shader_parameter("resolution", get_viewport_rect().size)
// -----------------------------------------------------------------------------
