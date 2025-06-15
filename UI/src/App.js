import React, { useState, useEffect } from "react";
import { fetchCards } from "./api/cardService";
import Header from "./components/Header/Header";
import Card from "./components/Card/Card";
import SearchModal from "./components/SearchModal/SearchModal";
import AnalyticsDashboard from "./components/AnalyticsDashboard/AnalyticsDashboard";
// Global CSS should come before component-specific CSS
import "./styles/global.css";
import "./App.css";

function App() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [dashboardContent, setDashboardContent] = useState({
    session_id: "",
    name: "",
    context: "",
  });
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cardColors = [
    "green",
    "blue",
    "orange",
    "red",
    "purple",
    "teal",
    "pink",
  ];

  // Fetch cards from API on component mount
  useEffect(() => {
    const getCards = async () => {
      try {
        setLoading(true);
        const data = await fetchCards();
        setCards(data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load cards. Please try again later.");
        setLoading(false);
        console.error("Error loading cards:", err);
      }
    };

    getCards();
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "/" && !searchOpen && !dashboardOpen) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [searchOpen, dashboardOpen]);

  return (
    <div className="container">
      <Header />

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading cards...</p>
        </div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="cards-grid">
          {cards.map((card, idx) => (
            <Card
              key={card.session_id}
              session_id={card.session_id}
              name={card.name}
              context={card.context}
              color={cardColors[idx % cardColors.length]}
              onClick={() => {
                setDashboardOpen(true);
                setDashboardContent(card);
              }}
            />
          ))}
        </div>
      )}

      <footer className="footer">ContextWeaver v1.0.0</footer>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
      {dashboardOpen && (
        <AnalyticsDashboard
          onClose={() => setDashboardOpen(false)}
          dashboardContent={dashboardContent}
        />
      )}
    </div>
  );
}

export default App;
