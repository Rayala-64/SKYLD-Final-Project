"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Bell, 
  CheckCheck, 
  Flame, 
  Trophy, 
  Award, 
  UserCheck, 
  MessageSquare, 
  Clock, 
  Sparkles,
  ExternalLink,
  X
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  NotificationItem 
} from "@/app/actions/notifications";
import { useRouter } from "next/navigation";

interface NotificationBellProps {
  placement?: "sidebar" | "header";
}

export function NotificationBell({ placement = "sidebar" }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchLatest = async () => {
    try {
      const res = await getUserNotifications();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchLatest();

    const supabase = createClient();
    const channelName = `notifications-${Date.now()}-${Math.random()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          fetchLatest();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, actionUrl?: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markNotificationAsRead(id);
    } catch (e) {
      console.error(e);
    }

    if (actionUrl) {
      setIsOpen(false);
      router.push(actionUrl);
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);
    try {
      await markAllNotificationsAsRead();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "RITUAL_DEADLINE_WARNING":
      case "DAILY_RITUAL_COMPLETED":
        return <Flame className="w-4 h-4 text-amber-500" />;
      case "CHAMPIONSHIP_UPDATE":
      case "CHALLENGE_DEADLINE_WARNING":
        return <Trophy className="w-4 h-4 text-emerald-500" />;
      case "POD_CHALLENGE_GRADED":
      case "MASTER_EVALUATION_COMPLETED":
        return <Award className="w-4 h-4 text-purple-500" />;
      case "BUDDY_REVIEW_ASSIGNED":
      case "PEER_REVIEW_ASSIGNED":
        return <UserCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-primary" />;
    }
  };

  const filteredNotifications = notifications.filter((n) =>
    activeFilter === "unread" ? !n.read_at : true
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchLatest();
        }}
        aria-label="Notifications"
        className="relative p-2 rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer flex items-center justify-center"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-background animate-pulse shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          className={`fixed ${
            placement === "header" 
              ? "top-16 right-4 sm:right-6" 
              : "bottom-20 left-4 sm:left-6"
          } w-80 sm:w-96 bg-card border border-border/80 rounded-2xl shadow-2xl z-[9999] overflow-hidden backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200`}
          style={{ maxHeight: 'calc(100vh - 120px)' }}
        >
          {/* Header */}
          <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold text-foreground text-base">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  title="Mark all as read"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-border/40 px-3 pt-2 gap-2 bg-muted/10">
            <button
              onClick={() => setActiveFilter("all")}
              className={`pb-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeFilter === "all"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter("unread")}
              className={`pb-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeFilter === "unread"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* List of Notifications */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/30">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-2 text-muted-foreground">
                  <Bell className="w-5 h-5 opacity-50" />
                </div>
                <p className="text-sm font-medium text-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activeFilter === "unread"
                    ? "No unread alerts remaining."
                    : "You will receive alerts for deadlines, buddy updates & reviews here."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isUnread = !item.read_at;
                const timeAgo = formatTimeAgo(item.created_at);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleMarkAsRead(item.id, item.action_url)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-muted/40 ${
                      isUnread ? "bg-primary/5 font-medium" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-background border border-border/60 shadow-xs shrink-0 mt-0.5">
                      {getIcon(item.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {item.title}
                        </span>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3 opacity-70" />
                        <span>{timeAgo}</span>
                        {item.action_url && (
                          <span className="text-primary flex items-center gap-0.5 font-medium ml-auto">
                            View <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  } catch {
    return "Recently";
  }
}
