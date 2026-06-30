// =============================================================================
// false_vacuum_decay_front — Shadertoy single-file drop-in
// -----------------------------------------------------------------------------
// Paste this whole file into a new shader on https://www.shadertoy.com.
// Self-contained (no #include): a compact distillation of the full repo so you
// can see the effect in ~10 seconds. Click+drag to move the nucleation point.
//
// For the full, modular version (precursors, multi-bubble, alien interior, etc.)
// flatten the real shaders: `node tools/build.mjs shaders/demo/universe_death.frag`.
// =============================================================================

#define PI 3.14159265

float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.-2.*f);
  float a=hash21(i),b=hash21(i+vec2(1,0)),c=hash21(i+vec2(0,1)),d=hash21(i+vec2(1,1));
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }
float fbm(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.; a*=.5; } return s; }
float ridged(vec2 p){ float s=0.,a=.5; for(int i=0;i<5;i++){ float n=1.-abs(2.*vnoise(p)-1.); s+=a*n*n; p*=2.; a*=.5; } return s; }
vec3 hueRot(vec3 c,float a){ vec3 k=vec3(.57735); float co=cos(a),si=sin(a);
  return c*co+cross(k,c)*si+k*dot(k,c)*(1.-co); }

// plasma ramp: ember -> orange -> white -> blue -> violet
vec3 plasma(float t){ t=clamp(t,0.,1.);
  vec3 e=vec3(.35,.04,.02),o=vec3(1.,.45,.1),w=vec3(1.,.95,.9),b=vec3(.55,.75,1.),v=vec3(.65,.4,1.);
  if(t<.25) return mix(e,o,t/.25);
  if(t<.55) return mix(o,w,(t-.25)/.3);
  if(t<.8)  return mix(w,b,(t-.55)/.25);
  return mix(b,v,(t-.8)/.2); }

vec3 tonemap(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }

void mainImage(out vec4 fragColor, in vec2 fragCoord){
  vec2 res=iResolution.xy;
  vec2 uv=fragCoord/min(res.x,res.y);
  float aspect=res.x/min(res.x,res.y);
  float t=iTime;

  vec2 center=(iMouse.z>0.)? iMouse.xy/min(res.x,res.y) : vec2(aspect*.5,.5);
  float radius=sqrt(.0004+pow(.12*t,2.));          // relativistic growth
  float thick=max(.04*radius,.01);

  float d=length(uv-center)-radius;                 // signed distance to wall
  float interior=smoothstep(thick*.5,-thick*.5,d);

  // --- false vacuum: a calm starfield ---
  vec3 col=mix(vec3(.02,.03,.06),vec3(.05,.04,.10),fbm(uv*2.+t*.02));
  col+=vec3(pow(hash21(floor(uv*600.)),60.));

  // precursor redshift ahead of the wall
  float prox=clamp(1.-d/(thick*8.),0.,1.)*step(0.,d);
  float luma=dot(col,vec3(.299,.587,.114));
  col=mix(col,vec3(luma)*vec3(1.4,.6,.45),prox*.8);

  // --- true vacuum: translated interior ---
  vec3 inside=hueRot(1.-col,interior*PI);           // inverted, hue-rotated
  float q=mix(32.,5.,interior);                      // re-encode banding
  inside*=floor(luma*q)/q/max(luma,1e-3);
  col=mix(col,inside,interior);

  // --- the wall ---
  float x=d/max(thick*.5,1e-4);
  float lum=exp(-x*x*4.)+.6*exp(x*6.)*step(x,0.)+.4*exp(-x*2.5)*step(0.,x);
  float ang=atan(uv.y-center.y,uv.x-center.x);
  lum*=.55+.9*ridged(vec2(ang*(3.+radius*8.),length(uv-center)*12.)-vec2(0.,t*1.5));
  col+=plasma(clamp(.4+exp(-x*x*4.)*.5,0.,1.))*lum*2.2*(.8+.6*radius);

  fragColor=vec4(tonemap(col),1.);
}
