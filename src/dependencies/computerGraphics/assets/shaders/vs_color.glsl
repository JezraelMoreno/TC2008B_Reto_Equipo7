#version 300 es
in vec4 a_position;
in vec3 a_normal;
in vec4 a_color;

uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;
uniform vec4 u_color;
uniform float u_vertexColorMix;

out vec4 v_color;
out vec3 v_normal;

void main() {
    gl_Position = u_worldViewProjection * a_position;
    v_color = mix(u_color, a_color * u_color, u_vertexColorMix);
    v_normal = mat3(u_worldInverseTranspose) * a_normal;
}
