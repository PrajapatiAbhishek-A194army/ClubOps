import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  ShieldCheck,
  HeartHandshake,
  AlertTriangle,
  Calendar,
  Send,
  Users,
  Wifi,
  WifiOff,
  Sparkles,
  Zap,
  Info,
  Clock,
  Radio,
  Bell,
  RefreshCw,
  Hash,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getCollaborationChannels,
  getCollaborationMessages,
  getCollaborationPresence,
  broadcastSystemActivity,
} from '../services/api';
import { useCollaborationSocket } from '../hooks/useCollaborationSocket';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function CollaborationPage() {
  const { activeClub, activeRole, user } = useAuth();

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messageType, setMessageType] = useState('CHAT');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch channels on mount or activeClub change
  useEffect(() => {
    if (!activeClub?.id) return;
    const loadChannels = async () => {
      try {
        const res = await getCollaborationChannels(activeClub.id);
        if (res.success && res.data) {
          setChannels(res.data);
        }
      } catch (err) {
        console.error('Failed to load channels:', err);
      }
    };
    loadChannels();
  }, [activeClub?.id]);

  // 2. Fetch messages when active channel changes
  const loadChannelMessages = useCallback(async () => {
    if (!activeClub?.id) return;
    try {
      setLoadingMessages(true);
      const res = await getCollaborationMessages(activeClub.id, activeChannel);
      if (res.success && res.data) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [activeClub?.id, activeChannel]);

  useEffect(() => {
    loadChannelMessages();
  }, [loadChannelMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. Fetch online presence
  const loadPresence = useCallback(async () => {
    if (!activeClub?.id) return;
    try {
      const res = await getCollaborationPresence(activeClub.id);
      if (res.success && res.data) {
        setOnlineUsers(res.data.online_users || []);
      }
    } catch (err) {
      console.error('Failed to load presence:', err);
    }
  }, [activeClub?.id]);

  useEffect(() => {
    loadPresence();
    const interval = setInterval(loadPresence, 20000);
    return () => clearInterval(interval);
  }, [loadPresence]);

  // 4. Inbound WebSocket Callbacks
  const handleMessageReceived = useCallback((newMsg, channel) => {
    if (channel === activeChannel || newMsg.channel === activeChannel) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    }

    // If it's a system event, also append to recent activities stream
    if (newMsg.message_type === 'SYSTEM_EVENT' || newMsg.message_type === 'URGENT_ALERT') {
      setActivities((prev) => [
        {
          id: newMsg.id,
          content: newMsg.content,
          type: newMsg.message_type,
          timestamp: newMsg.created_at,
          sender: newMsg.sender?.full_name || 'System',
        },
        ...prev.slice(0, 19),
      ]);
    }
  }, [activeChannel]);

  const handlePresenceUpdated = useCallback((payload) => {
    loadPresence();
  }, [loadPresence]);

  const handleSystemEvent = useCallback((payload) => {
    setActivities((prev) => [
      {
        id: Date.now().toString(),
        content: payload.description || payload.title,
        type: 'SYSTEM_EVENT',
        timestamp: payload.timestamp || new Date().toISOString(),
        sender: payload.actor_name || 'System',
      },
      ...prev.slice(0, 19),
    ]);
  }, []);

  const handleTyping = useCallback((payload) => {
    if (payload.channel === activeChannel) {
      setTypingUsers((prev) => {
        if (prev.includes(payload.user_name)) return prev;
        return [...prev, payload.user_name];
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUsers([]);
      }, 3000);
    }
  }, [activeChannel]);

  // Hook up WebSocket
  const { isConnected, sendMessage, sendTyping } = useCollaborationSocket({
    clubId: activeClub?.id,
    onMessageReceived: handleMessageReceived,
    onPresenceUpdated: handlePresenceUpdated,
    onSystemEvent: handleSystemEvent,
    onTyping: handleTyping,
  });

  // Handle message submission
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const contentToSend = inputText;
    const currentType = messageType;
    setInputText('');

    try {
      await sendMessage({
        channel: activeChannel,
        content: contentToSend,
        messageType: currentType,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else {
      sendTyping(activeChannel);
    }
  };

  const getChannelIcon = (name) => {
    if (name === 'general') return MessageSquare;
    if (name === 'organizers') return ShieldCheck;
    if (name === 'volunteers') return HeartHandshake;
    if (name === 'emergencies') return AlertTriangle;
    return Calendar;
  };

  const currentChannelObj = channels.find((c) => c.name === activeChannel) || {
    label: `# ${activeChannel}`,
    description: 'Real-time operational collaboration room',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Top Header & Connection Bar */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            Real-Time Collaboration Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Team Live Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Synchronized operational chat, active team presence, and campus event activity telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              isConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                <span>Live Gateway Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Reconnecting (REST Fallback)</span>
              </>
            )}
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{onlineUsers.length} Online</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            onClick={() => {
              loadChannelMessages();
              loadPresence();
            }}
          >
            Sync
          </Button>
        </div>
      </div>

      {/* Main 3-Column Collaboration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-280px)] min-h-[580px]">
        {/* Left Column: Channels List (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Channels</span>
            <Badge variant="neutral" size="sm">
              {channels.length} Rooms
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
            <div className="text-[11px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
              Operations Channels
            </div>
            {channels
              .filter((c) => !c.is_event)
              .map((chan) => {
                const Icon = getChannelIcon(chan.name);
                const isActive = activeChannel === chan.name;
                return (
                  <button
                    key={chan.id}
                    onClick={() => setActiveChannel(chan.name)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <div className="truncate">
                      <div className="truncate">{chan.label}</div>
                    </div>
                  </button>
                );
              })}

            {channels.some((c) => c.is_event) && (
              <>
                <div className="text-[11px] font-bold text-slate-400 px-3 pt-3 pb-1 uppercase tracking-wider">
                  Event War Rooms
                </div>
                {channels
                  .filter((c) => c.is_event)
                  .map((chan) => {
                    const isActive = activeChannel === chan.name;
                    return (
                      <button
                        key={chan.id}
                        onClick={() => setActiveChannel(chan.name)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Calendar className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
                        <div className="truncate">
                          <div className="truncate">{chan.label}</div>
                        </div>
                      </button>
                    );
                  })}
              </>
            )}
          </div>
        </div>

        {/* Center Column: Real-Time Chat Feed (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col overflow-hidden">
          {/* Active Channel Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">{currentChannelObj.label}</h2>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{currentChannelObj.description}</p>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin bg-slate-50/30">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 space-y-2">
                <MessageSquare className="w-10 h-10 text-slate-300 stroke-1" />
                <p className="text-xs font-medium">No messages in this channel yet.</p>
                <p className="text-[11px] text-slate-400">Be the first to start the coordination!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender?.id === user?.id;
                const isSystem = msg.message_type === 'SYSTEM_EVENT';
                const isUrgent = msg.message_type === 'URGENT_ALERT';

                if (isSystem || isUrgent) {
                  return (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                        isUrgent
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      {isUrgent ? (
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      ) : (
                        <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-bold flex items-center justify-between">
                          <span>{isUrgent ? 'URGENT OPERATIONAL ALERT' : 'OPERATIONS EVENT'}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="mt-0.5">{msg.content}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs ${
                        isMe
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {msg.sender?.full_name?.charAt(0) || 'U'}
                    </div>

                    <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end' : ''}`}>
                      <div
                        className={`flex items-center gap-2 text-[11px] text-slate-500 ${
                          isMe ? 'justify-end' : ''
                        }`}
                      >
                        <span className="font-bold text-slate-900">
                          {isMe ? 'You' : msg.sender?.full_name}
                        </span>
                        {msg.sender?.role && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-slate-100 text-slate-600">
                            {msg.sender.role}
                          </span>
                        )}
                        <span className="text-[10px]">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed shadow-2xs break-words ${
                          isMe
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="px-4 py-1 text-[11px] text-slate-400 italic bg-white flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
              <span>{typingUsers.join(', ')} typing...</span>
            </div>
          )}

          {/* Message Input Box */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-slate-100 bg-white flex flex-col gap-2"
          >
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMessageType('CHAT')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                    messageType === 'CHAT'
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Standard Chat
                </button>
                <button
                  type="button"
                  onClick={() => setMessageType('URGENT_ALERT')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                    messageType === 'URGENT_ALERT'
                      ? 'bg-red-100 text-red-800 font-bold'
                      : 'text-red-500 hover:text-red-700'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Urgent Alert
                </button>
              </div>
              <span className="text-[10px] text-slate-400">Press Enter to send</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message #${activeChannel}...`}
                className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={Send}
                disabled={!inputText.trim()}
              >
                Send
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Online Roster & Operations Activity Stream (3 Cols) */}
        <div className="lg:col-span-3 space-y-5 flex flex-col h-full overflow-hidden">
          {/* Online Presence Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-900">Online Now</span>
              </div>
              <Badge variant="success" size="sm">
                {onlineUsers.length} Active
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 scrollbar-thin">
              {onlineUsers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No other members online</p>
              ) : (
                onlineUsers.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                        {u.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 truncate">{u.full_name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{u.role}</div>
                      </div>
                    </div>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Operations Activity Stream Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">Live Operations</span>
              </div>
              <Badge variant="neutral" size="sm">
                Real-Time
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 scrollbar-thin">
              {activities.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 space-y-1">
                  <p>Awaiting operational actions...</p>
                  <p className="text-[10px]">Task moves, risk flags, check-ins broadcast here live.</p>
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-bold text-slate-600">{act.sender}</span>
                      <span>
                        {new Date(act.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-slate-800 text-[11px] font-medium leading-relaxed">{act.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
