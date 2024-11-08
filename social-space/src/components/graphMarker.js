import { Vector3 } from 'three';

const projected = new Vector3();
const LABEL_HALF_WIDTH = 110;

export function positionGraphMarker(element, marker, camera, width, height) {
  if (!marker) {
    element.hidden = true;
    return;
  }

  projected.fromArray(marker.position).applyMatrix4(camera.matrixWorldInverse);
  const depth = -projected.z;
  projected.applyMatrix4(camera.projectionMatrix);

  if (depth < camera.near || depth > camera.far || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) {
    element.hidden = true;
    return;
  }

  const x = (projected.x + 1) * width / 2;
  const y = (1 - projected.y) * height / 2;
  const projectedRadius = marker.radius * camera.projectionMatrix.elements[5] * height / (2 * depth);
  const ringRadius = Math.min(Math.max(projectedRadius * 1.06 + 5, 9), Math.min(width, height) * 0.44);

  const labelMargin = Math.min(LABEL_HALF_WIDTH + 8, width / 2);
  const labelX = Math.max(labelMargin, Math.min(width - labelMargin, x));
  const labelY = Math.max(8, Math.min(height - 48, y + ringRadius + 7));

  element.hidden = false;
  element.style.transform = `translate(${x}px, ${y}px)`;
  element.style.setProperty('--ring-radius', `${ringRadius}px`);

  const label = element.firstElementChild;
  if (label.textContent !== marker.name) {
    label.textContent = marker.name;
  }
  label.style.transform = `translate(${labelX - x}px, ${labelY - y}px) translateX(-50%)`;
}
