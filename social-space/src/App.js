import { useState } from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { slide as Menu } from 'react-burger-menu';
import Search from './components/Search';
import TheMap from './components/TheMap';
import WelcomePopup from './components/WelcomePopup';
import generalGraph from './graph_data_minified.json';
import userGraph from './graph_user_data_minified.json';
import './App.css';

const SAMPLE_HASHTAGS = ['BookTok', 'Pickleball', 'Cooking'];

function App() {
  const [graphMode, setGraphMode] = useState('general');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const graphData = graphMode === 'general' ? generalGraph : userGraph;

  const handleGraphModeChange = (event, nextMode) => {
    if (nextMode === null) {
      return;
    }

    setGraphMode(nextMode);
    setSelectedNode(null);
  };

  const selectHashtag = (query) => {
    const hashtag = query.trim().replace(/^#/, '');
    const lowercaseHashtag = hashtag.toLowerCase();
    const node = graphData.nodes.find(node => node.id === hashtag)
      ?? graphData.nodes.find(node => node.id.toLowerCase() === lowercaseHashtag);
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
          <Search key={graphMode} onSearch={selectHashtag} />

          <h3>Sample hashtags</h3>
          <ul>
            {SAMPLE_HASHTAGS.map(tag => (
              <li key={tag}>
                <button className="tag-shortcut" type="button" onClick={() => selectHashtag(tag)}>
                  #{tag}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Menu>
      <TheMap
        graphData={graphData}
        selectedNode={selectedNode}
        onSelectNode={setSelectedNode}
      />
    </div>
  );
}

export default App;
