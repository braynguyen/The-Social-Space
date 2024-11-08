import { useEffect, useState } from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { slide as Menu } from 'react-burger-menu';
import Search from './components/Search';
import WelcomePopup from './components/WelcomePopup';
import './App.css';

const GRAPH_LOADERS = {
  general: () => import(/* webpackChunkName: "graph-general" */ './graph_data_minified.json'),
  user: () => import(/* webpackChunkName: "graph-user" */ './graph_user_data_minified.json'),
};

const SAMPLE_HASHTAGS = ['BookTok', 'Pickleball', 'Cooking'];

function App() {
  const [graphMode, setGraphMode] = useState('general');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [view, setView] = useState(null);
  const [failedMode, setFailedMode] = useState(null);
  const loadFailed = failedMode === graphMode;
  const graphReady = view?.mode === graphMode;
  const GraphMap = view?.component;

  useEffect(() => {
    if (graphReady || loadFailed) {
      return;
    }

    let active = true;

    Promise.all([
      import(/* webpackChunkName: "graph-renderer" */ './components/TheMap'),
      GRAPH_LOADERS[graphMode](),
    ]).then(
      ([{ default: component }, { default: graphData }]) => {
        if (active) {
          setView({ component, graphData, mode: graphMode });
        }
      },
      () => {
        if (active) {
          setFailedMode(graphMode);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [graphMode, graphReady, loadFailed]);

  const handleGraphModeChange = (event, nextMode) => {
    if (nextMode === null) {
      return;
    }

    setGraphMode(nextMode);
    setSelectedNode(null);
    setFailedMode(null);
  };

  const selectHashtag = (query) => {
    if (!graphReady) {
      return false;
    }

    const { nodes } = view.graphData;
    const hashtag = query.trim().replace(/^#/, '');
    const lowercaseHashtag = hashtag.toLowerCase();
    const node = nodes.find(node => node.id === hashtag)
      ?? nodes.find(node => node.id.toLowerCase() === lowercaseHashtag);
    if (!node) {
      return false;
    }

    setSelectedNode(node);
    setMenuOpen(false);
    return true;
  };

  return (
    <div className="App">
      <WelcomePopup />
      <Menu isOpen={menuOpen} width={250} right onStateChange={({ isOpen }) => setMenuOpen(isOpen)}>
        <div>
          <h2>Social Space (WIP)</h2>
          <ToggleButtonGroup
            className="graph-mode"
            aria-label="Graph view"
            exclusive
            value={graphMode}
            onChange={handleGraphModeChange}
          >
            <ToggleButton value="general">General</ToggleButton>
            <ToggleButton value="user">User</ToggleButton>
          </ToggleButtonGroup>
          <Search key={graphMode} onSearch={selectHashtag} disabled={!graphReady} />

          <h3>Sample hashtags</h3>
          <ul>
            {SAMPLE_HASHTAGS.map(tag => (
              <li key={tag}>
                <button
                  className="tag-shortcut"
                  type="button"
                  disabled={!graphReady}
                  onClick={() => selectHashtag(tag)}
                >
                  #{tag}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Menu>
      {GraphMap && (
        <GraphMap
          graphData={view.graphData}
          selectedNode={selectedNode}
          onSelectNode={graphReady ? setSelectedNode : undefined}
        />
      )}
      {!graphReady && (
        <div className="graph-load-status">
          {loadFailed ? (
            <>
              <p role="alert">Couldn’t load this graph.</p>
              <button type="button" onClick={() => setFailedMode(null)}>Try again</button>
            </>
          ) : (
            <p role="status">Loading graph…</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
