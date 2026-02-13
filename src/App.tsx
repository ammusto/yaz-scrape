import React, { useState, useEffect, useRef } from 'react';
import SearchableDropdown from './components/SearchableDropdown';
import Layout from './components/Layout';

// Types
interface Manuscript {
  ys_id: number;
  bib_number?: number;
  title_turkish?: string;
  title_arabic?: string;
  alternative_titles?: string;
  author?: string;
  author_ar?: string;
  author_date?: string;
  classification_no?: string;
  subject?: string;
  library?: string;
  collection?: string;
  date_full?: string;
  date_year?: number;
  url?: string;
  languages?: string;
  physical_description?: string;
  shelf_mark?: string;
  type_of_material?: string;
  volume?: string;
  notes?: string;
  incipit?: string;
  explicit_text?: string;
}

interface SearchQuery {
  query: string;
  field: string;
}

interface SearchState {
  queries: SearchQuery[];
  library: string;
  collection: string[];
  subjects: string[];
  languages: string[];
  shelfMark: string;
  dateFrom: number | null;
  dateTo: number | null;
  includeUndated: boolean;
  sortBy: string;
  page: number;
  perPage: number;
}

interface FacetCount {
  value: string;
  count: number;
}

interface Aggregations {
  libraries: FacetCount[];
  collections: FacetCount[];
  subjects: FacetCount[];
  languages: FacetCount[];
}

// Configuration
const API_URL = process.env.REACT_APP_API_URL || 'https://api.kashshaf.com';

// Sort options
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance (Default)' },
  { value: 'date_asc', label: 'Date (asc)' },
  { value: 'date_desc', label: 'Date (desc)' },
  { value: 'title_tr_asc', label: 'Title (tr) A-Z' },
  { value: 'title_tr_desc', label: 'Title (tr) Z-A' },
  { value: 'title_ar_asc', label: 'Title (ar) A-Z' },
  { value: 'title_ar_desc', label: 'Title (ar) Z-A' },
];

const parseURLParams = (): SearchState => {
  const params = new URLSearchParams(window.location.search);

  const queries: SearchQuery[] = [];
  for (let i = 1; i <= 3; i++) {
    const q = params.get(`q${i}`);
    const f = params.get(`f${i}`) || 'all';
    if (q) {
      queries.push({ query: q, field: f });
    }
  }

  if (queries.length === 0 && params.get('q')) {
    queries.push({ query: params.get('q') || '', field: params.get('field') || 'all' });
  }

  if (queries.length === 0) {
    queries.push({ query: '', field: 'all' });
  }

  const subjectsParam = params.get('subjects');
  const collectionParam = params.get('collection');
  const languagesParam = params.get('languages');
  const fromParam = params.get('from');
  const toParam = params.get('to');
  const pageParam = params.get('page');
  const perParam = params.get('per');

  return {
    queries,
    library: params.get('library') || '',
    collection: collectionParam ? collectionParam.split(',') : [],
    subjects: subjectsParam ? subjectsParam.split(',') : [],
    languages: languagesParam ? languagesParam.split(',') : [],
    shelfMark: params.get('shelf') || '',
    dateFrom: fromParam ? parseInt(fromParam) : null,
    dateTo: toParam ? parseInt(toParam) : null,
    includeUndated: params.get('undated') !== 'false',
    sortBy: params.get('sort') || 'relevance',
    page: pageParam ? parseInt(pageParam) : 1,
    perPage: perParam ? parseInt(perParam) : 25
  };
};

const updateURL = (state: SearchState): void => {
  const params = new URLSearchParams();

  state.queries.forEach((q, i) => {
    if (q.query) {
      params.set(`q${i + 1}`, q.query);
      if (q.field !== 'all') {
        params.set(`f${i + 1}`, q.field);
      }
    }
  });

  if (state.library) params.set('library', state.library);
  if (state.collection.length > 0) params.set('collection', state.collection.join(','));
  if (state.subjects.length > 0) params.set('subjects', state.subjects.join(','));
  if (state.languages.length > 0) params.set('languages', state.languages.join(','));
  if (state.shelfMark) params.set('shelf', state.shelfMark);
  if (state.dateFrom) params.set('from', state.dateFrom.toString());
  if (state.dateTo) params.set('to', state.dateTo.toString());
  if (!state.includeUndated) params.set('undated', 'false');
  if (state.sortBy !== 'relevance') params.set('sort', state.sortBy);
  if (state.page > 1) params.set('page', state.page.toString());
  if (state.perPage !== 25) params.set('per', state.perPage.toString());

  const url = params.toString() ? `?${params.toString()}` : window.location.pathname;
  window.history.pushState({}, '', url);
};

const sortResults = (results: Manuscript[], sortBy: string): Manuscript[] => {
  if (sortBy === 'relevance') return results;

  const sorted = [...results];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'date_asc':
        return (a.date_year ?? 9999) - (b.date_year ?? 9999);
      case 'date_desc':
        return (b.date_year ?? 0) - (a.date_year ?? 0);
      case 'title_tr_asc':
        return (a.title_turkish || '').localeCompare(b.title_turkish || '', 'tr');
      case 'title_tr_desc':
        return (b.title_turkish || '').localeCompare(a.title_turkish || '', 'tr');
      case 'title_ar_asc':
        return (a.title_arabic || '').localeCompare(b.title_arabic || '', 'ar');
      case 'title_ar_desc':
        return (b.title_arabic || '').localeCompare(a.title_arabic || '', 'ar');
      default:
        return 0;
    }
  });
  return sorted;
};

function App() {
  const [urlState] = useState(parseURLParams());

  // Active filter state
  const [queries, setQueries] = useState<SearchQuery[]>(urlState.queries);
  const [library, setLibrary] = useState(urlState.library);
  const [collection, setCollection] = useState<string[]>(urlState.collection);
  const [subjects, setSubjects] = useState<string[]>(urlState.subjects);
  const [languages, setLanguages] = useState<string[]>(urlState.languages);
  const [shelfMark, setShelfMark] = useState(urlState.shelfMark);
  const [dateFrom, setDateFrom] = useState(urlState.dateFrom);
  const [dateTo, setDateTo] = useState(urlState.dateTo);
  const [includeUndated, setIncludeUndated] = useState(urlState.includeUndated);
  const [sortBy, setSortBy] = useState(urlState.sortBy);
  const [page, setPage] = useState(urlState.page);
  const [perPage, setPerPage] = useState(urlState.perPage);

  // Pending filter state
  const [pendingQueries, setPendingQueries] = useState<SearchQuery[]>(urlState.queries);
  const [pendingLibrary, setPendingLibrary] = useState(urlState.library);
  const [pendingCollection, setPendingCollection] = useState<string[]>(urlState.collection);
  const [pendingSubjects, setPendingSubjects] = useState<string[]>(urlState.subjects);
  const [pendingLanguages, setPendingLanguages] = useState<string[]>(urlState.languages);
  const [pendingShelfMark, setPendingShelfMark] = useState(urlState.shelfMark);
  const [pendingDateFrom, setPendingDateFrom] = useState(urlState.dateFrom);
  const [pendingDateTo, setPendingDateTo] = useState(urlState.dateTo);
  const [pendingIncludeUndated, setPendingIncludeUndated] = useState(urlState.includeUndated);

  // Results state
  const [results, setResults] = useState<Manuscript[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);

  // Aggregation state
  const [aggregations, setAggregations] = useState<Aggregations | null>(null);
  const [aggregationsLoaded, setAggregationsLoaded] = useState(false);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Load aggregations once on mount
  useEffect(() => {
    const loadAggregations = async () => {
      try {
        const res = await fetch(`${API_URL}/yek/aggregations`);
        if (res.ok) {
          const data: Aggregations = await res.json();
          setAggregations(data);
          setAggregationsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load aggregations:', err);
      }
    };
    loadAggregations();
  }, []);

  // Search effect — runs whenever active state changes
  useEffect(() => {
    let cancelled = false;

    const doSearch = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        const queryParts = queries
          .filter(q => q.query.trim())
          .map(q => q.query.trim());

        if (queryParts.length > 0) {
          params.set('q', queryParts.join(' '));
        }

        const firstQuery = queries.find(q => q.query.trim());
        if (firstQuery && firstQuery.field !== 'all') {
          params.set('field', firstQuery.field);
        }

        if (library) params.set('library', library);
        if (collection.length > 0) params.set('collection', collection.join(','));
        if (subjects.length > 0) params.set('subjects', subjects.join(','));
        if (languages.length > 0) params.set('languages', languages.join(','));
        if (dateFrom !== null) params.set('date_from', dateFrom.toString());
        if (dateTo !== null) params.set('date_to', dateTo.toString());
        params.set('include_undated', includeUndated.toString());
        params.set('limit', perPage.toString());
        params.set('offset', ((page - 1) * perPage).toString());

        console.debug('Search URL:', `${API_URL}/yek/search?${params.toString()}`);

        const response = await fetch(`${API_URL}/yek/search?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();

        if (!cancelled) {
          setResults(data.results || []);
          setTotalResults(data.total_hits || 0);

          updateURL({
            queries, library, collection, subjects, languages,
            shelfMark, dateFrom, dateTo, includeUndated,
            sortBy, page, perPage
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    doSearch();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries, library, collection, subjects, languages, shelfMark,
    dateFrom, dateTo, includeUndated, sortBy, page, perPage]);

  const hasPendingFilters = (): boolean => {
    return (
      pendingLibrary !== library ||
      JSON.stringify(pendingCollection) !== JSON.stringify(collection) ||
      JSON.stringify(pendingSubjects) !== JSON.stringify(subjects) ||
      JSON.stringify(pendingLanguages) !== JSON.stringify(languages) ||
      pendingShelfMark !== shelfMark ||
      pendingDateFrom !== dateFrom ||
      pendingDateTo !== dateTo ||
      pendingIncludeUndated !== includeUndated
    );
  };

  const applyFilters = () => {
    console.log('APPLY FILTERS:', {
      pendingLibrary, pendingCollection, pendingSubjects,
      pendingLanguages, pendingShelfMark, pendingDateFrom, pendingDateTo
    });
    setLibrary(pendingLibrary);
    setCollection(pendingCollection);
    setSubjects(pendingSubjects);
    setLanguages(pendingLanguages);
    setShelfMark(pendingShelfMark);
    setDateFrom(pendingDateFrom);
    setDateTo(pendingDateTo);
    setIncludeUndated(pendingIncludeUndated);
    setPage(1);
  };

  const handleSearch = () => {
    const validQueries = pendingQueries.filter(q => q.query.trim());
    if (validQueries.length === 0) {
      validQueries.push({ query: '', field: 'all' });
    }
    setQueries(validQueries);
    setPage(1);
  };

  const hasActiveFilters = (): boolean => {
    return (
      library !== '' ||
      collection.length > 0 ||
      subjects.length > 0 ||
      languages.length > 0 ||
      shelfMark !== '' ||
      dateFrom !== null ||
      dateTo !== null ||
      !includeUndated
    );
  };

  const clearFilters = () => {
    setPendingLibrary('');
    setPendingCollection([]);
    setPendingSubjects([]);
    setPendingLanguages([]);
    setPendingShelfMark('');
    setPendingDateFrom(null);
    setPendingDateTo(null);
    setPendingIncludeUndated(true);

    setLibrary('');
    setCollection([]);
    setSubjects([]);
    setLanguages([]);
    setShelfMark('');
    setDateFrom(null);
    setDateTo(null);
    setIncludeUndated(true);
    setPage(1);
  };

  useEffect(() => {
    if (resultsContainerRef.current) {
      resultsContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [page]);

  // Download results as CSV
  const downloadResults = async () => {
    if (totalResults > 2000 && !showDownloadConfirm) {
      setShowDownloadConfirm(true);
      return;
    }

    setShowDownloadConfirm(false);

    try {
      const params = new URLSearchParams();
      const queryParts = queries.filter(q => q.query.trim()).map(q => q.query.trim());
      if (queryParts.length > 0) params.set('q', queryParts.join(' '));
      const firstQuery = queries.find(q => q.query.trim());
      if (firstQuery && firstQuery.field !== 'all') params.set('field', firstQuery.field);
      if (library) params.set('library', library);
      if (collection.length > 0) params.set('collection', collection.join(','));
      if (subjects.length > 0) params.set('subjects', subjects.join(','));
      if (languages.length > 0) params.set('languages', languages.join(','));
      if (dateFrom !== null) params.set('date_from', dateFrom.toString());
      if (dateTo !== null) params.set('date_to', dateTo.toString());
      params.set('include_undated', includeUndated.toString());
      params.set('limit', Math.min(totalResults, 2000).toString());
      params.set('offset', '0');

      const response = await fetch(`${API_URL}/yek/search?${params.toString()}`);
      if (!response.ok) throw new Error('Download failed');

      const data = await response.json();
      const downloadData = data.results || [];

      const headers = [
        'ys_id', 'bib_number', 'title_turkish', 'title_arabic',
        'author', 'author_ar', 'author_date', 'classification_no', 'subject',
        'library', 'collection', 'date_full', 'date_year', 'url',
        'languages', 'physical_description', 'shelf_mark', 'type_of_material'
      ];

      const rows = downloadData.map((r: Manuscript) => [
        r.ys_id || '',
        r.bib_number || '',
        r.title_turkish || '',
        r.title_arabic || '',
        r.author || '',
        r.author_ar || '',
        r.author_date || '',
        r.classification_no || '',
        r.subject || '',
        r.library || '',
        r.collection || '',
        r.date_full || '',
        r.date_year || '',
        r.url || '',
        r.languages || '',
        r.physical_description || '',
        r.shelf_mark || '',
        r.type_of_material || ''
      ]);

      const csv: string = [
        headers.join(','),
        ...rows.map((row: (string | number | null | undefined)[]) =>
          row.map((cell: string | number | null | undefined) =>
            `"${String(cell).replace(/"/g, '""')}"`
          ).join(',')
        )
      ].join('\n');

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manuscripts_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      setError('Failed to download results');
    }
  };

  // Pagination
  const totalPages = Math.ceil(totalResults / perPage);
  const maxPageButtons = 10;
  let startPage = Math.max(1, page - Math.floor(maxPageButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

  if (endPage - startPage < maxPageButtons - 1) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }

  const clearSearch = () => {
    setPendingQueries([{ query: '', field: 'all' }]);
    setQueries([{ query: '', field: 'all' }]);
    setPage(1);
    updateURL({
      queries: [{ query: '', field: 'all' }],
      library, collection, subjects, languages,
      shelfMark, dateFrom, dateTo, includeUndated,
      sortBy, page: 1, perPage
    });
  };

  const SkeletonResult = () => (
    <div className="search-result skeleton">
      <div className="title-section">
        <div className="skeleton-title"></div>
      </div>
      <div className="author-section">
        <div className="skeleton-author"></div>
      </div>
      <div className="details-grid">
        <div className="details-column">
          <div className="skeleton-field"></div>
          <div className="skeleton-field"></div>
          <div className="skeleton-field"></div>
        </div>
        <div className="details-column">
          <div className="skeleton-field"></div>
          <div className="skeleton-field"></div>
        </div>
        <div className="details-column">
          <div className="skeleton-field"></div>
          <div className="skeleton-field"></div>
          <div className="skeleton-field"></div>
        </div>
      </div>
    </div>
  );

  const displayResults = sortResults(results, sortBy);

  return (
    <Layout>
      <div className="container">
        <div className="search-section">
          <div className="search-main">
            <button
              className="add-search-button"
              onClick={() => {
                if (pendingQueries.length < 3) {
                  setPendingQueries([...pendingQueries, { query: '', field: 'all' }]);
                }
              }}
              disabled={pendingQueries.length >= 3}
              style={{
                padding: '8px 12px',
                background: pendingQueries.length >= 3 ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: pendingQueries.length >= 3 ? 'not-allowed' : 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                marginRight: '8px'
              }}
            >
              +
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {pendingQueries.map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search manuscripts..."
                    value={item.query}
                    onChange={(e) => {
                      const updated = [...pendingQueries];
                      updated[index] = { ...updated[index], query: e.target.value };
                      setPendingQueries(updated);
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    style={{ flex: 1 }}
                  />
                  <select
                    className="search-field-select"
                    value={item.field}
                    onChange={(e) => {
                      const updated = [...pendingQueries];
                      updated[index] = { ...updated[index], field: e.target.value };
                      setPendingQueries(updated);
                    }}
                  >
                    <option value="all">All Fields</option>
                    <option value="title">Title</option>
                    <option value="author">Author</option>
                  </select>
                  {pendingQueries.length > 1 && index > 0 && (
                    <button
                      onClick={() => {
                        setPendingQueries(pendingQueries.filter((_, i) => i !== index));
                      }}
                      style={{
                        padding: '8px 12px',
                        background: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      -
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button className="search-button" onClick={handleSearch}>
              Search
            </button>
          </div>
        </div>

        <div className="main-layout">
          <div className="filters-sidebar">
            <div className="filters">
              <div className="filter-actions">
                <button className="apply-filters-button" onClick={applyFilters} disabled={!hasPendingFilters()}>
                  Apply Filters
                </button>
                <button
                  className="clear-filters-button"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters()}
                >
                  Clear Filters
                </button>
              </div>
              <div className="filter-group">
                <h4 className="filter-subheading">Shelf Mark</h4>
                <input
                  type="text"
                  id="shelf-mark-input"
                  className="shelf-mark-input"
                  placeholder='e.g., 00330'
                  value={pendingShelfMark}
                  onChange={(e) => setPendingShelfMark(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                />

                <h4 className="filter-subheading">Collection</h4>
                <SearchableDropdown
                  selected={pendingCollection}
                  setSelected={setPendingCollection}
                  searchIn="collection"
                  sourceFile={!aggregationsLoaded ? "collections.txt" : undefined}
                  aggregatedData={aggregations?.collections || null}
                />
                <h4 className="filter-subheading">Language</h4>
                <SearchableDropdown
                  selected={pendingLanguages}
                  setSelected={setPendingLanguages}
                  searchIn="language"
                  sourceFile={!aggregationsLoaded ? "languages.txt" : undefined}
                  aggregatedData={aggregations?.languages || null}
                />
                <h4 className="filter-subheading">Subject</h4>
                <SearchableDropdown
                  selected={pendingSubjects}
                  setSelected={setPendingSubjects}
                  searchIn="subject"
                  sourceFile={!aggregationsLoaded ? "subjects.txt" : undefined}
                  aggregatedData={aggregations?.subjects || null}
                />

                <h4 className="filter-subheading">Date Range</h4>
                <div className="date-filter">
                  <div className="date-range">
                    <input
                      type="number"
                      className="date-input"
                      placeholder="From"
                      value={pendingDateFrom || ''}
                      onChange={(e) => setPendingDateFrom(e.target.value ? parseInt(e.target.value) : null)}
                      min={0}
                      max={2025}
                    />
                    <span>to</span>
                    <input
                      type="number"
                      className="date-input"
                      placeholder="To"
                      value={pendingDateTo || ''}
                      onChange={(e) => setPendingDateTo(e.target.value ? parseInt(e.target.value) : null)}
                      min={0}
                      max={2025}
                    />
                  </div>
                  <div className="date-checkbox">
                    <input
                      type="checkbox"
                      id="include-undated"
                      checked={pendingIncludeUndated}
                      onChange={(e) => setPendingIncludeUndated(e.target.checked)}
                    />
                    <label htmlFor="include-undated">Include undated manuscripts</label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="main-content" ref={resultsContainerRef}>
            {error && (
              <div className="error">
                Error: {error}
              </div>
            )}

            {showDownloadConfirm && (
              <div className="download-confirm">
                <div className="download-confirm-content">
                  <p>Can only download 2,000 results. Proceed to download first 2,000 results?</p>
                  <div className="download-confirm-buttons">
                    <button className="confirm-yes" onClick={downloadResults}>Yes, Download</button>
                    <button className="confirm-no" onClick={() => setShowDownloadConfirm(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
            {loading ? (
              <>
                <div className="results-header skeleton-header">
                  <div className="skeleton-line" style={{ width: '200px', height: '16px' }}></div>
                  <div className="skeleton-line" style={{ width: '300px', height: '32px' }}></div>
                </div>
                <div className="results-list">
                  {Array.from({ length: perPage }).map((_, idx) => (
                    <SkeletonResult key={idx} />
                  ))}
                </div>
              </>
            ) : (
              !error && displayResults.length > 0 && (
                <>
                  <div className="results-header">
                    <div className="results-info">
                      Showing {((page - 1) * perPage) + 1}-{Math.min(page * perPage, totalResults)} of {totalResults.toLocaleString()} results
                    </div>
                    <div className="results-controls">
                      <select
                        className="sort-select"
                        value={sortBy}
                        onChange={(e) => {
                          setSortBy(e.target.value);
                        }}
                      >
                        {SORT_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <select
                        className="per-page-select"
                        value={perPage}
                        onChange={(e) => {
                          setPerPage(parseInt(e.target.value));
                          setPage(1);
                        }}
                      >
                        <option value="25">25 per page</option>
                        <option value="50">50 per page</option>
                        <option value="100">100 per page</option>
                        <option value="200">200 per page</option>
                      </select>
                      <button className="export-button" onClick={downloadResults}>
                        Download CSV
                      </button>
                      <button
                        className="clear-search-button"
                        onClick={clearSearch}
                        disabled={queries.every(q => !q.query)}
                      >
                        Clear Search
                      </button>
                    </div>
                  </div>

                  <div className="results-list">
                    {displayResults.map((result) => (
                      <div key={result.ys_id} className="search-result">
                        <div className="title-section">
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="title-link">
                            <div className="title-turkish">
                              {result.title_arabic && result.title_turkish
                                ? `${result.title_arabic} / ${result.title_turkish}`
                                : result.title_arabic || result.title_turkish || 'Untitled'}
                            </div>
                          </a>
                        </div>

                        <div className="author-section">
                          {result.author_ar && (
                            <div className="author-arabic">{result.author_ar}</div>
                          )}
                          {result.author && (
                            <div className="author-turkish">{result.author}</div>
                          )}
                        </div>
                        {result.alternative_titles && (
                          <div className="alternative-titles">
                            <span className="field-label">Alternative Titles:</span>
                            <span className="field-value">{result.alternative_titles}</span>
                          </div>
                        )}
                        <div className="details-grid">
                          <div className="details-column">
                            <div className="result-field">
                              <span className="field-label">Library:</span>
                              <span className="field-value">{result.library || '-'}</span>
                            </div>
                            <div className="result-field">
                              <span className="field-label">Folios:</span>
                              <span className="field-value">{result.physical_description || '-'}</span>
                            </div>
                            <div className="result-field">
                              <span className="field-label">Bibliographic ID:</span>
                              <span className="field-value">{result.bib_number || '-'}</span>
                            </div>
                          </div>

                          <div className="details-column">
                            <div className="result-field">
                              <span className="field-label">Collection:</span>
                              <span className="field-value">{result.collection || '-'}</span>
                            </div>
                            <div className="result-field">
                              <span className="field-label">Subject:</span>
                              <span className="field-value">{result.subject || '-'}</span>
                            </div>
                          </div>

                          <div className="details-column">
                            <div className="result-field">
                              <span className="field-label">Shelf Mark:</span>
                              <span className="field-value">{result.shelf_mark || '-'}</span>
                            </div>
                            <div className="result-field">
                              <span className="field-label">Date:</span>
                              <span className="field-value">{result.date_full || result.date_year || '-'}</span>
                            </div>
                            <div className="result-field">
                              <span className="field-label">Language:</span>
                              <span className="field-value">
                                {result.languages || '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
            )}

            {!loading && !error && results.length === 0 && (
              <div className="no-results">
                No manuscripts found. Try adjusting your search criteria.
              </div>
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-button"
              disabled={page === 1}
              onClick={() => { setPage(1); }}
            >
              First
            </button>

            <button
              className="page-button"
              disabled={page === 1}
              onClick={() => { setPage(page - 1); }}
            >
              Previous
            </button>

            {startPage > 1 && <span className="pagination-ellipsis">...</span>}

            {[...Array(endPage - startPage + 1)].map((_, idx) => {
              const pageNum = startPage + idx;
              return (
                <button
                  key={pageNum}
                  className={`page-button ${page === pageNum ? 'active' : ''}`}
                  onClick={() => { setPage(pageNum); }}
                >
                  {pageNum}
                </button>
              );
            })}

            {endPage < totalPages && <span className="pagination-ellipsis">...</span>}

            <button
              className="page-button"
              disabled={page === totalPages}
              onClick={() => { setPage(page + 1); }}
            >
              Next
            </button>

            <button
              className="page-button"
              disabled={page === totalPages}
              onClick={() => { setPage(totalPages); }}
            >
              Last
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default App;
