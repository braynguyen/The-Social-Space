import { useState } from 'react';

export default function Search({ onSearch }) {
  const [query, setQuery] = useState('');
  const [notFound, setNotFound] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setNotFound(!onSearch(query));
  };

  const handleChange = (event) => {
    setQuery(event.target.value);
    setNotFound(false);
  };

  return (
    <form className="hashtag-search" role="search" onSubmit={handleSubmit}>
      <label htmlFor="hashtag-search">Find a hashtag</label>
      <div className="hashtag-search-controls">
        <input
          id="hashtag-search"
          type="search"
          placeholder="#booktok"
          value={query}
          onChange={handleChange}
          required
        />
        <button type="submit">Find</button>
      </div>
      {notFound && <p role="status">No matching hashtag in this view.</p>}
    </form>
  );
}
