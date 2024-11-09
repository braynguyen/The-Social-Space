// The snapshots encode Louvain membership by color. Labels describe representative
// hashtags in each shipped cluster, and the fallback colors indicate no assignment.
const CLUSTER_LABELS = {
  general: {
    '#8cddd2': 'ASMR & everyday life',
    '#a4a543': 'Viral humor & trends',
    '#763a2b': 'Skating & everyday life',
    '#b8253b': 'Crafts & home',
    '#7bd5db': 'Finance & technology',
    '#58140b': 'Film & horror',
    '#3ea9d6': 'Fitness & wellness',
    '#35ceb0': 'Anime & fantasy',
    '#9271fc': 'Comedy, art & pets',
    '#6ea9ae': 'Art & alternative style',
    '#6500bf': 'Books & reading',
    '#382713': 'Relationships & self-growth',
    '#be2123': 'Travel & astrology',
    '#89163c': 'Sports & pop culture',
    '#592fd3': 'Witchcraft & spirituality',
    '#bc8ca0': 'Music & songwriting',
    '#ccbf33': 'Animals & wildlife',
    '#4bdaff': 'Cycling & motorsports',
    '#c2cf64': 'Science & space',
    '#a895c4': 'Food & pop culture',
    '#aeacee': 'Tabletop & nostalgia',
    '#b8fac9': 'Polish humor & lifestyle',
    '#5c5670': 'Cricket & regional culture',
  },
  user: {
    '#5347fc': 'Crafts & aesthetics',
    '#6b12ff': 'Gaming & nostalgia',
    '#9e0638': 'Viral humor & trends',
    '#a86c3a': 'Science, coding & health',
    '#6cb883': 'Comedy, art & pets',
  },
};
const UNASSIGNED_COLORS = { general: '#ff5733', user: '#000000' };
const TOP_HASHTAG_COUNT = 8;

export function getSidebarData({ nodes, links }, mode) {
  const tagsById = new Map(nodes.map(node => [node.id, {
    id: node.id,
    name: node.name,
    weight: Number.isFinite(node.val) ? Math.max(0, node.val) : 0,
    degree: 0,
    node,
  }]));
  const neighborsById = new Map();
  let connections = 0;

  // An edge can appear in both directions. Count each connection between distinct tags once.
  for (const { source, target } of links) {
    const sourceTag = tagsById.get(source);
    const targetTag = tagsById.get(target);
    if (!sourceTag || !targetTag || source === target) {
      continue;
    }

    const [first, second] = source < target ? [source, target] : [target, source];
    if (!neighborsById.has(first)) {
      neighborsById.set(first, new Set());
    }
    const neighbors = neighborsById.get(first);
    if (neighbors.has(second)) {
      continue;
    }

    neighbors.add(second);
    sourceTag.degree++;
    targetTag.degree++;
    connections++;
  }

  const rankedTags = [...tagsById.values()].sort((a, b) => b.weight - a.weight);
  const hashtagsByColor = new Map();
  const uncategorized = [];
  const outliers = [];

  for (const tag of rankedTags) {
    // Match the graph's point cloud, which contains nodes without a layout position.
    if (!tag.node.position) {
      outliers.push(tag);
    }

    const color = tag.node.color?.toLowerCase();
    if (!color || color === UNASSIGNED_COLORS[mode]) {
      uncategorized.push(tag);
      continue;
    }
    if (!hashtagsByColor.has(color)) {
      hashtagsByColor.set(color, []);
    }
    hashtagsByColor.get(color).push(tag);
  }

  const clusters = Array.from(hashtagsByColor, ([color, hashtags]) => ({
    id: color,
    label: CLUSTER_LABELS[mode]?.[color] ?? hashtags[0].name,
    count: hashtags.length,
    color,
    hashtags,
  })).sort((a, b) => b.count - a.count);

  if (uncategorized.length > 0) {
    clusters.push({
      id: 'uncategorized',
      label: 'Uncategorized',
      count: uncategorized.length,
      color: null,
      hashtags: uncategorized,
    });
  }

  return {
    topHashtags: rankedTags.slice(0, TOP_HASHTAG_COUNT),
    clusters,
    outliers,
    stats: { hashtags: nodes.length, connections, outliers: outliers.length },
  };
}
