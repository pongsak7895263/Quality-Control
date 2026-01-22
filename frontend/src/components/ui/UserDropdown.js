// src/components/ui/UserDropdown.js - User Dropdown Component
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './UserDropdown.css';

const UserDropdown = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { logout } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <div className="user-dropdown" ref={dropdownRef}>
      <button
        className="user-avatar"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="avatar-text">
          {getInitials(user?.firstName, user?.lastName)}
        </span>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-header">
            <div className="user-details">
              <div className="user-name-dropdown">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="user-email">{user?.email}</div>
              <div className="user-role-badge">{user?.role?.name}</div>
            </div>
          </div>

          <div className="dropdown-divider"></div>

          <div className="dropdown-items">
            <button className="dropdown-item">
              <span className="dropdown-icon">👤</span>
              Profile Settings
            </button>
            
            <button className="dropdown-item">
              <span className="dropdown-icon">🔑</span>
              Change Password
            </button>
            
            <button className="dropdown-item">
              <span className="dropdown-icon">⚙️</span>
              Preferences
            </button>
          </div>

          <div className="dropdown-divider"></div>

          <button className="dropdown-item logout-item" onClick={handleLogout}>
            <span className="dropdown-icon">🚪</span>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;