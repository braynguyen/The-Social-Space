import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceRadial, forceSimulation } from 'd3-force-3d';
import { createNodeSizer } from '../src/graphSizing.mjs';

const source = new URL('../src/', import.meta.url);
const output = new URL('generated/', source);

const MIN_NODE_GAP = 320;
const LINK_GAP = 500;

function layOutGraph(nodes, links) {
  // d3 mutates nodes and edges, so only pass the layout nodes and copies of the links.
  const linkForce = forceLink(links.map(link => ({ ...link })))
    .id(node => node.id)
    .distance(({ source, target }) => source.radius + target.radius + LINK_GAP);
  const simulation = forceSimulation(nodes, 3)
    .stop()
    .force('link', linkForce)
    .force('charge', forceManyBody().strength(-2500).distanceMax(7200))
    .force('contain', forceRadial(0).strength(0.02))
    .force('center', forceCenter())
    .force('separate', forceCollide(node => node.radius + MIN_NODE_GAP / 2).iterations(2))
    .tick(190);

  // Let collisions resolve without the other forces pulling nodes back together.
  simulation.force('link', null).force('charge', null).force('contain', null).tick(45);

  return new Map(nodes.map(({ id, x, y, z }) => [id, [x, y, z].map(Math.round)]));
}

const cooccurrences = JSON.parse(await readFile(new URL('graph_cooccurrences.json', source), 'utf8'));

const snapshots = await Promise.all([
  ['general', 'graph_data_minified.json'],
  ['user', 'graph_user_data_minified.json'],
].map(async ([mode, filename]) => ({
  mode,
  graph: JSON.parse(await readFile(new URL(filename, source), 'utf8')),
})));

// Use the largest rendered radius for each hashtag so both views can share a layout.
const radii = new Map();
for (const { graph } of snapshots) {
  const getNodeRadius = createNodeSizer(graph.nodes);
  for (const node of graph.nodes) {
    radii.set(node.id, Math.max(radii.get(node.id) ?? 0, getNodeRadius(node)));
  }
}

await mkdir(output, { recursive: true });
const layouts = new Map();

for (const { mode, graph } of snapshots) {
  const endpoints = new Set(graph.links.flatMap(({ source, target }) => [source, target]));
  const nodeIds = new Set(graph.nodes.map(node => node.id));

  for (const link of cooccurrences) {
    if (nodeIds.has(link.source) && !endpoints.has(link.source) && endpoints.has(link.target)) {
      graph.links.push(link);
      endpoints.add(link.source);
    }
  }

  const connectedIds = graph.nodes.filter(node => endpoints.has(node.id)).map(node => node.id);
  const topology = JSON.stringify([connectedIds, graph.links.map(({ source, target }) => [source, target])]);
  const positions = layouts.get(topology) ?? layOutGraph(
    connectedIds.map(id => ({ id, radius: radii.get(id) })),
    graph.links,
  );
  layouts.set(topology, positions);

  for (const node of graph.nodes) {
    if (positions.has(node.id)) {
      node.position = positions.get(node.id);
    }
  }

  const temporaryFile = new URL(`.${mode}-${process.pid}.json`, output);
  await writeFile(temporaryFile, JSON.stringify(graph));
  await rename(temporaryFile, new URL(`${mode}.json`, output));
}
