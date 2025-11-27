/*
 * Script to read a model stored in Wavefront OBJ format
 *
 * Gilberto Echeverria
 * 2025-07-29
 */


'use strict';

/*
 * Read the contents of an OBJ file received as a string
 * Return an object called arrays, with the arrays necessary to build a
 * Vertex Array Object (VAO) for WebGL.
 */
function loadObj(objString, materials = {}) {

    // The array with the attributes that will be passed to WebGL
    let arrays = {
        a_position: {
            numComponents: 3,
            data: []
        },
        a_color: {
            numComponents: 4,
            data: []
        },
        a_normal: {
            numComponents: 3,
            data: []
        },
        a_texCoord: {
            numComponents: 2,
            data: []
        }
    };

    // Early return if there is nothing to parse
    if (!objString) {
        return arrays;
    }

    // Containers for the raw OBJ data
    const positions = [];
    const texcoords = [];
    const normals = [];

    // Current material color (fallback white with full alpha)
    let currentColor = [1, 1, 1, 1];

    // Helper to resolve indices that may be negative (relative to the end)
    const resolveIndex = (value, arrayLength) => {
        const index = parseInt(value, 10);
        return index >= 0 ? index - 1 : arrayLength + index;
    };

    const processVertex = (vertex) => {
        if (!vertex) return;
        const [pIdx, tIdx, nIdx] = vertex.split('/');

        // Positions (mandatory)
        const posIndex = resolveIndex(pIdx, positions.length);
        const position = positions[posIndex];
        if (!position) return;
        arrays.a_position.data.push(...position);

        // Texture coordinates (optional)
        if (tIdx) {
            const texIndex = resolveIndex(tIdx, texcoords.length);
            const tex = texcoords[texIndex] || [0, 0];
            arrays.a_texCoord.data.push(tex[0], tex[1]);
        } else {
            arrays.a_texCoord.data.push(0, 0);
        }

        // Normals (optional)
        if (nIdx) {
            const normalIndex = resolveIndex(nIdx, normals.length);
            const normal = normals[normalIndex] || [0, 0, 1];
            arrays.a_normal.data.push(...normal);
        } else {
            arrays.a_normal.data.push(0, 0, 1);
        }

        // Color per vertex (kept even if shader uses a uniform)
        arrays.a_color.data.push(...currentColor);
    };

    const lines = objString.split(/\r?\n/);
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const parts = line.split(/\s+/);
        const keyword = parts[0];

        switch (keyword) {
            case 'v': {
                const position = parts.slice(1, 4).map(Number);
                if (position.length === 3) {
                    positions.push(position);
                }
                break;
            }
            case 'vt': {
                const tex = parts.slice(1, 3).map(Number);
                if (tex.length >= 2) {
                    texcoords.push(tex);
                }
                break;
            }
            case 'vn': {
                const normal = parts.slice(1, 4).map(Number);
                if (normal.length === 3) {
                    normals.push(normal);
                }
                break;
            }
            case 'usemtl': {
                const name = parts[1];
                if (materials && materials[name]) {
                    const kd = materials[name].kd || [1, 1, 1];
                    const opacity = materials[name].d ?? 1;
                    currentColor = [...kd, opacity];
                }
                break;
            }
            case 'f': {
                const vertices = parts.slice(1);
                // Triangulate polygons with more than 3 vertices
                for (let i = 1; i < vertices.length - 1; i++) {
                    processVertex(vertices[0]);
                    processVertex(vertices[i]);
                    processVertex(vertices[i + 1]);
                }
                break;
            }
            default:
                // Ignore other commands (o, g, s, mtllib, etc.)
                break;
        }
    }

    return arrays;
}

/*
 * Read the contents of an MTL file received as a string
 * Return an object containing all the materials described inside,
 * with their illumination attributes.
 */
function loadMtl(mtlString) {


    const materials = {};
    if (!mtlString) return materials;

    let current = null;

    const lines = mtlString.split(/\r?\n/);
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const parts = line.split(/\s+/);
        const keyword = parts[0];

        switch (keyword) {
            case 'newmtl':
                current = {
                    kd: [1, 1, 1],
                    ka: [0, 0, 0],
                    ks: [0, 0, 0],
                    ns: 0,
                    d: 1,
                };
                materials[parts[1]] = current;
                break;
            case 'Kd':
                if (current) current.kd = parts.slice(1, 4).map(Number);
                break;
            case 'Ka':
                if (current) current.ka = parts.slice(1, 4).map(Number);
                break;
            case 'Ks':
                if (current) current.ks = parts.slice(1, 4).map(Number);
                break;
            case 'Ns':
                if (current) current.ns = Number(parts[1]);
                break;
            case 'd':
            case 'Tr':
                if (current) current.d = Number(parts[1]);
                break;
            default:
                // Ignore the rest
                break;
        }
    }

    return materials;
}

export { loadObj, loadMtl };
