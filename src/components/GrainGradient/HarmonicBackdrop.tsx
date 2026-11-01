import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { harmonicFluxFragment } from './harmonicFlux';
import styles from './GrainGradient.module.css';

/** Animated grain-gradient backdrop shared by every portfolio route. */
export function HarmonicBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;
    const shaders: WebGLShader[] = [];
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let frame = 0;
    const cleanup = () => {
      cancelAnimationFrame(frame);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      shaders.forEach(shader => gl.deleteShader(shader));
    };
    try {
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) throw new Error('Cannot create background shader');
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compilation failed');
        }
        return shader;
      };
      program = gl.createProgram();
      if (!program) throw new Error('Cannot create background program');
      gl.attachShader(program, compile(gl.VERTEX_SHADER, `
        attribute vec2 position;
        varying highp vec2 vUv;
        void main() {
          vUv = (position + 1.0) * 0.5;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, harmonicFluxFragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? 'Shader linking failed');
      }
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      const uniform = (name: string) => gl.getUniformLocation(program!, name);
      gl.uniform1f(uniform('speed'), 0.2);
      gl.uniform1f(uniform('distortion'), 0.44);
      gl.uniform1f(uniform('grainMixer'), 0.55);
      gl.uniform1f(uniform('grainOverlay'), 0.22);
      gl.uniform1f(uniform('swirlMode'), 0);
      gl.uniform1f(uniform('viewAngle'), 0);
      // Slightly more neutral than the reference's #5d6583.
      gl.uniform3f(uniform('c1'), 94 / 255, 99 / 255, 121 / 255);
      for (let i = 2; i <= 6; i++) gl.uniform3f(uniform(`c${i}`), 0, 0, 0);
      const time = uniform('time');
      const resolution = uniform('resolution');
      let elapsed = 0;
      let previous = performance.now();
      const draw = (now: number) => {
        // Keep the reference's CSS-pixel grain scale and avoid retina fill cost.
        const width = Math.max(1, window.innerWidth);
        const height = Math.max(1, window.innerHeight);
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }
        if (!document.hidden) {
          if (!reducedMotion) elapsed += Math.min(now - previous, 100) / 1000;
          gl.uniform1f(time, elapsed);
          gl.uniform2f(resolution, width, height);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        previous = now;
        if (!reducedMotion) frame = requestAnimationFrame(draw);
      };
      draw(previous);
      const redraw = () => { if (reducedMotion) draw(performance.now()); };
      window.addEventListener('resize', redraw);
      return () => {
        window.removeEventListener('resize', redraw);
        cleanup();
      };
    } catch (error) {
      console.warn('Harmonic background unavailable:', error);
      cleanup();
    }
  }, [reducedMotion]);

  return <div className={styles.root} aria-hidden="true" style={{ background: '#000' }}>
    <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
  </div>;
}
