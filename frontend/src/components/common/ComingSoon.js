// src/components/common/ComingSoon.js

import React from 'react';
import './ComingSoon.css'; // เราจะสร้างไฟล์ CSS นี้ในขั้นตอนต่อไป

const ComingSoon = ({ title }) => {
  return (
    <div className="coming-soon-container">
      <div className="coming-soon-icon">🚧</div>
      <h2 className="coming-soon-title">{title}</h2>
      <p className="coming-soon-text">
        หน้านี้กำลังอยู่ระหว่างการพัฒนา...
      </p>
      <p className="coming-soon-subtitle">Coming Soon</p>
    </div>
  );
};

export default ComingSoon;