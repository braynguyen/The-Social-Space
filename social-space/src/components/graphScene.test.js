import { Matrix4, Raycaster, Vector3 } from 'three';
import { createGraphScene } from './graphScene';

test('batches the full graph and picks both linked and unlinked hashtags', () => {
  const linked = { id: 'books', position: [-20, 0, 0], val: 1 };
  const neighbor = { id: 'reading', position: [20, 0, 0], val: 1 };
  const isolated = { id: 'cooking', val: 1 };
  const graph = createGraphScene({
    nodes: [linked, neighbor, isolated],
    links: [{ source: linked.id, target: neighbor.id }],
  });

  try {
    const mesh = graph.scene.children.find(object => object.isInstancedMesh);
    const points = graph.scene.children.find(object => object.isPoints);
    const edges = graph.scene.children.find(object => object.isLineSegments);
    expect(mesh.count).toBe(2);
    expect(points.geometry.getAttribute('position').count).toBe(1);
    expect(Array.from(edges.geometry.getAttribute('position').array)).toEqual([
      ...linked.position, ...neighbor.position,
    ]);

    const ray = new Raycaster(new Vector3(), new Vector3(0, 0, -1));
    for (const node of [linked, isolated]) {
      ray.ray.origin.fromArray(graph.positions.get(node.id));
      ray.ray.origin.z += 20;
      expect(graph.pickNode(ray)).toBe(node);
    }
  } finally {
    graph.dispose();
  }
});

test('gives larger weights larger markers at the same scale in both views', () => {
  const snapshots = [1, 0.01].map(multiplier => [
    { id: 'small', position: [-1000, 0, 0], val: 20 * multiplier },
    { id: 'large', position: [1000, 0, 0], val: 2000 * multiplier },
    { id: 'unlinked', val: 0 },
  ]);
  const radiiByView = snapshots.map(nodes => {
    const graph = createGraphScene({ nodes, links: [] });
    try {
      const mesh = graph.scene.children.find(object => object.isInstancedMesh);
      const points = graph.scene.children.find(object => object.isPoints);
      const matrix = new Matrix4();
      const scale = new Vector3();

      const radii = nodes.slice(0, 2).map((node, index) => {
        mesh.getMatrixAt(index, matrix);
        const radius = scale.setFromMatrixScale(matrix).x;
        expect(radius).toBeCloseTo(graph.getNodeRadius(node));
        return radius;
      });

      expect(radii[1]).toBeGreaterThan(radii[0] * 5);
      expect(points.geometry.getAttribute('diameter').getX(0)).toBeCloseTo(2 * graph.getNodeRadius(nodes[2]));
      expect(graph.getNodeRadius(nodes[2])).toBeGreaterThan(0);
      return radii;
    } finally {
      graph.dispose();
    }
  });

  expect(radiiByView[0]).toEqual(radiiByView[1]);
});
