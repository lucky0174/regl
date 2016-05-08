var createContext = require('./util/create-context')
var createREGL = require('../../regl')
var tape = require('tape')

tape('drawing', function (t) {
  var regl = createREGL(createContext(5, 5))

  function checkPixmap (args, expected, remark) {
    var base = {
      frag: [
        'precision mediump float;',
        'void main() {',
        'gl_FragColor = vec4(1, 1, 1, 1);',
        '}'
      ].join('\n'),

      vert: [
        'precision mediump float;',
        'attribute vec2 position;',
        'varying vec4 fragColor;',
        'void main() {',
        'gl_Position=vec4((position - 2.0) / 2.1, 0, 1);',
        '}'
      ].join('\n'),

      attributes: {
        position: regl.buffer([0, 0, 4, 0, 4, 4, 0, 4])
      },

      depth: {enable: false, mask: false}
    }

    Object.keys(args).forEach(function (x) {
      base[x] = args[x]
    })

    function runCheck (suffix) {
      var pixels = regl.read()
      var actual = new Array(25)
      for (var i = 0; i < 25; ++i) {
        actual[i] = Math.min(1, pixels[4 * i])
      }
      t.same(actual, expected, remark + ' - ' + suffix)
    }

    var command = regl(base)

    regl.clear({color: [0, 0, 0, 0]})
    command()
    runCheck('static')

    regl.clear({color: [0, 0, 0, 0]})
    command(1)
    runCheck('batch')

    regl.clear({color: [0, 0, 0, 0]})
    command(function () {
      regl.draw()
    })
    runCheck('scope')
  }

  // points
  checkPixmap({
    primitive: 'points',
    count: 4
  }, [
    1, 0, 0, 0, 1,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    1, 0, 0, 0, 1
  ], 'point')

  // lines
  checkPixmap({
    primitive: 'lines',
    count: 2
  }, [
    1, 1, 1, 1, 1,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0
  ], 'line')

  // line strip
  checkPixmap({
    primitive: 'line strip',
    count: 3
  }, [
    1, 1, 1, 1, 1,
    0, 0, 0, 0, 1,
    0, 0, 0, 0, 1,
    0, 0, 0, 0, 1,
    0, 0, 0, 0, 1
  ], 'line strip')

  // line loop
  checkPixmap({
    primitive: 'line loop',
    count: 4
  }, [
    1, 1, 1, 1, 1,
    1, 0, 0, 0, 1,
    1, 0, 0, 0, 1,
    1, 0, 0, 0, 1,
    1, 1, 1, 1, 1
  ], 'line loop')

  // triangles
  checkPixmap({
    primitive: 'triangles',
    count: 3
  }, [
    1, 1, 1, 1, 1,
    0, 1, 1, 1, 1,
    0, 0, 1, 1, 1,
    0, 0, 0, 1, 1,
    0, 0, 0, 0, 1
  ], 'triangles')

  // triangle strip
  checkPixmap({
    primitive: 'triangle strip',
    count: 4
  }, [
    1, 1, 1, 1, 1,
    0, 1, 1, 1, 1,
    0, 0, 1, 1, 1,
    0, 1, 1, 1, 1,
    1, 1, 1, 1, 1
  ], 'triangle strip')

  // triangle fan
  checkPixmap({
    primitive: 'triangle fan',
    count: 4
  }, [
    1, 1, 1, 1, 1,
    1, 1, 1, 1, 1,
    1, 1, 1, 1, 1,
    1, 1, 1, 1, 1,
    1, 1, 1, 1, 1
  ], 'triangle fan')

  regl.destroy()
  t.end()
})
