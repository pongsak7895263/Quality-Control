// src/components/common/LoadingSpinner.js
import React from "react";
import "./LoadingSpinner.css"; // สร้างไฟล์ CSS สำหรับ spinner

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>{message}</p>
    </div>
  );
};

export default LoadingSpinner;