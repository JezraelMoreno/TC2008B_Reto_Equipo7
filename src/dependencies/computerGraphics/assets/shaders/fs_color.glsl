#version 300 es
precision highp float;

in vec4 v_color;
in vec3 v_normal;

uniform vec3 u_lightDirection;   // Dirección desde la luz hacia la escena
uniform vec3 u_ambient;          // Componente ambiental (RGB)

out vec4 outColor;

void main() {
    vec3 normal = normalize(v_normal);
    float light = max(dot(normal, -u_lightDirection), 0.0);

    vec3 diffuse = v_color.rgb * light;
    vec3 ambient = v_color.rgb * u_ambient;

    outColor = vec4(diffuse + ambient, v_color.a);
}
