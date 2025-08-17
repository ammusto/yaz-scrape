import React, { useState, useEffect, useCallback, useRef } from 'react';
import SearchableDropdown from './components/SearchableDropdown';
import Layout from './components/Layout';

// Types
interface Manuscript {
  ys_id: number;
  bib_number?: number;
  title_turkish?: string;
  title_arabic?: string;
  auto_title?: number;
  author?: string;
  author_ar?: string;
  auto_name?: number;
  classification_no?: string;
  subject?: string;
  classification_yazscrape?: string;
  library?: string;
  collection?: string;
  date_full?: string;
  date_year?: number;
  url?: string;
  languages?: string[];
  physical_description?: string;
  shelf_mark?: string;
  previous_shelfmark?: string;
  type_of_material?: string;
  alternative_titles?: string;
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
  authors: string[];
  languages: string[];
  shelfMark: string;
  dateFrom: number | null;
  dateTo: number | null;
  includeUndated: boolean;
  sortBy: string;
  page: number;
  perPage: number;
}

// Configuration
const API_URL = process.env.REACT_APP_API_URL || 'https://api.mihbara.com/opensearch';
const INDEX = process.env.REACT_APP_API_INDEX || 'yaz-scrape';
const API_USER = process.env.REACT_APP_API_USER || '';
const API_PASS = process.env.REACT_APP_API_PASS || '';

// Sort options
const SORT_OPTIONS = [
  { value: 'id', label: 'Id (Default)' },
  { value: 'date_asc', label: 'Date (asc)' },
  { value: 'date_desc', label: 'Date (desc)' },
  { value: 'title_tr_asc', label: 'Title (tr) A-Z' },
  { value: 'title_tr_desc', label: 'Title (tr) Z-A' },
  { value: 'title_ar_asc', label: 'Title (ar) A-Z' },
  { value: 'title_ar_desc', label: 'Title (ar) Z-A' },
  { value: 'author_tr_asc', label: 'Author (tr) A-Z' },
  { value: 'author_tr_desc', label: 'Author (tr) Z-A' },
  { value: 'author_ar_asc', label: 'Author (ar) A-Z' },
  { value: 'author_ar_desc', label: 'Author (ar) Z-A' }
];

// Utility functions
const buildShelfMarkQuery = (input: string): any => {
  if (!input) return null;

  // Check if user provided explicit wildcards
  if (input.includes('*') || input.includes('?')) {
    // User knows what they want - use their exact pattern
    return { wildcard: { shelf_mark: input } };
  }

  // Default behavior: partial match (contains)
  return { wildcard: { shelf_mark: `*${input}*` } };
};

const getSortQuery = (sortBy: string): any => {
  switch (sortBy) {
    case 'date_asc':
      return [{ date_year: { order: 'asc', missing: '_last' } }];
    case 'date_desc':
      return [{ date_year: { order: 'desc', missing: '_last' } }];
    case 'title_tr_asc':
      return [{ 'title_turkish.keyword': { order: 'asc', missing: '_last' } }];
    case 'title_tr_desc':
      return [{ 'title_turkish.keyword': { order: 'desc', missing: '_first' } }];
    case 'title_ar_asc':
      return [{ 'title_arabic.keyword': { order: 'asc', missing: '_last' } }];
    case 'title_ar_desc':
      return [{ 'title_arabic.keyword': { order: 'desc', missing: '_first' } }];
    case 'author_tr_asc':
      return [{ 'author.keyword': { order: 'asc', missing: '_last' } }];
    case 'author_tr_desc':
      return [{ 'author.keyword': { order: 'desc', missing: '_first' } }];
    case 'author_ar_asc':
      return [{ 'author_ar.keyword': { order: 'asc', missing: '_last' } }];
    case 'author_ar_desc':
      return [{ 'author_ar.keyword': { order: 'desc', missing: '_first' } }];
    default:
      return [{ bib_number: { order: 'asc' } }];
  }
};

const parseURLParams = (): SearchState => {
  const params = new URLSearchParams(window.location.search);

  // Parse multiple queries (q1, f1, q2, f2, q3, f3)
  const queries: SearchQuery[] = [];
  for (let i = 1; i <= 3; i++) {
    const q = params.get(`q${i}`);
    const f = params.get(`f${i}`) || 'all';
    if (q) {
      queries.push({ query: q, field: f });
    }
  }

  // If old single query format exists, use it
  if (queries.length === 0 && params.get('q')) {
    queries.push({ query: params.get('q') || '', field: params.get('field') || 'all' });
  }

  // Ensure at least one empty query
  if (queries.length === 0) {
    queries.push({ query: '', field: 'all' });
  }

  const subjectsParam = params.get('subjects');
  const collectionParam = params.get('collection');
  const authorsParam = params.get('authors');
  const languagesParam = params.get('languages');
  const fromParam = params.get('from');
  const toParam = params.get('to');
  const pageParam = params.get('page');
  const perParam = params.get('per');

  const state: SearchState = {
    queries: queries,
    library: params.get('library') || '',
    collection: collectionParam ? collectionParam.split(',') : [],
    subjects: subjectsParam ? subjectsParam.split(',') : [],
    authors: authorsParam ? authorsParam.split(',') : [],
    languages: languagesParam ? languagesParam.split(',') : [],
    shelfMark: params.get('shelf') || '',
    dateFrom: fromParam ? parseInt(fromParam) : null,
    dateTo: toParam ? parseInt(toParam) : null,
    includeUndated: params.get('undated') !== 'false',
    sortBy: params.get('sort') || 'id',
    page: pageParam ? parseInt(pageParam) : 1,
    perPage: perParam ? parseInt(perParam) : 25
  };
  return state;
};

const updateURL = (state: SearchState): void => {
  const params = new URLSearchParams();

  // Save multiple queries
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
  if (state.authors.length > 0) params.set('authors', state.authors.join(','));
  if (state.languages.length > 0) params.set('languages', state.languages.join(','));
  if (state.shelfMark) params.set('shelf', state.shelfMark);
  if (state.dateFrom) params.set('from', state.dateFrom.toString());
  if (state.dateTo) params.set('to', state.dateTo.toString());
  if (!state.includeUndated) params.set('undated', 'false');
  if (state.sortBy !== 'id') params.set('sort', state.sortBy);
  if (state.page > 1) params.set('page', state.page.toString());
  if (state.perPage !== 25) params.set('per', state.perPage.toString());

  const url = params.toString() ? `?${params.toString()}` : window.location.pathname;
  window.history.pushState({}, '', url);
};

function App() {
  // State from URL
  const [urlState] = useState(parseURLParams());

  // Active filter state (what's actually applied)
  const [queries, setQueries] = useState<SearchQuery[]>(urlState.queries);
  const [library, setLibrary] = useState(urlState.library);
  const [collection, setCollection] = useState<string[]>(urlState.collection);
  const [subjects, setSubjects] = useState<string[]>(urlState.subjects);
  const [authors, setAuthors] = useState<string[]>(urlState.authors);
  const [languages, setLanguages] = useState<string[]>(urlState.languages);
  const [shelfMark, setShelfMark] = useState(urlState.shelfMark);
  const [dateFrom, setDateFrom] = useState(urlState.dateFrom);
  const [dateTo, setDateTo] = useState(urlState.dateTo);
  const [includeUndated, setIncludeUndated] = useState(urlState.includeUndated);
  const [sortBy, setSortBy] = useState(urlState.sortBy);
  const [page, setPage] = useState(urlState.page);
  const [perPage, setPerPage] = useState(urlState.perPage);

  // Pending filter state (what user is selecting)
  const [pendingQueries, setPendingQueries] = useState<SearchQuery[]>(urlState.queries);
  const [pendingLibrary, setPendingLibrary] = useState(urlState.library);
  const [pendingCollection, setPendingCollection] = useState<string[]>(urlState.collection);
  const [pendingSubjects, setPendingSubjects] = useState<string[]>(urlState.subjects);
  const [pendingAuthors, setPendingAuthors] = useState<string[]>(urlState.authors);
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

  // Metadata state
  // const [libraries, setLibraries] = useState<string[]>([]);

  // Aggregation state
  const [aggregatedCollections, setAggregatedCollections] = useState<Array<{ value: string, count: number }> | null>(null);
  const [aggregatedSubjects, setAggregatedSubjects] = useState<Array<{ value: string, count: number }> | null>(null);
  const [aggregatedAuthors, setAggregatedAuthors] = useState<Array<{ value: string, count: number }> | null>(null);
  const [aggregatedLanguages, setAggregatedLanguages] = useState<Array<{ value: string, count: number }> | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Build OpenSearch query
  const buildQuery = useCallback((size?: number, from?: number, includeAggs: boolean = true) => {
    const must: any[] = [];
    const filter: any[] = [];

    // Build queries for each search input
    queries.forEach(({ query, field }) => {
      if (!query) return;

      const containsWildcard = query.includes('*') || query.includes('?');

      if (field === 'all') {
        if (containsWildcard) {
          // For wildcard searches on all fields, use wildcard queries on keyword fields
          must.push({
            bool: {
              should: [
                // Title fields with wildcards
                { wildcard: { "title_turkish.keyword": { value: query.toLowerCase() } } },
                { wildcard: { "title_arabic.keyword": { value: query.toLowerCase() } } },
                { wildcard: { "alternative_titles.keyword": { value: query.toLowerCase() } } },

                // Author fields with wildcards
                { wildcard: { "author.keyword": { value: query.toLowerCase() } } },
                { wildcard: { "author_ar.keyword": { value: query.toLowerCase() } } },

                // Other fields
                { wildcard: { "library": { value: query.toLowerCase() } } },
                { wildcard: { "collection": { value: query.toLowerCase() } } },
                { wildcard: { "physical_description": { value: query.toLowerCase() } } },
                { wildcard: { "shelf_mark": { value: query.toLowerCase() } } },
                { wildcard: { "previous_shelfmark": { value: query.toLowerCase() } } },

                // Also search in analyzed fields for better recall
                {
                  query_string: {
                    query: query,
                    fields: [
                      'title_turkish', 'title_arabic', 'author', 'author_ar',
                      'library', 'collection', 'physical_description',
                      'shelf_mark', 'previous_shelfmark', 'alternative_titles', 'bib_number.text'
                    ],
                    default_operator: "AND"
                  }
                }
              ],
              minimum_should_match: 1
            }
          });
        } else {
          // Regular search without wildcards - use the standard approach
          must.push({
            query_string: {
              query: query,
              fields: [
                'title_turkish', 'title_arabic', 'author', 'author_ar',
                'library', 'collection', 'physical_description',
                'shelf_mark', 'previous_shelfmark', 'alternative_titles', 'bib_number.text'
              ],
              default_operator: "AND"
            }
          });
        }
      } else {
        // Field-specific searches
        const fieldMap: Record<string, string[]> = {
          'title': ['title_turkish', 'title_arabic', 'alternative_titles'],
          'author': ['author', 'author_ar']
        };

        const fields = fieldMap[field] || [field];

        if (containsWildcard) {
          // For wildcards in specific fields
          const shouldClauses = [];

          // Add wildcard queries on keyword fields
          if (field === 'title') {
            shouldClauses.push(
              { wildcard: { "title_turkish.keyword": { value: query.toLowerCase() } } },
              { wildcard: { "title_arabic.keyword": { value: query.toLowerCase() } } },
              { wildcard: { "alternative_titles.keyword": { value: query.toLowerCase() } } }
            );
          } else if (field === 'author') {
            shouldClauses.push(
              { wildcard: { "author.keyword": { value: query.toLowerCase() } } },
              { wildcard: { "author_ar.keyword": { value: query.toLowerCase() } } }
            );
          } else {
            // For other fields, just use the field directly
            shouldClauses.push({ wildcard: { [field]: { value: query.toLowerCase() } } });
          }

          // Also include standard query string for better recall
          shouldClauses.push({
            query_string: {
              query: query,
              fields: fields,
              default_operator: "AND"
            }
          });

          must.push({
            bool: {
              should: shouldClauses,
              minimum_should_match: 1
            }
          });
        } else {
          // Regular search without wildcards - use the standard approach
          must.push({
            query_string: {
              query: query,
              fields: fields,
              default_operator: "AND"
            }
          });
        }
      }
    });

    // Filters
    if (library) {
      filter.push({ term: { library: library } });
    }

    if (collection.length > 0) {
      filter.push({
        terms: { collection: collection }
      });
    }

    if (subjects.length > 0) {
      filter.push({
        terms: { 'subject.keyword': subjects }
      });
    }

    if (authors.length > 0) {
      filter.push({
        terms: { 'author.keyword': authors }
      });
    }

    if (languages.length > 0) {
      filter.push({
        terms: { languages: languages }
      });
    }

    if (shelfMark) {
      const shelfMarkQuery = buildShelfMarkQuery(shelfMark);
      if (shelfMarkQuery) {
        must.push(shelfMarkQuery);
      }
    }

    // Date filter
    if (dateFrom || dateTo) {
      const dateQuery: any = { range: { date_year: {} } };
      if (dateFrom) dateQuery.range.date_year.gte = dateFrom;
      if (dateTo) dateQuery.range.date_year.lte = dateTo;

      if (includeUndated) {
        filter.push({
          bool: {
            should: [
              dateQuery,
              { bool: { must_not: { exists: { field: 'date_year' } } } }
            ]
          }
        });
      } else {
        filter.push(dateQuery);
      }
    } else if (!includeUndated) {
      filter.push({ exists: { field: 'date_year' } });
    }

    // Build final query
    const query_body: any = {
      from: from !== undefined ? from : (page - 1) * perPage,
      size: size !== undefined ? size : perPage,
      track_total_hits: true,
      sort: getSortQuery(sortBy),
      query: {
        bool: {
          ...(must.length > 0 && { must }),
          ...(filter.length > 0 && { filter })
        }
      }
    };

    // Add aggregations if requested and there's an actual search
    if (includeAggs && (must.length > 0 || filter.length > 0)) {
      query_body.aggs = {
        collections: {
          terms: {
            field: 'collection',
            size: 300,
            order: { _count: 'desc' }
          }
        },
        subjects: {
          terms: {
            field: 'subject.keyword',
            size: 300,
            order: { _count: 'desc' }
          }
        },
        authors: {
          terms: {
            field: 'author.raw',
            size: 300,
            order: { _count: 'desc' }
          }
        },
        languages: {
          terms: {
            field: 'languages',
            size: 100,
            order: { _count: 'desc' }
          }
        }
      };
    }

    // If no conditions, match all
    if (must.length === 0 && filter.length === 0) {
      query_body.query = { match_all: {} };
    }

    return query_body;
  }, [queries, library, collection, subjects, authors, languages, shelfMark,
    dateFrom, dateTo, includeUndated, sortBy, page, perPage]);

  // Perform search
  const performSearch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const searchQuery = buildQuery();
      console.debug("Search query payload:", JSON.stringify(searchQuery, null, 2));

      // Check if we're trying to access beyond 10k limit
      const requestedOffset = (page - 1) * perPage;
      if (requestedOffset >= 10000) {
        setError('Cannot access results beyond 10,000. Please refine your search criteria.');
        setResults([]);
        return;
      }

      // Ensure we don't request beyond 10k
      const maxSize = Math.min(perPage, 10000 - requestedOffset);
      searchQuery.size = maxSize;

      const response = await fetch(`${API_URL}/${INDEX}/_search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${API_USER}:${API_PASS}`)}`
        },
        body: JSON.stringify(searchQuery)
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();

      setResults(data.hits.hits.map((hit: any) => hit._source));
      setTotalResults(data.hits.total.value);

      // Process aggregations if present
      if (data.aggregations) {
        setHasSearched(true);

        if (data.aggregations.collections) {
          setAggregatedCollections(
            data.aggregations.collections.buckets.map((b: any) => ({
              value: b.key,
              count: b.doc_count
            }))
          );
        }

        if (data.aggregations.subjects) {
          setAggregatedSubjects(
            data.aggregations.subjects.buckets.map((b: any) => ({
              value: b.key,
              count: b.doc_count
            }))
          );
        }

        if (data.aggregations.authors) {
          setAggregatedAuthors(
            data.aggregations.authors.buckets.map((b: any) => ({
              value: b.key,
              count: b.doc_count
            }))
          );
        }

        if (data.aggregations.languages) {
          setAggregatedLanguages(
            data.aggregations.languages.buckets.map((b: any) => ({
              value: b.key,
              count: b.doc_count
            }))
          );
        }
      }

      // Update URL
      updateURL({
        queries, library, collection, subjects, authors, languages,
        shelfMark, dateFrom, dateTo, includeUndated,
        sortBy, page, perPage
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, queries, library, collection, subjects, authors, languages,
    shelfMark, dateFrom, dateTo, includeUndated, sortBy, page, perPage]);

  const hasPendingFilters = (): boolean => {
    return (
      pendingLibrary !== library ||
      JSON.stringify(pendingCollection) !== JSON.stringify(collection) ||
      JSON.stringify(pendingSubjects) !== JSON.stringify(subjects) ||
      JSON.stringify(pendingAuthors) !== JSON.stringify(authors) ||
      JSON.stringify(pendingLanguages) !== JSON.stringify(languages) ||
      pendingShelfMark !== shelfMark ||
      pendingDateFrom !== dateFrom ||
      pendingDateTo !== dateTo ||
      pendingIncludeUndated !== includeUndated
    );
  };

  // Apply filters - copies pending to active
  const applyFilters = () => {
    setLibrary(pendingLibrary);
    setCollection(pendingCollection);
    setSubjects(pendingSubjects);
    setAuthors(pendingAuthors);
    setLanguages(pendingLanguages);
    setShelfMark(pendingShelfMark);
    setDateFrom(pendingDateFrom);
    setDateTo(pendingDateTo);
    setIncludeUndated(pendingIncludeUndated);
    setPage(1);
  };

  useEffect(() => {
    performSearch();
  }, [queries, library, collection, subjects, authors, languages, shelfMark, dateFrom, dateTo, includeUndated, sortBy, page, perPage, performSearch]);

  // Handle search button - applies current query + all active filters
  const handleSearch = () => {
    // Filter out empty queries and set
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
      authors.length > 0 ||
      languages.length > 0 ||
      shelfMark !== '' ||
      dateFrom !== null ||
      dateTo !== null ||
      !includeUndated
    );
  };

  // Clear all filters
  const clearFilters = () => {
    // Clear pending
    setPendingLibrary('');
    setPendingCollection([]);
    setPendingSubjects([]);
    setPendingAuthors([]);
    setPendingLanguages([]);
    setPendingShelfMark('');
    setPendingDateFrom(null);
    setPendingDateTo(null);
    setPendingIncludeUndated(true);

    // Clear active
    setLibrary('');
    setCollection([]);
    setSubjects([]);
    setAuthors([]);
    setLanguages([]);
    setShelfMark('');
    setDateFrom(null);
    setDateTo(null);
    setIncludeUndated(true);
    setPage(1);

    // Clear aggregated data and reset to file-based
    setHasSearched(false);
    setAggregatedCollections(null);
    setAggregatedSubjects(null);
    setAggregatedAuthors(null);
    setAggregatedLanguages(null);

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
      // Build query for up to 2000 results without aggregations
      const downloadQuery = buildQuery(Math.min(totalResults, 2000), 0, false);

      const response = await fetch(`${API_URL}/${INDEX}/_search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${API_USER}:${API_PASS}`)}`
        },
        body: JSON.stringify(downloadQuery)
      });

      if (!response.ok) throw new Error('Download failed');

      const data = await response.json();
      const downloadResults = data.hits.hits.map((hit: any) => hit._source);

      // Create CSV
      const headers = [
        'ys_id', 'bib_number', 'title_turkish', 'title_arabic', 'auto_title',
        'author', 'author_ar', 'auto_name', 'classification_no', 'subject',
        'classification_yazscrape', 'library', 'collection', 'date_full',
        'date_year', 'url', 'language', 'languages', 'physical_description', 'shelf_mark',
        'previous_shelfmark', 'type_of_material'
      ];

      const rows = downloadResults.map((r: any) => [
        r.ys_id || '',
        r.bib_number || '',
        r.title_turkish || '',
        r.title_arabic || '',
        r.auto_title || '',
        r.author || '',
        r.author_ar || '',
        r.auto_name || '',
        r.classification_no || '',
        r.subject || '',
        r.classification_yazscrape || '',
        r.library || '',
        r.collection || '',
        r.date_full || '',
        r.date_year || '',
        r.url || '',
        r.language || '',
        Array.isArray(r.languages) ? r.languages.join(', ') : '',
        r.physical_description || '',
        r.shelf_mark || '',
        r.previous_shelfmark || '',
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

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manuscripts_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      setError('Failed to download results');
    }
  };

  // // Load libraries from libraries.txt
  // useEffect(() => {
  //   const loadLibraries = async () => {
  //     try {
  //       const res = await fetch('/libraries.txt');
  //       // Ensure proper UTF-8 decoding
  //       const buffer = await res.arrayBuffer();
  //       const decoder = new TextDecoder('utf-8');
  //       const text = decoder.decode(buffer);

  //       const lines = text
  //         .split('\n')
  //         .map(line => line.trim())
  //         .filter(line => line.length > 0);

  //       // setLibraries(lines.sort());
  //     } catch (err) {
  //       console.error('Failed to load libraries.txt:', err);
  //     }
  //   };

  //   loadLibraries();
  // }, []);

  // Pagination
  const totalPages = Math.ceil(totalResults / perPage);
  const maxPageButtons = 10;
  let startPage = Math.max(1, page - Math.floor(maxPageButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

  if (endPage - startPage < maxPageButtons - 1) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }

  const clearSearch = () => {
    // Reset search queries to a single empty query
    setPendingQueries([{ query: '', field: 'all' }]);
    setQueries([{ query: '', field: 'all' }]);
    setPage(1);

    // Update URL without search queries
    updateURL({
      queries: [{ query: '', field: 'all' }],
      library, collection, subjects, authors, languages,
      shelfMark, dateFrom, dateTo, includeUndated,
      sortBy, page: 1, perPage
    });

  };

  const SkeletonResult = () => (
    <div className="search-result skeleton">
      {/* Title skeleton */}
      <div className="title-section">
        <div className="skeleton-title"></div>
      </div>

      {/* Author skeleton */}
      <div className="author-section">
        <div className="skeleton-author"></div>
      </div>

      {/* Three column section skeleton */}
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
                    placeholder="Search manuscripts... (use * for wildcards)"
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
                  placeholder='e.g., 330, *330, 330*'
                  value={pendingShelfMark}
                  onChange={(e) => setPendingShelfMark(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                />

                <h4 className="filter-subheading">Collection</h4>
                <SearchableDropdown
                  selected={pendingCollection}
                  setSelected={setPendingCollection}
                  searchIn="collection"
                  sourceFile={!hasSearched ? "collections.txt" : undefined}
                  aggregatedData={aggregatedCollections}
                />
                <h4 className="filter-subheading">Language</h4>
                <SearchableDropdown
                  selected={pendingLanguages}
                  setSelected={setPendingLanguages}
                  searchIn="language"
                  sourceFile={!hasSearched ? "languages.txt" : undefined}
                  aggregatedData={aggregatedLanguages}
                />
                <h4 className="filter-subheading">Subject</h4>
                <SearchableDropdown
                  selected={pendingSubjects}
                  setSelected={setPendingSubjects}
                  searchIn="subject"
                  sourceFile={!hasSearched ? "subjects.txt" : undefined}
                  aggregatedData={aggregatedSubjects}
                />



                {hasSearched && aggregatedAuthors && (
                  <>
                    <h4 className="filter-subheading">Author</h4>
                    <SearchableDropdown
                      selected={pendingAuthors}
                      setSelected={setPendingAuthors}
                      searchIn="author"
                      aggregatedData={aggregatedAuthors}
                    />
                  </>
                )}

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

            {loading && (
              <div className="results-list">
                {Array.from({ length: perPage }).map((_, idx) => (
                  <SkeletonResult key={idx} />
                ))}
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
              !error && results.length > 0 && (
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
                          performSearch();
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
                          performSearch();
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
                      {/* Add Clear Search button */}
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
                    {results.map((result) => (
                      <div key={result.ys_id} className="search-result">
                        {/* Title section - full width */}
                        <div className="title-section">
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="title-link">
                            <div className="title-turkish">
                              {result.title_arabic && result.title_turkish
                                ? `${result.title_arabic} / ${result.title_turkish}`
                                : result.title_arabic || result.title_turkish || 'Untitled'}
                            </div>
                          </a>
                        </div>

                        {/* Author section - full width */}
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
                        {/* Three column section for remaining data */}
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
                                {Array.isArray(result.languages) && result.languages.length > 0
                                  ? result.languages.join(', ')
                                  : '-'}
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
              onClick={() => {
                setPage(1);
                performSearch();
              }}
            >
              First
            </button>

            <button
              className="page-button"
              disabled={page === 1}
              onClick={() => {
                setPage(page - 1);
                performSearch();
              }}
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
                  onClick={() => {
                    setPage(pageNum);
                    performSearch();
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            {endPage < totalPages && <span className="pagination-ellipsis">...</span>}

            <button
              className="page-button"
              disabled={page === totalPages}
              onClick={() => {
                setPage(page + 1);
                performSearch();
              }}
            >
              Next
            </button>

            <button
              className="page-button"
              disabled={page === totalPages}
              onClick={() => {
                setPage(totalPages);
                performSearch();
              }}
            >
              Last
            </button>
          </div>
        )}
      </div>
    </Layout >
  );
}

export default App;