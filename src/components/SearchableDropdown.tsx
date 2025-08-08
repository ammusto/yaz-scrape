import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  ReactElement,
} from 'react';
import {
  VariableSizeList as List,
  type VariableSizeList,
} from 'react-window';

const normalize = (str: string): string =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c');

interface Item {
  label: string;
  value: string;
}

interface SearchableDropdownProps {
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  searchIn: 'collection' | 'subject' | 'author' | string;
  sourceFile?: string;
  aggregatedData?: Array<{ value: string, count: number }> | null;
}

const LIST_MAX_HEIGHT = 240;
const DEFAULT_ROW_HEIGHT = 36;

const parseItems = (text: string, searchIn: string): Item[] => {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines
    .map((line) => ({
      label: line,
      value: line,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

const Row = React.memo(function Row({
  index,
  style,
  data,
}: {
  index: number;
  style: React.CSSProperties;
  data: {
    items: Item[];
    selected: string[];
    toggle: (val: string) => void;
    sourceFile: string;
    listRef: React.RefObject<VariableSizeList>;
    rowHeights: React.MutableRefObject<Record<string, number>>;
    setItemSize: (index: number, size: number) => void;
  };
}) {
  const { items, selected, toggle, sourceFile, rowHeights, setItemSize } = data;
  const item = items[index];
  const id = `${sourceFile || 'agg'}-${item.value}-${index}`;
  const rowRef = useRef<HTMLDivElement | null>(null);

  // Create a unique key for this item to track in rowHeights
  const itemKey = `${item.value}-${item.label}`;

  useEffect(() => {
    // Use RAF to ensure DOM is painted before measuring
    const rafId = requestAnimationFrame(() => {
      if (!rowRef.current) return;

      const measuredHeight = rowRef.current.getBoundingClientRect().height;
      const currentHeight = rowHeights.current[itemKey] || DEFAULT_ROW_HEIGHT;

      // Only update if height has changed significantly (more than 1px difference)
      if (Math.abs(currentHeight - measuredHeight) > 1) {
        rowHeights.current[itemKey] = measuredHeight;
        setItemSize(index, measuredHeight);
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [index, item.label, itemKey, rowHeights, setItemSize]); // Use itemKey for consistency

  return (
    <div style={{ ...style, overflow: 'hidden' }}>
      <div
        ref={rowRef}
        style={{
          padding: '4px 8px',
          borderBottom: '1px solid #eee',
          fontSize: '16px',
          lineHeight: '1.4',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <input
          type="checkbox"
          id={id}
          checked={selected.includes(item.value)}
          onChange={() => toggle(item.value)}
          style={{ marginTop: '3px', marginRight: '8px', flexShrink: 0, width: '16px', height: '16px' }}
        />
        <label htmlFor={id} style={{ cursor: 'pointer', flex: 1 }}>
          {item.label}
        </label>
      </div>
    </div>
  );
});

export default function SearchableDropdown({
  selected,
  setSelected,
  searchIn,
  sourceFile,
  aggregatedData
}: SearchableDropdownProps): ReactElement {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const listRef = useRef<VariableSizeList>(null as unknown as VariableSizeList);
  const rowHeights = useRef<Record<string, number>>({});
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    // Clear row heights when items change
    rowHeights.current = {};

    if (aggregatedData) {
      // Use aggregated data with counts
      const items = aggregatedData.map(item => ({
        label: `${item.value} (${item.count.toLocaleString()})`,
        value: item.value
      }));
      setItems(items);

      // Force list to recalculate all heights
      if (listRef.current) {
        listRef.current.resetAfterIndex(0, false);
      }
    } else if (sourceFile) {
      // Load from file
      fetch(`/${sourceFile}`)
        .then((res) => res.text())
        .then((text) => {
          setItems(parseItems(text, searchIn));
          // Force list to recalculate all heights
          if (listRef.current) {
            listRef.current.resetAfterIndex(0, false);
          }
        })
        .catch(() => setItems([]));
    } else {
      setItems([]);
    }
  }, [sourceFile, searchIn, aggregatedData]);

  const filtered = useMemo(() => {
    const q = normalize(debouncedQuery);
    if (!q) return items;
    return items.filter(
      (item) =>
        normalize(item.label).includes(q) ||
        normalize(item.value).includes(q)
    );
  }, [debouncedQuery, items]);

  // Reset row heights when filtered items change
  useEffect(() => {
    // Don't clear heights, just reset the list to remeasure
    if (listRef.current) {
      listRef.current.resetAfterIndex(0, false);
    }
    // Force a re-render to ensure new measurements
    setForceUpdate(prev => prev + 1);
  }, [filtered]);

  const toggle = useCallback(
    (val: string) => {
      setSelected((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
      );
    },
    [setSelected]
  );

  const setItemSize = useCallback((index: number, size: number) => {
    if (listRef.current && rowHeights.current[index] !== size) {
      listRef.current.resetAfterIndex(index, true);
    }
  }, []);

  const getItemSize = useCallback((index: number) => {
    const item = filtered[index];
    if (!item) return DEFAULT_ROW_HEIGHT;

    const itemKey = `${item.value}-${item.label}`;
    return rowHeights.current[itemKey] || DEFAULT_ROW_HEIGHT;
  }, [filtered]);

  // Calculate total selected count
  const selectedCount = selected.length;



  return (
    <div style={{ width: '100%', maxWidth: '400px' }}>
      <input
        type="text"
        id={`${searchIn}-dropdown`}
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '8px',
          marginBottom: '0px',
          border: '1px solid #ccc',
          borderRadius: '4px',
        }}
      />
      <div style={{ marginBottom: '4px', fontSize: '12px', color: '#666' }}>
        {filtered.length} items {query && `(filtered from ${items.length})`}
        {selectedCount > 0 && ` • ${selectedCount} selected`}
      </div>
      <div
        style={{
          maxHeight: `${LIST_MAX_HEIGHT}px`,
          minHeight: '200px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        {filtered.length > 0 ? (
          <List
            ref={listRef}
            height={LIST_MAX_HEIGHT}
            itemCount={filtered.length}
            itemSize={getItemSize}
            estimatedItemSize={DEFAULT_ROW_HEIGHT}
            width="100%"
            itemData={{
              items: filtered,
              selected,
              toggle,
              sourceFile: sourceFile || 'aggregated',
              listRef,
              rowHeights,
              setItemSize,
            }}
            overscanCount={2}
            key={`${searchIn}-${forceUpdate}`} 
          >
            {Row}
          </List>
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
            No items found
          </div>
        )}
      </div>
    </div>
  );
}