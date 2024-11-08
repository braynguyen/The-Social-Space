import { useState } from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { slide as Menu } from 'react-burger-menu';
import Search from './components/search';
import TheMap from './components/TheMap';
import WelcomePopup from './components/WelcomePopup';
import generalGraph from './graph_data_minified.json';
import userGraph from './graph_user_data_minified.json';
import './App.css';

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

  const inviteFriend = () => {
    alert('Invite your friend!');
  };

  return (
    <div className="App">
      <WelcomePopup />
      <Menu isOpen={menuOpen} width={250} right onStateChange={({ isOpen }) => setMenuOpen(isOpen)}>
        <div>
          <h2>Social Space (WIP)</h2>
          <ToggleButtonGroup
            aria-label="Graph view"
            exclusive
            value={graphMode}
            onChange={handleGraphModeChange}
          >
            <ToggleButton value="general">General</ToggleButton>
            <ToggleButton value="user">User</ToggleButton>
          </ToggleButtonGroup>
          <Search />

          <p><b>My Top Tags</b></p>
          <hr />
          <ol>
            <li><a onClick={() => setMenuOpen(false)} href="/#">#BookTok</a></li>
            <li><a onClick={() => setMenuOpen(false)} href="/#">#Pickleball</a></li>
            <li><a onClick={() => setMenuOpen(false)} href="/#">#Cooking</a></li>
          </ol>
        </div>
        <div>
          <p><b>My Toks</b></p>
          <hr />
          <ol>
            <li><a onClick={() => setMenuOpen(false)} href="/#">BookTok</a></li>
            <li><a onClick={() => setMenuOpen(false)} href="/#">CookTok</a></li>
            <li><a onClick={() => setMenuOpen(false)} href="/#">PickleballTok</a></li>
          </ol>
        </div>
        <div className='bottom'>
          <button className="invite-button" onClick={inviteFriend}>Invite Friend</button>
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
