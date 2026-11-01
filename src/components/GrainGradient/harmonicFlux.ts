// Adapted from Alembic Harmonic Flux.
// Reference: https://alembic.space/ (inspected 2026-11-01).
export const harmonicFluxFragment = /* glsl */ `
// The hash multiplies intermediate values into the thousands. On mobile
// mediump (often float16), fract() then loses all fractional bits and the
// grain collapses into a repeated grid. Keep hash and UV math in highp.
precision highp float;
varying highp vec2 vUv;
uniform float time;
uniform float speed;
uniform float distortion;
uniform float grainMixer;
uniform float grainOverlay;
uniform float swirlMode;
uniform float viewAngle;
uniform vec2 resolution;

uniform vec3 c1, c2, c3, c4, c5, c6;

float qHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float vNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(qHash(i), qHash(i + vec2(1.0, 0.0)), f.x),
               mix(qHash(i + vec2(0.0, 1.0)), qHash(i + vec2(1.0, 1.0)), f.x), f.y);
}

mat2 rot(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c);
}

void main() {
    vec2 p = vUv - 0.5;
    p = rot(viewAngle * 6.28318) * p;
    p.x *= resolution.x / resolution.y;
    vec2 uv = p + 0.5;
    float t = time * speed;

    float n = vNoise(uv * 3.0 + t * 0.1);
    for(float i = 1.0; i <= 3.0; i++) {
        uv.x += (distortion / i) * sin(t * 0.4 + i * uv.y * 2.5 + n);
        uv.y += (distortion / i) * cos(t * 0.2 + i * uv.x * 2.1 + n);
    }

    vec3 finalCol = vec3(0.0);
    float totalW = 0.0;
    float mixer = (qHash(vUv * 1000.0) - 0.5) * grainMixer;


    vec3 colors[6]; colors[0]=c1; colors[1]=c2; colors[2]=c3; colors[3]=c4; colors[4]=c5; colors[5]=c6;

    for(int i = 0; i < 6; i++) {
        float fi = float(i);

        vec2 pos = vec2(
            0.5 + 0.4 * sin(t * (0.15 + fi * 0.08) + fi * 2.0),
            0.5 + 0.4 * cos(t * (0.1 + fi * 0.12) + fi * 1.3)
        );


        if (swirlMode > 0.5) {
            pos = rot(t * 0.4 + fi * 0.2) * (pos - 0.5) + 0.5;
        }

        pos += mixer;

        float d = length(uv - pos);

        float weight = 1.0 / (pow(d, 4.2) + 0.002);
        finalCol += colors[i] * weight;
        totalW += weight;
    }

    finalCol /= totalW;

    vec2 grainCoord = floor(vUv * resolution.xy + fract(time));
    float grain = qHash(grainCoord + fract(time));
    float luma = dot(finalCol, vec3(0.2126, 0.7152, 0.0722));


    vec3 grainBody = finalCol * (0.88 + grain * 0.24);
    finalCol = mix(finalCol, grainBody, grainOverlay * (1.5 - luma));

    gl_FragColor = vec4(finalCol, 1.0);
}
`;
