const MAX_FORCES = 20
const DEBUG_MODE = false
const SHOW_SLIDERS = false
let FREEZE = false 

class CacheA {
    constructor() {
        this._cache = {}
    }
    getOrReuse(key, fn) {
        if (!(key in this._cache)) this._cache[key] = fn()

        return this._cache[key]
    }

    get(key) {
        return this._cache[key]
    }
}

function forceClassStructName(cls) {
    return `${FORCE_NAMES[cls.id]}Force`
}
function pascalToUpperSnake(str) {
    return str
        .split(/\.?(?=[A-Z])/)
        .join("_")
        .toUpperCase()
}

const FORCES = {
    Gravity: 1,
    NoiseSimplex: 2,
    Point: 3,
    Vortex: 4,
}



const FORCE_NAMES = Object.fromEntries(
    Object.entries(FORCES).map(entries => entries.reverse())
)

class SPForce {
    constructor({ dynamic = false } = {}) {
        this.dynamic = dynamic
        this.props = {}
    }

    // subclasses must override static id and static schema
    static id
    static schema = {} // e.g. { vector: "vec3<f32>", ... }

    // compute how many floats this force packs
    static floatCount() {
        const sizes = { "f32": 1, "vec2<f32>": 2, "vec3<f32>": 3, "vec4<f32>": 4 }
        return Object.values(this.schema).reduce(
            (sum, ty) => sum + (sizes[ty] || 0),
            0
        )
    }

    // flatten props to a Float32Array-compatible array
    getFloats(mesh_config = undefined) {
        return Object.entries(this.constructor.schema).flatMap(([key, ty]) => {
            let v
            if (typeof this.props[key] === "function") {
                v = this.props[key](mesh_config)
            } else {
                v = this.props[key]
            }
            return Array.isArray(v) ? v : [v]
        })
    }

    // generate WGSL struct from schema
    static structWgsl() {
        const lines = [`struct ${this.name} {`]
        for (const [field, ty] of Object.entries(this.schema)) {
            lines.push(`  ${field}: ${ty},`)
        }
        lines.push(`};`)
        return lines.join("\n")
    }

    static extractionWgsl(bufferName, ofsVar = "base") {
        let lines = []
        let offset = 0
        for (const [field, ty] of Object.entries(this.schema)) {
            if (ty.startsWith("vec")) {
                const n = parseInt(ty.match(/\d/)[0])
                const comps = Array.from(
                    { length: n },
                    (_, i) => `${bufferName}[${ofsVar} + ${offset + i}u]`
                ).join(", ")
                lines.push(`let ${field} = vec${n}<f32>(${comps});`)
                offset += n
            } else {
                lines.push(`let ${field} = ${bufferName}[${ofsVar} + ${offset}u];`)
                offset += 1
            }
        }
        const args = Object.keys(this.schema).join(", ")
        lines.push(`let force_opts = ${this.name}(${args});`)
        // indent each line for WGSL switch-case context
        return lines.map(l => `    ${l}`).join("\n")
    }
    // default procWgsl must be overridden
    static procWgsl() {
        throw new Error("procWgsl() not implemented")
    }
}
// — Gravity force —
class SPGravityForce extends SPForce {
    static id = FORCES.Gravity
    static schema = { vector: "vec3<f32>" }

    constructor({ vector, dynamic = false } = {}) {
        super({ dynamic })

        this.props.vector = vector // vec3<f32>
    }

    static procWgsl() {
        return `
  computed = txVec3ByMat4(params.inverseTransform, force_opts.vector);
`
    }
}

// — Curl‐noise force —
class SPNoiseSimplexForce extends SPForce {
    static id = FORCES.NoiseSimplex
    static schema = { noiseOffset: "f32", noiseStrength: "f32" }
    constructor({ noiseOffset, noiseStrength, dynamic = false } = {}) {
        super({ dynamic })

        this.props.noiseOffset = noiseOffset // f32
        this.props.noiseStrength = noiseStrength // f32
    }

    static procWgsl() {
        return `
  // base frequency scaled & offset in X/Z
  var bf = currentPosition * 0.3;
  bf.x += params.noiseOffset;
  bf.z += params.noiseOffset * 0.5;
  let periodicity = vec3<f32>(4.0);
  let bf_world = txVec3ByMat4(params.inverseTransform, bf);
  let n1 = psrdnoise3(bf_world, periodicity, params.noiseOffset);
  let n2 = psrdnoise3(bf_world + vec3<f32>(17.3), periodicity, params.noiseOffset + 9.7);
  let g1 = n1.gradient;
  let g2 = n2.gradient;
  let curl = normalize(vec3<f32>(
    g1.y * g2.z - g1.z * g2.y,
    g1.z * g2.x - g1.x * g2.z,
    g1.x * g2.y - g1.y * g2.x
  )) * force_opts.noiseStrength;
  computed = curl;
`
    }
}

// 2) Define the new point‐force:
class SPPointForce extends SPForce {
    static id = FORCES.Point
    static schema = {
        center: "vec3<f32>", // origin of the point‐force
        strength: "f32", // peak magnitude at the center
        falloffDistance: "f32", // radius beyond which force = 0
        falloffPower: "f32" // exponent for curve (e.g. 2 = quadratic falloff)
    }

    constructor({
        center,
        strength,
        falloffDistance,
        falloffPower = 2.0,
        dynamic = false
    } = {}) {
        super({ dynamic })
        this.props.center = center
        this.props.strength = strength
        this.props.falloffDistance = falloffDistance
        this.props.falloffPower = falloffPower
    }

    static procWgsl() {
        return `
        
  // vector from point to current
  let dir = currentPosition - txVec3ByMat4(params.inverseTransform, force_opts.center);
  let dist = length(dir);

  // normalized falloff parameter t: 1 at center → 0 at falloffDistance
  let t = clamp(1.0 - dist / force_opts.falloffDistance, 0.0, 1.0);

  // apply curve and scale by strength
  let f = pow(t, force_opts.falloffPower) * force_opts.strength;

  // final force: direction * magnitude
  computed = select(
    vec3<f32>(0.0),               // when condition is false (dist <= 0)
    normalize(dir) * f,           // when condition is true  (dist > 0)
    dist > 0.0                    // the boolean condition
  );
`
    }
}


class SPVortexForce extends SPForce {
    // match the new FORCES.Vortex id
    static id = FORCES.Vortex;

    // parameters: center of the vortex axis, axis direction (unit), strength,
    // how far the effect reaches, and how quickly it falls off
    static schema = {
        center: "vec3<f32>",
        axis: "vec3<f32>",
        strength: "f32",
        falloffDistance: "f32",
        falloffPower: "f32"
    };

    constructor({
        center        = [0,0,0],
        axis          = [0,1,0],
        strength      = 1.0,
        falloffDistance = 1.0,
        falloffPower    = 2.0,
        dynamic       = false
    } = {}) {
        super({ dynamic });
        this.props.center           = center;           // vec3<f32>
        this.props.axis             = axis;             // vec3<f32> (should be normalized)
        this.props.strength         = strength;         // f32
        this.props.falloffDistance  = falloffDistance;  // f32
        this.props.falloffPower     = falloffPower;     // f32
    }

    static procWgsl() {
        // In WGSL: compute the swirling velocity around `axis`, with falloff
        return `
  // vector from vortex center to current point
  let rel = currentPosition - txVec3ByMat4(params.inverseTransform, force_opts.center);

  // project rel onto the axis to get the closest point on the axis line
  let projLen = dot(rel, force_opts.axis);
  let proj    = projLen * force_opts.axis;

  // radial vector from axis to point
  let radial = rel - proj;
  let dist   = length(radial);

  // falloff factor: 1 at axis → 0 at falloffDistance
  let t = clamp(1.0 - dist / force_opts.falloffDistance, 0.0, 1.0);
  let falloff = pow(t, force_opts.falloffPower);

  // swirl direction: perpendicular to both the axis and radial vector
  let swirlDir = normalize(cross(force_opts.axis, radial));

  // final vortex force
  computed = swirlDir * (force_opts.strength * falloff);
`;
    }
}


function getFormattedForceBufferName(cls) {
    return `${pascalToUpperSnake(FORCE_NAMES[cls.id])}_FORCES`
}
function getWgslForForces(forces) {
    const uniqueClasses = [...new Set(forces.map(i => i.constructor))]
    let uniformBlock = `
struct ForceUniforms {
  forceCount: u32,
};

@group(1) @binding(0) var<uniform> forceUniforms: ForceUniforms;
@group(1) @binding(1) var<storage,read_write> forceLookups: array<vec2u, ${MAX_FORCES}>;
@group(1) @binding(2) var<storage,read_write> f_p: array<f32, ${MAX_FORCES * 10 * 4
        }>;
`

    let bindingsMapping = {
        forceUniforms: { group: 1, binding: 0 },
        forceLookups: { group: 1, binding: 1 },
        f_p: { group: 1, binding: 2 }
    }
    let globals = `

${uniformBlock}

${uniqueClasses.map(cls => cls.structWgsl()).join("\n")}

// --- DYNAMIC ACCUMULATOR ---
fn accumulateForces(
    currentPosition: vec3<f32>,
    previousNeighborPosition: vec3<f32>,
    nextNeighborPosition: vec3<f32>,
    previousPosition: vec3<f32>,
    velocity: vec3<f32>
) -> vec3<f32> {
  var totalForce = vec3<f32>(0.0);
  for (var i = 0u; i < forceUniforms.forceCount; i = i + 1u) {
    let typeId = forceLookups[i].x;
    let ofs    = forceLookups[i].y;
    var computed = vec3<f32>(0.0);
    switch (typeId) {
     ${uniqueClasses
            .map(cls => {
                const field = getFormattedForceBufferName(cls)
                return `
    case ${cls.id}u: {
      ${cls.extractionWgsl("f_p", "ofs")}

      ${cls.procWgsl().trim()}
    }`
            })
            .join("\n")}
     case default {}
    }
    totalForce += computed;
  }

  
    // Strand direction (based on neighbors)
    let hairDirection = normalize((nextNeighborPosition - currentPosition) + (currentPosition - previousNeighborPosition));

    // Decompose velocity
    let velocityParallel = dot(velocity, hairDirection) * hairDirection;
    let velocityPerpendicular = velocity - velocityParallel;

    // Directional drag
    let parallelResistance = 120.1 * params.resistance;  // Low drag along the strand
    let perpendicularResistance = 200.0 * params.resistance; // High drag orthogonal to the strand
    let dragForce = -velocityParallel * parallelResistance - velocityPerpendicular * perpendicularResistance;

    // Add drag to total force
    totalForce += dragForce;

    
  return totalForce;
}
`

    return { globals, bindingsMapping }
}



function setupForces(engine, forces, computeShader) {
    // determine max floats per force
    const classes = [...new Set(forces.map(f => f.constructor))]
    const maxFloatCount = Math.max(...classes.map(c => c.floatCount()))

    // create uniform buffer for count
    const forceUniforms = new BABYLON.UniformBuffer(engine)
    forceUniforms.addUniform("forceCount", 1)

    // create storage buffer for lookups: vec2<u32> per force
    const forceLookups = new BABYLON.StorageBuffer(
        engine,
        MAX_FORCES * 2 * Uint32Array.BYTES_PER_ELEMENT,
        BABYLON.Constants.BUFFER_CREATIONFLAG_READWRITE,
        "forceLookups"
    )

    // create storage buffer for floats
    const f_p = new BABYLON.StorageBuffer(
        engine,
        MAX_FORCES * maxFloatCount * 10 * Float32Array.BYTES_PER_ELEMENT,
        BABYLON.Constants.BUFFER_CREATIONFLAG_READWRITE,
        "forceFloats"
    )

    // bind buffers to shader
    computeShader.setUniformBuffer("forceUniforms", forceUniforms)
    computeShader.setStorageBuffer("forceLookups", forceLookups)
    computeShader.setStorageBuffer("f_p", f_p)

    // update function to refill buffers each frame
    // update function to refill buffers each frame
    let update = () => {
        const lookups = new Uint32Array(MAX_FORCES * 2)
        const floats = new Float32Array(MAX_FORCES * maxFloatCount)

        let offset = 0
        forces.forEach((f, i) => {
            lookups[2 * i] = f.constructor.id
            lookups[2 * i + 1] = offset
            const arr = f.getFloats(this)
            floats.set(arr, offset)
            offset += arr.length
        })

        forceUniforms.updateInt("forceCount", forces.length)
        forceUniforms.update()
        forceLookups.update(lookups)
        f_p.update(floats)
    }

    return { update, forceUniforms, forceLookups, f_p }
}

/**
 * @typedef {Object} StrandPropertiesConfig
 * @property {number} [tangentScale=0.001]           Scale applied to the strand tangent.
 * @property {number} [scaleFalloff=0.1]             How quickly the strand tapers.
 * @property {number} [curveSamples=1]               Number of samples along the curve.
 * @property {number} [crossSectionPoints=4]         Points used to define the strand’s cross-section.
 * @property {number} [segmentLength=0.01]           Length of each segment.
 * @property {number} [controlPointsPerStrand=8]     Number of control points per strand.
 * @property {number} [stiffness=0.008]            How stiff the strand should be
 */


/**
 * Encapsulates properties for a hair/strand-like mesh.
 */
class StrandProperties {
    /**
     * @param {StrandPropertiesConfig} [config={}]
     */
    constructor({
        tangentScale = 0.001,
        scaleFalloff = 0.1,
        curveSamples = 1,
        crossSectionPoints = 4,
        segmentLength = 0.01,
        controlPointsPerStrand = 8,
        stiffness = 0.008
    } = {}) {
        this.tangentScale = tangentScale
        this.scaleFalloff = scaleFalloff
        this.curveSamples = curveSamples
        this.crossSectionPoints = crossSectionPoints
        this.segmentLength = segmentLength
        this.controlPointsPerStrand = controlPointsPerStrand
        this.stiffness = stiffness
    }
}

class SpawnStrategy {
    constructor(mesh, { vertex_sampler, vertex_redistributor }) {
        this.mesh = mesh
        this.vertex_sampler = vertex_sampler
        this.vertex_redistributor = vertex_redistributor
    }

    computeBasisGeometry() {
        let { indices } = this.vertex_sampler(this.mesh)
        if (this.vertex_redistributor && !this.mesh_config.mask_mesh) {
            let mask_mesh = this.vertex_redistributor({ mesh: this.mesh, indices })

            this.mesh_config.mask_mesh = mask_mesh
            mask_mesh.parent = this.mesh
            mask_mesh.material = new BABYLON.StandardMaterial()
            mask_mesh.material.alpha = 0
            return {
                mesh: mask_mesh,
                indices: new Array(mask_mesh.getTotalVertices())
                    .fill(0)
                    .map((_, i) => i)
            }
        }
        return { mesh, indices }
    }
}

class MeshStrandPhysicsConfig {
    constructor({
        scene,
        mesh,
        strand_properties,
        spawn_strategy,
        topo_strategy,
        physics_forces = [],
        is_static = true
    }) {
        this.scene = scene
        this.tested_indices = false
        this.mesh = mesh
        this.buffers = {}
        this.output_mesh = new BABYLON.Mesh(`strand_geom@${mesh.uniqueId}`, scene)
        this.cache = new CacheA()
        this.physics_forces = physics_forces
        this.spawn_strategy = new SpawnStrategy(mesh, spawn_strategy)
        this.spawn_strategy.mesh_config = this
        this.strand_properties = strand_properties
        this.topo_strategy = topo_strategy
        this.is_dynamic_geometry =
            !!mesh.skeleton ||
            (mesh.morphTargetManager && mesh.morphTargetManager.numTargets > 0)
        this.is_dynamic_worldmatrix = !is_static
        this.is_static = is_static
    }
    get basis_mesh() {
        return this.mask_mesh || this.mesh
    }

    setupForces() {
        let computeShader = this.getShader()
        let engine = this.scene.getEngine()
        return setupForces.call(this, engine, this.physics_forces, computeShader)
    }

    getShader() {
        if (!this._shader) {
            const physics_wgsl = getWgslForForces(this.physics_forces)

            const SHADER_CODE = `

${generateWGSLLookup(this.strand_properties.crossSectionPoints)}

${WGSL_SHADERS.HELPERS}

${WGSL_SHADERS.SIMPLEX_NOISE}

${WGSL_SHADERS.HERMITE}


// Sphere SDF function
fn sdfSphere(point: vec3<f32>, center: vec3<f32>, radius: f32) -> f32 {
    return length(point - center) - radius;
}

// Collision response
fn resolveCollision(point: vec3<f32>, center: vec3<f32>, radius: f32) -> vec3<f32> {
    let direction = normalize(point - center); // Direction from sphere center to point
    return center + direction * radius;       // Project point to the sphere surface
}

struct MeshingParams {
    controlPointsPerStrand: u32,
    tangentScale: f32,
    scaleFalloff: f32,
    curveSamples: u32,
    crossSectionPoints: u32, // Number of points in the cross-section profile
};

// Sphere parameters
const sphereCenter = vec3f(0.16, 0.15, -0.89);
const sphereRadius: f32 = 1.;

// Global simulation parameters
struct SimulationParams {
    VERLET_ITERATIONS: u32,
    inverseTransform: mat4x4<f32>,
    segmentLength: f32,
    stiffness: f32,
    resistance: f32,
    deltaTime: f32,
    controlPointsPerStrand: u32,
    activeTendrilCount: u32,
    gravity: vec3f,
    octaves: i32,
    noiseStrength: f32,
    noiseOffset: f32,
    inverseDeltaTransform: mat4x4<f32>,
    finalBoneMatrix: mat4x4<f32>,
    inverseTransposeRotationBoneMatrix: mat4x4<f32>,
    sphere: vec4f,
    forceCount: u32,
};

// Metadata for tendrils
struct TendrilData {
    rootNormal: vec3<f32>,
};

 ${physics_wgsl.globals}

fn doAccumulateForces(
    currentPosition: vec3<f32>, 
    previousNeighborPosition: vec3<f32>, 
    nextNeighborPosition: vec3<f32>, 
    previousPosition: vec3<f32>, 
    velocity: vec3<f32>
) -> vec3<f32> {
    var totalForce = vec3<f32>(0.0);

    // Gravity
    totalForce += params.gravity;


// drop the base frequency by 1/10:
var baseFreq = currentPosition * 0.3; 
baseFreq.x = baseFreq.x + params.noiseOffset;
baseFreq.z = baseFreq.z + params.noiseOffset * .5;
let periodicity = vec3<f32>(4.0); 
   // Sample two 3D noise fields at the same point+time
let n1 = psrdnoise3(baseFreq, periodicity, params.noiseOffset);
let n2 = psrdnoise3(baseFreq+vec3(17.3), periodicity, params.noiseOffset+9.7);

// Their gradients:
let g1 = n1.gradient;
let g2 = n2.gradient;

// Curl: ∇×F for F=(g1, g2, 0)
let curl = normalize(vec3<f32>(
  g1.y * g2.z - g1.z * g2.y,
  g1.z * g2.x - g1.x * g2.z,
  g1.x * g2.y - g1.y * g2.x
)) * params.noiseStrength;

totalForce += curl;

    // // Wind force (dummy example)
    // let windDirection = vec3<f32>(-1.0, 0.2, -1.0); // Example wind direction
    // let windStrength = 1.; // Example strengthf
    // let windForce = windDirection * windStrength;
    // totalForce += windForce;


    // Strand direction (based on neighbors)
    let hairDirection = normalize((nextNeighborPosition - currentPosition) + (currentPosition - previousNeighborPosition));

    // Decompose velocity
    let velocityParallel = dot(velocity, hairDirection) * hairDirection;
    let velocityPerpendicular = velocity - velocityParallel;

    // Directional drag
    let parallelResistance = 120.1 * params.resistance;  // Low drag along the strand
    let perpendicularResistance = 200.0 * params.resistance; // High drag orthogonal to the strand
    let dragForce = -velocityParallel * parallelResistance - velocityPerpendicular * perpendicularResistance;

    // Add drag to total force
    totalForce += dragForce;

    return totalForce;
}

const DARK_SEA_GREEN = vec4f(0.29, 0.49, 0.54, 1.0);
const LIGHT_SEA_GREEN = vec4f(0.31, 0.68, 0.78, 1.0);



@group(0) @binding(0) var<storage, read_write> CURRENT_POSITIONS: array<f32>;
@group(0) @binding(1) var<storage, read_write> PREVIOUS_POSITIONS: array<f32>;
@group(0) @binding(2) var<uniform> params: SimulationParams;
@group(0) @binding(4) var<storage, read_write> GEOM_VERTS: array<f32>; // Output vertex positions
@group(0) @binding(5) var<storage, read_write> GEOM_INDICES: array<u32>; // Output mesh indices
@group(0) @binding(6) var<uniform> meshing_params: MeshingParams;
@group(0) @binding(7) var<storage, read_write> GEOM_COLORS: array<f32>; // 4 floats per vertex (RGBA)
@group(0) @binding(8) var<storage, read_write> UPDATED_ROOT_POSITIONS: array<f32>; // updated root control point positions in target mesh
@group(0) @binding(9) var<storage, read_write> UPDATED_ROOT_NORMALS: array<f32>; // updated root control point positions in target mesh
@group(0) @binding(10) var<storage, read_write> SPAWN_INDICES: array<u32>; // Basis for which vertices to treat as spawn points
@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    
    
    let _usage1 = GEOM_VERTS[0];
    let _usage2 = GEOM_INDICES[1];
    let _usage3 = meshing_params.tangentScale;
    let _usage4 = UPDATED_ROOT_POSITIONS[0];
    let _usage5 = UPDATED_ROOT_NORMALS[0];
    let _usage6 = forceLookups[0];
    let _usage7 = forceUniforms.forceCount;
    let _usage8 = f_p[0];
    let _usage9 = SPAWN_INDICES[0];
    let tendrilIndex = global_id.x;

    if (global_id.x >=  params.activeTendrilCount) {
        return;
    }


    let tendril_data_start_idx = tendrilIndex * meshing_params.controlPointsPerStrand * 3u;

    
    CURRENT_POSITIONS[tendril_data_start_idx] = UPDATED_ROOT_POSITIONS[(tendrilIndex * 3) + 0];
    CURRENT_POSITIONS[tendril_data_start_idx + 1] = UPDATED_ROOT_POSITIONS[(tendrilIndex * 3) + 1];
    CURRENT_POSITIONS[tendril_data_start_idx + 2] = UPDATED_ROOT_POSITIONS[(tendrilIndex * 3) + 2];

    PREVIOUS_POSITIONS[tendril_data_start_idx] = UPDATED_ROOT_POSITIONS[(tendrilIndex * 3) + 0];
    PREVIOUS_POSITIONS[tendril_data_start_idx + 1] = UPDATED_ROOT_POSITIONS[(tendrilIndex * 3) + 1];
    PREVIOUS_POSITIONS[tendril_data_start_idx + 2] = UPDATED_ROOT_POSITIONS[(tendrilIndex * 3) + 2];


    // Load the entire tendril into a local variable
    var tendrilCurrentPositions: array<vec3<f32>, 64>; // Adjust size to max control points
    var tendrilPreviousPositions: array<vec3<f32>, 64>; // Same as above

    for (var idx: u32 = 0; idx < meshing_params.controlPointsPerStrand; idx++) {
        let baseIdx = tendril_data_start_idx + (idx * 3u);
        tendrilCurrentPositions[idx] = vec3<f32>(
            CURRENT_POSITIONS[baseIdx + 0],
            CURRENT_POSITIONS[baseIdx + 1],
            CURRENT_POSITIONS[baseIdx + 2]
        );
        tendrilPreviousPositions[idx] = vec3<f32>(
            PREVIOUS_POSITIONS[baseIdx + 0],
            PREVIOUS_POSITIONS[baseIdx + 1],
            PREVIOUS_POSITIONS[baseIdx + 2]
        );
    }


    // Compute the new root normal based on the updated root position and the first segment
    var ROOT_POSITION = tendrilCurrentPositions[0];

    let rootNormal =  vec3f(UPDATED_ROOT_NORMALS[(tendrilIndex * 3) + 0],
     UPDATED_ROOT_NORMALS[(tendrilIndex * 3) + 1],
     UPDATED_ROOT_NORMALS[(tendrilIndex * 3) + 2]);

    for (var idx: u32 = 1; idx < meshing_params.controlPointsPerStrand; idx++) {

        var currentPosition = (vec4<f32>(
            tendrilCurrentPositions[idx],
            1.
        ) * params.inverseDeltaTransform).xyz;


        var previousPositionVec = (vec4<f32>(
            tendrilPreviousPositions[idx],
            1.
        ) * params.inverseDeltaTransform).xyz;
        tendrilPreviousPositions[idx] = previousPositionVec;

        let previousPosition = vec3<f32>(
            tendrilPreviousPositions[idx]
        );

        // Fetch neighbors
        var previousNeighborPosition = vec3<f32>(0.0);
        var nextNeighborPosition = vec3<f32>(0.0);

        if (idx > 0) {
            // Previous neighbor exists
            let prevIdx = idx - 1;
            previousNeighborPosition = (vec4<f32>(
            tendrilCurrentPositions[prevIdx], 1.
        ) * params.inverseDeltaTransform).xyz;
        } else {
            // For root, use current position (no prior neighbor)
            previousNeighborPosition = currentPosition;
        }

        if (idx < meshing_params.controlPointsPerStrand - 1) {
            // Next neighbor exists
            let nextIdx = idx + 1;
            nextNeighborPosition = (vec4<f32>(
            tendrilCurrentPositions[nextIdx], 1.
        ) * params.inverseDeltaTransform).xyz;
        } else {
            // For tip, use current position (no next neighbor)
            nextNeighborPosition = currentPosition;
        }

        // Compute velocity
        let velocity = currentPosition - previousPosition;

        // Accumulate forces
        let totalForce = accumulateForces(
            currentPosition, 
            previousNeighborPosition, 
            nextNeighborPosition, 
            previousPosition, 
            velocity
        );

        // Verlet integration
        var newPosition = currentPosition + velocity + totalForce * params.deltaTime * params.deltaTime;


        // Update positions
        tendrilPreviousPositions[idx] = currentPosition;
        tendrilCurrentPositions[idx] = newPosition;
    }

    // Bone matrix application to root vertex
    var currentPosition = tendrilCurrentPositions[0];

    // Constraint resolution
    for (var iteration: u32 = 0; iteration < params.VERLET_ITERATIONS; iteration++) {
        for (var idx: u32 = 1; idx < meshing_params.controlPointsPerStrand; idx++) {

            let currentPosition = tendrilCurrentPositions[idx];
            let previousPosition = tendrilCurrentPositions[idx - 1u];

            // Sphere collision constraint
            // Inside your constraint‐resolution loop, replace your collision block with:

// Sphere collision constraint
let distanceToSphere = sdfSphere(currentPosition, params.sphere.xyz, params.sphere.a);
if (distanceToSphere < 0.0) {
    // 1) push back onto the surface
    let corrected = resolveCollision(currentPosition, params.sphere.xyz, params.sphere.a);

    // 2) compute penetration depth and a friction factor [0..1]
    //    tweak 0.5 to dial in how strong the friction is
    let penetration = -distanceToSphere;
    let friction   = clamp(penetration * 10., 0.0, 1.0);

    // 3) grab your “old” position (from the previous frame)
    let prevFrame = tendrilPreviousPositions[idx];

    // 4) compute the raw collision‐velocity
    let rawVel = corrected - prevFrame;

    // 5) re‐write previousPosition so that on the next frame
    //    velocity = (corrected – previous) has been damped by (1 – friction)
    tendrilPreviousPositions[idx] = corrected - rawVel * (1.0 - friction);

    // 6) finally store your projected position
    tendrilCurrentPositions[idx] = corrected;
}

            // Distance constraint
            let direction = currentPosition - previousPosition;
            let distance = length(direction);
            let distanceError = distance - params.segmentLength;

            if (distance > 0.0) {
                let correction = (distanceError / distance) * 0.5;
                let correctionVector = direction * correction;

                if (idx != 1) {
                    tendrilCurrentPositions[idx - 1u] += correctionVector;
                }
                tendrilCurrentPositions[idx] -= correctionVector;
            }
        }
    }

    // Apply stiffness at the end
        // After physics integration, apply stiffness
    for (var idx: u32 = 1; idx < meshing_params.controlPointsPerStrand; idx++) {
    let rootPosition = tendrilCurrentPositions[0u];
    
    // Calculate the "natural" position based on segment length
    let direction = rootNormal; // Natural direction
    let naturalPosition = rootPosition + direction * (params.segmentLength * f32(idx));
    
    // Easing function to adjust stiffness influence
    let distanceFactor = f32(idx) / f32(meshing_params.controlPointsPerStrand);

    let baseStiffnessInfluence = params.stiffness * easeOutCubic(1.0 - distanceFactor);

    // Additive "scalp stiffness" for the first few vertices
    // var scalpStiffnessFactor: f32 = 0.0;
    // let scalpStiffnessFalloff = 12u;
    // if (idx < scalpStiffnessFalloff) {
    //         let t = f32(idx) / f32(scalpStiffnessFalloff); // Normalize idx to range [0, 1] over the first 3 vertices
    //             scalpStiffnessFactor = pow(1.0 - t, f32(scalpStiffnessFalloff)); // Linearly decreases from 1.0 (100%) to 0.0
    //     }

    // //Combine the stiffness influences
    // let totalStiffnessInfluence = baseStiffnessInfluence + (scalpStiffnessFactor);

    let correction = mix(vec3f(0,0,0), naturalPosition, baseStiffnessInfluence);
    // Blend the computed position with the natural position
    tendrilCurrentPositions[idx] +=  correction;
    tendrilPreviousPositions[idx] +=  correction;
    }



      for (var idx: u32 = 1; idx < meshing_params.controlPointsPerStrand; idx++) {
        let baseIdx = tendril_data_start_idx + idx * 3u;
        CURRENT_POSITIONS[baseIdx] = tendrilCurrentPositions[idx].x;
        CURRENT_POSITIONS[baseIdx + 1] = tendrilCurrentPositions[idx].y;
        CURRENT_POSITIONS[baseIdx + 2] = tendrilCurrentPositions[idx].z;
        PREVIOUS_POSITIONS[baseIdx] =     tendrilPreviousPositions[idx].x;
        PREVIOUS_POSITIONS[baseIdx + 1] = tendrilPreviousPositions[idx].y;
        PREVIOUS_POSITIONS[baseIdx + 2] = tendrilPreviousPositions[idx].z;
    }
    

    // Calculate global geometry base indices for the current strand
    // Calculate global geometry base indices for the current strand
let strandVertexBaseIndex = tendrilIndex
    * (meshing_params.controlPointsPerStrand - 1u)
    * meshing_params.curveSamples
    * meshing_params.crossSectionPoints
    * 3u;

let strandVertexBase = tendrilIndex
    * (meshing_params.controlPointsPerStrand - 1u)
    * meshing_params.curveSamples
    * meshing_params.crossSectionPoints;


let strandIndexBaseIndex = tendrilIndex
    * (meshing_params.controlPointsPerStrand - 1u)
    * meshing_params.curveSamples
    * meshing_params.crossSectionPoints
    * 6u;

// Compute tangents (finite differences)
var tangents: array<vec3<f32>, 64>; // Adjust size to max control points
for (var i: u32 = 0u; i < meshing_params.controlPointsPerStrand; i = i + 1u) {
    if (i < meshing_params.controlPointsPerStrand - 1u) {
        tangents[i] = normalize(tendrilCurrentPositions[i + 1u] - tendrilCurrentPositions[i]);
    } else if (i > 0u) {
        tangents[i] = normalize(tendrilCurrentPositions[i] - tendrilCurrentPositions[i - 1u]);
    } else {
        tangents[i] = vec3<f32>(0.0, 1.0, 0.0); // Default for single point
    }
}

// Generate interpolated curve points using Hermite spline
var curvePoints: array<vec3<f32>, 1024>; // Adjust size as needed
var curveTangents: array<vec3<f32>, 1024>; // Store tangents for parallel transport
var curvePointCount: u32 = 0u;

for (var i: u32 = 0u; i < meshing_params.controlPointsPerStrand - 1u; i = i + 1u) {
    let p0 = tendrilCurrentPositions[i];
    let p1 = tendrilCurrentPositions[i + 1u];
    let t0 = tangents[i];
    let t1 = tangents[i + 1u];

    for (var t: f32 = 0.0; t < 1.0; t = t + (1.0 / f32(meshing_params.curveSamples))) {
        curvePoints[curvePointCount] = hermite(p0, p1, t0, t1, t, meshing_params.tangentScale);
        curveTangents[curvePointCount] = normalize(hermiteTangent(p0, p1, t0, t1, t, meshing_params.tangentScale));
        curvePointCount = curvePointCount + 1u;
    }
}

// Initialize the first frame
var normal = rootNormal; // Initial guess for normal
if (abs(dot(normal, curveTangents[0])) > 0.9) {
    normal = vec3<f32>(1.0, 0.0, 0.0); // Adjust if nearly aligned with tangent
}
var binormal = cross(curveTangents[0], normal);
normal = cross(binormal, curveTangents[0]);

// Transform cross-sections and generate mesh
for (var i: u32 = 0u; i < curvePointCount; i = i + 1u) {
    let point = curvePoints[i];
    let tangent = curveTangents[i];

    let color = mix(LIGHT_SEA_GREEN, DARK_SEA_GREEN, smoothstep(0., f32(curvePointCount), f32(i))); //  gradient
    // Parallel transport to update normal and binormal
    if (i > 0u) {
        let prevTangent = curveTangents[i - 1u];
        var rotationAxis = cross(prevTangent, tangent);
        let rotationAngle = acos(clamp(dot(prevTangent, tangent), -1.0, 1.0)); // Avoid numerical issues
        if (length(rotationAxis) > 1e-5) {
            rotationAxis = normalize(rotationAxis);
            let cosAngle = cos(rotationAngle);
            let sinAngle = sin(rotationAngle);

            // Rodrigues' rotation formula for parallel transport
            normal = normal * cosAngle + cross(rotationAxis, normal) * sinAngle +
                rotationAxis * dot(rotationAxis, normal) * (1.0 - cosAngle);
            binormal = binormal * cosAngle + cross(rotationAxis, binormal) * sinAngle +
                rotationAxis * dot(rotationAxis, binormal) * (1.0 - cosAngle);
        }
    }

    // Compute scale
    let scale = ((1.0 - f32(i) / f32(curvePointCount - 1u)) * meshing_params.scaleFalloff) / 5;

    // Generate cross-section points
    for (var j: u32 = 0u; j < meshing_params.crossSectionPoints; j = j + 1u) {
        
        let cs = CROSS_SECTION_TABLE[j];          // vec2(cos, sin)
        let localPosition = vec3<f32>(cs.x, cs.y, 0.0) * scale;
    //   let angle = 2.0 * 3.14 * f32(j) / f32(meshing_params.crossSectionPoints);
    //   let localPosition = vec3<f32>(cos(angle), sin(angle), 0.0) * scale;


        // Transform from tangent space to world space
        let globalPosition = 
            tangent * localPosition.z +
            binormal * localPosition.x +
            normal * localPosition.y +
            point; // Offset by curve point position

        // Write to GEOM_VERTS
        let globalVertexIndex = strandVertexBaseIndex
            + (i * meshing_params.crossSectionPoints + j) * 3u;
        GEOM_VERTS[globalVertexIndex] = globalPosition.x;
        GEOM_VERTS[globalVertexIndex + 1] = globalPosition.y;
        GEOM_VERTS[globalVertexIndex + 2] = globalPosition.z;
        let colorIndex = strandVertexBaseIndex
            + (i * meshing_params.crossSectionPoints + j) * 4u; // 4 floats per color (RGBA)

        GEOM_COLORS[colorIndex + 0] = color.r;
        GEOM_COLORS[colorIndex + 1] = color.g;
        GEOM_COLORS[colorIndex + 2] = color.b;
        GEOM_COLORS[colorIndex + 3] = color.a; // Alpha (optional, set to 1.0)
        // Generate indices
        if (i > 0u) {
            // Generate indices, closing the loop for the cross-section
             let segOffset = (i - 1u) * meshing_params.crossSectionPoints;
            let a = strandVertexBase + segOffset + j;
            let b = strandVertexBase + segOffset + ((j + 1u) % meshing_params.crossSectionPoints);
            let c = strandVertexBase + i       * meshing_params.crossSectionPoints + j;
            let d = strandVertexBase + i       * meshing_params.crossSectionPoints + ((j + 1u) % meshing_params.crossSectionPoints);

            let triBase = strandIndexBaseIndex
                        + segOffset * 6u
                        + j * 6u;

            GEOM_INDICES[triBase + 0] = a;
            GEOM_INDICES[triBase + 1] = b;
            GEOM_INDICES[triBase + 2] = c;
            GEOM_INDICES[triBase + 3] = b;
            GEOM_INDICES[triBase + 4] = d;
            GEOM_INDICES[triBase + 5] = c;
        }

    }
}


}

fn alignToRootNormal(
    currentPosition: vec3<f32>, 
    rootNormal: vec3<f32>, 
    rootToPrev: vec3<f32>, 
    segmentLength: f32, 
    stiffness: f32
) -> vec3<f32> {
    // Project the current position onto the root-normal axis
    let projection = dot(currentPosition, rootNormal) * rootNormal;
    let targetPosition = projection + rootToPrev; // Maintain relative segment offset
    // Interpolate between the current position and the target position
    let correctedPosition = mix(currentPosition, targetPosition, stiffness);

    // Normalize the segment length
    let correctedDirection = normalize(correctedPosition - rootToPrev);
    return rootToPrev + correctedDirection * segmentLength;
}


fn falloffCurve(t: f32) -> f32 {
    // Use a smoothstep-based falloff for now
    return smoothstep(0.0, 1.0, 1.0 - t);
}

fn easeOutCubic(t: f32) -> f32 {
    return 1.0 - pow(1.0 - t, 3.0);
}


`
            console.log(SHADER_CODE)


            const yThreshold = -4 // Minimum y-value for spawning tendrils
            // mesh.material.wireframe = true
            // Get the list of spawn vertex indices (e.g. scalp points).
            // Identify vertices which should spawn hairs.
            const upVector = new BABYLON.Vector3(0, 1, 0)
            const centerOffset = new BABYLON.Vector3(0, 3.4, -0.1) // Center of the bounds.
            const sphereRadius = 0.34 // Adjust based on your mesh scale.
            const spawnIndices = this.cache.get("basis_geometry")?.indices
            // Use the new tendril generation function.
            const tendrilData = generateTendrilsFromMeshUsingIndices(
                this.basis_mesh, // e.g. character_data.meshes[1]
                this.strand_properties.segmentLength, // your segment length value
                this.strand_properties.controlPointsPerStrand, // number of control points per tendril
                spawnIndices // provided list of spawn vertex indices
            )

            // Visualization
            const tendrilLines = []
            const tendrilColors = []
            for (let i = 0; i < tendrilData.activeTendrilCount; i++) {
                const line = []
                for (let j = 0; j < this.strand_properties.controlPointsPerStrand; j++) {
                    const idx = i * this.strand_properties.controlPointsPerStrand * 3 + j * 3
                    line.push(
                        new BABYLON.Vector3(
                            tendrilData.tendrilPositions[idx],
                            tendrilData.tendrilPositions[idx + 1],
                            tendrilData.tendrilPositions[idx + 2]
                        )
                    )
                }
                tendrilLines.push(line)
                tendrilColors.push(
                    line.map(
                        (e, i) =>
                            new BABYLON.Color4(
                                0.1,
                                1 - i * (1 / this.strand_properties.controlPointsPerStrand),
                                i * (1 / this.strand_properties.controlPointsPerStrand),
                                1
                            )
                    )
                )
            }
            let lineSystem

            if (DEBUG_MODE) {
                lineSystem = BABYLON.MeshBuilder.CreateLineSystem(
                    "lineSystem",
                    {
                        lines: tendrilLines,
                        colors: tendrilColors,
                        updatable: true
                    },
                    scene
                )
                lineSystem.parent = this.mesh
            }

            const numTendrils = tendrilData.activeTendrilCount

            let defaultMeshingParams = {
                controlPointsPerStrand: this.strand_properties.controlPointsPerStrand,
                tangentScale: this.strand_properties.tangentScale,
                scaleFalloff: this.strand_properties.scaleFalloff,
                curveSamples: this.strand_properties.curveSamples,
                crossSectionPoints: this.strand_properties.crossSectionPoints
            }

            // Update buffer sizes using the active tendril count from tendrilData.
            const bufferSizes = calculateBufferSizes(
                tendrilData.activeTendrilCount,
                defaultMeshingParams // your object containing curveSamples and crossSectionPoints
            )
            this.cache._cache.bufferSizes = bufferSizes
            console.log("Vertex Buffer Size (bytes):", bufferSizes.vertexBufferSize)
            console.log("Index Buffer Size (bytes):", bufferSizes.indexBufferSize)
            console.log("Total Points:", bufferSizes.totalPoints)
            console.log("Total Indices:", bufferSizes.totalIndices)

            const spawn_indices_storage = new BABYLON.StorageBuffer(
                engine,
                spawnIndices.length * 4,
                BABYLON.Constants.BUFFER_CREATIONFLAG_VERTEX |
                BABYLON.Constants.BUFFER_CREATIONFLAG_WRITE |
                BABYLON.Constants.BUFFER_CREATIONFLAG_INDEX
            )
            spawn_indices_storage.update(new Uint32Array(spawnIndices))

            // Update buffers and simulation parameters
            const geom_verts_storage = new BABYLON.StorageBuffer(
                engine,
                bufferSizes.vertexBufferSize,
                BABYLON.Constants.BUFFER_CREATIONFLAG_VERTEX |
                BABYLON.Constants.BUFFER_CREATIONFLAG_WRITE |
                BABYLON.Constants.BUFFER_CREATIONFLAG_READ
            )

            if (DEBUG_MODE) {
                let geom_verts_pcmr = new PointCloudMeshRenderer("geom_verts", this.scene, { initial_vertex_count: bufferSizes.totalPoints, parent: this.mesh })
                geom_verts_pcmr.initialize({ buffer: geom_verts_storage })
            }
            this.buffers.geom_verts_storage = geom_verts_storage
            const geom_indices_storage = new BABYLON.StorageBuffer(
                engine,
                bufferSizes.indexBufferSize,
                BABYLON.Constants.BUFFER_CREATIONFLAG_VERTEX |
                BABYLON.Constants.BUFFER_CREATIONFLAG_READWRITE |
                BABYLON.Constants.BUFFER_CREATIONFLAG_INDEX
            )

            this.buffers.geom_indices_storage = geom_indices_storage

            // 1. Create PBR material
            var hairMat = new BABYLON.PBRMaterial("hair", scene)

            // 2. Albedo (base color)
            hairMat.albedoColor = BABYLON.Color3.FromHexString("#03ff7d")

            // 3. Roughness & metallic
            hairMat.metallic = 0.3
            hairMat.roughness = 0.7 // soft, diffuse look
            hairMat.environmentIntensity = 1.0

             scene.environmentTexture = new BABYLON.HDRCubeTexture("https://env-ai.vercel.app/envmaps/hd/nebula-3-HDR.hdr", scene, 128, false, true, false, true);
    
            scene.createDefaultSkybox(scene.environmentTexture);


            var pbr = hairMat
            const geom_mesh = this.output_mesh
            geom_mesh.material = pbr
            geom_mesh.material.backFaceCulling = false;

            geom_mesh.alwaysSelectAsActiveMesh = true
            geom_mesh.parent = this.basis_mesh

            const geom_buffer = new BABYLON.VertexBuffer(
                engine,
                geom_verts_storage.getBuffer(),
                BABYLON.VertexBuffer.PositionKind,
                true,
                false,
                3
            )
            geom_mesh.setVerticesBuffer(geom_buffer, false)
            // geom_mesh.setIndexBuffer(
            //     geom_indices_storage.getBuffer(),
            //     bufferSizes.totalPoints,
            //     bufferSizes.totalIndices,
            // );
            const colorStorageBuffer = new BABYLON.StorageBuffer(
                engine,
                bufferSizes.totalPoints * 4 * 4, // 4 floats (RGBA) for every 3 floats (position)
                BABYLON.Constants.BUFFER_CREATIONFLAG_VERTEX |
                BABYLON.Constants.BUFFER_CREATIONFLAG_WRITE
            )
            // geom_mesh.setVerticesBuffer(
            //     new BABYLON.VertexBuffer(
            //         engine,
            //         colorStorageBuffer.getBuffer(),
            //         BABYLON.VertexBuffer.ColorKind,
            //         true,
            //         false,
            //         4, // 4 floats for color (RGBA)
            //     ),
            // );

            const meshingParamsBuffer = new BABYLON.UniformBuffer(
                engine,
                undefined,
                undefined,
                "params"
            )
            meshingParamsBuffer.addUniform("controlPointsPerStrand", 1)
            meshingParamsBuffer.addUniform("tangentScale", 1)
            meshingParamsBuffer.addUniform("scaleFalloff", 1)
            meshingParamsBuffer.addUniform("curveSamples", 1)
            meshingParamsBuffer.addUniform("crossSectionPoints", 1)

            meshingParamsBuffer.updateFloat(
                "tangentScale",
                defaultMeshingParams.tangentScale
            )
            meshingParamsBuffer.updateFloat(
                "scaleFalloff",
                defaultMeshingParams.scaleFalloff
            )
            meshingParamsBuffer.updateUInt(
                "curveSamples",
                defaultMeshingParams.curveSamples
            )
            meshingParamsBuffer.updateUInt(
                "crossSectionPoints",
                defaultMeshingParams.crossSectionPoints
            )
            meshingParamsBuffer.updateUInt(
                "controlPointsPerStrand",
                defaultMeshingParams.controlPointsPerStrand
            )
            meshingParamsBuffer.update()

            console.log("Vertex Buffer Size (bytes):", bufferSizes.vertexBufferSize)
            console.log("Index Buffer Size (bytes):", bufferSizes.indexBufferSize)
            console.log("Total Points:", bufferSizes.totalPoints)
            console.log("Total Indices:", bufferSizes.totalIndices)

            //  setup gravity
            let gravityVector = new BABYLON.Vector3(0, -9.8, 0)

            // Workgroup size (matches @workgroup_size in WGSL)
            const workgroupSizeX = 256

            // Calculate number of workgroups
            //
            const numWorkgroupsX = Math.ceil(spawnIndices.length / workgroupSizeX)

            // Update buffers and simulation parameters
            const positionsBuffer = new BABYLON.StorageBuffer(
                engine,
                tendrilData.tendrilPositions.byteLength,
                BABYLON.Constants.BUFFER_CREATIONFLAG_VERTEX |
                BABYLON.Constants.BUFFER_CREATIONFLAG_WRITE |
                BABYLON.Constants.BUFFER_CREATIONFLAG_READ
            )
            positionsBuffer.update(tendrilData.tendrilPositions)

            const previousPositionsBuffer = new BABYLON.StorageBuffer(
                engine,
                tendrilData.tendrilPreviousPositions.byteLength
            )
            previousPositionsBuffer.update(tendrilData.tendrilPreviousPositions)

            const paramsBuffer = new BABYLON.UniformBuffer(
                engine,
                undefined,
                undefined,
                "params"
            )

            let simulationParams = {
                segmentLength: this.strand_properties.segmentLength,
                stiffness: 0.0,
                resistance: 1.79,
                deltaTime: 0.016,
                controlPointsPerStrand: this.strand_properties.controlPointsPerStrand,
                activeTendrilCount: 1, // Single tendri
                noiseStrength: 1.5,
                noiseOffset: 0,
                gravity: gravityVector,
                octaves: 1
            }

            // Animate the bone
            scene.onBeforeRenderObservable.add(() => {
                simulationParams.noiseOffset = simulationParams.noiseOffset + 0.01
                paramsBuffer.updateFloat("noiseOffset", simulationParams.noiseOffset)
                paramsBuffer.update()
            })
            simulationParams.activeTendrilCount = tendrilData.activeTendrilCount
            let previousOriginMatrix = BABYLON.Matrix.Identity() // Initialize to identity matrix
            let previousBoneMatrix = BABYLON.Matrix.Identity() // Initialize to identity matri
            let inverseDeltaTransform = BABYLON.Matrix.Identity()
            this.state = {
                previousOriginMatrix,
                previousBoneMatrix,
                inverseDeltaTransform,
                meshingParamsBuffer,
                paramsBuffer
            }
            paramsBuffer.addUniform("VERLET_ITERATIONS", 1)
            paramsBuffer.addUniform("inverseTransform", 16)
            paramsBuffer.addUniform("segmentLength", 1)
            paramsBuffer.addUniform("stiffness", 1)
            paramsBuffer.addUniform("resistance", 1)
            paramsBuffer.addUniform("deltaTime", 1)
            paramsBuffer.addUniform("controlPointsPerStrand", 1)
            paramsBuffer.addUniform("activeTendrilCount", 1)
            paramsBuffer.addUniform("gravity", 3)
            paramsBuffer.addUniform("octaves", 1)
            paramsBuffer.addUniform("noiseStrength", 1)
            paramsBuffer.addUniform("noiseOffset", 1)
            paramsBuffer.addUniform("inverseDeltaTransform", 16)
            paramsBuffer.addUniform("finalBoneMatrix", 16)
            paramsBuffer.addUniform("inverseTransposeRotationBoneMatrix", 16)
            paramsBuffer.addUniform("sphere", 4)
            paramsBuffer.addUniform("forceCount", 1)
            paramsBuffer.updateUInt(
                "VERLET_ITERATIONS",
                20
            )
            paramsBuffer.updateFloat("segmentLength", simulationParams.segmentLength)
            paramsBuffer.updateFloat("stiffness", simulationParams.stiffness)
            paramsBuffer.updateFloat("resistance", simulationParams.resistance)
            paramsBuffer.updateFloat("deltaTime", simulationParams.deltaTime)
            paramsBuffer.updateInt(
                "controlPointsPerStrand",
                simulationParams.controlPointsPerStrand
            )
            paramsBuffer.updateInt(
                "activeTendrilCount",
                simulationParams.activeTendrilCount
            )
            paramsBuffer.updateVector3("gravity", gravityVector)
            paramsBuffer.updateFloat("noiseStrength", simulationParams.noiseStrength)
            paramsBuffer.updateFloat("noiseOffset", simulationParams.noiseOffset)
            paramsBuffer.updateInt("octaves", simulationParams.controlPointsPerStrand)
            paramsBuffer.updateMatrix("inverseDeltaTransform", inverseDeltaTransform)
            paramsBuffer.updateMatrix(
                "inverseTransform",
                this.mesh.getWorldMatrix().invertToRef(new BABYLON.Matrix())
            )
            paramsBuffer.updateMatrix("finalBoneMatrix", previousOriginMatrix)
            paramsBuffer.update()

            // ---- Compute Shader Setup ----
            let computeShader = new BABYLON.ComputeShader(
                "tendrilCompute",
                engine,
                {
                    computeSource: SHADER_CODE
                },
                {
                    bindingsMapping: {
                        CURRENT_POSITIONS: { group: 0, binding: 0 },
                        PREVIOUS_POSITIONS: { group: 0, binding: 1 },
                        params: { group: 0, binding: 2 },
                        GEOM_VERTS: { group: 0, binding: 4 },
                        GEOM_INDICES: { group: 0, binding: 5 },
                        meshing_params: { group: 0, binding: 6 },
                        GEOM_COLORS: { group: 0, binding: 7 },
                        UPDATED_ROOT_POSITIONS: { group: 0, binding: 8 },
                        UPDATED_ROOT_NORMALS: { group: 0, binding: 9 },
                        SPAWN_INDICES: { group: 0, binding: 10 },
                        ...physics_wgsl.bindingsMapping
                    }
                }
            )

            // uniformBuffer.updateFloatArray("simulationParams", uniformData);
            computeShader.setStorageBuffer("SPAWN_INDICES", spawn_indices_storage)
            computeShader.setStorageBuffer("CURRENT_POSITIONS", positionsBuffer)
            computeShader.setStorageBuffer(
                "PREVIOUS_POSITIONS",
                previousPositionsBuffer
            )
            computeShader.setUniformBuffer("params", paramsBuffer)
            computeShader.setStorageBuffer("GEOM_VERTS", geom_verts_storage)
            computeShader.setStorageBuffer("GEOM_INDICES", geom_indices_storage)
            computeShader.setUniformBuffer("meshing_params", meshingParamsBuffer)
            computeShader.setStorageBuffer("GEOM_COLORS", colorStorageBuffer)
            this.state.update_linesystem = () => {
                if (DEBUG_MODE) {

                    positionsBuffer.read().then(updatedPositions => {
                        updatedPositions = new Float32Array(updatedPositions.buffer)
                        //
                        lineSystem.updateMeshPositions(positions => {
                            for (
                                let i = 0;
                                i < this.strand_properties.controlPointsPerStrand * simulationParams.activeTendrilCount;
                                i++
                            ) {
                                const cpIndex = i * 3
                                positions[i * 3 + 0] = updatedPositions[cpIndex + 0]
                                positions[i * 3 + 1] = updatedPositions[cpIndex + 1]
                                positions[i * 3 + 2] = updatedPositions[cpIndex + 2]
                            }
                        }, true)
                    })
                }
            }
            this._shader = computeShader
        }


        return this._shader
    }

    tickSimulation() {
        if (this.state.update_linesystem) this.state.update_linesystem()
        let computeShader = this.getShader()
        let mesh = this.basis_mesh
        let {
            previousOriginMatrix,
            previousBoneMatrix,
            paramsBuffer,
            meshingParamsBuffer
        } = this.state

        // Current transformation matrix of the parent mesh
        const currentOriginMatrix = mesh.getWorldMatrix().clone()
        // Calculate the delta transformation (current * inverse(previous))
        const inversePreviousOriginMatrix =
            BABYLON.Matrix.Invert(previousOriginMatrix)
        const deltaTransform = currentOriginMatrix.multiply(
            inversePreviousOriginMatrix
        )

        // Update the uniform buffer with the inverse delta transformation
        const inverseDeltaTransform =
            BABYLON.Matrix.Invert(deltaTransform).transpose()
        paramsBuffer.updateMatrix("inverseDeltaTransform", inverseDeltaTransform)

        paramsBuffer.updateMatrix(
            "inverseTransform",
            this.mesh.getWorldMatrix().invertToRef(new BABYLON.Matrix())
        )

        // const headTipOffset = head_tip.getFinalMatrix().getTranslation().clone()
        // const headBaseOffset = head_base.getFinalMatrix().getTranslation().clone()         // returns a Babylon.Matrix

        // // 2) extract its translation
        // //    option A: via decompose
        // const t = BABYLON.Vector3.Lerp(headBaseOffset, headTipOffset, .5)

        // const radius = .11
        // sphere.position = t.clone()
        // sphere.scaling.setAll(radius * 2)

        // // 4) upload to the uniform
        // paramsBuffer.updateFloat4(
        //     "sphere",
        //     t.x, t.y, t.z,
        //     radius
        // );

        paramsBuffer.update()
        meshingParamsBuffer.update()
        this.state.previousOriginMatrix = currentOriginMatrix.clone()
        // state.previousBoneMatrix = currentFinalBoneMatrix.clone();

        const numWorkgroupsX = Math.ceil(
            this.cache.get("basis_geometry")?.indices.length / 256
        )
       
        if (!this.indices_calculated) {
            this.output_mesh.setIndexBuffer(
                this.buffers.geom_indices_storage.getBuffer(),
                this.cache._cache.bufferSizes.totalPoints,
                this.cache._cache.bufferSizes.totalIndices,
                true
            )
            this.indices_calculated = true
        }
        computeShader.dispatchWhenReady(numWorkgroupsX).then(async () => {
            // Dispatch for 1 workgroup

            if (!this.tested_indices && DEBUG_MODE) {
                this.tested_indices = true
       
                const idxBytes = await this.buffers.geom_indices_storage.read()
                const indices = [...new Uint32Array(idxBytes.buffer)]
                const posBytes = await this.buffers.geom_verts_storage.read()
                const positions = [...new Float32Array(posBytes.buffer)]
                function debugMeshAdvanced(indices, positions, options = {}) {
                    const {
                        tolerance = 1e-12,       // area² threshold for “zero area”
                        logFirstIntervals = 5    // how many intervals to print
                    } = options;

                    const totalTriangles = indices.length / 3;
                    const uniqueTris = new Set();
                    const degenerateList = [];

                    // Walk all triangles
                    for (let i = 0, triIdx = 0; i < indices.length; i += 3, triIdx++) {
                        const i0 = indices[i], i1 = indices[i + 1], i2 = indices[i + 2];
                        // normalize key for uniqueness
                        const key = [i0, i1, i2].sort((a, b) => a - b).join(',');
                        uniqueTris.add(key);

                        // 1) index-dup degeneracy
                        if (i0 === i1 || i1 === i2 || i0 === i2) {
                            degenerateList.push(triIdx);
                            continue;
                        }

                        // 2) collinearity / zero-area degeneracy
                        const [x0, y0, z0] = positions.slice(i0 * 3, i0 * 3 + 3);
                        const [x1, y1, z1] = positions.slice(i1 * 3, i1 * 3 + 3);
                        const [x2, y2, z2] = positions.slice(i2 * 3, i2 * 3 + 3);

                        const ux = x1 - x0, uy = y1 - y0, uz = z1 - z0;
                        const vx = x2 - x0, vy = y2 - y0, vz = z2 - z0;
                        // cross-product
                        const cx = uy * vz - uz * vy;
                        const cy = uz * vx - ux * vz;
                        const cz = ux * vy - uy * vx;
                        const area2 = cx * cx + cy * cy + cz * cz;
                        if (area2 <= tolerance) {
                            degenerateList.push(triIdx);
                        }
                    }

                    // Now compress degenerateList into contiguous intervals
                    degenerateList.sort((a, b) => a - b);
                    const intervals = [];
                    let start = null, end = null;
                    for (const t of degenerateList) {
                        if (start === null) {
                            start = end = t;
                        } else if (t === end + 1) {
                            end = t;
                        } else {
                            intervals.push({ start, end, length: end - start + 1 });
                            start = end = t;
                        }
                    }
                    if (start !== null) intervals.push({ start, end, length: end - start + 1 });

                    // Gather some stats on those runs
                    const runLengths = intervals.map(iv => iv.length);
                    const longestRun = Math.max(...runLengths, 0);
                    const avgRun = runLengths.reduce((s, l) => s + l, 0) / (runLengths.length || 1);

                    // Log results
                    console.log({
                        totalTriangles,
                        uniqueTriangles: uniqueTris.size,
                        degenerateTriangles: degenerateList.length,
                        degenerateRuns: intervals.length,
                        longestDegenerateRun: longestRun,
                        avgDegenerateRunLength: avgRun.toFixed(2),
                        firstIntervals: intervals.slice(0, logFirstIntervals)
                    });
                }

                // Usage:
                // debugMeshAdvanced(indices, positions, {
                //   tolerance: 1e-8,      // if you need a looser zero‐area test
                //   logFirstIntervals: 10 // show up to 10 broken‐triangle intervals
                // });
                // debugger

                // this.output_mesh.setIndices(
                //   indices,
                //   this.cache._cache.bufferSizes.totalPoints,
                //   true
                // )

                
            }
        })
    }
}

class StrandPhysicsManager {
    constructor({ scene, engine, camera, gui }) {
        this.scene = scene
        this.engine = engine
        this.camera = camera
        this.BBHelper = new BoundingInfoAndTransformsHelper(engine)
        this.meshes = {}
        this.gui = gui // an AdvancedTexture
    }

    async initialize() {
        await this.BBHelper._initializePlatform()
    }

    get mesh_array() {
        return Object.values(this.meshes)
    }

    registerMesh(config) {
        this.meshes[config.mesh.uniqueId] = config // config is a MeshStrandPhysicsConfig
        let m = this.meshes[config.mesh.uniqueId]
        
        let { mesh, indices } = m.cache.getOrReuse("basis_geometry", () =>
            m.spawn_strategy.computeBasisGeometry()
        )
        if (DEBUG_MODE){
            m.pcmr = new PointCloudMeshRenderer("debug_" + mesh.uniqueId, this.scene, { parent: mesh, initial_vertex_count: mesh.getTotalVertices() })
        debugger
        }
        
       
        
        // Create utility layer the gizmo will be rendered on

        {
            // Create the gizmo and attach to the box
            var gizmo = new BABYLON.PositionGizmo()
            gizmo.attachedMesh = config.mesh

            // Keep the gizmo fixed to world rotation
            gizmo.updateGizmoRotationToMatchAttachedMesh = true
            gizmo.updateGizmoPositionToMatchAttachedMesh = true
        }

        {
            // Create the gizmo and attach to the box
            var gizmo = new BABYLON.RotationGizmo()
            gizmo.attachedMesh = config.mesh

            // Keep the gizmo fixed to world rotation
            gizmo.updateGizmoRotationToMatchAttachedMesh = true
            gizmo.updateGizmoPositionToMatchAttachedMesh = true
        }
    }

    async runPipeline(mesh_id = null) {
        if (FREEZE) return
        let test = this.BBHelper.computeAsync(
            this.mesh_array.map(e => e.basis_mesh)
        )
        for (let [mesh_id, mesh_config] of Object.entries(this.meshes)) {
            if (mesh_config.LOCKED) continue
            if (!mesh_config.buffers_ready) {
                mesh_config.LOCKED = true
                await test

                let computeShader = mesh_config.getShader()
                 if (SHOW_SLIDERS){
                     
        createSlider(this.gui, `[${mesh_config.mesh.name}]: Iterations`, 1, 60, 20, 1, val => {
            computeShader._bindings.params.object.updateUInt("VERLET_ITERATIONS", val)
            computeShader._bindings.params.object.update()
        })
        }

                let { update } = mesh_config.setupForces()
                mesh_config.update_forces = update
                update()
                computeShader.setStorageBuffer(
                    "UPDATED_ROOT_POSITIONS",
                    this.BBHelper._platform._txPositionBuffers[
                    mesh_config.basis_mesh.uniqueId
                    ]
                )

                computeShader.setStorageBuffer(
                    "UPDATED_ROOT_NORMALS",
                    this.BBHelper._platform._txNormalBuffers[
                    mesh_config.basis_mesh.uniqueId
                    ]
                )
                mesh_config.buffers_ready = true
                mesh_config.LOCKED = false
            } else {
                mesh_config.update_forces()
                mesh_config.tickSimulation()
            }
        }
    }
}



var createScene = async function () {
    var scene = new BABYLON.Scene(engine)

 var groundMat = new BABYLON.PBRMaterial("hair", scene)
    groundMat.albedoColor = BABYLON.Color3.FromHexString("#07140f")
    groundMat.metallic = 0.1
    groundMat.roughness = 0.7 // soft, diffuse look
    groundMat.environmentIntensity = 1.0

    const gui = createGUI()
    var spm = new StrandPhysicsManager({ scene, engine, gui })
    await spm.initialize()

    const forces = [
        new SPGravityForce({ vector: [0, 9.81, 0] }),
        new SPNoiseSimplexForce({ noiseOffset: 12.3, noiseStrength: 5 }),
        new SPPointForce({
            center: [0, 0, 0],
            strength: 0,
            falloffDistance: 1,
            falloffPower: 2
        }),
        // new SPVortexForce({
        //     center:          [0,0,0],
        //     axis:            [0,1,0],
        //         strength:        25.0,
        //         falloffDistance: 15.0,
        //         falloffPower:    .5
        //     })

    ]

    let poly = BABYLON.MeshBuilder.CreatePolyhedron("poly", {
        type: 4,
        size: 0.2
    })
    spm.registerMesh(
        new MeshStrandPhysicsConfig({
            scene,
            mesh: poly,
            strand_properties: new StrandProperties({
                segmentLength: 0.16,
                controlPointsPerStrand: 6,
                crossSectionPoints: 2
            }),
            spawn_strategy: {
                vertex_sampler(mesh) {
                    return {
                        mesh,
                        indices: new Array(mesh.getTotalVertices()).fill(0).map((_, i) => i)
                    }
                },
                vertex_redistributor({ mesh, indices }) {
                    return samplePoissonDiskOnMesh(
                        mesh, // your head
                        indices, // scalp vertices
            /*r=*/ 0.015, // min distance
            /*maxPoints=*/ 500,
            /*maxTries=*/ 30,
                        scene
                    )
                }
            },
            physics_forces: forces
        })
    )

    let poly2 = BABYLON.MeshBuilder.CreatePolyhedron("poly", {
        type: 14,
        size: 2
    })
    poly2.material = groundMat
    poly2.scaling.y = .2
    poly2.scaling.x = .2
    poly2.bakeCurrentTransformIntoVertices()
    poly2.position.x = 3
    poly.position.x = -2
    spm.registerMesh(
        new MeshStrandPhysicsConfig({
            scene,
            mesh: poly2,
            strand_properties: new StrandProperties({
                segmentLength: 0.3,
                controlPointsPerStrand: 4,
                crossSectionPoints: 2,
                scaleFalloff: .3
            }),
            spawn_strategy: {
                vertex_sampler(mesh) {
                    return {
                        mesh,
                        indices: new Array(mesh.getTotalVertices()).fill(0).map((_, i) => i)
                    }
                },
                vertex_redistributor({ mesh, indices }) {
                    return samplePoissonDiskOnMesh(
                        mesh, // your head
                        indices, // scalp vertices
            /*r=*/ 0.015, // min distance
            /*maxPoints=*/ 1000,
            /*maxTries=*/ 30,
                        scene
                    )
                }
            },
            physics_forces: forces
        })
    )

    // Our built-in 'ground' shape.
    var ground = BABYLON.MeshBuilder.CreateGroundFromHeightMap("ground", "textures/heightMap.png", {width: 6, height: 6, subdivisions: 25, maxHeight: 0.1, onReady(mesh) {
// 1. Create PBR material
           

ground.material = groundMat
    spm.registerMesh(
        new MeshStrandPhysicsConfig({
            scene,
            mesh: ground,
            strand_properties: new StrandProperties({
                segmentLength: 0.2,
                controlPointsPerStrand: 3,
                crossSectionPoints: 2,
                tangentScale: 3,
                scaleFalloff: .6
            }),
            spawn_strategy: {
                vertex_sampler(mesh) {
                    return {
                        mesh,
                        indices: new Array(mesh.getTotalVertices()).fill(0).map((_, i) => i)
                    }
                },
                vertex_redistributor({ mesh, indices }) {
                    return samplePoissonDiskOnMesh(
                        mesh, // your head
                        indices, // scalp vertices
            /*r=*/ 0.001, // min distance
            /*maxPoints=*/ 12000,
            /*maxTries=*/ 30,
                        scene
                    )
                }
            },
            physics_forces: forces
        })
    )

    }} );
      
    scene.onBeforeRenderObservable.add(_ => {
        spm.runPipeline()
    })

    var camera = new BABYLON.ArcRotateCamera(
        "camera1",
        0,
        Math.PI / 2,
        5,
        BABYLON.Vector3.Zero(),
        scene
    )
    camera.wheelPrecision = 50
    camera.lowerRadiusLimit = 0.01
    camera.upperRadiusLimit = 20

    camera.position.y = 9.5
    camera.attachControl(canvas, true)
    camera.alpha = 2.4521
    camera.beta = 1.2676
    camera.radius = 5.5990

    // Light setup
    const light = new BABYLON.HemisphericLight(
        "light",
        new BABYLON.Vector3(1, 1, 0),
        scene
    )
    light.intensity = 0.6


createSlider(gui, `Disable update`, 0, 1, 0, 1, val => {
            FREEZE = !FREEZE
        })
    return scene

}

function createArrow(origin, endpoint, scene) {
    // Create an arrow mesh using GreasedLine
    const arrowOrigin = origin
    const arrowEnd = endpoint
    const arrowPoints = [arrowOrigin, arrowEnd]

    let width_mult = 1

    const arrowLine = BABYLON.CreateGreasedLine(
        "arrowLine",
        {
            points: arrowPoints,
            widthDistribution:
                BABYLON.GreasedLineMeshWidthDistribution.WIDTH_DISTRIBUTION_START,
            widths: arrowPoints.map(e => [0.2 * width_mult, 0.2 * width_mult]).flat()
        },
        {
            color: new BABYLON.Color3(0, 1, 0)
        },
        scene
    )

    // Create the arrow cap
    const arrowCap = BABYLON.GreasedLineTools.GetArrowCap(
        arrowEnd,
        BABYLON.Vector3.Down(),
        0.2 * width_mult * 4,
        0.2 * width_mult * 4,
        0.2 * width_mult * 4
    )

    BABYLON.CreateGreasedLine(
        "arrowCap",
        {
            points: arrowCap.points,
            widths: arrowCap.widths,
            widthDistribution:
                BABYLON.GreasedLineMeshWidthDistribution.WIDTH_DISTRIBUTION_START,
            instance: arrowLine
        },
        scene
    )

    // Add interactivity: Rotate the arrow
    arrowLine.rotationQuaternion = new BABYLON.Quaternion()
    // arrowLine.rotation.z = 0;

    return arrowLine
}

const WGSL_SHADERS = {
    HELPERS: `
    // Transforms a point (w=1.0) by a 4×4 matrix and returns the resulting vec3
fn txVec3ByMat4(m: mat4x4<f32>, v: vec3<f32>) -> vec3<f32> {
    return (m * vec4<f32>(v, 1.0)).xyz;
}
    `,
    HERMITE: `
    fn hermiteTangent(
    p0: vec3<f32>, 
    p1: vec3<f32>, 
    t0: vec3<f32>, 
    t1: vec3<f32>, 
    t: f32, 
    tangentScale: f32
) -> vec3<f32> {
    let h00_derivative = 6.0 * t * t - 6.0 * t;
    let h10_derivative = 3.0 * t * t - 4.0 * t + 1.0;
    let h01_derivative = -6.0 * t * t + 6.0 * t;
    let h11_derivative = 3.0 * t * t - 2.0 * t;

    return h00_derivative * p0
        + h10_derivative * (tangentScale * t0)
        + h01_derivative * p1
        + h11_derivative * (tangentScale * t1);
}


    fn hermite(p0: vec3<f32>, p1: vec3<f32>, t0: vec3<f32>, t1: vec3<f32>, t: f32, tangentScale: f32) -> vec3<f32> {
    // Scale tangents
    let scaledT0 = t0 * tangentScale;
    let scaledT1 = t1 * tangentScale;

    // Hermite basis functions
    let t2 = t * t;
    let t3 = t2 * t;
    let h00 = 2.0 * t3 - 3.0 * t2 + 1.0;
    let h10 = t3 - 2.0 * t2 + t;
    let h01 = -2.0 * t3 + 3.0 * t2;
    let h11 = t3 - t2;

    // Compute interpolated position
    return p0 * h00 + scaledT0 * h10 + p1 * h01 + scaledT1 * h11;
}
`,
    SIMPLEX_NOISE: `
// Modified from the amazing original:


// psrdnoise (c) 2021 Stefan Gustavson and Ian McEwan
// Published under the MIT license.
// https://github.com/stegu/psrdnoise/
    
fn mod289v4f(i: vec4<f32>) -> vec4<f32> {
	return i - floor(i / 289.0) * 289.0;
}

fn permute289v4f(i: vec4<f32>) -> vec4<f32>
{
	var im: vec4<f32> = mod289v4f(i);
	return mod289v4f((im*34.0 + 10.0)*im);
}

fn mod289v4f_psrn(i: vec4<f32>) -> vec4<f32> {
	return i - floor(i / 289.0) * 289.0;
}


fn permute289v4f_psrn(i: vec4<f32>) -> vec4<f32>
{
	var im: vec4<f32> = mod289v4f_psrn(i);
	return mod289v4f_psrn((im*34.0 + 10.0)*im);
}


fn snoise3(x: vec3<f32>) -> f32
{
	let M = mat3x3<f32>(0.0, 1.0, 1.0, 1.0, 0.0, 1.0,  1.0, 1.0, 0.0);
	let Mi = mat3x3<f32>(-0.5, 0.5, 0.5, 0.5,-0.5, 0.5, 0.5, 0.5,-0.5);

	var uvw: vec3<f32>;
	var i0: vec3<f32>;
	var i1: vec3<f32>;
	var i2: vec3<f32>;
	var i3: vec3<f32>;
	var f0: vec3<f32>;
	var gt_: vec3<f32>;
	var lt_: vec3<f32>;
	var gt: vec3<f32>;
	var lt: vec3<f32>;
	var o1: vec3<f32>;
	var o2: vec3<f32>;
	var v0: vec3<f32>;
	var v1: vec3<f32>;
	var v2: vec3<f32>;
	var v3: vec3<f32>;
	var x0: vec3<f32>;
	var x1: vec3<f32>;
	var x2: vec3<f32>;
	var x3: vec3<f32>;
	
	uvw = M * x;
	i0 = floor(uvw);
	f0 = uvw - i0;
	gt_ = step(f0.xyx, f0.yzz);
	lt_ = 1.0 - gt_;
	gt = vec3<f32>(lt_.z, gt_.xy);
	lt = vec3<f32>(lt_.xy, gt_.z);
	o1 = min( gt, lt );
	o2 = max( gt, lt );
	i1 = i0 + o1;
	i2 = i0 + o2;
	i3 = i0 + vec3<f32>(1.0,1.0,1.0);
	v0 = Mi * i0;
	v1 = Mi * i1;
	v2 = Mi * i2;
	v3 = Mi * i3;
	x0 = x - v0;
	x1 = x - v1;
	x2 = x - v2;
	x3 = x - v3;
	
	var hash: vec4<f32>;
	var theta: vec4<f32>;
	var sz: vec4<f32>;
	var psi: vec4<f32>;
	var St: vec4<f32>;
	var Ct: vec4<f32>;
	var sz_: vec4<f32>;

	hash = permute289v4f( permute289v4f( permute289v4f( 
		vec4<f32>(i0.z, i1.z, i2.z, i3.z ))
		+ vec4<f32>(i0.y, i1.y, i2.y, i3.y ))
		+ vec4<f32>(i0.x, i1.x, i2.x, i3.x ));
	theta = hash * 3.883222077;
	sz = hash * -0.006920415 + 0.996539792;
	psi = hash * 0.108705628;
	Ct = cos(theta);
	St = sin(theta);
	sz_ = sqrt( 1.0 - sz*sz );

	var gx: vec4<f32>;
	var gy: vec4<f32>;
	var gz: vec4<f32>;

	gx = Ct * sz_;
	gy = St * sz_;
	gz = sz;  
	
	var g0: vec3<f32>;
	var g1: vec3<f32>;
	var g2: vec3<f32>;
	var g3: vec3<f32>;
	var w: vec4<f32>;
	var w2: vec4<f32>;
	var w3: vec4<f32>;
	var gdotx: vec4<f32>;
	var n: f32;
	
	g0 = vec3<f32>(gx.x, gy.x, gz.x);
	g1 = vec3<f32>(gx.y, gy.y, gz.y);
	g2 = vec3<f32>(gx.z, gy.z, gz.z);
	g3 = vec3<f32>(gx.w, gy.w, gz.w);
	w = 0.5 - vec4<f32>(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3));
	w = max(w, vec4<f32>(0.0, 0.0, 0.0, 0.0));
	w2 = w * w;
	w3 = w2 * w;
	gdotx = vec4<f32>(dot(g0,x0), dot(g1,x1), dot(g2,x2), dot(g3,x3));
	n = dot(w3, gdotx);
	
	return 39.5 * n;
}



fn fBm(p: vec3f) -> f32 {
    var value: f32 = 0.0;
    var amplitude: f32 = 0.9;
    var frequency: f32 = 0.5;
    
    for (var i: i32 = 0; i < params.octaves; i++) {
        value += (f32(i) * 0.001) + (amplitude * snoise3(p * frequency));
        frequency *= (f32(i) * 0.05) + 2.0;
        amplitude *= (f32(i) * 0.05) + 0.5;
    }
    
    return value;
}

struct NG3 {
	noise: f32,
	gradient: vec3<f32>
};
// Requires you to have a time uniform, e.g.:
// struct Uniforms { time: f32; };
// @group(0) @binding(0) var<uniform> u : Uniforms;
fn psrdnoise3(x: vec3<f32>, p: vec3<f32>, alpha: f32) -> NG3 {
    let M  = mat3x3<f32>(
        0.0, 1.0, 1.0,
        1.0, 0.0, 1.0,
        1.0, 1.0, 0.0
    );
    let Mi = mat3x3<f32>(
       -0.5,  0.5,  0.5,
        0.5, -0.5,  0.5,
        0.5,  0.5, -0.5
    );

    var uvw: vec3<f32>;
    var i0:  vec3<f32>;
    var i1:  vec3<f32>;
    var i2:  vec3<f32>;
    var i3:  vec3<f32>;
    var f0:  vec3<f32>;
    var gt_: vec3<f32>;
    var lt_: vec3<f32>;
    var gt:  vec3<f32>;
    var lt:  vec3<f32>;
    var o1:  vec3<f32>;
    var o2:  vec3<f32>;
    var v0:  vec3<f32>;
    var v1:  vec3<f32>;
    var v2:  vec3<f32>;
    var v3:  vec3<f32>;
    var x0:  vec3<f32>;
    var x1:  vec3<f32>;
    var x2:  vec3<f32>;
    var x3:  vec3<f32>;

    // simplex lattice coords
    uvw = M * x;
    i0  = floor(uvw);
    f0  = uvw - i0;
    gt_ = step(f0.xyx, f0.yzz);
    lt_ = 1.0 - gt_;
    gt  = vec3<f32>(lt_.z, gt_.xy);
    lt  = vec3<f32>(lt_.xy, gt_.z);
    o1  = min(gt, lt);
    o2  = max(gt, lt);
    i1  = i0 + o1;
    i2  = i0 + o2;
    i3  = i0 + vec3<f32>(1.0, 1.0, 1.0);

    v0 = Mi * i0;
    v1 = Mi * i1;
    v2 = Mi * i2;
    v3 = Mi * i3;

    x0 = x - v0;
    x1 = x - v1;
    x2 = x - v2;
    x3 = x - v3;

    // periodic wrapping
    var vx: vec4<f32>;
    var vy: vec4<f32>;
    var vz: vec4<f32>;
    if (any(p > vec3<f32>(0.0))) {
        vx = vec4<f32>(v0.x, v1.x, v2.x, v3.x);
        vy = vec4<f32>(v0.y, v1.y, v2.y, v3.y);
        vz = vec4<f32>(v0.z, v1.z, v2.z, v3.z);
        if (p.x > 0.0) { vx = vx - floor(vx / p.x) * p.x; }
        if (p.y > 0.0) { vy = vy - floor(vy / p.y) * p.y; }
        if (p.z > 0.0) { vz = vz - floor(vz / p.z) * p.z; }
        i0 = floor(M * vec3<f32>(vx.x, vy.x, vz.x) + 0.5);
        i1 = floor(M * vec3<f32>(vx.y, vy.y, vz.y) + 0.5);
        i2 = floor(M * vec3<f32>(vx.z, vy.z, vz.z) + 0.5);
        i3 = floor(M * vec3<f32>(vx.w, vy.w, vz.w) + 0.5);
    }

    // hash & base spherical gradient basis
    var hash:  vec4<f32>;
    var theta: vec4<f32>;
    var sz:    vec4<f32>;
    var psi:   vec4<f32>;
    var St:    vec4<f32>;
    var Ct:    vec4<f32>;
    var sz_:   vec4<f32>;

    hash = permute289v4f(
        permute289v4f(
            permute289v4f(vec4<f32>(i0.z, i1.z, i2.z, i3.z))
          + vec4<f32>(i0.y, i1.y, i2.y, i3.y))
      + vec4<f32>(i0.x, i1.x, i2.x, i3.x)
    );

    // ——— Time-varying seed oscillation ———
    let phaseOff = fract(hash * vec4<f32>(7.3, 13.1, 17.7, 23.5))
                   * 6.28318530718;
    let freq = mix(
        vec4<f32>(0.5),
        vec4<f32>(6.5),
        fract(hash * vec4<f32>(3.5, 5.5, 7.5, 11.5))
    );
    let osc = sin(params.noiseOffset * freq + phaseOff) * 0.5;   // ±0.5 offset
    let dh  = fract(hash + osc);                    // dynamic hash

    theta = dh * 3.883222077;
    sz    = dh * -0.006920415 + 0.996539792;
    psi   = dh * 0.108705628;
    Ct    = cos(theta);
    St    = sin(theta);
    sz_   = sqrt(1.0 - sz * sz);

    // gradient & rotation setup
    var gx:  vec4<f32>;
    var gy:  vec4<f32>;
    var gz:  vec4<f32>;
    var px:  vec4<f32>;
    var py:  vec4<f32>;
    var pz:  vec4<f32>;
    var Sp:  vec4<f32>;
    var Cp:  vec4<f32>;
    var Ctp: vec4<f32>;
    var qx:  vec4<f32>;
    var qy:  vec4<f32>;
    var qz:  vec4<f32>;
    var Sa:  vec4<f32>;
    var Ca:  vec4<f32>;

   
        gx = Ct * sz_;
        gy = St * sz_;
        gz = sz;
    

    // unpack & fade
    let g0 = vec3<f32>(gx.x, gy.x, gz.x);
    let g1 = vec3<f32>(gx.y, gy.y, gz.y);
    let g2 = vec3<f32>(gx.z, gy.z, gz.z);
    let g3 = vec3<f32>(gx.w, gy.w, gz.w);

    var w  = 0.5 - vec4<f32>(
        dot(x0, x0),
        dot(x1, x1),
        dot(x2, x2),
        dot(x3, x3)
    );
    w = max(w, vec4<f32>(0.0));
    var w2 = w * w;
    var w3 = w2 * w;
    var gdotx = vec4<f32>(
        dot(g0, x0),
        dot(g1, x1),
        dot(g2, x2),
        dot(g3, x3)
    );

    let n = 39.5 * dot(w3, gdotx);

    // derivatives
    var dw  = -6.0 * w2 * gdotx;
    var dn0 = w3.x * g0 + dw.x * x0;
    var dn1 = w3.y * g1 + dw.y * x1;
    var dn2 = w3.z * g2 + dw.z * x2;
    var dn3 = w3.w * g3 + dw.w * x3;
    let g   = 39.5 * (dn0 + dn1 + dn2 + dn3);

    return NG3(n, g);
}
`
}

function checkComputeShadersSupported(engine, scene) {
    const supportCS = engine.getCaps().supportComputeShaders

    if (supportCS) {
        return true
    }

    var panel = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(
        "UI",
        true,
        scene
    )

    const textNOk =
        "**Use WebGPU to watch this demo which requires compute shaders support. To enable WebGPU please use Edge Canary or Chrome canary. Also, select the WebGPU engine from the top right drop down menu.**"

    var info = new BABYLON.GUI.TextBlock()
    info.text = textNOk
    info.width = "100%"
    info.paddingLeft = "5px"
    info.paddingRight = "5px"
    info.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER
    info.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER
    info.color = supportCS ? "green" : "red"
    info.fontSize = supportCS ? "18px" : "24px"
    info.fontStyle = supportCS ? "" : "bold"
    info.textWrapping = true
    panel.addControl(info)

    return false
}

function generateTendrilsFromMeshUsingIndices(
    mesh,
    SEGMENT_LENGTH,
    controlPointsPerStrand,
    spawnIndices
) {
    // Get the vertex positions and normals from the mesh.
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
    const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind)
    // Use the origin as a fallback center if normals are missing.
    const center = new BABYLON.Vector3(0, 0, 0)

    // Arrays to hold tendril data.
    const tendrilPositions = []
    const tendrilPreviousPositions = []
    const tendrilMeta = []
    const vertexToControlPointMap = []
    let activeTendrilCount = 0

    // Iterate over the provided spawnIndices.
    for (let i = 0; i < spawnIndices.length; i++) {
        const vertexIndex = spawnIndices[i]
        const x = positions[vertexIndex * 3]
        const y = positions[vertexIndex * 3 + 1]
        const z = positions[vertexIndex * 3 + 2]

        // Map this vertex index to the corresponding control point index.
        const rootControlPointIndex =
            activeTendrilCount * controlPointsPerStrand * 3
        vertexToControlPointMap.push({
            vertexIndex: vertexIndex,
            controlPointIndex: rootControlPointIndex
        })
        activeTendrilCount++

        // Determine the normal for this vertex.
        let normalX, normalY, normalZ
        if (normals[vertexIndex * 3] === undefined) {
            // If normals are missing, compute one based on the direction from the center.
            const direction = new BABYLON.Vector3(x, y, z)
                .subtract(center)
                .normalize()
            normalX = direction.x
            normalY = direction.y
            normalZ = direction.z
            // Optionally store the calculated normal back.
            normals[vertexIndex * 3] = normalX
            normals[vertexIndex * 3 + 1] = normalY
            normals[vertexIndex * 3 + 2] = normalZ
        } else {
            normalX = normals[vertexIndex * 3]
            normalY = normals[vertexIndex * 3 + 1]
            normalZ = normals[vertexIndex * 3 + 2]
        }

        // Create a root position and normal vector.
        const rootPosition = new BABYLON.Vector3(x, y, z)
        const rootNormal = new BABYLON.Vector3(normalX, normalY, normalZ)

        // Initialize control points for the tendril along the direction of rootNormal.
        for (let j = 0; j < controlPointsPerStrand; j++) {
            const distance = SEGMENT_LENGTH * j // Fixed segment length.
            const tendrilPosition = rootPosition.add(rootNormal.scale(distance))
            tendrilPositions.push(
                tendrilPosition.x,
                tendrilPosition.y,
                tendrilPosition.z
            )
            // Initial previous positions are set equal to the starting positions.
            tendrilPreviousPositions.push(
                tendrilPosition.x,
                tendrilPosition.y,
                tendrilPosition.z
            )
        }

        // Store tendril metadata (here the root normal and a placeholder value).
        tendrilMeta.push(rootNormal.x, rootNormal.y, rootNormal.z, 0)
    }

    return {
        tendrilPositions: new Float32Array(tendrilPositions),
        tendrilPreviousPositions: new Float32Array(tendrilPreviousPositions),
        tendrilMeta: new Float32Array(tendrilMeta),
        vertexToControlPointMap: vertexToControlPointMap,
        activeTendrilCount: activeTendrilCount,
        sampleCount: tendrilPositions.length / 3
    }
}

class BoundingInfoAndTransformsHelper extends BABYLON.BoundingInfoHelper {
    async _initializePlatform() {
        if (!this._platform) {
            if (this._engine.getCaps().supportComputeShaders) {
                this._platform = new ComputeShaderBoundingAndTransformsHelper(
                    this._engine
                )
            } else if (this._engine.getCaps().supportTransformFeedbacks) {
                // const module = await import("./transformFeedbackBoundingHelper");
                // this._platform = new module.TransformFeedbackBoundingHelper(this._engine);
            } else {
                throw new Error("Your engine does not support Compute Shaders")
            }
        }
    }
}

class ComputeShaderBoundingAndTransformsHelper extends BABYLON.ComputeShaderBoundingHelper {
    constructor(engine) {
        super(engine)
        this._txPositionBuffers = {}
        this._normalBuffers = {}
        this._txNormalBuffers = {}
        this._txSelectedIndicesBuffers = {}
    }

    setCustomVertexIndices(indicesArray) {
        this.customSelectedIndices = indicesArray
    }

    processMeshList() {
        if (this._processedMeshes.length === 0) {
            return
        }

        this._uboIndex = 0

        const resultDataSize = 8 * this._processedMeshes.length
        const resultData = new Float32Array(resultDataSize)

        const resultBuffer = new BABYLON.StorageBuffer(
            this._engine,
            Float32Array.BYTES_PER_ELEMENT * resultDataSize
        )
        this._resultBuffers.push(resultBuffer)

        for (let i = 0; i < this._processedMeshes.length; i++) {
            resultData[i * 8 + 0] = Number.POSITIVE_INFINITY
            resultData[i * 8 + 1] = Number.POSITIVE_INFINITY
            resultData[i * 8 + 2] = Number.POSITIVE_INFINITY

            resultData[i * 8 + 3] = Number.NEGATIVE_INFINITY
            resultData[i * 8 + 4] = Number.NEGATIVE_INFINITY
            resultData[i * 8 + 5] = Number.NEGATIVE_INFINITY
        }

        resultBuffer.update(resultData)

        for (let i = 0; i < this._processedMeshes.length; i++) {
            const mesh = this._processedMeshes[i]
            const vertexCount = mesh.getTotalVertices()

            const computeShaders = this._computeShaders[i]
            const computeShaderWithoutMorph = computeShaders[0]
            const computeShaderWithMorph = computeShaders[1]

            const manager = mesh.morphTargetManager
            const hasMorphs =
                manager && manager.numInfluencers > 0 && manager.supportsPositions
            const computeShader = hasMorphs
                ? computeShaderWithMorph
                : computeShaderWithoutMorph

            this._extractDataAndLink(
                computeShader,
                mesh,
                BABYLON.VertexBuffer.PositionKind,
                3,
                "positionBuffer",
                this._positionBuffers
            )
            this._extractDataAndLink(
                computeShader,
                mesh,
                BABYLON.VertexBuffer.NormalKind,
                3,
                "normalBuffer",
                this._normalBuffers
            )
            // Bones
            if (
                mesh &&
                mesh.useBones &&
                mesh.computeBonesUsingShaders &&
                mesh.skeleton &&
                mesh.skeleton.useTextureToStoreBoneMatrices
            ) {
                this._extractDataAndLink(
                    computeShader,
                    mesh,
                    BABYLON.VertexBuffer.MatricesIndicesKind,
                    4,
                    "indexBuffer",
                    this._indexBuffers
                )
                this._extractDataAndLink(
                    computeShader,
                    mesh,
                    BABYLON.VertexBuffer.MatricesWeightsKind,
                    4,
                    "weightBuffer",
                    this._weightBuffers
                )
                const boneSampler = mesh.skeleton.getTransformMatrixTexture(mesh)
                computeShader.setTexture("boneSampler", boneSampler, false)
                if (mesh.numBoneInfluencers > 4) {
                    this._extractDataAndLink(
                        computeShader,
                        mesh,
                        BABYLON.VertexBuffer.MatricesIndicesExtraKind,
                        4,
                        "indexExtraBuffer",
                        this._indexExtraBuffers
                    )
                    this._extractDataAndLink(
                        computeShader,
                        mesh,
                        BABYLON.VertexBuffer.MatricesWeightsExtraKind,
                        4,
                        "weightExtraBuffer",
                        this._weightExtraBuffers
                    )
                }
            }

            const ubo = this._getUBO()

            // Morphs
            if (hasMorphs) {
                const morphTargets = manager._targetStoreTexture
                computeShader.setTexture("morphTargets", morphTargets, false)

                this._prepareStorage(
                    computeShader,
                    "morphTargetInfluences",
                    mesh.uniqueId,
                    this._morphTargetInfluenceBuffers,
                    manager.numInfluencers,
                    manager.influences
                )
                this._prepareStorage(
                    computeShader,
                    "morphTargetTextureIndices",
                    mesh.uniqueId,
                    this._morphTargetTextureIndexBuffers,
                    manager.numInfluencers,
                    manager._morphTargetTextureIndices
                )

                ubo.updateFloat3(
                    "morphTargetTextureInfo",
                    manager._textureVertexStride,
                    manager._textureWidth,
                    manager._textureHeight
                )
                ubo.updateInt("morphTargetCount", manager.numInfluencers)
                ubo.update()
            }

            computeShader.setStorageBuffer("resultBuffer", resultBuffer)
            if (this.customSelectedIndices) {
                this._prepareStorage(
                    computeShader,
                    "selectedIndices",
                    mesh.uniqueId,
                    this._txSelectedIndicesBuffers,
                    this.customSelectedIndices.length,
                    new Uint32Array(this.customSelectedIndices),
                    BABYLON.Constants.BUFFER_CREATIONFLAG_VERTEX |
                    BABYLON.Constants.BUFFER_CREATIONFLAG_READWRITE
                )
            } else {
                this._prepareStorage(
                    computeShader,
                    "selectedIndices",
                    mesh.uniqueId,
                    this._txSelectedIndicesBuffers,
                    vertexCount,
                    new Uint32Array(new Array(vertexCount).fill(0).map((e, i) => i)),
                    BABYLON.Constants.BUFFER_CREATIONFLAG_VERTEX |
                    BABYLON.Constants.BUFFER_CREATIONFLAG_READWRITE
                )
            }

            this._prepareStorage(
                computeShader,
                "transformedNormals",
                mesh.uniqueId,
                this._txNormalBuffers,
                vertexCount * 3,
                null,
                BABYLON.Constants.BUFFER_CREATIONFLAG_VERTEX |
                BABYLON.Constants.BUFFER_CREATIONFLAG_READWRITE
            )
            this._prepareStorage(
                computeShader,
                "transformedPositions",
                mesh.uniqueId,
                this._txPositionBuffers,
                vertexCount * 3,
                null,
                BABYLON.Constants.BUFFER_CREATIONFLAG_VERTEX |
                BABYLON.Constants.BUFFER_CREATIONFLAG_READWRITE
            )

            computeShader.setUniformBuffer("settings", ubo)

            // Dispatch
            computeShader.dispatch(Math.ceil(vertexCount / 256))

            this._engine.flushFramebuffer()
        }
    }

    _prepareStorage(
        computeShader,
        name,
        id,
        storageUnit,
        numInfluencers,
        data,
        flags
    ) {
        let buffer

        if (!storageUnit[id]) {
            buffer = flags
                ? new BABYLON.StorageBuffer(
                    this._engine,
                    Float32Array.BYTES_PER_ELEMENT * numInfluencers,
                    flags
                )
                : new BABYLON.StorageBuffer(
                    this._engine,
                    Float32Array.BYTES_PER_ELEMENT * numInfluencers
                )
            storageUnit[id] = buffer
        } else {
            buffer = storageUnit[id]
        }
        if (data) buffer.update(data)

        computeShader.setStorageBuffer(name, buffer)
    }

    _getComputeShader(defines, hasBones, hasMorphs) {
        let computeShader
        const join = defines.join("\n")

        if (!this._computeShadersCacheA[join]) {
            const bindingsMapping = {
                positionBuffer: { group: 0, binding: 0 },
                normalBuffer: { group: 0, binding: 13 },
                resultBuffer: { group: 0, binding: 1 },
                settings: { group: 0, binding: 7 },
                transformedPositions: { group: 0, binding: 11 },
                transformedNormals: { group: 0, binding: 12 },
                selectedIndices: { group: 0, binding: 14 }
            }

            if (hasBones) {
                bindingsMapping.boneSampler = { group: 0, binding: 2 }
                bindingsMapping.indexBuffer = { group: 0, binding: 3 }
                bindingsMapping.weightBuffer = { group: 0, binding: 4 }
                bindingsMapping.indexExtraBuffer = { group: 0, binding: 5 }
                bindingsMapping.weightExtraBuffer = { group: 0, binding: 6 }
            }
            if (hasMorphs) {
                bindingsMapping.morphTargets = { group: 0, binding: 8 }
                bindingsMapping.morphTargetInfluences = { group: 0, binding: 9 }
                bindingsMapping.morphTargetTextureIndices = { group: 0, binding: 10 }
            }

            computeShader = new BABYLON.ComputeShader(
                `boundingInfoCompute${hasBones ? "_bones" : ""}${hasMorphs ? "_morphs" : ""
                }`,
                this._engine,
                { computeSource: INJECTED_BB_COMPUTE_SHADER },
                {
                    bindingsMapping,
                    defines: defines
                }
            )
            this._computeShadersCacheA[join] = computeShader
        } else {
            computeShader = this._computeShadersCacheA[join]
        }

        return computeShader
    }
}

// Exactly the same as https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/ShadersWGSL/boundingInfo.compute.fx
// except with minor injections (changes are in template expressions ${}) to write out the full positions
const INJECTED_BB_COMPUTE_SHADER = ` // Exactly the same as https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/ShadersWGSL/boundingInfo.compute.fx
// except with minor injections (changes are in template expressions ) to write out the full positions
// and now handling normals as well.

struct Results {
  minX : atomic<i32>,
  minY : atomic<i32>,
  minZ : atomic<i32>,
  maxX : atomic<i32>,
  maxY : atomic<i32>,
  maxZ : atomic<i32>,
  dummy1 : i32,
  dummy2 : i32,
};

fn floatToBits(value: f32) -> i32 {
    return bitcast<i32>(value);
}

fn bitsToFloat(value: i32) -> f32 {
    return bitcast<f32>(value);
}

fn atomicMinFloat(atomicVar: ptr<storage, atomic<i32>, read_write>, value: f32) {
    let intValue = floatToBits(value);
    loop {
        let oldIntValue = atomicLoad(atomicVar);
        let oldValue = bitsToFloat(oldIntValue);
        if (value >= oldValue) {
            break;
        }
        if (atomicCompareExchangeWeak(atomicVar, oldIntValue, intValue).old_value == oldIntValue) {
            break;
        }
    }
}

fn atomicMaxFloat(atomicVar: ptr<storage, atomic<i32>, read_write>, value: f32) {
    let intValue = floatToBits(value);
    loop {
        let oldIntValue = atomicLoad(atomicVar);
        let oldValue = bitsToFloat(oldIntValue);
        if (value <= oldValue) {
            break;
        }
        if (atomicCompareExchangeWeak(atomicVar, oldIntValue, intValue).old_value == oldIntValue) {
            break;
        }
    }
}

fn readMatrixFromRawSampler(smp : texture_2d<f32>, index : f32) -> mat4x4<f32> {
    let offset = i32(index) * 4;	
    let m0 = textureLoad(smp, vec2<i32>(offset + 0, 0), 0);
    let m1 = textureLoad(smp, vec2<i32>(offset + 1, 0), 0);
    let m2 = textureLoad(smp, vec2<i32>(offset + 2, 0), 0);
    let m3 = textureLoad(smp, vec2<i32>(offset + 3, 0), 0);
    return mat4x4<f32>(m0, m1, m2, m3);
}

const identity = mat4x4f(
    vec4f(1.0, 0.0, 0.0, 0.0),
    vec4f(0.0, 1.0, 0.0, 0.0),
    vec4f(0.0, 0.0, 1.0, 0.0),
    vec4f(0.0, 0.0, 0.0, 1.0)
);

struct Settings {
    morphTargetTextureInfo: vec3f,
    morphTargetCount: i32,
    indexResult : u32,
};

@group(0) @binding(0) var<storage, read> positionBuffer : array<f32>;
// New normals input buffer.
@group(0) @binding(13) var<storage, read> normalBuffer : array<f32>;

@group(0) @binding(1) var<storage, read_write> resultBuffer : array<Results>;
@group(0) @binding(7) var<uniform> settings : Settings;

#if NUM_BONE_INFLUENCERS > 0
  @group(0) @binding(2) var boneSampler : texture_2d<f32>;
  @group(0) @binding(3) var<storage, read> indexBuffer :  array<vec4f>;
  @group(0) @binding(4) var<storage, read> weightBuffer : array<vec4f>;
  #if NUM_BONE_INFLUENCERS > 4
    @group(0) @binding(5) var<storage, read> indexExtraBuffer : array<vec4f>;
    @group(0) @binding(6) var<storage, read> weightExtraBuffer : array<vec4f>;
  #endif
#endif

#ifdef MORPHTARGETS
@group(0) @binding(8) var morphTargets : texture_2d_array<f32>;
@group(0) @binding(9) var<storage, read> morphTargetInfluences : array<f32>;
@group(0) @binding(10) var<storage, read> morphTargetTextureIndices : array<f32>;
#endif

#ifdef MORPHTARGETS
fn readVector3FromRawSampler(targetIndex : i32, vertexIndex : u32) -> vec3f {			
    let vertexID = f32(vertexIndex) * settings.morphTargetTextureInfo.x;
    let y = floor(vertexID / settings.morphTargetTextureInfo.y);
    let x = vertexID - y * settings.morphTargetTextureInfo.y;
    let textureUV = vec2<i32>(i32(x), i32(y));
    return textureLoad(morphTargets, textureUV, i32(morphTargetTextureIndices[targetIndex]), 0).xyz;
}
#endif

${
  /** INJECTED */ `@group(0) @binding(11) var<storage, read_write> transformedPositions : array<f32>;`
    }
// New output buffer for transformed normals.
${
  /** INJECTED */ `@group(0) @binding(12) var<storage, read_write> transformedNormals : array<f32>;`
    }
${
  /** INJECTED */ `@group(0) @binding(14) var<storage, read_write> selectedIndices : array<u32>;`
    }
@compute @workgroup_size(256, 1, 1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
    var index = selectedIndices[global_id.x]; // read from complete buffer but only selected indices

    if (global_id.x >= arrayLength(&selectedIndices)) {
        return;
    }



    let position = vec3f(
        positionBuffer[index * 3],
        positionBuffer[index * 3 + 1],
        positionBuffer[index * 3 + 2]
    );
    // Read the corresponding normal.
    let normal = vec3f(
        normalBuffer[index * 3],
        normalBuffer[index * 3 + 1],
        normalBuffer[index * 3 + 2]
    );

    var finalWorld = identity;
    var positionUpdated = position;

#if NUM_BONE_INFLUENCERS > 0
      var influence : mat4x4<f32>;
      let matricesIndices = indexBuffer[index];
      let matricesWeights = weightBuffer[index];

      influence = readMatrixFromRawSampler(boneSampler, matricesIndices[0]) * matricesWeights[0];

      #if NUM_BONE_INFLUENCERS > 1
          influence = influence + readMatrixFromRawSampler(boneSampler, matricesIndices[1]) * matricesWeights[1];
      #endif	
      #if NUM_BONE_INFLUENCERS > 2
          influence = influence + readMatrixFromRawSampler(boneSampler, matricesIndices[2]) * matricesWeights[2];
      #endif	
      #if NUM_BONE_INFLUENCERS > 3
          influence = influence + readMatrixFromRawSampler(boneSampler, matricesIndices[3]) * matricesWeights[3];
      #endif	

      #if NUM_BONE_INFLUENCERS > 4
          let matricesIndicesExtra = indexExtraBuffer[index];
          let matricesWeightsExtra = weightExtraBuffer[index];
          influence = influence + readMatrixFromRawSampler(boneSampler, matricesIndicesExtra.x) * matricesWeightsExtra.x;
          #if NUM_BONE_INFLUENCERS > 5
              influence = influence + readMatrixFromRawSampler(boneSampler, matricesIndicesExtra.y) * matricesWeightsExtra.y;
          #endif	
          #if NUM_BONE_INFLUENCERS > 6
              influence = influence + readMatrixFromRawSampler(boneSampler, matricesIndicesExtra.z) * matricesWeightsExtra.z;
          #endif	
          #if NUM_BONE_INFLUENCERS > 7
              influence = influence + readMatrixFromRawSampler(boneSampler, matricesIndicesExtra.w) * matricesWeightsExtra.w;
          #endif	
      #endif	

      finalWorld = finalWorld * influence;
#endif

#ifdef MORPHTARGETS
    for (var i = 0; i < NUM_MORPH_INFLUENCERS; i = i + 1) {
        if (i >= settings.morphTargetCount) {
            break;
        }
        positionUpdated = positionUpdated + (readVector3FromRawSampler(i, index) - position) * morphTargetInfluences[i];
    }
#endif

    var worldPos = finalWorld * vec4f(positionUpdated.x, positionUpdated.y, positionUpdated.z, 1.0);
    // Transform the normal using the same matrix but with w = 0 (to avoid translation) and normalize it.
    var worldNormal = normalize((finalWorld * vec4f(normal, 0.0)).xyz);

    index = global_id.x; // write into compact buffer of only selected vertices
    ${
      /** INJECTED */ `transformedPositions[index * 3] = worldPos.x;
    transformedPositions[(index * 3)+1] = worldPos.y;
    transformedPositions[(index * 3)+2] = worldPos.z;`
    }
    
    ${
      /** INJECTED */ `transformedNormals[index * 3] = worldNormal.x;
    transformedNormals[(index * 3)+1] = worldNormal.y;
    transformedNormals[(index * 3)+2] = worldNormal.z;`
    }

    atomicMinFloat(&resultBuffer[settings.indexResult].minX, worldPos.x);
    atomicMinFloat(&resultBuffer[settings.indexResult].minY, worldPos.y);
    atomicMinFloat(&resultBuffer[settings.indexResult].minZ, worldPos.z);

    atomicMaxFloat(&resultBuffer[settings.indexResult].maxX, worldPos.x);
    atomicMaxFloat(&resultBuffer[settings.indexResult].maxY, worldPos.y);
    atomicMaxFloat(&resultBuffer[settings.indexResult].maxZ, worldPos.z);
}
`

// Helper to check if WebGPU supported
function checkComputeShadersSupported(engine, scene) {
    const supportCS = engine.getCaps().supportComputeShaders

    if (supportCS) {
        return true
    }

    var panel = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(
        "UI",
        true,
        scene
    )

    const textNOk =
        "**Use WebGPU to watch this demo which requires compute shaders support. To enable WebGPU please use Edge Canary or Chrome canary. Also, select the WebGPU engine from the top right drop down menu.**"

    var info = new BABYLON.GUI.TextBlock()
    info.text = textNOk
    info.width = "100%"
    info.paddingLeft = "5px"
    info.paddingRight = "5px"
    info.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER
    info.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER
    info.color = supportCS ? "green" : "red"
    info.fontSize = supportCS ? "18px" : "24px"
    info.fontStyle = supportCS ? "" : "bold"
    info.textWrapping = true
    panel.addControl(info)

    return false
}
class PointCloudMeshRenderer extends BABYLON.TransformNode {

    /**
     * @param {number} initialParticleCount - The initial number of particles.
     * @param {BABYLON.Scene} scene - The BabylonJS scene.
     */
    constructor(name, scene, { initial_vertex_count, parent }) {
        super(name, scene)
        if (parent) this.parent = parent
        this.vertexCount = initial_vertex_count;
    }

    /**
     * Initializes or rebuilds the PointsCloudSystem.
     * @param {Object} options - Options for initialization.
     * @param {BABYLON.StorageBuffer} [options.buffer] - StorageBuffer containing vertex positions.
     * @param {Float32Array} [options.floats] - Float32Array of vertex positions.
     * @returns {Promise}
     */
    async initialize({ buffer, floats, attribute_buffers }) {
        const oldPCS = this.pcs;
        if (!buffer && attribute_buffers) {

            buffer = attribute_buffers.position.buffer
        }
        if (buffer instanceof BABYLON.StorageBuffer) {
            buffer = new BABYLON.VertexBuffer(
                this._scene.getEngine(),
                buffer.getBuffer(),
                BABYLON.VertexBuffer.PositionKind
            );
            this.vertexCount = buffer.getBuffer().capacity / buffer.getSize(true)
        } else if (buffer instanceof BABYLON.VertexBuffer) {

            this.vertexCount = buffer
                ? (buffer.getBuffer().capacity / buffer.getSize(true)) / buffer._size
                : floats.length / 3;
            // it's already in the correct form
        }

        console.log(`Reinitializing PointsCloudSystem with ${this.vertexCount} points`);
        // Create a new PointsCloudSystem instance
        this.pcs = new BABYLON.PointsCloudSystem("pcs", 3, this._scene);

        // Add the initial set of points (default positions at 0)
        this.pcs.addPoints(this.vertexCount);

        return this.pcs.buildMeshAsync().then(pcsMesh => {
            pcsMesh.parent = this
            pcsMesh.hasVertexAlpha = true
            if (attribute_buffers) {
                Object.entries(attribute_buffers).forEach(([buffer_name, store]) => {
                    if (store?.buffer instanceof BABYLON.VertexBuffer) pcsMesh.setVerticesBuffer(store.buffer, false)
                })
            }
            else if (buffer && buffer instanceof BABYLON.VertexBuffer) {
                pcsMesh.setVerticesBuffer(buffer, false);
            } else if (floats) {
                pcsMesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, floats);
            }
            // Dispose of the old mesh after the new one is rendered
            if (oldPCS) {
                oldPCS.mesh.isVisible = false;
                this._scene.onAfterRenderObservable.addOnce(() => {
                    oldPCS.dispose();
                });
            }
        });
    }

    /**
     * Updates the particle positions directly or by setting a buffer.
     * If the new data contains a different number of vertices, the mesh is rebuilt.
     *
     * @param {BABYLON.StorageBuffer | Float32Array | number[]} positionsData - The new vertex positions.
     */
    render(positionsData, attribute_buffers) {
        if (!positionsData && attribute_buffers) {
            positionsData = attribute_buffers.position.buffer
        }

        let buffer, floats;


        // Determine the input data type
        if (positionsData instanceof BABYLON.StorageBuffer) {
            buffer = new BABYLON.VertexBuffer(
                this._scene.getEngine(),
                positionsData.getBuffer(),
                BABYLON.VertexBuffer.PositionKind
            );
        } else if (positionsData instanceof BABYLON.VertexBuffer) {
            buffer = positionsData
        } else if (positionsData instanceof Float32Array) {
            floats = positionsData;
        } else if (Array.isArray(positionsData)) {
            floats = new Float32Array(positionsData);
        } else {
            // Exit if the provided data is invalid
            return;
        }



        // Calculate the new vertex count
        const newVertexCount = buffer
            ? (buffer.getBuffer().capacity / buffer.getSize(true)) / buffer._size
            : floats.length / 3;

        // Reinitialize the mesh if the vertex count has changed
        if (newVertexCount !== this.vertexCount) {
            this.vertexCount = newVertexCount;
            this.initialize({ buffer, floats });
        } else {
            if (attribute_buffers) {
                Object.entries(attribute_buffers).forEach(([buffer_name, store]) => {
                    if (store?.buffer instanceof BABYLON.VertexBuffer) this.pcs.mesh.setVerticesBuffer(store.buffer, false)
                })
            } else if (buffer) {
                this.pcs.mesh.setVerticesBuffer(buffer, false);
            } else if (floats) {
                this.pcs.mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, floats);
            }
        }
    }
}

function findScalpPoints(mesh, centerOffset, upDirVector, radius) {
    const scene = mesh.getScene()

    // Normalize the up direction vector.
    const upDir = upDirVector.normalize()

    // --- Debug: Create a wireframe sphere to visualize the reference sphere ---
    // The debug sphere is centered at centerOffset with a diameter of 2*radius.
    const debugSphere = BABYLON.MeshBuilder.CreateSphere(
        "debugSphere",
        { diameter: radius * 2, segments: 16 },
        scene
    )
    debugSphere.position = centerOffset
    const debugMaterial = new BABYLON.StandardMaterial("debugMaterial", scene)
    debugMaterial.wireframe = true
    debugMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0) // red color for visibility
    debugSphere.material = debugMaterial
    // --------------------------------------------------------------------------

    // Retrieve the vertex positions from the mesh.
    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
    if (!positions) {
        console.warn("Mesh does not contain vertex position data.")
        return []
    }

    const scalpIndices = []

    // Loop through each vertex (each vertex has 3 components: x, y, z)
    for (let i = 0; i < positions.length; i += 3) {
        const vertex = new BABYLON.Vector3(
            positions[i],
            positions[i + 1],
            positions[i + 2]
        )

        // Let D be the vector from the sphere's center to the vertex.
        const D = vertex.subtract(centerOffset)

        // Compute the projection of D along the up direction.
        const dUp = BABYLON.Vector3.Dot(D, upDir)

        // Our ray: origin = vertex, direction = -upDir. We need to see if this ray
        // (i.e. V - t * upDir, for t >= 0) intersects the sphere:
        //   ||(vertex - t*upDir) - centerOffset||² = radius²
        // Expanding gives a quadratic in t:
        //   t² - 2*(D·upDir)*t + (||D||² - radius²) = 0
        // Compute its discriminant:
        const Dsq = D.lengthSquared()
        const discriminant = dUp * dUp - (Dsq - radius * radius)

        // If discriminant is negative, the ray misses the sphere.
        if (discriminant < 0) {
            continue
        }

        // The two solutions are:
        //   t = dUp ± sqrt(discriminant)
        // We take the smaller (closer) solution:
        const t = dUp - Math.sqrt(discriminant)

        // If t >= 0, then starting at the sphere (at the intersection point) and moving
        // upward (along upDir) will hit the vertex.
        if (t >= 0) {
            scalpIndices.push(i / 3)
        }
    }

    return scalpIndices
}

function calculateBufferSizes(
    activeTendrilCount,
    meshingParams
) {
    const { curveSamples, crossSectionPoints, controlPointsPerStrand } = meshingParams
    // Number of segments per tendril (control points - 1)
    const segmentCount = controlPointsPerStrand - 1
    // Total interpolated points per tendril.
    const pointsPerTendril = segmentCount * curveSamples * crossSectionPoints
    // Total interpolated points for all tendrils.
    const totalPoints = pointsPerTendril * activeTendrilCount
    // Each vertex has 3 floats (4 bytes each).
    const vertexBufferSize = totalPoints * 3 * 4

    // Each segment generates (curveSamples * crossSectionPoints) quads,
    // each quad uses 6 indices (2 triangles).
    const indicesPerTendril = segmentCount * curveSamples * crossSectionPoints * 6
    const totalIndices = indicesPerTendril * activeTendrilCount
    const indexBufferSize = totalIndices * 4 // 4 bytes per unsigned integer.

    return {
        vertexBufferSize,
        indexBufferSize,
        totalPoints,
        totalIndices
    }
}
/**
 * Uniformly samples points on just the scalp triangles by
 * subdividing each triangle into a barycentric grid.
 *
 * @param {BABYLON.Mesh} originalMesh    The skinned head mesh.
 * @param {number[]} scalpIndices        Array of vertex‐indices on the scalp.
 * @param {number}   spacing             Desired approximate distance between samples.
 * @param {BABYLON.Scene} scene
 * @returns {BABYLON.Mesh}               A new point‐cloud mesh, skinned to same skeleton.
 */
function sampleMeshUniformGrid(
    originalMesh,
    scalpIndices,
    spacing = 0.02,
    scene
) {
    // 1) pull buffers
    const posBuf = originalMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
    const normBuf = originalMesh.getVerticesData(BABYLON.VertexBuffer.NormalKind)
    const idxBuf = originalMesh.getIndices()
    const biBuf =
        originalMesh.getVerticesData(BABYLON.VertexBuffer.MatricesIndicesKind) || []
    const bwBuf =
        originalMesh.getVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind) || []

    const scalpSet = new Set(scalpIndices)
    const outP = [],
        outN = [],
        outBI = [],
        outBW = []
    const v0 = BABYLON.Vector3.Zero(),
        v1 = BABYLON.Vector3.Zero(),
        v2 = BABYLON.Vector3.Zero()
    const n0 = BABYLON.Vector3.Zero(),
        n1 = BABYLON.Vector3.Zero(),
        n2 = BABYLON.Vector3.Zero()

    // 2) for each triangle touching the scalp...
    for (let f = 0; f < idxBuf.length; f += 3) {
        const i0 = idxBuf[f],
            i1 = idxBuf[f + 1],
            i2 = idxBuf[f + 2]
        if (!(scalpSet.has(i0) || scalpSet.has(i1) || scalpSet.has(i2))) continue

        // load verts
        v0.set(posBuf[i0 * 3], posBuf[i0 * 3 + 1], posBuf[i0 * 3 + 2])
        v1.set(posBuf[i1 * 3], posBuf[i1 * 3 + 1], posBuf[i1 * 3 + 2])
        v2.set(posBuf[i2 * 3], posBuf[i2 * 3 + 1], posBuf[i2 * 3 + 2])

        // compute longest edge length
        const L0 = v1.subtract(v0).length()
        const L1 = v2.subtract(v1).length()
        const L2 = v0.subtract(v2).length()
        const Lmax = Math.max(L0, L1, L2)

        // how many subdivisions per edge?
        const N = Math.max(1, Math.ceil(Lmax / spacing))

        // load normals
        n0.set(normBuf[i0 * 3], normBuf[i0 * 3 + 1], normBuf[i0 * 3 + 2])
        n1.set(normBuf[i1 * 3], normBuf[i1 * 3 + 1], normBuf[i1 * 3 + 2])
        n2.set(normBuf[i2 * 3], normBuf[i2 * 3 + 1], normBuf[i2 * 3 + 2])

        // skin slices
        const b0 = biBuf.slice(i0 * 4, i0 * 4 + 4),
            w0 = bwBuf.slice(i0 * 4, i0 * 4 + 4)
        const b1 = biBuf.slice(i1 * 4, i1 * 4 + 4),
            w1 = bwBuf.slice(i1 * 4, i1 * 4 + 4)
        const b2 = biBuf.slice(i2 * 4, i2 * 4 + 4),
            w2 = bwBuf.slice(i2 * 4, i2 * 4 + 4)

        // iterate barycentric grid
        for (let a = 0; a <= N; a++) {
            for (let b = 0; b <= N - a; b++) {
                const c = N - a - b
                const u = a / N,
                    v = b / N,
                    w = c / N

                // position
                const p = v0.scale(u).add(v1.scale(v)).add(v2.scale(w))
                outP.push(p.x, p.y, p.z)

                // normal
                const nn = n0.scale(u).add(n1.scale(v)).add(n2.scale(w)).normalize()
                outN.push(nn.x, nn.y, nn.z)

                // bone indices & weights
                const bi = [0, 0, 0, 0],
                    bw = [0, 0, 0, 0]
                for (let j = 0; j < 4; j++) {
                    bi[j] = b0[j] * u + b1[j] * v + b2[j] * w
                    bw[j] = w0[j] * u + w1[j] * v + w2[j] * w
                }
                // normalize
                const sumW = bw.reduce((s, x) => s + x, 0) || 1
                for (let j = 0; j < 4; j++) bw[j] /= sumW

                outBI.push(...bi)
                outBW.push(...bw)
            }
        }
    }

    // 3) build new mesh
    const sampled = new BABYLON.Mesh("uniformScalp", scene)
    const vd = new BABYLON.VertexData()
    vd.positions = new Float32Array(outP)
    vd.normals = new Float32Array(outN)
    vd.matricesIndices = new Float32Array(outBI)
    vd.matricesWeights = new Float32Array(outBW)
    vd.applyToMesh(sampled, true)
    sampled.isUnIndexed = true

    // 4) skin
    sampled.skeleton = originalMesh.skeleton
    sampled.computeBonesUsingShaders = true

    return sampled
}

/**
 * Samples points on scalp triangles with a uniform barycentric grid,
 * and blends normals with adjacent‐face normals based on distance to edges.
 *
 * @param {BABYLON.Mesh} originalMesh
 * @param {number[]} scalpIndices
 * @param {number} spacing        // target spacing between points
 * @param {number} blendWidth     // how far (in barycentric [0–1]) to blend normals across edges
 * @param {BABYLON.Scene} scene
 * @returns {BABYLON.Mesh}
 */
function sampleMeshWithSmoothNormals(
    originalMesh,
    scalpIndices,
    spacing = 0.02,
    blendWidth = 1,
    scene
) {
    // 1) Pull buffers
    const pos = originalMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
    const idx = originalMesh.getIndices()
    const bi =
        originalMesh.getVerticesData(BABYLON.VertexBuffer.MatricesIndicesKind) || []
    const bw =
        originalMesh.getVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind) || []

    const scalpSet = new Set(scalpIndices)

    // 2) Precompute face normals and build edge→tri adjacency
    const faceNormal = [] // length = idx.length/3, each is Vector3
    const edgeMap = new Map() // key = "i0_i1" sorted, value = [faceIndex,...]

    for (let f = 0, fi = 0; f < idx.length; f += 3, ++fi) {
        const i0 = idx[f],
            i1 = idx[f + 1],
            i2 = idx[f + 2]
        // compute face normal
        const v0 = BABYLON.Vector3.FromArray(pos, i0 * 3)
        const v1 = BABYLON.Vector3.FromArray(pos, i1 * 3)
        const v2 = BABYLON.Vector3.FromArray(pos, i2 * 3)
        const n = BABYLON.Vector3.Cross(
            v1.subtract(v0),
            v2.subtract(v0)
        ).normalize()
        faceNormal[fi] = n
            // register edges
            ;[
                [i0, i1],
                [i1, i2],
                [i2, i0]
            ].forEach(([a, b]) => {
                const key = a < b ? `${a}_${b}` : `${b}_${a}`
                if (!edgeMap.has(key)) edgeMap.set(key, [])
                edgeMap.get(key).push(fi)
            })
    }

    // helper to look up the neighbor face for edge j of face fi
    function getNeighbor(fi, edgeIdx) {
        // edgeIdx: 0→(i0,i1), 1→(i1,i2), 2→(i2,i0)
        const f = fi * 3
        const a = idx[f + edgeIdx]
        const b = idx[f + ((edgeIdx + 1) % 3)]
        const key = a < b ? `${a}_${b}` : `${b}_${a}`
        const adj = edgeMap.get(key) || []
        // return the OTHER face
        return adj.find(x => x !== fi) ?? fi
    }

    const outP = [],
        outN = [],
        outBI = [],
        outBW = []

    // 3) Loop scalp triangles only
    for (let f = 0, fi = 0; f < idx.length; f += 3, ++fi) {
        const [i0, i1, i2] = [idx[f], idx[f + 1], idx[f + 2]]
        if (!(scalpSet.has(i0) || scalpSet.has(i1) || scalpSet.has(i2))) continue

        const v0 = BABYLON.Vector3.FromArray(pos, i0 * 3)
        const v1 = BABYLON.Vector3.FromArray(pos, i1 * 3)
        const v2 = BABYLON.Vector3.FromArray(pos, i2 * 3)
        // longest edge
        const L0 = v1.subtract(v0).length()
        const L1 = v2.subtract(v1).length()
        const L2 = v0.subtract(v2).length()
        const N = Math.max(1, Math.ceil(Math.max(L0, L1, L2) / spacing))

        // grab skin slices
        const b0 = bi.slice(i0 * 4, i0 * 4 + 4),
            w0 = bw.slice(i0 * 4, i0 * 4 + 4)
        const b1 = bi.slice(i1 * 4, i1 * 4 + 4),
            w1 = bw.slice(i1 * 4, i1 * 4 + 4)
        const b2 = bi.slice(i2 * 4, i2 * 4 + 4),
            w2 = bw.slice(i2 * 4, i2 * 4 + 4)

        // prefetch this face’s normal and its three neighbors’
        const fn = faceNormal[fi]
        const nn0 = faceNormal[getNeighbor(fi, 0)]
        const nn1 = faceNormal[getNeighbor(fi, 1)]
        const nn2 = faceNormal[getNeighbor(fi, 2)]

        // 4) sample barycentric grid
        for (let a = 0; a <= N; a++) {
            for (let b = 0; b <= N - a; b++) {
                const c = N - a - b
                const u = a / N,
                    v = b / N,
                    w = c / N
                // position
                const p = v0.scale(u).add(v1.scale(v)).add(v2.scale(w))
                outP.push(p.x, p.y, p.z)

                // smooth‐blend normal
                // each barycentric coord=0 on the opposite edge
                const bd0 = Math.max(0, (blendWidth - u) / blendWidth)
                const bd1 = Math.max(0, (blendWidth - v) / blendWidth)
                const bd2 = Math.max(0, (blendWidth - w) / blendWidth)
                const interior = Math.max(0, 1 - (bd0 + bd1 + bd2))
                const nBlended = fn
                    .scale(interior)
                    .add(nn0.scale(bd0))
                    .add(nn1.scale(bd1))
                    .add(nn2.scale(bd2))
                    .normalize()
                outN.push(nBlended.x, nBlended.y, nBlended.z)

                // skin‐weights
                const biArr = [0, 0, 0, 0],
                    bwArr = [0, 0, 0, 0]
                for (let j = 0; j < 4; j++) {
                    biArr[j] = b0[j] * u + b1[j] * v + b2[j] * w
                    bwArr[j] = w0[j] * u + w1[j] * v + w2[j] * w
                }
                const sumW = bwArr.reduce((s, x) => s + x, 0) || 1
                for (let j = 0; j < 4; j++) bwArr[j] /= sumW
                outBI.push(...biArr)
                outBW.push(...bwArr)
            }
        }
    }

    // 5) build and skin new mesh
    const sampled = new BABYLON.Mesh("smoothScalp", scene)
    const vd = new BABYLON.VertexData()
    vd.positions = new Float32Array(outP)
    vd.normals = new Float32Array(outN)
    vd.matricesIndices = new Float32Array(outBI)
    vd.matricesWeights = new Float32Array(outBW)
    vd.applyToMesh(sampled, true)
    sampled.isUnIndexed = true
    sampled.skeleton = originalMesh.skeleton
    sampled.computeBonesUsingShaders = true

    return sampled
}

// feed `smoothScalpMesh` into your bounding/transforms helper exactly as before.

/**
 * Uniform, hole-free scalp sampling via two interleaved barycentric grids,
 * plus smooth normal blending across adjacent faces.
 *
 * @param {BABYLON.Mesh} originalMesh
 * @param {number[]}   scalpIndices
 * @param {number}     spacing      // target distance between samples
 * @param {number}     blendWidth   // how far (in barycentric [0–1]) to blend normals
 * @param {BABYLON.Scene} scene
 * @returns {BABYLON.Mesh}
 */
function sampleMeshDualGridSmoothNormals(
    originalMesh,
    scalpIndices,
    spacing = 0.02,
    blendWidth = 0.1,
    scene
) {
    // 1) pull buffers
    const posBuf = originalMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
    const idxBuf = originalMesh.getIndices()
    const biBuf =
        originalMesh.getVerticesData(BABYLON.VertexBuffer.MatricesIndicesKind) || []
    const bwBuf =
        originalMesh.getVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind) || []

    const scalpSet = new Set(scalpIndices)

    // 2) precompute face normals & adjacency
    const faceNormal = [],
        edgeMap = new Map()
    for (let f = 0, fi = 0; f < idxBuf.length; f += 3, ++fi) {
        const [i0, i1, i2] = [idxBuf[f], idxBuf[f + 1], idxBuf[f + 2]]
        const v0 = BABYLON.Vector3.FromArray(posBuf, i0 * 3),
            v1 = BABYLON.Vector3.FromArray(posBuf, i1 * 3),
            v2 = BABYLON.Vector3.FromArray(posBuf, i2 * 3)
        const n = BABYLON.Vector3.Cross(
            v1.subtract(v0),
            v2.subtract(v0)
        ).normalize()
        faceNormal[fi] = n
        for (const [a, b] of [
            [i0, i1],
            [i1, i2],
            [i2, i0]
        ]) {
            const key = a < b ? `${a}_${b}` : `${b}_${a}`
                ; (edgeMap.get(key) || edgeMap.set(key, []).get(key)).push(fi)
        }
    }
    function neighbor(fi, edgeIdx) {
        const f = fi * 3,
            a = idxBuf[f + edgeIdx],
            b = idxBuf[f + ((edgeIdx + 1) % 3)],
            key = a < b ? `${a}_${b}` : `${b}_${a}`,
            adj = edgeMap.get(key)
        return adj?.find(x => x !== fi) ?? fi
    }

    const outP = [],
        outN = [],
        outBI = [],
        outBW = []

    // 3) process scalp triangles
    for (let f = 0, fi = 0; f < idxBuf.length; f += 3, ++fi) {
        const [i0, i1, i2] = [idxBuf[f], idxBuf[f + 1], idxBuf[f + 2]]
        if (!(scalpSet.has(i0) || scalpSet.has(i1) || scalpSet.has(i2))) continue

        const v0 = BABYLON.Vector3.FromArray(posBuf, i0 * 3),
            v1 = BABYLON.Vector3.FromArray(posBuf, i1 * 3),
            v2 = BABYLON.Vector3.FromArray(posBuf, i2 * 3)
        // longest edge → subdivisions
        const L0 = v1.subtract(v0).length(),
            L1 = v2.subtract(v1).length(),
            L2 = v0.subtract(v2).length(),
            N = Math.max(1, Math.ceil(Math.max(L0, L1, L2) / spacing))

        // fetch this face’s & neighbors’ normals
        const fn = faceNormal[fi],
            nn = [neighbor(fi, 0), neighbor(fi, 1), neighbor(fi, 2)].map(
                i => faceNormal[i]
            )

        // skin slices
        const b0 = biBuf.slice(i0 * 4, i0 * 4 + 4),
            w0 = bwBuf.slice(i0 * 4, i0 * 4 + 4),
            b1 = biBuf.slice(i1 * 4, i1 * 4 + 4),
            w1 = bwBuf.slice(i1 * 4, i1 * 4 + 4),
            b2 = biBuf.slice(i2 * 4, i2 * 4 + 4),
            w2 = bwBuf.slice(i2 * 4, i2 * 4 + 4)

        // helper: sample one barycentric point and push to arrays
        const pushSample = (u, v, w) => {
            // position
            const p = v0.scale(u).add(v1.scale(v)).add(v2.scale(w))
            outP.push(p.x, p.y, p.z)
            // smooth normal
            const bd = [
                Math.max(0, (blendWidth - u) / blendWidth),
                Math.max(0, (blendWidth - v) / blendWidth),
                Math.max(0, (blendWidth - w) / blendWidth)
            ]
            const interior = Math.max(0, 1 - (bd[0] + bd[1] + bd[2]))
            const smoothN = fn
                .scale(interior)
                .add(nn[0].scale(bd[0]))
                .add(nn[1].scale(bd[1]))
                .add(nn[2].scale(bd[2]))
                .normalize()
            outN.push(smoothN.x, smoothN.y, smoothN.z)
            // skin
            const bi = [0, 0, 0, 0],
                bw = [0, 0, 0, 0]
            for (let j = 0; j < 4; j++) {
                bi[j] = b0[j] * u + b1[j] * v + b2[j] * w
                bw[j] = w0[j] * u + w1[j] * v + w2[j] * w
            }
            const sumW = bw.reduce((s, x) => s + x, 0) || 1
            for (let j = 0; j < 4; j++) bw[j] /= sumW
            outBI.push(...bi)
            outBW.push(...bw)
        }

        // 4a) regular grid
        for (let a = 0; a <= N; a++) {
            for (let b = 0; b <= N - a; b++) {
                pushSample(a / N, b / N, (N - a - b) / N)
            }
        }
        // 4b) offset grid
        for (let a = 0; a < N; a++) {
            for (let b = 0; b < N - a; b++) {
                pushSample((a + 0.5) / N, (b + 0.5) / N, (N - a - b - 1 + 0.5) / N)
            }
        }
    }

    // 5) build new mesh
    const sampled = new BABYLON.Mesh("dualGridScalp", scene)
    const vd = new BABYLON.VertexData()
    vd.positions = new Float32Array(outP)
    vd.normals = new Float32Array(outN)
    vd.matricesIndices = new Float32Array(outBI)
    vd.matricesWeights = new Float32Array(outBW)
    vd.applyToMesh(sampled, true)
    sampled.isUnIndexed = true
    sampled.skeleton = originalMesh.skeleton
    sampled.computeBonesUsingShaders = true

    return sampled
}

/**
 * Poisson-disk sample a skinned mesh’s scalp surface.
 *
 * @param {BABYLON.Mesh} mesh         The head mesh (must have positions, normals, skinning).
 * @param {number[]}     scalpIndices Array of vertex-indices marking the scalp region.
 * @param {number}       r            Minimum distance between samples.
 * @param {number}       maxPoints    Desired number of samples.
 * @param {number}       maxTries     Max dart-throws per sample (default 30).
 * @param {BABYLON.Scene}scene
 * @returns {BABYLON.Mesh}            New point-cloud mesh with skinning & smoothed normals.
 */
function samplePoissonDiskOnMesh(
    mesh,
    scalpIndices,
    r,
    maxPoints,
    maxTries = 30,
    scene
) {
    // 1) fetch buffers
    const posBuf = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)
    const normBuf = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind)
    const idxBuf = mesh.getIndices()
    const biBuf =
        mesh.getVerticesData(BABYLON.VertexBuffer.MatricesIndicesKind) || []
    const bwBuf =
        mesh.getVerticesData(BABYLON.VertexBuffer.MatricesWeightsKind) || []
    const scalpSet = new Set(scalpIndices)

    // 2) compute triangle areas & cumulative distribution
    const tris = []
    let totalArea = 0
    for (let f = 0; f < idxBuf.length; f += 3) {
        const [i0, i1, i2] = [idxBuf[f], idxBuf[f + 1], idxBuf[f + 2]]
        if (!(scalpSet.has(i0) || scalpSet.has(i1) || scalpSet.has(i2))) continue
        const v0 = BABYLON.Vector3.FromArray(posBuf, i0 * 3)
        const v1 = BABYLON.Vector3.FromArray(posBuf, i1 * 3)
        const v2 = BABYLON.Vector3.FromArray(posBuf, i2 * 3)
        const area =
            BABYLON.Vector3.Cross(v1.subtract(v0), v2.subtract(v0)).length() * 0.5
        totalArea += area
        tris.push({ i0, i1, i2, area, cum: totalArea })
    }

    // 3) helper: pick a random scalp triangle by area
    function pickTri() {
        const x = Math.random() * totalArea
        for (const t of tris) {
            if (x <= t.cum) return t
        }
        return tris[tris.length - 1]
    }

    // 4) storage for samples
    const samples = []
    const normals = []
    const boneI = []
    const boneW = []

    // 5) dart throwing
    for (let count = 0; count < maxPoints; count++) {
        let placed = false
        for (let t = 0; t < maxTries && !placed; t++) {
            // pick a triangle
            const tri = pickTri()
            // random barycentric
            let u = Math.random(),
                v = Math.random()
            if (u + v > 1) {
                u = 1 - u
                v = 1 - v
            }
            const w = 1 - u - v
            // compute pos
            const p0 = BABYLON.Vector3.FromArray(posBuf, tri.i0 * 3)
            const p1 = BABYLON.Vector3.FromArray(posBuf, tri.i1 * 3)
            const p2 = BABYLON.Vector3.FromArray(posBuf, tri.i2 * 3)
            const p = p0.scale(u).add(p1.scale(v)).add(p2.scale(w))

            // check distance against existing
            let ok = true
            for (const q of samples) {
                if (BABYLON.Vector3.DistanceSquared(p, q) < r * r) {
                    ok = false
                    break
                }
            }
            if (!ok) continue

            // accept
            samples.push(p)

            // normal interpolation & smoothing
            const n0 = BABYLON.Vector3.FromArray(normBuf, tri.i0 * 3)
            const n1 = BABYLON.Vector3.FromArray(normBuf, tri.i1 * 3)
            const n2 = BABYLON.Vector3.FromArray(normBuf, tri.i2 * 3)
            const n = n0.scale(u).add(n1.scale(v)).add(n2.scale(w)).normalize()
            normals.push(n)

            // bone weights interp & normalize
            const bi0 = biBuf.slice(tri.i0 * 4, tri.i0 * 4 + 4),
                bi1 = biBuf.slice(tri.i1 * 4, tri.i1 * 4 + 4),
                bi2 = biBuf.slice(tri.i2 * 4, tri.i2 * 4 + 4)
            const bw0 = bwBuf.slice(tri.i0 * 4, tri.i0 * 4 + 4),
                bw1 = bwBuf.slice(tri.i1 * 4, tri.i1 * 4 + 4),
                bw2 = bwBuf.slice(tri.i2 * 4, tri.i2 * 4 + 4)

            const BI = [0, 0, 0, 0],
                BW = [0, 0, 0, 0]
            for (let j = 0; j < 4; j++) {
                BI[j] = bi0[j] * u + bi1[j] * v + bi2[j] * w
                BW[j] = bw0[j] * u + bw1[j] * v + bw2[j] * w
            }
            const s = BW.reduce((a, b) => a + b, 0) || 1
            for (let j = 0; j < 4; j++) BW[j] /= s

            boneI.push(...BI)
            boneW.push(...BW)

            placed = true
        }
        if (!placed) {
            // too crowded: stop early
            break
        }
    }

    // 6) build point-cloud mesh
    const outMesh = new BABYLON.Mesh("poissonScalp", scene)
    const vd = new BABYLON.VertexData()
    vd.positions = new Float32Array(samples.flatMap(p => [p.x, p.y, p.z]))
    vd.normals = new Float32Array(normals.flatMap(n => [n.x, n.y, n.z]))
    vd.matricesIndices = new Float32Array(boneI)
    vd.matricesWeights = new Float32Array(boneW)
    vd.applyToMesh(outMesh, true)
    outMesh.isUnIndexed = true

    // 7) skin it
    outMesh.skeleton = mesh.skeleton
    outMesh.computeBonesUsingShaders = true

    return outMesh
}

/**
 * Generates a WGSL `const` lookup table for cosine/sine values.
 *
 * @param {number} points - Number of cross-section points (e.g. 16).
 * @returns {string} WGSL code defining a const array<vec2<f32>, points>.
 */
function generateWGSLLookup(points) {
    const lines = []
    lines.push(
        `const CROSS_SECTION_TABLE: array<vec2<f32>, ${points}> = array<vec2<f32>, ${points}>(`
    )
    for (let j = 0; j < points; j++) {
        const angle = (2 * Math.PI * j) / points
        const cosVal = angle.toFixed(6) // use a fixed precision
        const sinVal = angle.toFixed(6)
        lines.push(
            `    vec2<f32>(${Math.cos(angle).toFixed(6)}, ${Math.sin(angle).toFixed(
                6
            )})${j < points - 1 ? "," : ""}`
        )
    }
    lines.push(");")
    return lines.join("\n")
}



function createSlider(guiPanel, label, min, max, value, step, callback) {
    // Create and add a text label
    const text = new BABYLON.GUI.TextBlock();
    text.paddingLeftInPixels = 8
    text.paddingRightInPixels = 8

    text.text = `${label}: ${value}`;
    text.height = "30px";
    text.color = "white";
    text.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    guiPanel.addControl(text);

    // Create and configure the slider
    const slider = new BABYLON.GUI.Slider();
    slider.minimum = min;
    slider.maximum = max;
    slider.value = value;
    slider.step = step;
    slider.height = "20px";
    slider.width = "200px";
    slider.onValueChangedObservable.add((v) => {
        text.text = `${label}: ${Number.isInteger(v) ? v : v.toFixed(3)}`;
        callback(v);
    });
    guiPanel.addControl(slider);
    return slider
}

function createGUI() {
    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    const guiPanel = new BABYLON.GUI.StackPanel();

    guiPanel.background = new BABYLON.Color4(0, 0, 0, .2)
    guiPanel.alpha = .7
    guiPanel.width = "220px";
    guiPanel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    guiPanel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    advancedTexture.addControl(guiPanel);
    return guiPanel
}
