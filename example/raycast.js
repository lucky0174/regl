const canvas = document.body.appendChild(document.createElement('canvas'))
const fit = require('canvas-fit')
const regl = require('../regl')({canvas: canvas})
const mat4 = require('gl-mat4')
const vec3 = require('gl-vec3')
window.addEventListener('resize', fit(canvas), false)
const bunny = require('bunny')
const normals = require('angle-normals')
var mp = require('mouse-position')(canvas)
var mb = require('mouse-pressed')(canvas)
var intersect = require('ray-triangle-intersection')

var viewMatrix = new Float32Array([1, -0, 0, 0, 0, 0.876966655254364, 0.48055124282836914, 0, -0, -0.48055124282836914, 0.876966655254364, 0, 0, 0, -11.622776985168457, 1])
var projectionMatrix = new Float32Array(16)

var lightDir = [0.39, 0.87, 0.29]

const planeElements = []
var planePosition = []
var planeNormal = []

planePosition.push([-0.5, 0.0, -0.5])
planePosition.push([+0.5, 0.0, -0.5])
planePosition.push([-0.5, 0.0, +0.5])
planePosition.push([+0.5, 0.0, +0.5])

planeNormal.push([0.0, 1.0, 0.0])
planeNormal.push([0.0, 1.0, 0.0])
planeNormal.push([0.0, 1.0, 0.0])
planeNormal.push([0.0, 1.0, 0.0])

planeElements.push([3, 1, 0])
planeElements.push([0, 2, 3])

var boxPosition = [
  // side faces
  [-0.5, +0.5, +0.5], [+0.5, +0.5, +0.5], [+0.5, -0.5, +0.5], [-0.5, -0.5, +0.5], // positive z face.
  [+0.5, +0.5, +0.5], [+0.5, +0.5, -0.5], [+0.5, -0.5, -0.5], [+0.5, -0.5, +0.5], // positive x face
  [+0.5, +0.5, -0.5], [-0.5, +0.5, -0.5], [-0.5, -0.5, -0.5], [+0.5, -0.5, -0.5], // negative z face
  [-0.5, +0.5, -0.5], [-0.5, +0.5, +0.5], [-0.5, -0.5, +0.5], [-0.5, -0.5, -0.5], // negative x face.
  [-0.5, +0.5, -0.5], [+0.5, +0.5, -0.5], [+0.5, +0.5, +0.5], [-0.5, +0.5, +0.5],  // top face
  [-0.5, -0.5, -0.5], [+0.5, -0.5, -0.5], [+0.5, -0.5, +0.5], [-0.5, -0.5, +0.5]  // bottom face
]

const boxElements = [
  [2, 1, 0], [2, 0, 3],
  [6, 5, 4], [6, 4, 7],
  [10, 9, 8], [10, 8, 11],
  [14, 13, 12], [14, 12, 15],
  [18, 17, 16], [18, 16, 19],
  [20, 21, 22], [23, 20, 22]
]

// all the normals of a single block.
var boxNormal = [
  // side faces
  [0.0, 0.0, +1.0], [0.0, 0.0, +1.0], [0.0, 0.0, +1.0], [0.0, 0.0, +1.0],
  [+1.0, 0.0, 0.0], [+1.0, 0.0, 0.0], [+1.0, 0.0, 0.0], [+1.0, 0.0, 0.0],
  [0.0, 0.0, -1.0], [0.0, 0.0, -1.0], [0.0, 0.0, -1.0], [0.0, 0.0, -1.0],
  [-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0], [-1.0, 0.0, 0.0],
  // top
  [0.0, +1.0, 0.0], [0.0, +1.0, 0.0], [0.0, +1.0, 0.0], [0.0, +1.0, 0.0],
  // bottom
  [0.0, -1.0, 0.0], [0.0, -1.0, 0.0], [0.0, -1.0, 0.0], [0.0, -1.0, 0.0]
]

const globalScope = regl({
  uniforms: {
    lightDir: lightDir
  }
})

// render the object with lighting, using the previously rendered cubemap
// to render the shadows.
const drawNormal = regl({
  uniforms: {
    view: () => viewMatrix,
    projection: ({viewportWidth, viewportHeight}) =>
      mat4.perspective(projectionMatrix,
                       Math.PI / 4,
                       viewportWidth / viewportHeight,
                       0.01,
                       1000)
  },
  frag: `
  precision mediump float;

  varying vec3 vNormal;
  varying vec3 vPosition;

  uniform float ambientLightAmount;
  uniform float diffuseLightAmount;
  uniform vec3 color;
  uniform vec3 lightDir;

  void main () {
    vec3 ambient = ambientLightAmount * color;
    float cosTheta = dot(vNormal, lightDir);
    vec3 diffuse = diffuseLightAmount * color * clamp(cosTheta , 0.0, 1.0 );

    gl_FragColor = vec4((ambient + diffuse), 1.0);
  }`,
  vert: `
  precision mediump float;

  attribute vec3 position;
  attribute vec3 normal;

  varying vec3 vPosition;
  varying vec3 vNormal;

  uniform mat4 projection, view, model;

  void main() {
    vec4 worldSpacePosition = model * vec4(position, 1);

    vPosition = worldSpacePosition.xyz;
    vNormal = normal;

    gl_Position = projection * view * worldSpacePosition;
  }`
})

function Mesh (elements, position, normal) {
  this.elements = elements
  this.position = position
  this.normal = normal
}

function createModelMatrix (props) {
  var m = mat4.identity([])

  mat4.translate(m, m, props.translate)

  var s = props.scale
  mat4.scale(m, m, [s, s, s])

  return m
}

Mesh.prototype.draw = regl({
  uniforms: {
    model: (_, props, batchId) => {
      return createModelMatrix(props)
    },
    ambientLightAmount: 0.3,
    diffuseLightAmount: 0.7,
    color: regl.prop('color')
  },
  attributes: {
    position: regl.this('position'),
    normal: regl.this('normal')
  },
  elements: regl.this('elements'),
  cull: {
    enable: true
  }
})

var bunnyMesh = new Mesh(bunny.cells, bunny.positions, normals(bunny.cells, bunny.positions))
var boxMesh = new Mesh(boxElements, boxPosition, boxNormal)
var planeMesh = new Mesh(planeElements, planePosition, planeNormal)

var meshes = [
  {scale: 2.0, translate: [4.0, 0.0, 0.0], color: [0.6, 0.0, 0.0], mesh: boxMesh},
  {scale: 1.3, translate: [-3.0, 0.0, -4.0], color: [0.0, 0.6, 0.0], mesh: boxMesh},
  {scale: 0.7, translate: [-3.0, -2.0, 4.0], color: [0.0, 0.0, 0.8], mesh: boxMesh}
]

mb.on('down', function () {
  var vp = mat4.multiply([], projectionMatrix, viewMatrix)
  var invVp = mat4.invert([], vp)

  var rayPoint = vec3.transformMat4([], [2.0 * mp.x / canvas.width - 1.0, -2.0 * mp.y / canvas.height + 1.0, 0.0], invVp)

  var rayOrigin = vec3.transformMat4([], [0, 0, 0], mat4.invert([], viewMatrix))

  var rayDir = vec3.normalize([], vec3.subtract([], rayPoint, rayOrigin))
  /*
    console.log('ray orig', rayOrigin)
    console.log('ray dir', rayDir)
  */
  for (var i = 0; i < meshes.length; i++) {
    var m = meshes[i]

    var modelMatrix = createModelMatrix(m)

    for (var j = 0; j < m.mesh.elements.length; j++) {
      var f = m.mesh.elements[j]
      var tri = [
        vec3.transformMat4([], m.mesh.position[f[0]], modelMatrix),
        vec3.transformMat4([], m.mesh.position[f[1]], modelMatrix),
        vec3.transformMat4([], m.mesh.position[f[2]], modelMatrix)
      ]
      //      console.log('tri: ', tri)

      var res = intersect([], rayPoint, rayDir, tri)
      if (res !== null) {
        console.log('INTERSECT!')
        return
      }
    }
  }
})

regl.frame(({tick}) => {
  regl.clear({
    color: [0, 0, 0, 255],
    depth: 1
  })

  var drawMeshes = () => {
    for (var i = 0; i < meshes.length; i++) {
      var m = meshes[i]

      m.mesh.draw({scale: m.scale, translate: m.translate, color: m.color})
    }
  }

  globalScope(() => {
    drawNormal(() => {
      drawMeshes()
    })
  })
})
