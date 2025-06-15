import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <h1 className="title">ContextWeaver</h1>
      <div className="search-hint">
        press / to search through contexts
      </div>
    </header>
  );
};

export default Header;