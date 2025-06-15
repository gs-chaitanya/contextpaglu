import React, { useRef, useEffect, useState } from 'react';
import './Card.css';

const Card = ({ session_id, name,context, color, onClick }) => {
  const cardRef = useRef(null);
  const [copied, setCopied] = useState(false);
  
  // Animation on hover using plain JS
  useEffect(() => {
    const card = cardRef.current;
    
    const handleMouseEnter = () => {
      card.style.transform = 'scale(1.03) translateY(-8px)';
      card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
    };
    
    const handleMouseLeave = () => {
      card.style.transform = 'scale(1) translateY(0px)';
      card.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.15)';
    };
    
    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
  
  const handleCopyClick = (e) => {
    e.stopPropagation(); // Prevent card click event
    navigator.clipboard.writeText(context)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 500);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };
  
  return (
    <div 
      ref={cardRef}
      className={`card card-${color}`} 
      onClick={onClick}
    >
      <button 
        className={`copy-button ${copied ? 'copied' : ''}`}
        onClick={handleCopyClick}
        aria-label="Copy to clipboard"
      >
        {copied ? (
          <svg className="check-icon" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        ) : (
          <svg className="copy-icon" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
          </svg>
        )}
      </button>
      <div className="card-content">{name}</div>
    </div>
  );
};

export default Card;