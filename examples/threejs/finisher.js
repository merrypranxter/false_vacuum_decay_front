// =============================================================================
// three.js integration — false-vacuum-decay as a fullscreen post-process.
// -----------------------------------------------------------------------------
// Renders your scene into a render target, then runs a fullscreen pass that
// feeds the scene texture into the finisher as `original_color`.
//
//   import { FalseVacuumPass } from "./finisher.js";
//   const fv = new FalseVacuumPass(renderer, scene, camera);
//   // in your loop, instead of renderer.render(scene, camera):
//   fv.render(dt);
//   fv.nucleate(0.42, 0.55);   // optional: re-nucleate at uv (x,y)
//
// Requires three.js r150+. The finisher fragment is inlined below so this file
// is self-contained; in a real project you'd flatten the repo shaders with
// `node tools/build.mjs` and import the string instead.
// =============================================================================

import * as THREE from "three";

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// Compact finisher: translate the incoming scene texture + draw the wall.
// (Mirrors translate_scene + render_decay_front from the repo core.)
const FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tScene;
  uniform vec3  iResolution;
  uniform float iTime;
  uniform vec2  bubble_center;
  uniform float bubble_radius;
  uniform float wall_thickness;
  uniform float wall_temperature;
  uniform float interior_wrongness;

  #define PI 3.14159265
  float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
    return mix(mix(hash21(i),hash21(i+vec2(1,0)),u.x),
               mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),u.x),u.y); }
  float ridged(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ float n=1.-abs(2.*vnoise(p)-1.); s+=a*n*n; p*=2.; a*=.5; } return s; }
  vec3 hueRot(vec3 c,float a){ vec3 k=vec3(.57735); float co=cos(a),si=sin(a);
    return c*co+cross(k,c)*si+k*dot(k,c)*(1.-co); }
  vec3 plasma(float t){ t=clamp(t,0.,1.);
    vec3 e=vec3(.35,.04,.02),o=vec3(1.,.45,.1),w=vec3(1.,.95,.9),b=vec3(.55,.75,1.),v=vec3(.65,.4,1.);
    if(t<.25)return mix(e,o,t/.25); if(t<.55)return mix(o,w,(t-.25)/.3);
    if(t<.8)return mix(w,b,(t-.55)/.25); return mix(b,v,(t-.8)/.2); }

  void main(){
    float aspect = iResolution.x / min(iResolution.x, iResolution.y);
    vec2 uv = vec2(vUv.x * aspect, vUv.y);
    vec2 center = vec2(bubble_center.x * aspect, bubble_center.y);

    vec3 scene = texture2D(tScene, vUv).rgb;

    float d = length(uv - center) - bubble_radius;
    float thick = max(wall_thickness, 0.004);
    float interior = smoothstep(thick*0.5, -thick*0.5, d);
    float luma = dot(scene, vec3(0.299,0.587,0.114));

    // translated interior
    vec3 inside = hueRot(mix(scene, 1.0-scene, interior_wrongness), interior*PI);
    float q = mix(32.0, 5.0, interior_wrongness*interior);
    inside *= floor(luma*q)/q / max(luma,1e-3);
    vec3 col = mix(scene, inside, interior);

    // wall
    float x = d/max(thick*0.5,1e-4);
    float lum = exp(-x*x*4.0) + 0.6*exp(x*6.0)*step(x,0.0) + 0.4*exp(-x*2.5)*step(0.0,x);
    float ang = atan(uv.y-center.y, uv.x-center.x);
    lum *= 0.55 + 0.9*ridged(vec2(ang*(3.0+bubble_radius*8.0), length(uv-center)*12.0) - vec2(0.0,iTime*1.5));
    col += plasma(clamp(0.4+exp(-x*x*4.0)*0.5+0.15*wall_temperature,0.,1.)) * lum * 2.2 * (0.8+0.6*bubble_radius);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export class FalseVacuumPass {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.t0 = performance.now();

    const size = new THREE.Vector2();
    renderer.getSize(size);
    const dpr = renderer.getPixelRatio();
    this.target = new THREE.WebGLRenderTarget(size.x * dpr, size.y * dpr, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    });

    this.uniforms = {
      tScene:               { value: this.target.texture },
      iResolution:          { value: new THREE.Vector3(size.x * dpr, size.y * dpr, 1) },
      iTime:                { value: 0 },
      bubble_center:        { value: new THREE.Vector2(0.5, 0.5) },
      bubble_radius:        { value: 0.0 },
      wall_thickness:       { value: 0.04 },
      wall_temperature:     { value: 0.5 },
      interior_wrongness:   { value: 0.85 },
      expansion_rate:       { value: 0.12 },
    };

    this.fsScene = new THREE.Scene();
    this.fsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.uniforms })
    );
    this.fsScene.add(quad);
  }

  nucleate(x = 0.5, y = 0.5) {
    this.uniforms.bubble_center.value.set(x, y);
    this.t0 = performance.now();
  }

  setSize(w, h) {
    const dpr = this.renderer.getPixelRatio();
    this.target.setSize(w * dpr, h * dpr);
    this.uniforms.iResolution.value.set(w * dpr, h * dpr, 1);
  }

  render() {
    const t = (performance.now() - this.t0) / 1000;
    this.uniforms.iTime.value = t;
    // relativistic radius: sqrt(r0^2 + (rate*t)^2)
    const r0 = 0.02, rate = this.uniforms.expansion_rate.value;
    this.uniforms.bubble_radius.value = Math.sqrt(r0 * r0 + (rate * t) ** 2);
    this.uniforms.wall_thickness.value = Math.max(0.04 * this.uniforms.bubble_radius.value, 0.01);

    // 1. render the real scene into the target
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(this.scene, this.camera);

    // 2. run the finisher to the screen
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.fsScene, this.fsCamera);
  }
}
