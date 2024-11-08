import { useEffect, useMemo, useRef, useState } from 'react';
import { PerspectiveCamera, Raycaster, Vector2, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { positionGraphMarker } from './graphMarker';
import { createGraphScene } from './graphScene';

export default function GraphCanvas({ graphData, selectedNode, onSelectNode }) {
  const canvasRef = useRef(null);
  const graphRef = useRef(null);
  const focusMarkerRef = useRef(null);
  const hoverMarkerRef = useRef(null);
  const pointerStart = useRef(null);
  const hoverTimer = useRef(null);
  const [renderFailed, setRenderFailed] = useState(false);
  const [showUnlinked, setShowUnlinked] = useState(false);
  const unlinkedCount = useMemo(
    () => graphData.nodes.reduce((count, node) => count + Number(!node.position), 0),
    [graphData],
  );

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

    const focusElement = focusMarkerRef.current;
    const hoverElement = hoverMarkerRef.current;
    let focused = null;
    let hovered = null;
    let width = 1;
    let height = 1;
    let frame = null;

    const updateMarkers = () => {
      const hoverMarker = hovered?.id === focused?.id ? null : hovered;
      positionGraphMarker(focusElement, focused, camera, width, height);
      positionGraphMarker(hoverElement, hoverMarker, camera, width, height);
      canvas.style.cursor = hovered ? 'pointer' : '';
    };
    const requestDraw = () => {
      if (frame === null) {
        frame = requestAnimationFrame(() => {
          frame = null;
          renderer.render(graph.scene, camera);
          updateMarkers();
        });
      }
    };

    const fitDistance = () => {
      const verticalHalfFov = camera.fov * Math.PI / 360;
      const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * camera.aspect);
      return graph.radius / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov));
    };

    const resize = () => {
      width = Math.max(canvas.clientWidth, 1);
      height = Math.max(canvas.clientHeight, 1);
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
    controls.addEventListener('change', () => {
      hovered = null;
      requestDraw();
    });

    const markerFor = node => {
      const position = node && graph.positions.get(node.id);
      return position ? {
        id: node.id,
        name: node.name,
        position,
        radius: graph.getNodeRadius(node),
      } : null;
    };

    const raycaster = new Raycaster();
    const pointer = new Vector2();
    graphRef.current = {
      focus(node) {
        focused = markerFor(node);
        graph.setFocusedNode(node);
        requestDraw();
      },
      setShowUnlinked(visible) {
        graph.setShowUnlinked(visible);
        hovered = null;
        requestDraw();
      },
      hover(node) {
        if (hovered?.id !== node?.id) {
          hovered = markerFor(node);
          updateMarkers();
        }
      },
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
      focusElement.hidden = true;
      hoverElement.hidden = true;
      canvas.style.cursor = '';
      controls.dispose();
      graph.dispose();
      renderer.dispose();
    };
  }, [graphData]);

  useEffect(() => {
    graphRef.current?.setShowUnlinked(showUnlinked);
  }, [graphData, showUnlinked]);

  useEffect(() => {
    if (selectedNode) {
      graphRef.current?.focus(selectedNode);
    }
  }, [graphData, selectedNode]);

  useEffect(() => {
    if (!onSelectNode) {
      clearTimeout(hoverTimer.current);
      graphRef.current?.hover(null);
      graphRef.current?.focus(null);
    }
  }, [onSelectNode]);

  const clearHover = () => {
    clearTimeout(hoverTimer.current);
    graphRef.current?.hover(null);
  };

  const handlePointerMove = ({ clientX, clientY, buttons }) => {
    clearTimeout(hoverTimer.current);
    if (buttons || !onSelectNode) {
      graphRef.current?.hover(null);
      return;
    }

    hoverTimer.current = setTimeout(() => {
      const graph = graphRef.current;
      if (graph) {
        graph.hover(graph.pickNode(clientX, clientY));
      }
    }, 65);
  };

  const handlePointerDown = ({ clientX, clientY }) => {
    clearHover();
    pointerStart.current = { x: clientX, y: clientY };
  };

  const handlePointerUp = ({ button, clientX, clientY }) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    const graph = graphRef.current;
    if (!onSelectNode || !graph || !start || button !== 0 || Math.hypot(clientX - start.x, clientY - start.y) > 5) {
      return;
    }

    const node = graph.pickNode(clientX, clientY);
    if (!node) {
      graph.focus(null);
    }
    onSelectNode(node);
  };

  return (
    <div className="graph-canvas">
      <canvas
        ref={canvasRef}
        aria-label="3D hashtag graph"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pointerStart.current = null; }}
        onPointerMove={handlePointerMove}
        onPointerLeave={clearHover}
      />
      <div className="graph-marker graph-marker--focus" ref={focusMarkerRef} hidden>
        <span className="graph-marker-label" role="status" />
      </div>
      <div className="graph-marker" ref={hoverMarkerRef} hidden>
        <span className="graph-marker-label" role="tooltip" />
      </div>
      {!renderFailed && unlinkedCount > 0 && unlinkedCount < graphData.nodes.length && (
        <label className="graph-outliers">
          <input
            type="checkbox"
            checked={showUnlinked}
            onChange={event => setShowUnlinked(event.target.checked)}
          />
          Show {unlinkedCount.toLocaleString()} unlinked hashtags
        </label>
      )}
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
