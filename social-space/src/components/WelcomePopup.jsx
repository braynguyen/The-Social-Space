import { useState } from 'react';

export default function WelcomePopup() {
  const [open, setOpen] = useState(true);

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="grayed-background" />
      <div className="info-card">
        <h1><u>The Social Space</u></h1>
        <h3>
          <i>
            by <a href="https://www.linkedin.com/in/brayden-nguyen">Brayden Nguyen</a>,{' '}
            <a href="https://www.linkedin.com/in/quentinrl/">Quentin Romero Lauro</a>,{' '}
            <a href="https://www.linkedin.com/in/shreyash-ranjan/">Shreyash Ranjan</a>,
            and <a href="https://www.linkedin.com/in/jeremy-luu1/">Jeremy Luu</a>
          </i>
        </h3>
        <p>Hi everyone :)</p>
        <p>
          The Social Space is an interactive 3D visualization of the TikTok algorithm through
          300,000+ scraped videos. Hashtags are connected by how often they appear in the same
          video. Colors identify communities, or “Toks,” found by the Louvain algorithm.
        </p>
        <p>
          In the future, we want to map the Toks in anyone’s For You feed and let people compare
          them with friends. Choose User in the sidebar to explore a sample feed.
        </p>
        <button type="button" onClick={() => setOpen(false)}>Continue</button>
      </div>
    </>
  );
}
