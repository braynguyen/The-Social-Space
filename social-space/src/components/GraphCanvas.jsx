import { useEffect, useRef, useState } from 'react';
import { PerspectiveCamera, Raycaster, Vector2, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createGraphScene, nodeRadius } from './graphScene';

export default function GraphCanvas({ graphData, selectedNode, onSelectNode }) {
  const canvasRef = useRef(null);
  const graphRef = useRef(null);
  const pointerStart = useRef(null);
  const hoverTimer = useRef(null);
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    let renderer;

    try {
      renderer = new WebGLRenderer({ canvas, antialias: true });
    } catch {
      setRenderFailed(true);
      return;
    }

    setRenderFailed(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const graph = createGraphScene(graphData);
    const camera = new PerspectiveCamera(45, 1, 0.5, graph.radius * 40);
    const controls = new OrbitControls(camera, canvas);
    controls.listenToKeyEvents(canvas);
    controls.minDistance = 2;
    controls.maxDistance = graph.radius * 20;

    let frame = null;
    const requestDraw = () => {
      if (frame === null) {
        frame = requestAnimationFrame(() => {
          frame = null;
          renderer.render(graph.scene, camera);
        });
      }
    };

    const fitDistance = () => {
      const verticalHalfFov = camera.fov * Math.PI / 360;
      const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * camera.aspect);
      return graph.radius / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov));
    };

    const resize = () => {
      const width = Math.max(canvas.clientWidth, 1);
      const height = Math.max(canvas.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      graph.setPixelHeight(height * renderer.getPixelRatio());
      requestDraw();
    };

    resize();
    camera.position.set(0, 0, fitDistance() * 1.08);
    controls.maxDistance = Math.max(controls.maxDistance, camera.position.z);
    controls.update();
    controls.addEventListener('change', requestDraw);

    const raycaster = new Raycaster();
    const pointer = new Vector2();
    graphRef.current = {
      camera,
      controls,
      positions: graph.positions,
      pickNode(clientX, clientY) {
        const bounds = canvas.getBoundingClientRect();
        pointer.set(
          2 * (clientX - bounds.left) / bounds.width - 1,
          1 - 2 * (clientY - bounds.top) / bounds.height,
        );
        raycaster.setFromCamera(pointer, camera);
        return graph.pickNode(raycaster);
      },
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => {
      graphRef.current = null;
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(hoverTimer.current);
      canvas.title = '';
      controls.dispose();
      graph.dispose();
      renderer.dispose();
    };
  }, [graphData]);

  useEffect(() => {
    const graph = graphRef.current;
    const position = graph?.positions.get(selectedNode?.id);
    if (!position) {
      return;
    }

    const { camera, controls } = graph;
    const direction = camera.position.clone().sub(controls.target).normalize();
    controls.target.fromArray(position);
    camera.position.copy(controls.target).addScaledVector(direction, Math.max(40, 3 * nodeRadius(selectedNode)));
    controls.update();
  }, [selectedNode]);

  const clearHover = () => {
    clearTimeout(hoverTimer.current);
    canvasRef.current.title = '';
  };

  const handlePointerMove = ({ clientX, clientY, buttons }) => {
    clearHover();
    if (buttons || !onSelectNode) {
      return;
    }

    hoverTimer.current = setTimeout(() => {
      const node = graphRef.current?.pickNode(clientX, clientY);
      canvasRef.current.title = node?.name ?? '';
    }, 100);
  };

  const handlePointerUp = ({ button, clientX, clientY }) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!onSelectNode || !start || button !== 0 || Math.hypot(clientX - start.x, clientY - start.y) > 5) {
      return;
    }

    const node = graphRef.current?.pickNode(clientX, clientY);
    if (node) {
      onSelectNode(node);
    }
  };

  return (
    <div className="graph-canvas">
      <canvas
        ref={canvasRef}
        aria-label="3D hashtag graph"
        tabIndex={0}
        onPointerDown={({ clientX, clientY }) => { pointerStart.current = { x: clientX, y: clientY }; }}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pointerStart.current = null; }}
        onPointerMove={handlePointerMove}
        onPointerLeave={clearHover}
      />
      {renderFailed ? (
        <p className="graph-load-status" role="status">
          3D rendering is unavailable. You can still search hashtags.
        </p>
      ) : (
        <p className="graph-navigation">Drag to rotate · Scroll to zoom · Right-drag to pan</p>
      )}
    </div>
  );
}
