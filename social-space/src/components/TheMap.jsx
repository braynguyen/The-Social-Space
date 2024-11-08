import GraphCanvas from './GraphCanvas';

const TIKTOK_VIDEO_URL = /^https:\/\/www\.tiktok\.com\/@[^/?#]+\/video\/(\d+)\/?(?:[?#].*)?$/;

export default function TheMap({ graphData, selectedNode, onSelectNode }) {
  const videoUrl = selectedNode?.video_links?.find(url => TIKTOK_VIDEO_URL.test(url));
  const videoId = videoUrl?.match(TIKTOK_VIDEO_URL)[1];

  return (
    <>
      <GraphCanvas
        graphData={graphData}
        selectedNode={selectedNode}
        onSelectNode={onSelectNode}
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
