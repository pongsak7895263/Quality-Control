// src/hooks/useWebSocket.js
import { useState, useEffect, useRef } from 'react';

const useWebSocket = (token) => {
  const [connected, setConnected] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const maxReconnectAttempts = 5;
  const reconnectAttempts = useRef(0);

  const connect = () => {
    if (!token) return;

    try {
      // Use environment variable or default WebSocket URL
      const wsUrl = process.env.REACT_APP_WS_URL || `ws://localhost:8080/ws?token=${token}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        // console.log('WebSocket connected');
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'dashboard_update':
              setDashboardData(data.payload);
              break;
            case 'realtime_data':
              setRealtimeData(data.payload);
              break;
            case 'notification':
              setNotifications(prev => [data.payload, ...prev.slice(0, 49)]); // Keep last 50
              break;
            case 'error':
              setError(data.payload.message);
              break;
            default:
              // console.log('Unknown message type:', data.type);
          }
        } catch (err) {
          // console.error('Failed to parse WebSocket message:', err);
        }
      };

      wsRef.current.onerror = (error) => {
        // console.error('WebSocket error:', error);
        setError('WebSocket connection error');
      };

      wsRef.current.onclose = (event) => {
        // console.log('WebSocket disconnected:', event.code, event.reason);
        setConnected(false);
        
        // Attempt to reconnect if it wasn't a manual close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const timeout = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, timeout);
        }
      };
    } catch (err) {
      // console.error('Failed to create WebSocket connection:', err);
      setError('Failed to create WebSocket connection');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000); // Normal closure
    }
    setConnected(false);
  };

  const sendMessage = (type, payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    } else {
      setError('WebSocket is not connected');
    }
  };

  useEffect(() => {
    if (token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [token]);

  return {
    connected,
    dashboardData,
    realtimeData,
    notifications,
    error,
    sendMessage,
    reconnect: connect
  };
};

export default useWebSocket;