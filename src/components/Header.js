import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();

  return (
    <header>
      <div className="header-container">
        {!location.pathname.startsWith('/viewer') && (
          <div className="header-text"><a href="/">yaz-scrape</a></div>
        )}
        <nav>
          <ul className="flex">
            <li><Link to="/">Catalogue</Link></li>
            <li><Link to="/about">About</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;