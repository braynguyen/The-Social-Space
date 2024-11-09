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
} from 'three';
import { createNodeSizer } from '../graphSizing.mjs';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const FALLBACK_COLOR = '#ffffaa';
const UNLINKED_RADIUS_SCALE = 0.55;
const MAX_ASPECT_SPREAD = 2;
const LINK_OPACITY = 0.12;

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

export function createGraphScene({ nodes, links }, aspect = 1) {
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

  const positions = new Map(nodes.map(({ id }) => [id, [0, 0, 0]]));
  const color = new Color();
  const transform = new Object3D();

  const nodeGeometry = new IcosahedronGeometry(1, 1);
  const nodeMaterial = new MeshLambertMaterial();
  const nodeMesh = new InstancedMesh(nodeGeometry, nodeMaterial, connectedNodes.length);
  nodeMesh.boundingSphere = new Sphere();

  connectedNodes.forEach((node, index) => {
    nodeMesh.setColorAt(index, color.set(node.color ?? FALLBACK_COLOR));
  });

  // Draw unlinked hashtags as depth-scaled circular points. They need no mesh triangles.
  const isolatedPositions = isolatedNodes.map((_, index) => isolatedPosition(index, isolatedNodes.length, layoutRadius));
  const pointPositions = new Float32Array(isolatedNodes.length * 3);
  const pointColors = new Float32Array(isolatedNodes.length * 3);
  const pointDiameters = new Float32Array(isolatedNodes.length);
  let maxPointRadius = 0;

  isolatedNodes.forEach((node, index) => {
    const size = getNodeRadius(node);
    color.set(node.color ?? FALLBACK_COLOR).toArray(pointColors, index * 3);
    pointDiameters[index] = 2 * size;
    maxPointRadius = Math.max(maxPointRadius, size);
  });

  const pointGeometry = new BufferGeometry();
  pointGeometry.setAttribute('position', new BufferAttribute(pointPositions, 3));
  pointGeometry.setAttribute('color', new BufferAttribute(pointColors, 3));
  pointGeometry.setAttribute('diameter', new BufferAttribute(pointDiameters, 1));
  pointGeometry.boundingSphere = new Sphere();

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
  const linkGeometry = new BufferGeometry();
  linkGeometry.setAttribute('position', new BufferAttribute(vertices, 3));
  linkGeometry.boundingSphere = new Sphere();
  const linkMaterial = new LineBasicMaterial({
    color: '#aabbcc',
    transparent: true,
    opacity: LINK_OPACITY,
    depthWrite: false,
  });

  const neighborsById = new Map();
  let maxNeighbors = 0;
  const addNeighbor = (id, neighborId) => {
    let neighbors = neighborsById.get(id);
    if (!neighbors) {
      neighbors = new Set();
      neighborsById.set(id, neighbors);
    }
    neighbors.add(neighborId);
    maxNeighbors = Math.max(maxNeighbors, neighbors.size);
  };

  for (const { source, target } of links) {
    if (source !== target) {
      addNeighbor(source, target);
      addNeighbor(target, source);
    }
  }

  const focusedLinkVertices = new Float32Array(maxNeighbors * 6);
  const focusedLinkPosition = new BufferAttribute(focusedLinkVertices, 3);
  const focusedLinkGeometry = new BufferGeometry();
  focusedLinkGeometry.setAttribute('position', focusedLinkPosition);
  focusedLinkGeometry.setDrawRange(0, 0);
  focusedLinkGeometry.boundingSphere = linkGeometry.boundingSphere;
  const focusedLinkMaterial = new LineBasicMaterial({
    color: '#ffe66d',
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const focusedLinks = new LineSegments(focusedLinkGeometry, focusedLinkMaterial);
  focusedLinks.visible = false;
  focusedLinks.renderOrder = 1;
  let focusedNodeId;

  const updateFocusedLinks = () => {
    const neighbors = neighborsById.get(focusedNodeId);
    const count = neighbors?.size ?? 0;
    focusedLinks.visible = count > 0;
    focusedLinkGeometry.setDrawRange(0, count * 2);
    linkMaterial.opacity = count ? 0.04 : LINK_OPACITY;
    if (!count) {
      return;
    }

    const origin = positions.get(focusedNodeId);
    let offset = 0;
    for (const neighborId of neighbors) {
      focusedLinkVertices.set(origin, offset);
      focusedLinkVertices.set(positions.get(neighborId), offset + 3);
      offset += 6;
    }
    focusedLinkPosition.needsUpdate = true;
  };

  const light = new DirectionalLight(0xffffff, 2);
  light.position.set(1, 2, 3);
  scene.add(
    nodeMesh,
    pointCloud,
    new LineSegments(linkGeometry, linkMaterial),
    focusedLinks,
    new AmbientLight(0xffffff, 1),
    light,
  );

  let radius = layoutRadius;
  let spreadX;
  let spreadY;

  const setAspect = aspect => {
    const nextSpreadX = Math.min(Math.max(1, aspect), MAX_ASPECT_SPREAD);
    const nextSpreadY = Math.min(Math.max(1, 1 / aspect), MAX_ASPECT_SPREAD);
    if (spreadX === nextSpreadX && spreadY === nextSpreadY) {
      return;
    }
    spreadX = nextSpreadX;
    spreadY = nextSpreadY;

    // Keep marker coordinates live as the layout changes between portrait and landscape.
    const placeNode = (id, [x, y, z]) => {
      const position = positions.get(id);
      position[0] = x * spreadX;
      position[1] = y * spreadY;
      position[2] = z;
      return position;
    };

    let connectedRadius = layoutRadius;
    connectedNodes.forEach((node, index) => {
      transform.position.fromArray(placeNode(node.id, node.position));
      transform.scale.setScalar(getNodeRadius(node));
      transform.updateMatrix();
      nodeMesh.setMatrixAt(index, transform.matrix);
      connectedRadius = Math.max(connectedRadius, transform.position.length() + transform.scale.x);
    });
    nodeMesh.instanceMatrix.needsUpdate = true;
    nodeMesh.boundingSphere.radius = connectedRadius;

    radius = connectedRadius;
    isolatedNodes.forEach((node, index) => {
      const position = placeNode(node.id, isolatedPositions[index]);
      pointPositions.set(position, index * 3);
      radius = Math.max(radius, Math.hypot(...position) + getNodeRadius(node));
    });
    pointGeometry.getAttribute('position').needsUpdate = true;
    pointGeometry.boundingSphere.radius = radius;

    links.forEach(({ source, target }, index) => {
      vertices.set(positions.get(source), index * 6);
      vertices.set(positions.get(target), index * 6 + 3);
    });
    linkGeometry.getAttribute('position').needsUpdate = true;
    linkGeometry.boundingSphere.radius = radius;
    updateFocusedLinks();
  };
  setAspect(aspect);

  return {
    scene,
    positions,
    get radius() { return radius; },
    getNodeRadius,
    setAspect,
    getOverviewDistance(verticalFov, aspect) {
      const verticalScale = 1 / Math.tan(verticalFov * Math.PI / 360);
      const horizontalScale = verticalScale / aspect;
      const horizontalRadiusScale = Math.hypot(1, horizontalScale);
      const verticalRadiusScale = Math.hypot(1, verticalScale);
      let distance = 2;
      for (const node of nodes) {
        const [x, y, z] = positions.get(node.id);
        const size = getNodeRadius(node);
        // Leave room for the whole sphere against each side of the camera frustum.
        distance = Math.max(
          distance,
          z + Math.abs(x) * horizontalScale + size * horizontalRadiusScale,
          z + Math.abs(y) * verticalScale + size * verticalRadiusScale,
        );
      }
      return distance;
    },
    setPixelHeight(height) {
      pointMaterial.uniforms.viewportHeight.value = height;
    },
    setShowUnlinked(visible) {
      showUnlinked = visible || connectedNodes.length === 0;
      updatePointVisibility();
    },
    setFocusedNode(node) {
      focusedNodeId = node?.id;
      focusedPointIndex = node && !node.position ? isolatedNodes.findIndex(({ id }) => id === node.id) : -1;
      updatePointVisibility();
      updateFocusedLinks();
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
      focusedLinkGeometry.dispose();
      focusedLinkMaterial.dispose();
    },
  };
}
