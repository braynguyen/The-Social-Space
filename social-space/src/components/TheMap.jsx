import { useEffect, useRef } from 'react';
import ForceGraph3D from 'react-force-graph-3d';

const TIKTOK_VIDEO_URL = /^https:\/\/www\.tiktok\.com\/@[^/?#]+\/video\/(\d+)\/?(?:[?#].*)?$/;

export default function TheMap({ graphData, selectedNode, onSelectNode }) {
  const graphRef = useRef(null);

  useEffect(() => {
    graphRef.current.d3Force('charge').strength(-1250);
  }, []);

  useEffect(() => {
    if (!selectedNode) {
      return;
    }

    const { x, y, z } = selectedNode;
    const distance = Math.hypot(x, y, z);
    if (!Number.isFinite(distance)) {
      return;
    }

    const offset = 40;
    const scale = 1 + offset / (distance || 1);
    const position = distance === 0
      ? { x, y, z: offset }
      : { x: x * scale, y: y * scale, z: z * scale };

    graphRef.current.cameraPosition(position, selectedNode, 3000);
  }, [selectedNode]);

  const videoUrl = selectedNode?.video_links?.find(url => TIKTOK_VIDEO_URL.test(url));
  const videoId = videoUrl?.match(TIKTOK_VIDEO_URL)[1];

  return (
    <>
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        onNodeClick={onSelectNode}
        enableNodeDrag={false}
        linkOpacity={0.05}
        nodeOpacity={0.85}
      />

      {selectedNode && (
        <section className="video-preview" aria-labelledby="video-preview-title">
          <div className="video-preview-header">
            <h2 id="video-preview-title">{selectedNode.name}</h2>
            <button type="button" onClick={() => onSelectNode(null)}>Close</button>
          </div>
          {videoId ? (
            <>
              <iframe
                title={`TikTok video for ${selectedNode.name}`}
                src={`https://www.tiktok.com/player/v1/${videoId}`}
                allowFullScreen
              />
              <a href={videoUrl} target="_blank" rel="noreferrer">Watch on TikTok</a>
            </>
          ) : (
            <p>No video preview available.</p>
          )}
        </section>
      )}
    </>
  );
}
