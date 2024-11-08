"""Refresh supplemental graph edges from the checked-in TikTok video sample."""

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GRAPH = ROOT / "social-space/src/graph_data_minified.json"
VIDEO_SAMPLE = ROOT / "csv_files/scrapedhashtags.csv"
OUTPUT = ROOT / "social-space/src/graph_cooccurrences.json"

MIN_VIDEOS = 5
MIN_CREATORS = 3
MAX_ADDED_EDGES = 2200
MAX_EDGES_PER_ANCHOR = 12
DISCOVERY_TAGS = {
    "fyp", "fy", "fypage", "foryou", "foryoupage", "foryourpage",
    "parati", "pourtoi", "tiktok", "trend", "trending", "viral", "viralvideo",
}
VIDEO_URL = re.compile(r"https://www\.tiktok\.com/@([^/?#]+)/video/(\d+)")


def get_video_hashtags(hashtags):
    videos = {}
    with VIDEO_SAMPLE.open(encoding="utf-8", newline="") as input_file:
        for row in csv.DictReader(input_file):
            video_id, url, tags = row["id"], row["webVideoUrl"], row["hashtags"]
            match = VIDEO_URL.fullmatch(url or "")
            if tags and match and match[2] == video_id and video_id not in videos:
                creator = match[1].casefold()
                videos[video_id] = (creator, hashtags.intersection(tags.split()))
    return videos.values()


def rank_pairs(graph):
    anchors = {link[key] for link in graph["links"] for key in ("source", "target")}
    eligible = {node["id"] for node in graph["nodes"] if node["id"].casefold() not in DISCOVERY_TAGS}
    video_counts = Counter()
    pair_counts = Counter()
    videos = []

    for creator, hashtags in get_video_hashtags(eligible):
        video_counts.update(hashtags)
        isolated, connected = hashtags - anchors, hashtags & anchors
        if isolated and connected:
            videos.append((creator, isolated, connected))
            pair_counts.update((source, target) for source in isolated for target in connected)

    frequent_pairs = {pair for pair, count in pair_counts.items() if count >= MIN_VIDEOS}
    creators = defaultdict(set)
    for creator, isolated, connected in videos:
        for source in isolated:
            for target in connected:
                pair = (source, target)
                if pair in frequent_pairs:
                    creators[pair].add(creator)

    ranked = []
    for (source, target), accounts in creators.items():
        if len(accounts) < MIN_CREATORS:
            continue
        count = pair_counts[source, target]
        # Squared cosine similarity reduces the influence of ubiquitous tags.
        similarity = count ** 2 / (video_counts[source] * video_counts[target])
        ranked.append((-similarity, -len(accounts), -count, source, target))
    return sorted(ranked)


def select_edges(ranked_pairs):
    edges = []
    attached = set()
    anchor_counts = Counter()
    for _, _, negative_count, source, target in ranked_pairs:
        if source in attached or anchor_counts[target] >= MAX_EDGES_PER_ANCHOR:
            continue
        edges.append({"source": source, "target": target, "distance": -negative_count * 1000})
        attached.add(source)
        anchor_counts[target] += 1
        if len(edges) == MAX_ADDED_EDGES:
            break
    return sorted(edges, key=lambda edge: edge["source"])


def main():
    graph = json.loads(GRAPH.read_text(encoding="utf-8"))
    edges = select_edges(rank_pairs(graph))
    OUTPUT.write_text(json.dumps(edges, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {len(edges):,} edges backed by shared videos.")


if __name__ == "__main__":
    main()
