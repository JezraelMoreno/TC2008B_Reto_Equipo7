#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_texCoord;

uniform vec3 u_lightDirection;
uniform vec3 u_ambient;
uniform vec3 u_emissive;
uniform sampler2D u_texture;

out vec4 outColor;

void main() {
    vec3 normal = normalize(v_normal);
    float light = max(dot(normal, -u_lightDirection), 0.0);

    vec4 texColor = texture(u_texture, v_texCoord);
    vec3 diffuse = texColor.rgb * light;
    vec3 ambient = texColor.rgb * u_ambient;

    outColor = vec4(diffuse + ambient + u_emissive, texColor.a);
}
