// =============================================================================
// regl — the smallest possible host for the false-vacuum-decay finisher.
// -----------------------------------------------------------------------------
// One fullscreen draw. No scene texture (procedural false vacuum); swap the
// `render_false_vacuum` body for a `texture2D(uScene, uv)` to eat a real frame.
//
//   <script src="https://unpkg.com/regl/dist/regl.min.js"></script>
//   <script type="module" src="finisher.js"></script>
//
// Move the mouse to relocate the nucleation point.
// =============================================================================

const regl = window.createREGL({ extensions: [] });

const mouse = { x: 0.5, y: 0.5, down: 0 };
window.addEventListener("pointermove", (e) => {
  mouse.x = e.clientX / window.innerWidth;
  mouse.y = 1.0 - e.clientY / window.innerHeight;
});
window.addEventListener("pointerdown", () => (mouse.down = 1));
window.addEventListener("pointerup", () => (mouse.down = 0));

const draw = regl({
  vert: `
    precision highp float;
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `,
  frag: `
    precision highp float;
    uniform vec2  uResolution;
    uniform float uTime;
    uniform vec2  uMouse;
    uniform float uMouseDown;

    #define PI 3.14159265
    float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
      return mix(mix(hash21(i),hash21(i+vec2(1,0)),u.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),u.x),u.y); }
    float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.; a*=.5;} return s; }
    float ridged(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ float n=1.-abs(2.*vnoise(p)-1.); s+=a*n*n; p*=2.; a*=.5;} return s; }
    vec3 hueRot(vec3 c,float a){ vec3 k=vec3(.57735); float co=cos(a),si=sin(a); return c*co+cross(k,c)*si+k*dot(k,c)*(1.-co); }
    vec3 plasma(float t){ t=clamp(t,0.,1.);
      vec3 e=vec3(.35,.04,.02),o=vec3(1.,.45,.1),w=vec3(1.,.95,.9),b=vec3(.55,.75,1.),v=vec3(.65,.4,1.);
      if(t<.25)return mix(e,o,t/.25); if(t<.55)return mix(o,w,(t-.25)/.3);
      if(t<.8)return mix(w,b,(t-.55)/.25); return mix(b,v,(t-.8)/.2); }
    vec3 tonemap(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }

    // swap this for a scene texture sample to use as a true finisher
    vec3 render_false_vacuum(vec2 uv, float t){
      vec3 c=mix(vec3(.02,.03,.06),vec3(.05,.04,.10),fbm(uv*2.+t*.02));
      return c+vec3(pow(hash21(floor(uv*600.)),60.));
    }

    void main(){
      vec2 res=uResolution;
      vec2 uv=gl_FragCoord.xy/min(res.x,res.y);
      float aspect=res.x/min(res.x,res.y);
      float t=uTime;
      vec2 center=(uMouseDown>0.)? vec2(uMouse.x*aspect,uMouse.y) : vec2(aspect*.5,.5);

      float radius=sqrt(.0004+pow(.12*t,2.));
      float thick=max(.04*radius,.01);
      float d=length(uv-center)-radius;
      float interior=smoothstep(thick*.5,-thick*.5,d);

      vec3 col=render_false_vacuum(uv,t);
      float luma=dot(col,vec3(.299,.587,.114));
      vec3 inside=hueRot(1.-col,interior*PI);
      float q=mix(32.,5.,interior);
      inside*=floor(luma*q)/q/max(luma,1e-3);
      col=mix(col,inside,interior);

      float x=d/max(thick*.5,1e-4);
      float lum=exp(-x*x*4.)+.6*exp(x*6.)*step(x,0.)+.4*exp(-x*2.5)*step(0.,x);
      float ang=atan(uv.y-center.y,uv.x-center.x);
      lum*=.55+.9*ridged(vec2(ang*(3.+radius*8.),length(uv-center)*12.)-vec2(0.,t*1.5));
      col+=plasma(clamp(.4+exp(-x*x*4.)*.5,0.,1.))*lum*2.2*(.8+.6*radius);

      gl_FragColor=vec4(tonemap(col),1.);
    }
  `,
  // nested vec2s so regl infers size:2; a flat array would default to size:1
  attributes: { position: [[-1, -1], [3, -1], [-1, 3]] },
  uniforms: {
    uResolution: ({ viewportWidth, viewportHeight }) => [viewportWidth, viewportHeight],
    uTime: ({ time }) => time,
    uMouse: () => [mouse.x, mouse.y],
    uMouseDown: () => mouse.down,
  },
  count: 3,
});

regl.frame(() => {
  regl.clear({ color: [0, 0, 0, 1], depth: 1 });
  draw();
});
