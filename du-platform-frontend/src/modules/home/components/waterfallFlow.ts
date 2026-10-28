// Animate the existing photograph in image coordinates, so object-fit cropping
// cannot move the effect onto the sky or the foreground cliff on narrow screens.
const vertexSource = `
attribute vec2 position;
varying vec2 screen;
void main() {
  screen = vec2(position.x, -position.y) * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentSource = `
precision mediump float;
uniform sampler2D photograph;
uniform vec2 crop;
uniform float time;
varying vec2 screen;

void main() {
  vec2 uv = (screen - 0.5) * crop + 0.5;
  vec4 original = texture2D(photograph, uv);

  // The lip is below the tree line. The right edge follows the foreground rock.
  float lip = mix(0.653, 0.666, smoothstep(0.0, 0.85, uv.x));
  float rockEdge = mix(0.888, 0.837, smoothstep(0.70, 1.0, uv.y));
  float region = smoothstep(lip, lip + 0.025, uv.y)
    * (1.0 - smoothstep(rockEdge - 0.012, rockEdge, uv.x));
  if (region == 0.0) {
    gl_FragColor = original;
    return;
  }
  float light = dot(original.rgb, vec3(0.299, 0.587, 0.114));
  // Dark rock channels stay anchored; motion follows the pale water curtains.
  float water = region * smoothstep(0.30, 0.67, light);
  float fall = smoothstep(lip, lip + 0.10, uv.y);

  // Two offset phases blend continuously when a sample reaches the end of its
  // fall. Sampling upwards makes visible water texture travel downwards.
  float phase = fract(time * 0.55 + sin(uv.x * 81.0) * 0.08);
  float otherPhase = fract(phase + 0.5);
  float distance = 0.042 * fall;
  float ripple = sin(uv.y * 180.0 - time * 6.0 + uv.x * 95.0)
    * 0.0009 * fall;
  vec2 flowing = vec2(uv.x + ripple, uv.y);
  vec4 first = texture2D(photograph, flowing - vec2(0.0, phase * distance));
  vec4 second = texture2D(photograph, flowing - vec2(0.0, otherPhase * distance));
  vec4 moving = mix(first, second, abs(phase - 0.5) * 2.0);
  gl_FragColor = mix(original, moving, water * 0.88);
}`;

export type WaterfallFlow = {
  setPlaying: (playing: boolean) => void;
  dispose: () => void;
};

export function createWaterfallFlow(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement
): WaterfallFlow | null {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let texture: WebGLTexture | null = null;
  let resizeObserver: ResizeObserver | undefined;
  let frameId = 0;
  let playing = false;
  let disposed = false;
  let elapsed = 0;
  let lastPaint = 0;
  let previousTime: number | undefined;

  function dispose() {
    if (disposed) return;
    disposed = true;
    playing = false;
    cancelAnimationFrame(frameId);
    resizeObserver?.disconnect();
    gl!.deleteTexture(texture);
    gl!.deleteBuffer(buffer);
    gl!.deleteProgram(program);
    shaders.forEach(shader => gl!.deleteShader(shader));
  }

  try {
    const compile = (type: number, source: string) => {
      const shader = gl!.createShader(type);
      if (!shader) throw new Error("Waterfall shader unavailable");
      shaders.push(shader);
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS))
        throw new Error("Waterfall shader unsupported");
      return shader;
    };

    program = gl.createProgram();
    if (!program) throw new Error("Waterfall program unavailable");
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("Waterfall program unsupported");
    gl.useProgram(program);

    buffer = gl.createBuffer();
    texture = gl.createTexture();
    if (!buffer || !texture) throw new Error("Waterfall resources unavailable");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    const crop = gl.getUniformLocation(program, "crop");
    const time = gl.getUniformLocation(program, "time");
    gl.uniform1i(gl.getUniformLocation(program, "photograph"), 0);

    const draw = () => {
      gl!.uniform1f(time, elapsed);
      gl!.drawArrays(gl!.TRIANGLES, 0, 6);
    };

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height || disposed) return;
      // Bound fill-rate and GPU memory even on large, high-DPI displays.
      const scale = Math.min(
        window.devicePixelRatio || 1,
        1.5,
        Math.sqrt(900_000 / (width * height))
      );
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      gl!.viewport(0, 0, canvas.width, canvas.height);
      const cover = Math.max(
        width / image.naturalWidth,
        height / image.naturalHeight
      );
      gl!.uniform2f(
        crop,
        width / (image.naturalWidth * cover),
        height / (image.naturalHeight * cover)
      );
      draw();
    };

    const frame = (timestamp: number) => {
      if (!playing || disposed) return;
      frameId = requestAnimationFrame(frame);
      if (timestamp - lastPaint < 1000 / 30) return;
      if (previousTime !== undefined)
        elapsed += Math.min((timestamp - previousTime) / 1000, 0.1);
      previousTime = timestamp;
      lastPaint = timestamp;
      draw();
    };

    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    return {
      setPlaying(next) {
        if (disposed || playing === next) return;
        playing = next;
        previousTime = undefined;
        cancelAnimationFrame(frameId);
        if (playing) frameId = requestAnimationFrame(frame);
      },
      dispose,
    };
  } catch {
    dispose();
    return null;
  }
}
