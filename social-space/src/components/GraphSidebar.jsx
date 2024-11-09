import { useId, useState } from 'react';
import './GraphSidebar.css';

const TOP_HASHTAG_PREVIEW = 5;
const GENRES_PER_PAGE = 4;
const HASHTAGS_PER_PAGE = 6;
const countFormatter = new Intl.NumberFormat();
const weightFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 2,
});

function TagList({ hashtags, ranked = false, onSelectNode }) {
  const List = ranked ? 'ol' : 'ul';
  const listId = useId();

  return (
    <List className="sidebar-list">
      {hashtags.map((hashtag, index) => {
        const weightId = `${listId}-${index}`;

        return (
          <li key={hashtag.id}>
            <button
              className="sidebar-row"
              type="button"
              aria-label={hashtag.name}
              aria-describedby={weightId}
              onClick={() => onSelectNode(hashtag)}
            >
              {ranked && <span className="sidebar-rank" aria-hidden="true">{index + 1}</span>}
              <span className="sidebar-name" title={hashtag.name}>{hashtag.name}</span>
              <span id={weightId} className="sidebar-number">
                <span className="sidebar-screen-reader">Graph weight </span>
                {weightFormatter.format(hashtag.weight)}
              </span>
            </button>
          </li>
        );
      })}
    </List>
  );
}

function Pager({ name, page, pageSize, total, onPageChange }) {
  if (total <= pageSize) {
    return null;
  }

  const first = page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="sidebar-pager">
      <p aria-live="polite">
        {countFormatter.format(first)}–{countFormatter.format(last)} of {countFormatter.format(total)}
      </p>
      <button type="button" aria-label={`Previous ${name}`} disabled={page === 0} onClick={() => onPageChange(page - 1)}>
        Prev
      </button>
      <button type="button" aria-label={`Next ${name}`} disabled={last === total} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </div>
  );
}

function BrowseHashtags({ name, hashtags, onSelectNode }) {
  const [page, setPage] = useState(0);
  const first = page * HASHTAGS_PER_PAGE;

  return (
    <>
      <p className="sidebar-list-caption">Graph weight</p>
      <TagList hashtags={hashtags.slice(first, first + HASHTAGS_PER_PAGE)} onSelectNode={onSelectNode} />
      <Pager name={name} page={page} pageSize={HASHTAGS_PER_PAGE} total={hashtags.length} onPageChange={setPage} />
    </>
  );
}

function TopHashtags({ hashtags, onSelectNode }) {
  const [showAll, setShowAll] = useState(false);

  return (
    <section className="sidebar-section" aria-labelledby="sidebar-top-hashtags">
      <div className="sidebar-section-heading">
        <h3 id="sidebar-top-hashtags">Top hashtags</h3>
        <span>Graph weight</span>
      </div>
      <TagList
        hashtags={showAll ? hashtags : hashtags.slice(0, TOP_HASHTAG_PREVIEW)}
        ranked
        onSelectNode={onSelectNode}
      />
      {hashtags.length > TOP_HASHTAG_PREVIEW && (
        <button className="sidebar-more" type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show fewer top hashtags' : `Show all ${hashtags.length} top hashtags`}
        </button>
      )}
    </section>
  );
}

function Genres({ genres, onSelectNode }) {
  const [page, setPage] = useState(0);
  const [expandedGenre, setExpandedGenre] = useState(null);
  const first = page * GENRES_PER_PAGE;

  const changePage = (nextPage) => {
    setPage(nextPage);
    setExpandedGenre(null);
  };

  return (
    <section className="sidebar-section" aria-labelledby="sidebar-genres">
      <div className="sidebar-section-heading">
        <h3 id="sidebar-genres">Genres</h3>
        <span>Hashtags</span>
      </div>
      <ul className="sidebar-list">
        {genres.slice(first, first + GENRES_PER_PAGE).map(genre => {
          const expanded = expandedGenre === genre.id;
          const membersId = `sidebar-genre-${genre.id}`;

          return (
            <li key={genre.id}>
              <button
                className="sidebar-row sidebar-disclosure"
                type="button"
                aria-label={genre.label}
                aria-describedby={`${membersId}-count`}
                aria-expanded={expanded}
                aria-controls={membersId}
                onClick={() => setExpandedGenre(expanded ? null : genre.id)}
              >
                <span className="sidebar-genre-dot" style={{ backgroundColor: genre.color }} aria-hidden="true" />
                <span className="sidebar-name" title={genre.label}>{genre.label}</span>
                <span id={`${membersId}-count`} className="sidebar-number">
                  {countFormatter.format(genre.count)}
                  <span className="sidebar-screen-reader"> hashtags</span>
                </span>
                <span className="sidebar-chevron" aria-hidden="true" />
              </button>
              <div id={membersId} className="sidebar-genre-members" hidden={!expanded}>
                {expanded && <BrowseHashtags name="hashtags" hashtags={genre.hashtags} onSelectNode={onSelectNode} />}
              </div>
            </li>
          );
        })}
      </ul>
      <Pager name="genres" page={page} pageSize={GENRES_PER_PAGE} total={genres.length} onPageChange={changePage} />
    </section>
  );
}

function Outliers({ hashtags, onSelectNode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="sidebar-section sidebar-outliers" aria-labelledby="sidebar-outliers-heading">
      <h3 id="sidebar-outliers-heading">
        <button
          className="sidebar-row sidebar-disclosure"
          type="button"
          aria-expanded={expanded}
          aria-controls="sidebar-outliers-list"
          onClick={() => setExpanded(!expanded)}
        >
          Outliers
          <span className="sidebar-chevron" aria-hidden="true" />
        </button>
      </h3>
      <p>Hashtags in the outer cloud.</p>
      <div id="sidebar-outliers-list" hidden={!expanded}>
        {expanded && <BrowseHashtags name="outliers" hashtags={hashtags} onSelectNode={onSelectNode} />}
      </div>
    </section>
  );
}

function keepKeyboardNavigation(event) {
  if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    event.stopPropagation();
  }
}

export default function GraphSidebar({ graphReady, loadFailed, data, onSelectNode, children }) {
  return (
    <div className="graph-sidebar" onKeyDown={keepKeyboardNavigation}>
      <header className="sidebar-header">
        <h2>Explore hashtags</h2>
      </header>

      <div className="graph-mode" role="group" aria-label="Graph view">
        <button type="button" aria-pressed="true">General</button>
        <button type="button" disabled>User (TBD)</button>
      </div>
      {children}

      {graphReady && data ? (
        <>
          <dl className="sidebar-stats">
            <div>
              <dt>Hashtags</dt>
              <dd>{countFormatter.format(data.stats.hashtags)}</dd>
            </div>
            <div>
              <dt>Edges</dt>
              <dd>{countFormatter.format(data.stats.connections)}</dd>
            </div>
            <div>
              <dt>Outliers</dt>
              <dd>{countFormatter.format(data.stats.outliers)}</dd>
            </div>
          </dl>
          {data.topHashtags.length > 0 && <TopHashtags hashtags={data.topHashtags} onSelectNode={onSelectNode} />}
          {data.clusters.length > 0 && <Genres genres={data.clusters} onSelectNode={onSelectNode} />}
          {data.outliers.length > 0 && <Outliers hashtags={data.outliers} onSelectNode={onSelectNode} />}
        </>
      ) : (
        <p className="sidebar-status">{loadFailed ? 'Couldn’t load this graph.' : 'Loading hashtags…'}</p>
      )}
    </div>
  );
}
