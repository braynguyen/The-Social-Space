import { Raycaster, Vector3 } from 'three';
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
