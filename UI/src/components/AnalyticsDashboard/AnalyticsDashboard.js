import React, { useEffect, useRef } from "react";
import "./AnalyticsDashboard.css";

const AnalyticsDashboard = ({ onClose, dashboardContent }) => {
  const modalRef = useRef(null);
  const features = [
    "Real-time data visualization",
    "Custom report builder",
    "Performance metrics tracking",
    "Export functionality",
    "Automated alerts",
  ];

  useEffect(() => {
    // Animation on open
    const overlay = document.querySelector(".dashboard-overlay");
    const modal = modalRef.current;
    const featureItems = document.querySelectorAll(".feature-item");

    // Trigger animations after elements are added to the DOM
    setTimeout(() => {
      if (overlay) overlay.classList.add("visible");
      if (modal) modal.classList.add("visible");

      // Staggered animation for features
      featureItems.forEach((item, index) => {
        setTimeout(() => {
          item.classList.add("visible");
        }, 150 + index * 50);
      });
    }, 10);

    // Close modal on Escape key
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="dashboard-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="dashboard-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        <h2 className="dashboard-title">{dashboardContent.name}</h2>
        <div className="dashboard-session-id">
          session_id : {dashboardContent.session_id}
        </div>
        <hr className="divider" />

        <p className="description">{dashboardContent.context}</p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <button
            className="popup-copy-button"
            style={{ display: " flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => {
              navigator.clipboard.writeText(dashboardContent.context);
            }}
          >
            <svg
              className="copy-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
            >
              <path
                fill="currentColor"
                d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
              />
            </svg>
          </button>
          <div
            className="sarvam-wrapper"
            style={{ display: "flex", gap: "10px" }}
          >
            <button className="sarvam-translate">Translate</button>
            <button
              className="sarvam-tts"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="white"
                viewBox="0 0 24 24"
              >
                <path d="M3 9v6h4l5 5V4l-5 5H3zm13.5 3c0-1.77-.77-3.37-2-4.47v8.94c1.23-1.1 2-2.7 2-4.47zm2.5 0c0 2.49-1.01 4.73-2.64 6.36l1.41 1.41C19.99 17.99 21 15.14 21 12s-1.01-5.99-2.73-8.77l-1.41 1.41C18.99 7.27 19.5 9.63 19.5 12z" />
              </svg>
            </button>{" "}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                height: "full",
                justifyContent: "center",
              }}
            >
              <div style={{'padding':"10px"}}>
              Powererd By<br/><span style={{color:'orange'}}>Sarvam AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
