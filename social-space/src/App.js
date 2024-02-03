import logo from './logo.svg';
import './App.css';
import './components/TheMap';
import TheMap from './components/TheMap';
import { useState, useEffect } from 'react';
import { slide as Menu } from 'react-burger-menu';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        console.log("fetching");
        const response = await fetch('http://localhost:5000/api/graph-data');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setGraphData(data);
      } catch (error) {
        console.error("Could not fetch graph data:", error);
      }
    };
    fetchGraphData();
  }, []);

  const handleMenuButtonClick = () => {
    setMenuOpen(!menuOpen);
  };

  const inviteFriend = () => {
    // Add your logic for inviting friends here
    alert("Invite your friend!");
  };

  return (
    <div className="App">
      <Menu isOpen={menuOpen} width={250} right onStateChange={({ isOpen }) => setMenuOpen(isOpen)}>
        {/* Add your menu items here */}
        <div>
          <h2>Social Space</h2>
          <p><b>My Top Tags</b></p>
          <hr />
          <ol>
            <li><a onClick={() => setMenuOpen(false)} href="/">#BookTok</a></li>
            <li><a onClick={() => setMenuOpen(false)} href="/">#Pickleball</a></li>
            <li><a onClick={() => setMenuOpen(false)} href="/">#Cooking</a></li>
          </ol>
        </div>
        <div>
          <p><b>My Toks</b></p>
          <hr />
          <ol>
            <li><a onClick={() => setMenuOpen(false)} href="/">BookTok</a></li>
            <li><a onClick={() => setMenuOpen(false)} href="/">CookTok</a></li>
            <li><a onClick={() => setMenuOpen(false)} href="/">PickleballTok</a></li>
          </ol>
        </div>
        <div>
          <button className="invite-button" onClick={inviteFriend}>Invite Friend</button>
        </div>
      </Menu>
      <TheMap
        graphData={graphData}
        linkDistance={link => link.distance}
        zIndex={1}
      />
    </div>
  );
}

export default App;
