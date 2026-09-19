import { useState, useEffect, useRef, useCallback } from 'react';
import { sendCollaborationMessage } from '../services/api';

export function useCollaborationSocket({
  clubId,
  onMessageReceived,
  onPresenceUpdated,
  onSystemEvent,
  onTyping,
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    if (!clubId) return;

    const token = localStorage.getItem('clubops_token');
    if (!token) return;

    // Determine WS protocol based on window location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Backend runs on port 8000 in dev
    const host = window.location.hostname === 'localhost' ? '127.0.0.1:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/clubs/${clubId}/ws?token=${encodeURIComponent(token)}`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setLastError(null);
        reconnectAttemptsRef.current = 0;

        // Start heartbeat ping
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'PING' }));
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const type = payload.type;

          if (type === 'NEW_MESSAGE') {
            if (onMessageReceived) onMessageReceived(payload.message, payload.channel);
          } else if (type === 'USER_JOINED' || type === 'USER_LEFT') {
            if (onPresenceUpdated) onPresenceUpdated(payload);
          } else if (type === 'SYSTEM_EVENT') {
            if (onSystemEvent) onSystemEvent(payload);
          } else if (type === 'TYPING') {
            if (onTyping) onTyping(payload);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      socket.onerror = (err) => {
        setLastError('WebSocket connection encountered an error.');
      };

      socket.onclose = (event) => {
        setIsConnected(false);
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

        // Exponential backoff reconnect unless explicitly closed
        if (event.code !== 1000 && event.code !== 1008) {
          const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 10000);
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (e) {
      console.error('Failed to instantiate WebSocket:', e);
      setIsConnected(false);
    }
  }, [clubId, onMessageReceived, onPresenceUpdated, onSystemEvent, onTyping]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Client unmounted');
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Send message helper: uses WebSocket if open, falls back to REST API
  const sendMessage = useCallback(
    async ({ channel = 'general', content, messageType = 'CHAT', eventId = null, metadata = null }) => {
      if (!content || !content.trim()) return null;

      const payload = {
        channel,
        content: content.trim(),
        message_type: messageType,
        event_id: eventId,
        metadata,
      };

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'CHAT_MESSAGE',
            ...payload,
          })
        );
        return { success: true, via: 'WEBSOCKET' };
      } else {
        // REST fallback
        try {
          const res = await sendCollaborationMessage(clubId, payload);
          if (res.success && onMessageReceived) {
            onMessageReceived(res.data, channel);
          }
          return res;
        } catch (err) {
          console.error('Error sending message via fallback:', err);
          throw err;
        }
      }
    },
    [clubId, onMessageReceived]
  );

  const sendTyping = useCallback((channel = 'general') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'TYPING',
          channel,
        })
      );
    }
  }, []);

  return {
    isConnected,
    lastError,
    sendMessage,
    sendTyping,
    reconnect: connect,
  };
}
