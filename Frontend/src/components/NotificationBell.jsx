import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notificationService';

const formatTimeLabel = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const popoverRef = useRef(null);

  const fetchLatestNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getNotifications();
      setNotifications(response?.notifications || []);
      setUnreadCount(Number(response?.unreadCount || 0));
    } catch {
      // Keep UI quiet on transient failures.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestNotifications();
    const timer = setInterval(fetchLatestNotifications, 15000);
    return () => clearInterval(timer);
  }, [fetchLatestNotifications]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const visibleNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);

  const handleToggle = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      await fetchLatestNotifications();
    }
  };

  const handleMarkAsRead = async (id) => {
    if (!id) return;
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore to avoid blocking user actions.
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore to avoid blocking user actions.
    }
  };

  return (
    <div className={`notification-bell-wrap ${open ? 'open' : ''}`} ref={popoverRef}>
      <button type="button" className="ghost-icon notification-trigger" aria-label="Notifications" onClick={handleToggle}>
        🔔
        {unreadCount > 0 ? <span className="notification-badge">{Math.min(unreadCount, 99)}</span> : null}
      </button>

      {open ? (
        <section className="notification-popover" aria-label="Notification panel">
          <div className="notification-popover-head">
            <strong>Notifications</strong>
            <button type="button" onClick={handleMarkAllRead} disabled={!unreadCount}>Mark all read</button>
          </div>

          {loading ? (
            <p className="notification-state">Loading...</p>
          ) : visibleNotifications.length === 0 ? (
            <p className="notification-state">No notifications yet.</p>
          ) : (
            <div className="notification-list">
              {visibleNotifications.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className={`notification-item ${item.isRead ? '' : 'unread'}`}
                  onClick={() => handleMarkAsRead(item._id)}
                >
                  <span className="notification-dot" aria-hidden="true" />
                  <div className="notification-copy">
                    <h4>{item.title || 'Notification'}</h4>
                    <p>{item.message || ''}</p>
                    <small>{formatTimeLabel(item.createdAt)}</small>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="notification-view-all"
            onClick={() => {
              setOpen(false);
              navigate('/settings');
            }}
          >
            View all in Settings
          </button>
        </section>
      ) : null}
    </div>
  );
};

export default NotificationBell;
