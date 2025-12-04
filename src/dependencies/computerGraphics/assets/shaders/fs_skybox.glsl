#version 300 es
precision highp float;

// Skybox fragment shader: sample the cubemap using the view direction
in vec4 v_position;

uniform samplerCube u_skybox;
uniform mat4 u_viewDirectionProjectionInverse;

out vec4 outColor;

void main() {
    vec4 t = u_viewDirectionProjectionInverse * v_position;
    vec3 direction = normalize(t.xyz / t.w);
    outColor = texture(u_skybox, direction);
}
