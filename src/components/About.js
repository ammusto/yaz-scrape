import React from 'react';
import Layout from './Layout';
import './Layout.css';

const About = () => {
    return (
        <Layout>
            <div className="container">

                <div className="about-container">
                    <div className="text-content">
                        <h2>About Yazma Eserler</h2>

                        <p>
                            Yaz-scrape is a more responsive, user-friendly version of the catalogue of <a href="https://portal.yek.gov.tr/">Turkey's online manuscript collection</a> designed to make searching accessible, robust, and speedy. <strong>Note:</strong> This only contains the Manuscript subset of the catalogue (ignoring printed editions held by YEK), and clicking on any entry will take you to the online portal for more details. You must have an account on Turkey's Manuscript Portal in order to view the manuscript.
                        </p>

                        <h3>Features</h3>
                        <ul>
                            <li>Search across titles in Turkish and Arabic</li>
                            <li>Filter by collection, subject, and date</li>
                            <li>Export results to CSV</li>
                            <li>Links that go directly to Turkey's online portal</li>
                            <li>LLM Generated Arabic titles and author names for those entries that lacked them (likely to contain errors!)</li>
                        </ul>

                        <h3>How to Use</h3>
                        <p>
                            Use the search bar to find manuscripts by title, author, or subject. Apply filters in the left sidebar
                            to narrow your results. You will get maximum results by using wildcards, e.g. *vasiy* if you want to find works titled Vasiyet, Vasiyyet, Vasiyyetname, etc.
                        </p>

                        <h3>Search Features</h3>

                        <h4>Wildcard Searches</h4>
                        <p>
                            Search fields support wildcard characters for flexible pattern matching:
                        </p>
                        <ul>
                            <li><strong>* (asterisk)</strong> - Matches any number of characters. For example, "kitab*" finds "kitab", "kitabul", "kitabullah", etc.</li>
                            <li><strong>? (question mark)</strong> - Matches exactly one character. For example, "ra?a" matches "raja" or "rasa" but not "ra" or "raasa"</li>
                        </ul>
                        <p>
                            Examples of wildcard patterns:
                        </p>
                        <ul>
                            <li><strong>*islam*</strong> - finds text containing "islam" anywhere</li>
                            <li><strong>islam*</strong> - finds text starting with "islam"</li>
                            <li><strong>*islam</strong> - finds text ending with "islam"</li>
                            <li><strong>kit?b</strong> - matches "kitab", "kiteb", etc.</li>
                        </ul>

                        <h4>Exact Phrase Searches</h4>
                        <p>
                            Use <strong>double quotes</strong> to search for exact phrases. For example, searching for <strong>"kitab al-salat"</strong> will only find manuscripts containing that exact phrase in that exact order.
                        </p>

                        <h4>Multiple Search Queries</h4>
                        <p>
                            Click the <strong>+</strong> button to add up to 3 simultaneous search queries. Each query can target different fields:
                        </p>
                        <ul>
                            <li><strong>All Fields</strong> - searches across title, author, library, collection, physical description, and shelf marks</li>
                            <li><strong>Title</strong> - searches only in Turkish and Arabic title fields</li>
                            <li><strong>Author</strong> - searches only in author fields (both Turkish and Arabic)</li>
                        </ul>
                        <p>
                            Multiple queries are combined with AND logic, meaning all conditions must be met. For example, searching for "hadith" in Title and "bukhari" in Author will find manuscripts with "hadith" in the title AND "bukhari" as the author.
                        </p>

                        <h4>Filters (Left Sidebar)</h4>
                        <p>
                            Use filters to narrow your search results:
                        </p>
                        <ul>
                            <li><strong>Shelf Mark</strong> - Filter by shelf mark identifiers (supports wildcards)</li>
                            <li><strong>Collection</strong> - Select one or more collections</li>
                            <li><strong>Subject</strong> - Filter by subject categories</li>
                            <li><strong>Language</strong> - Filter by language</li>
                            <li><strong>Author</strong> - Filter results by specific authors (appears after initial search)</li>
                            <li><strong>Date Range</strong> - Specify a date range, with option to include undated manuscripts</li>
                        </ul>
                        <p>
                            Remember to click <strong>"Apply Filters"</strong> after making your selections.
                        </p>

                        <h3>Technical Details</h3>
                        <p>
                            <strong>Turkish Text Normalization:</strong> The search engine automatically handles Turkish-specific characters,
                            allowing users to search without worrying about diacritics. For example, searching for "seyhulislam" will
                            match "Şeyhülislam." The system uses ASCII folding to normalize
                            ş→s, ç→c, ğ→g, ö→o, ü→u, and handles the special Turkish i/ı distinction.
                        </p>
                        <p>
                            <strong>Arabic Text Normalization:</strong> Comprehensive Arabic text processing removes diacritical marks
                            (tashkeel) and normalizes letter variants. The system treats أ, إ, آ, and ا as equivalent, normalizes
                            ى to ي and ة to ه, and strips all harakat and other diacritical marks. This allows searching for
                            "محمد" to match "مُحَمَّد" or "محمّد" regardless of vocalization.
                        </p>
                        <p>
                            <strong>Search Operators:</strong> All search terms within a single query are combined with AND logic by default.
                            This means searching for "kitab hadith" will only return results containing both "kitab" AND "hadith".
                        </p>
                    </div>
                </div>
            </div>

        </Layout>
    );
};

export default About;