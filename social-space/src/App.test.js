import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';

jest.mock('./generated/general.json', () => ({
  nodes: [
    {
      id: 'booktok',
      name: '#booktok',
      val: 12,
      color: '#6500bf',
      position: [0, 0, 0],
      video_links: ['https://www.tiktok.com/@reader/video/123456789'],
    },
    { id: 'BookTok', name: '#BookTok', val: 2, color: '#6500bf' },
    { id: 'cooking', name: '#cooking', val: 20, color: '#a895c4', position: [1, 0, 0], video_links: ['N/A'] },
  ],
  links: [{ source: 'booktok', target: 'cooking' }],
}));

const mockLoadUserGraph = jest.fn();

jest.mock('./generated/user.json', () => {
  mockLoadUserGraph();
  return {
    nodes: [{ id: 'pickleball', name: '#pickleball', val: 10, color: '#5347fc' }],
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
  const topHashtags = screen.getByRole('region', { name: 'Top hashtags' });
  expect(within(topHashtags).getByRole('button', { name: '#pickleball' })).toBeInTheDocument();
  expect(within(topHashtags).queryByRole('button', { name: '#booktok' })).not.toBeInTheDocument();
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

test('ranks top hashtags and opens the selected result from the sidebar', async () => {
  await openApp();
  fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }));

  const topHashtags = await screen.findByRole('region', { name: 'Top hashtags' });
  const rankedTags = within(topHashtags).getAllByRole('button');
  expect(rankedTags.map(button => button.getAttribute('aria-label'))).toEqual(['#cooking', '#booktok', '#BookTok']);
  fireEvent.click(rankedTags[0]);

  expect(screen.getByRole('region', { name: '#cooking' })).toBeInTheDocument();
});

test('browses only the selected genre and opens its exact hashtag', async () => {
  await openApp();
  fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }));

  const genres = await screen.findByRole('region', { name: 'Genres' });
  const books = within(genres).getByRole('button', { name: 'Books & reading' });
  expect(books).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(books);
  expect(books).toHaveAttribute('aria-expanded', 'true');
  expect(within(genres).queryByRole('button', { name: '#cooking' })).not.toBeInTheDocument();
  fireEvent.click(within(genres).getByRole('button', { name: '#BookTok' }));

  expect(screen.getByRole('region', { name: '#BookTok' })).toBeInTheDocument();
});

test('prefers the exact spelling when two tags differ only in case', async () => {
  await openApp();
  fireEvent.click(screen.getByRole('button', { name: 'Open Menu' }));

  const search = await screen.findByRole('searchbox', { name: 'Find a hashtag' });
  fireEvent.change(search, { target: { value: '#BookTok' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find' }));

  expect(screen.getByRole('region', { name: '#BookTok' })).toBeInTheDocument();
});
