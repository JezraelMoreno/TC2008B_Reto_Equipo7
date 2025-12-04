#version 300 es
precision highp float;

in vec3 v_normal;
in vec2 v_texCoord;
in vec3 v_worldPos;

uniform vec3 u_lightDirection;
uniform vec3 u_ambient;
uniform vec3 u_emissive;
uniform sampler2D u_texture;
uniform int u_pointLightCount;
uniform vec3 u_pointLightPos[64];
uniform vec3 u_pointLightColor[64];

out vec4 outColor;

void main() {
    vec4 texColor = texture(u_texture, v_texCoord);
    vec3 base = texColor.rgb;
    vec3 normal = normalize(v_normal);
    float dirLight = max(dot(normal, -u_lightDirection), 0.0);

    vec3 diffuse = base * dirLight;
    vec3 ambient = base * u_ambient;

    const int MAX_LIGHTS = 64;
    for (int i = 0; i < MAX_LIGHTS; ++i) {
        if (i >= u_pointLightCount) break;
        vec3 L = u_pointLightPos[i] - v_worldPos;
        float dist = length(L);
        vec3 lightDir = dist > 0.0001 ? L / dist : vec3(0.0, 0.0, 0.0);
        float attenuation = 1.0 / (1.0 + 0.12 * dist * dist);
        float nDotL = max(dot(normal, lightDir), 0.0);
        diffuse += base * u_pointLightColor[i] * nDotL * attenuation;
        ambient += base * u_pointLightColor[i] * 0.08 * attenuation;
    }

    // Emit lighting tinted by the texture to keep albedo visible
    vec3 emissive = base * u_emissive;

    vec3 lit = diffuse + ambient + emissive;
    vec3 finalColor = mix(base, lit, 0.7);

    outColor = vec4(finalColor, texColor.a);
}
