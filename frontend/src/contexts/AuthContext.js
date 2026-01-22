// components/layout/Layout.js - Main Layout Component
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, X, Bell, User, LogOut, Settings, 
  Home, BarChart3, Package, FileText, Users,
  ChevronDown, Search, Moon, Sun
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout, refreshSession, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Auto-refresh session every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshSession();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [refreshSession]);

  // Load user preferences
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const menuItems = [
    {
      label: 'Dashboard',
      path: '/',
      icon: Home,
      permission: null
    },
    {
      label: 'Material Inspection',
      path: '/material-inspection',
      icon: Package,
      permission: 'material_inspection_view'
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: BarChart3,
      permission: 'reports_view'
    },
    {
      label: 'Documents',
      path: '/documents',
      icon: FileText,
      permission: 'documents_view'
    },
    {
      label: 'Users',
      path: '/users',
      icon: Users,
      permission: 'users_view'
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  return (
    <div className={`layout ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Package className="w-8 h-8 text-blue-600" />
            <h2>QC System</h2>
          </div>
          <button 
            className="sidebar-toggle md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="sidebar-nav">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">
              {user?.firstName?.charAt(0) || 'U'}
            </div>
            <div className="user-details">
              <p className="user-name">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="user-role">{user?.role?.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <button 
              className="sidebar-toggle md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="search-box">
              <Search className="w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="search-input"
              />
            </div>
          </div>

          <div className="topbar-right">
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="icon-button"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <div className="notifications">
              <button className="icon-button">
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="notification-badge">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>

            {/* User Menu */}
            <div className="user-menu">
              <button 
                className="user-menu-trigger"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="avatar">
                  {user?.firstName?.charAt(0) || 'U'}
                </div>
                <span className="user-name">
                  {user?.firstName} {user?.lastName}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {userMenuOpen && (
                <div className="user-menu-dropdown">
                  <div className="menu-header">
                    <p className="user-name">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="user-email">{user?.email}</p>
                  </div>
                  
                  <div className="menu-items">
                    <button className="menu-item">
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button className="menu-item">
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <div className="menu-divider"></div>
                    <button 
                      className="menu-item logout"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-content">
          {children}
        </main>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;