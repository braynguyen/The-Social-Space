import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./graph_data_minified.json', () => ({
  nodes: [
    {
      id: 'booktok',
      name: '#booktok',
      x: 0,
      y: 0,
      z: 0,
      video_links: ['https://www.tiktok.com/@reader/video/123456789'],
    },
    { id: 'cooking', name: '#cooking', video_links: ['N/A'] },
  ],
  links: [],
}));

jest.mock('./graph_user_data_minified.json', () => ({
  nodes: [{ id: 'pickleball', name: '#pickleball' }],
  links: [],
}));

const mockCameraPosition = jest.fn();

jest.mock('react-force-graph-3d', () => {
  const { forwardRef, useImperativeHandle } = require('react');

  return forwardRef(function Graph({ graphData, onNodeClick }, ref) {
    useImperativeHandle(ref, () => ({
      d3Force: () => ({ strength: () => {} }),
      cameraPosition: mockCameraPosition,
    }));

    return graphData.nodes.map(node => (
      <button key={node.id} onClick={() => onNodeClick(node)}>
        Select {node.name}
      </button>
    ));
  });
});

function openApp() {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
}

test('switches graph views and clears the previous selection', async () => {
  openApp();
  fireEvent.click(screen.getByRole('button', { name: 'Select #booktok' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }));

  const general = await screen.findByRole('button', { name: 'General' });
  const user = screen.getByRole('button', { name: 'User' });
  expect(general).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(general);
  expect(screen.getByTitle('TikTok video for #booktok')).toBeInTheDocument();

  fireEvent.click(user);
  expect(user).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Select #pickleball' })).toBeInTheDocument();
  expect(screen.queryByTitle('TikTok video for #booktok')).not.toBeInTheDocument();
});

test('opens an isolated video player and handles tags with no video', () => {
  openApp();
  fireEvent.click(screen.getByRole('button', { name: 'Select #booktok' }));

  expect(screen.getByTitle('TikTok video for #booktok')).toHaveAttribute(
    'src',
    'https://www.tiktok.com/player/v1/123456789',
  );
  expect(mockCameraPosition).toHaveBeenLastCalledWith(
    { x: 0, y: 0, z: 40 },
    expect.objectContaining({ id: 'booktok' }),
    3000,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByTitle('TikTok video for #booktok')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Select #cooking' }));
  expect(screen.getByText('No video preview available.')).toBeInTheDocument();
});
