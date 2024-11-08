import { PerspectiveCamera } from 'three';
import { positionGraphMarker } from './graphMarker';

test('labels a graph node and follows its projected position until it leaves the viewport', () => {
  const marker = document.createElement('div');
  const label = document.createElement('span');
  marker.append(label);

  const camera = new PerspectiveCamera(45, 4 / 3, 1, 100);
  const tag = { name: '#booktok', position: [0, 0, -20], radius: 2 };
  positionGraphMarker(marker, tag, camera, 800, 600);
  expect(label).toHaveTextContent('#booktok');
  expect(marker.style.transform).toBe('translate(400px, 300px)');
  expect(marker.hidden).toBe(false);

  camera.position.x = 5;
  camera.updateMatrixWorld();
  positionGraphMarker(marker, tag, camera, 800, 600);
  expect(parseFloat(marker.style.transform.slice('translate('.length))).toBeLessThan(400);

  camera.position.x = 30;
  camera.updateMatrixWorld();
  positionGraphMarker(marker, tag, camera, 800, 600);
  expect(marker.hidden).toBe(true);
});
