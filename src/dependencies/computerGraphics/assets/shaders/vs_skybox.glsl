#version 300 es
precision highp float;

// Skybox vertex shader: pass clip-space coords to compute lookup direction
in vec2 a_position;

out vec4 v_position;

void main() {
    v_position = vec4(a_position, 1.0, 1.0);
    gl_Position = vec4(a_position, 1.0, 1.0);
}
