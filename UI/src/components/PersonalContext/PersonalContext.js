import React, { useState, useEffect, useRef } from "react";
import { savePersonalContext } from "../../api/personalContextService";
import './PersonalContext.css';

const PersonalContext = ({ onClose, formData,setFormData }) => {
  const modalRef = useRef(null);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Animation on open
    const overlay = document.querySelector(".form-overlay");
    const modal = modalRef.current;
    const formFields = document.querySelectorAll(".form-field");

    // Trigger animations after elements are added to the DOM
    setTimeout(() => {
      if (overlay) overlay.classList.add("visible");
      if (modal) modal.classList.add("visible");

      // Staggered animation for form fields
      formFields.forEach((field, index) => {
        setTimeout(() => {
          field.classList.add("visible");
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.age.trim()) newErrors.age = "Age is required";
    else if (isNaN(formData.age) || formData.age < 1 || formData.age > 150) {
      newErrors.age = "Please enter a valid age (1-150)";
    }
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.country.trim()) newErrors.country = "Country is required";
    if (!formData.occupation.trim())
      newErrors.occupation = "Occupation is required";
    if (!formData.bio.trim()) newErrors.bio = "Bio is required";

    return newErrors;
  };

  const handleSubmit =async () => {
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      savePersonalContext(formData)
      onClose();
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="form-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        <h2 className="form-title">Personal Context</h2>
        <hr className="divider" />

        <p className="description">
          Please fill out your profile information below. All fields are
          required to create your profile.
        </p>

        <div className="profile-form">
          <div className="form-field">
            <label className="field-label">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`form-input ${errors.name ? "error" : ""}`}
              placeholder="Enter your full name"
            />
            {errors.name && (
              <span className="error-message">{errors.name}</span>
            )}
          </div>

          <div className="form-field">
            <label className="field-label">Age</label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              className={`form-input ${errors.age ? "error" : ""}`}
              placeholder="Enter your age"
              min="1"
              max="150"
            />
            {errors.age && <span className="error-message">{errors.age}</span>}
          </div>

          <div className="form-row">
            <div className="form-field">
              <label className="field-label">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className={`form-input ${errors.city ? "error" : ""}`}
                placeholder="Enter your city"
              />
              {errors.city && (
                <span className="error-message">{errors.city}</span>
              )}
            </div>

            <div className="form-field">
              <label className="field-label">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className={`form-input ${errors.country ? "error" : ""}`}
                placeholder="Enter your country"
              />
              {errors.country && (
                <span className="error-message">{errors.country}</span>
              )}
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Occupation</label>
            <input
              type="text"
              name="occupation"
              value={formData.occupation}
              onChange={handleInputChange}
              className={`form-input ${errors.occupation ? "error" : ""}`}
              placeholder="Enter your occupation"
            />
            {errors.occupation && (
              <span className="error-message">{errors.occupation}</span>
            )}
          </div>

          <div className="form-field">
            <label className="field-label">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              className={`form-textarea ${errors.bio ? "error" : ""}`}
              placeholder="Tell us about yourself..."
              rows="4"
            />
            {errors.bio && <span className="error-message">{errors.bio}</span>}
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-button" onClick={handleSubmit}>
              <svg
                className="submit-icon"
                viewBox="0 0 24 24"
                width="16"
                height="16"
              >
                <path
                  fill="currentColor"
                  d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"
                />
              </svg>
              Build Personal Context
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalContext;