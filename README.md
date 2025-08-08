# Manuscript Search Application

yaz-scrape is a react-based search interface for Islamic manuscript data scraped from Turkey's YEK (Yazma Eserler Kurumu) portal. The data is indexed in OpenSearch and made searchable through a web interface. All manuscript data is scraped from the Turkish manuscript portal at https://portal.yek.gov.tr/. This includes metadata for manuscripts held in various Turkish libraries and collections. You must have an account on the portal in order to view more details about the manuscript and the images. This web app is just to facilitate searching the catalogue.

## Features

### Search
- Multiple simultaneous search queries (up to 3)
- Field-specific search (All Fields, Title, Author)
- Wildcard support using * and ?
- Query string search with AND operator

### Filters
- Collection
- Subject
- Language (individual languages extracted from multi-language fields)
- Author (available after initial search)
- Shelf Mark (with wildcard support)
- Date Range (with option to include undated manuscripts)

### Sorting Options
- ID (default)
- Date (ascending/descending)
- Title in Turkish (A-Z/Z-A)
- Title in Arabic (A-Z/Z-A)
- Author in Turkish (A-Z/Z-A)
- Author in Arabic (A-Z/Z-A)

### Other Features
- CSV export (up to 2000 results)

## Technical Stack

- React with TypeScript
- react-window for virtualized dropdowns
- Direct OpenSearch API integration
- OpenSearch for data storage and search
- Custom analyzers for Turkish and Arabic text
- N-gram tokenization for partial matching