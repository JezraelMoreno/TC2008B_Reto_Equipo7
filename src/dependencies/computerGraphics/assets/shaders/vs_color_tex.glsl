#version 300 es
precision highp float;

in vec4 a_position;
in vec3 a_normal;
in vec2 a_texCoord;

uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;
uniform mat4 u_world;

out vec3 v_normal;
out vec2 v_texCoord;
out vec3 v_worldPos;

void main() {
    vec4 worldPos = u_world * a_position;
    gl_Position = u_worldViewProjection * a_position;
    v_normal = mat3(u_worldInverseTranspose) * a_normal;
    v_texCoord = a_texCoord;
    v_worldPos = worldPos.xyz;
}
