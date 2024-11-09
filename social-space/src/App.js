import { useEffect, useMemo, useState } from 'react';
import { slide as Menu } from 'react-burger-menu';
import GraphSidebar from './components/GraphSidebar';
import Search from './components/Search';
import WelcomePopup from './components/WelcomePopup';
import { getSidebarData } from './sidebarData';
import './App.css';

const GRAPH_LOADERS = {
  general: () => import(/* webpackChunkName: "graph-general" */ './generated/general.json'),
  user: () => import(/* webpackChunkName: "graph-user" */ './generated/user.json'),
};

const MENU_STYLES = { bmCrossButton: { width: 44, height: 44, top: 12, right: 12 } };

function App() {
  const [graphMode, setGraphMode] = useState('general');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisited, setMenuVisited] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [view, setView] = useState(null);
  const [failedMode, setFailedMode] = useState(null);
  const loadFailed = failedMode === graphMode;
  const graphReady = view?.mode === graphMode;
  const GraphMap = view?.component;
  const browseGraph = graphReady && menuVisited ? view.graphData : null;
  const sidebarData = useMemo(
    () => browseGraph && getSidebarData(browseGraph, graphMode),
    [browseGraph, graphMode],
  );

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

  const handleMenuStateChange = ({ isOpen }) => {
    setMenuOpen(isOpen);
    if (isOpen) {
      setMenuVisited(true);
    }
  };

  const selectNodeFromMenu = node => {
    setSelectedNode(node);
    setMenuOpen(false);
  };

  const selectHashtag = query => {
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

    selectNodeFromMenu(node);
    return true;
  };

  return (
    <div className="App">
      <WelcomePopup />
      <Menu
        id="hashtag-menu"
        isOpen={menuOpen}
        width="min(24rem, calc(100vw - 1rem))"
        right
        styles={MENU_STYLES}
        onStateChange={handleMenuStateChange}
      >
        <div tabIndex={-1}>
          <GraphSidebar
            graphMode={graphMode}
            onGraphModeChange={handleGraphModeChange}
            graphReady={graphReady}
            loadFailed={loadFailed}
            data={sidebarData}
            onSelectNode={tag => selectNodeFromMenu(tag.node)}
          >
            <Search key={graphMode} onSearch={selectHashtag} disabled={!graphReady} />
          </GraphSidebar>
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
