import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  MeshLambertMaterial,
  Object3D,
  Points,
  Scene,
  ShaderMaterial,
  Sphere,
  Vector3,
} from 'three';
import { createNodeSizer } from '../graphSizing.mjs';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const FALLBACK_COLOR = '#ffffaa';
const UNLINKED_RADIUS_SCALE = 0.55;

const pointVertexShader = `
  attribute float diameter;
  uniform float viewportHeight;
  varying vec3 pointColor;

  void main() {
    vec4 eyePosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * eyePosition;
    gl_PointSize = max(1.0, diameter * viewportHeight * projectionMatrix[1][1] / (-2.0 * eyePosition.z));
    pointColor = color;
  }
`;

const pointFragmentShader = `
  varying vec3 pointColor;

  void main() {
    vec2 offset = 2.0 * gl_PointCoord - 1.0;
    float radiusSquared = dot(offset, offset);
    if (radiusSquared > 1.0) discard;
    float shade = mix(0.38, 0.75, sqrt(1.0 - radiusSquared));
    gl_FragColor = vec4(pointColor * shade, 1.0);
    #include <colorspace_fragment>
  }
`;

function isolatedPosition(index, count, radius) {
  const height = 1 - (2 * index + 1) / count;
  const ring = Math.sqrt(1 - height * height);
  const angle = index * GOLDEN_ANGLE;
  const distance = radius * (0.82 + (index % 7) * 0.03);

  return [
    distance * ring * Math.cos(angle),
    distance * height,
    distance * ring * Math.sin(angle),
  ];
}

export function createGraphScene({ nodes, links }) {
  const scene = new Scene();
  scene.background = new Color('#000011');

  const connectedNodes = nodes.filter(node => node.position);
  const isolatedNodes = nodes.filter(node => !node.position);

  // Spread the background points by position independently of snapshot ordering.
  let seed = 1;
  for (let index = isolatedNodes.length - 1; index > 0; index--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const other = Math.floor(seed / 2 ** 32 * (index + 1));
    [isolatedNodes[index], isolatedNodes[other]] = [isolatedNodes[other], isolatedNodes[index]];
  }
  const layoutRadius = connectedNodes.reduce(
    (max, node) => Math.max(max, Math.hypot(...node.position)),
    100,
  );
  const radiusForWeight = createNodeSizer(nodes);
  const getNodeRadius = node => radiusForWeight(node) * (node.position ? 1 : UNLINKED_RADIUS_SCALE);

  const positions = new Map();
  const color = new Color();
  const transform = new Object3D();

  const nodeGeometry = new IcosahedronGeometry(1, 1);
  const nodeMaterial = new MeshLambertMaterial();
  const nodeMesh = new InstancedMesh(nodeGeometry, nodeMaterial, connectedNodes.length);
  let connectedRadius = layoutRadius;

  connectedNodes.forEach((node, index) => {
    positions.set(node.id, node.position);
    transform.position.fromArray(node.position);
    transform.scale.setScalar(getNodeRadius(node));
    transform.updateMatrix();

    nodeMesh.setMatrixAt(index, transform.matrix);
    nodeMesh.setColorAt(index, color.set(node.color ?? FALLBACK_COLOR));
    connectedRadius = Math.max(connectedRadius, transform.position.length() + transform.scale.x);
  });

  nodeMesh.boundingSphere = new Sphere(new Vector3(), connectedRadius);

  // Draw unlinked hashtags as depth-scaled circular points. They need no mesh triangles.
  const pointPositions = new Float32Array(isolatedNodes.length * 3);
  const pointColors = new Float32Array(isolatedNodes.length * 3);
  const pointDiameters = new Float32Array(isolatedNodes.length);
  let radius = connectedRadius;
  let maxPointRadius = 0;

  isolatedNodes.forEach((node, index) => {
    const position = isolatedPosition(index, isolatedNodes.length, layoutRadius);
    const size = getNodeRadius(node);
    positions.set(node.id, position);
    pointPositions.set(position, index * 3);
    color.set(node.color ?? FALLBACK_COLOR).toArray(pointColors, index * 3);
    pointDiameters[index] = 2 * size;
    maxPointRadius = Math.max(maxPointRadius, size);
    radius = Math.max(radius, Math.hypot(...position) + size);
  });

  const pointGeometry = new BufferGeometry();
  pointGeometry.setAttribute('position', new BufferAttribute(pointPositions, 3));
  pointGeometry.setAttribute('color', new BufferAttribute(pointColors, 3));
  pointGeometry.setAttribute('diameter', new BufferAttribute(pointDiameters, 1));
  pointGeometry.boundingSphere = new Sphere(new Vector3(), radius);

  const pointMaterial = new ShaderMaterial({
    vertexColors: true,
    uniforms: { viewportHeight: { value: 1 } },
    vertexShader: pointVertexShader,
    fragmentShader: pointFragmentShader,
  });
  const pointCloud = new Points(pointGeometry, pointMaterial);
  const pickTargets = [nodeMesh, pointCloud];
  let showUnlinked = connectedNodes.length === 0;
  let focusedPointIndex = -1;

  const updatePointVisibility = () => {
    const start = showUnlinked ? 0 : Math.max(focusedPointIndex, 0);
    const count = showUnlinked ? isolatedNodes.length : Number(focusedPointIndex !== -1);
    pointGeometry.setDrawRange(start, count);
    pointCloud.visible = count > 0;
  };
  updatePointVisibility();

  const vertices = new Float32Array(links.length * 6);
  links.forEach(({ source, target }, index) => {
    vertices.set(positions.get(source), index * 6);
    vertices.set(positions.get(target), index * 6 + 3);
  });

  const linkGeometry = new BufferGeometry();
  linkGeometry.setAttribute('position', new BufferAttribute(vertices, 3));
  const linkMaterial = new LineBasicMaterial({
    color: '#aabbcc',
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });

  const light = new DirectionalLight(0xffffff, 2);
  light.position.set(1, 2, 3);
  scene.add(nodeMesh, pointCloud, new LineSegments(linkGeometry, linkMaterial), new AmbientLight(0xffffff, 1), light);

  return {
    scene,
    positions,
    radius,
    getNodeRadius,
    setPixelHeight(height) {
      pointMaterial.uniforms.viewportHeight.value = height;
    },
    setShowUnlinked(visible) {
      showUnlinked = visible || connectedNodes.length === 0;
      updatePointVisibility();
    },
    setFocusedNode(node) {
      focusedPointIndex = node && !node.position ? isolatedNodes.findIndex(({ id }) => id === node.id) : -1;
      updatePointVisibility();
    },
    pickNode(raycaster) {
      raycaster.params.Points.threshold = maxPointRadius;
      const hits = pointCloud.visible
        ? raycaster.intersectObjects(pickTargets)
        : raycaster.intersectObject(nodeMesh);
      const hit = hits.find(intersection =>
        intersection.object === nodeMesh
        || intersection.distanceToRay <= getNodeRadius(isolatedNodes[intersection.index]),
      );
      if (!hit) {
        return null;
      }
      return hit.object === nodeMesh ? connectedNodes[hit.instanceId] : isolatedNodes[hit.index];
    },
    dispose() {
      nodeMesh.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      pointGeometry.dispose();
      pointMaterial.dispose();
      linkGeometry.dispose();
      linkMaterial.dispose();
    },
  };
}
