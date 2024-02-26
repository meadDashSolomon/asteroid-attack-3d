uniform float uTime;

varying vec2 vUv;

void main()
{
    vec3 pos = position;

    // Distortion
    pos.x += sin(pos.y * 0.5 + uTime * 0.5) * 2.0;
    pos.y += cos(pos.x * 0.5 + uTime * 0.5) * 2.0;

    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;

    vUv = uv;
}