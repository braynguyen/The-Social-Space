import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { forceCenter, forceLink, forceManyBody, forceSimulation } from 'd3-force-3d';

const source = new URL('../src/', import.meta.url);
const output = new URL('generated/', source);

await mkdir(output, { recursive: true });

for (const [mode, filename] of [
  ['general', 'graph_data_minified.json'],
  ['user', 'graph_user_data_minified.json'],
]) {
  const graph = JSON.parse(await readFile(new URL(filename, source), 'utf8'));
  const endpoints = new Set(graph.links.flatMap(({ source, target }) => [source, target]));
  const connectedNodes = graph.nodes.filter(node => endpoints.has(node.id)).map(({ id }) => ({ id }));
  const edges = graph.links.map(link => ({ ...link }));

  // d3 mutates its nodes and edges. Keep the serialized links as hashtag IDs.
  forceSimulation(connectedNodes, 3)
    .stop()
    .force('link', forceLink(edges).id(node => node.id))
    .force('charge', forceManyBody().strength(-1250))
    .force('center', forceCenter())
    .tick(180);

  const positions = new Map(connectedNodes.map(({ id, x, y, z }) => [id, [x, y, z].map(Math.round)]));
  for (const node of graph.nodes) {
    if (positions.has(node.id)) {
      node.position = positions.get(node.id);
    }
  }

  const temporaryFile = new URL(`.${mode}-${process.pid}.json`, output);
  await writeFile(temporaryFile, JSON.stringify(graph));
  await rename(temporaryFile, new URL(`${mode}.json`, output));
}
