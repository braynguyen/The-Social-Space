import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./generated/general.json', () => ({
  nodes: [
    {
      id: 'booktok',
      name: '#booktok',
      video_links: ['https://www.tiktok.com/@reader/video/123456789'],
    },
    { id: 'BookTok', name: '#BookTok' },
    { id: 'cooking', name: '#cooking', video_links: ['N/A'] },
  ],
  links: [],
}));

const mockLoadUserGraph = jest.fn();

jest.mock('./generated/user.json', () => {
  mockLoadUserGraph();
  return {
    nodes: [{ id: 'pickleball', name: '#pickleball' }],
    links: [],
  };
});

jest.mock('./components/GraphCanvas', () => ({
  __esModule: true,
  default: function GraphCanvas({ graphData, onSelectNode }) {
    return graphData.nodes.map(node => (
      <button key={node.id} onClick={() => onSelectNode?.(node)}>
        Select {node.name}
      </button>
    ));
  },
}));

async function openApp() {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await screen.findByRole('button', { name: 'Select #booktok' });
}

test('switches graph views and clears the previous selection', async () => {
  await openApp();
  fireEvent.click(screen.getByRole('button', { name: 'Select #booktok' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }));

  const general = await screen.findByRole('button', { name: 'General' });
  const user = screen.getByRole('button', { name: 'User' });
  expect(general).toHaveAttribute('aria-pressed', 'true');
  expect(mockLoadUserGraph).not.toHaveBeenCalled();

  fireEvent.click(general);
  expect(screen.getByTitle('TikTok video for #booktok')).toBeInTheDocument();

  fireEvent.click(user);
  expect(user).toHaveAttribute('aria-pressed', 'true');
  expect(await screen.findByRole('button', { name: 'Select #pickleball' })).toBeInTheDocument();
  expect(mockLoadUserGraph).toHaveBeenCalledTimes(1);
  expect(screen.queryByTitle('TikTok video for #booktok')).not.toBeInTheDocument();
});

test('opens an isolated video player and handles tags with no video', async () => {
  await openApp();
  fireEvent.click(screen.getByRole('button', { name: 'Select #booktok' }));

  expect(screen.getByTitle('TikTok video for #booktok')).toHaveAttribute(
    'src',
    'https://www.tiktok.com/player/v1/123456789',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByTitle('TikTok video for #booktok')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Select #cooking' }));
  expect(screen.getByText('No video preview available.')).toBeInTheDocument();
});

test('searches the current graph by hashtag and reports missing matches', async () => {
  await openApp();
  fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }));

  const search = await screen.findByRole('searchbox', { name: 'Find a hashtag' });
  const find = screen.getByRole('button', { name: 'Find' });
  fireEvent.change(search, { target: { value: '#pickleball' } });
  fireEvent.click(find);
  expect(screen.getByRole('status')).toHaveTextContent('No matching hashtag in this view.');

  fireEvent.change(search, { target: { value: '  #BOOKTOK ' } });
  fireEvent.click(find);
  expect(screen.getByTitle('TikTok video for #booktok')).toBeInTheDocument();
});

test('opens a sample hashtag from the sidebar', async () => {
  await openApp();
  fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }));
  fireEvent.click(await screen.findByRole('button', { name: '#Cooking' }));

  expect(screen.getByRole('region', { name: '#cooking' })).toBeInTheDocument();
});

test('prefers the exact spelling when two tags differ only in case', async () => {
  await openApp();
  fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }));

  const search = await screen.findByRole('searchbox', { name: 'Find a hashtag' });
  fireEvent.change(search, { target: { value: '#BookTok' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find' }));

  expect(screen.getByRole('region', { name: '#BookTok' })).toBeInTheDocument();
});
