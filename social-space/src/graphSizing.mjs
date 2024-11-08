const MIN_RADIUS = 12;
const MAX_RADIUS = 360;

function nodeWeight({ val }) {
  return Number.isFinite(val) ? Math.max(0, val) : 0;
}

export function createNodeSizer(nodes) {
  const maxWeight = nodes.reduce((max, node) => Math.max(max, nodeWeight(node)), 0) || 1;
  return node => MIN_RADIUS + Math.sqrt(nodeWeight(node) / maxWeight) * (MAX_RADIUS - MIN_RADIUS);
}
