import { useEffect, useMemo, useState } from 'react';
import { slide as Menu } from 'react-burger-menu';
import GraphSidebar from './components/GraphSidebar';
import Search from './components/Search';
import WelcomePopup from './components/WelcomePopup';
import { getSidebarData } from './sidebarData';
import './App.css';

const MENU_STYLES = { bmCrossButton: { width: 44, height: 44, top: 12, right: 12 } };

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisited, setMenuVisited] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [view, setView] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const graphReady = view !== null;
  const GraphMap = view?.component;
  const browseGraph = graphReady && menuVisited ? view.graphData : null;
  const sidebarData = useMemo(
    () => browseGraph && getSidebarData(browseGraph, 'general'),
    [browseGraph],
  );

  useEffect(() => {
    if (graphReady || loadFailed) {
      return;
    }

    let active = true;

    Promise.all([
      import(/* webpackChunkName: "graph-renderer" */ './components/TheMap'),
      import(/* webpackChunkName: "graph-general" */ './generated/general.json'),
    ]).then(
      ([{ default: component }, { default: graphData }]) => {
        if (active) {
          setView({ component, graphData });
        }
      },
      () => {
        if (active) {
          setLoadFailed(true);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [graphReady, loadFailed]);

  const handleMenuStateChange = ({ isOpen }) => {
    setMenuOpen(isOpen);
    if (isOpen) {
      setMenuVisited(true);
    }
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

    setSelectedNode(node);
    return true;
  };

  return (
    <div className={menuOpen && selectedNode ? 'App App--sidebar-preview' : 'App'}>
      <WelcomePopup />
      <Menu
        id="hashtag-menu"
        isOpen={menuOpen}
        width="var(--sidebar-width)"
        right
        styles={MENU_STYLES}
        onStateChange={handleMenuStateChange}
      >
        <div tabIndex={-1}>
          <GraphSidebar
            graphReady={graphReady}
            loadFailed={loadFailed}
            data={sidebarData}
            onSelectNode={tag => setSelectedNode(tag.node)}
          >
            <Search onSearch={selectHashtag} disabled={!graphReady} />
          </GraphSidebar>
        </div>
      </Menu>
      {GraphMap && (
        <GraphMap
          graphData={view.graphData}
          selectedNode={selectedNode}
          onSelectNode={setSelectedNode}
        />
      )}
      {!graphReady && (
        <div className="graph-load-status">
          {loadFailed ? (
            <>
              <p role="alert">Couldn’t load this graph.</p>
              <button type="button" onClick={() => setLoadFailed(false)}>Try again</button>
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
