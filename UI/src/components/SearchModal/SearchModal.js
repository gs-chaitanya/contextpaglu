import React, { useEffect, useRef } from 'react';
import './SearchModal.css';

const SearchModal = ({ onClose }) => {
  const modalRef = useRef(null);
  const inputRef = useRef(null);
  
  useEffect(() => {
    // Animation on open
    const overlay = document.querySelector('.search-overlay');
    const modal = modalRef.current;
    
    // Trigger animations after elements are added to the DOM
    setTimeout(() => {
      if (overlay) overlay.classList.add('visible');
      if (modal) modal.classList.add('visible');
    }, 10);
    
    // Focus the input
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Close modal on Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  return (
    <div className="search-overlay" onClick={onClose}>
      <div 
        ref={modalRef}
        className="search-container" 
        onClick={(e) => e.stopPropagation()}
      >
        <input 
          ref={inputRef}
          type="text" 
          className="search-input"
          placeholder="Search through contexts..." 
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Handle search
              console.log('Searching for:', e.target.value);
              onClose();
            }
          }}
        />
        <p className="help-text">Press Escape to close • Enter to search</p>
      </div>
    </div>
  );
};

export default SearchModal;