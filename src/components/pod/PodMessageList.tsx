"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Message = {
  id: string;
  message: string;
  created_at: string;
  sender: {
    full_name: string;
    role: string;
  };
};

export function PodMessageList({ initialMessages, podId }: { initialMessages: Message[], podId: string }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to new pod messages
    const channel = supabase
      .channel('pod_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pod_messages',
          filter: `pod_id=eq.${podId}`
        },
        async (payload) => {
          const newMsg = payload.new;
          
          // Fetch sender details since realtime payload only has sender_id
          const { data: senderData } = await supabase
            .from("users")
            .select("full_name, role")
            .eq("id", newMsg.sender_id)
            .single();

          if (senderData) {
            setMessages((prev) => [
              {
                id: newMsg.id,
                message: newMsg.message,
                created_at: newMsg.created_at,
                sender: {
                  full_name: senderData.full_name,
                  role: senderData.role
                }
              },
              ...prev
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [podId, supabase]);

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" />
        <p>No messages yet. Say hello to your pod!</p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {messages.map((msg) => (
        <div key={msg.id} className="flex gap-4">
          <Avatar className="w-10 h-10 border border-border">
            <AvatarFallback className={msg.sender.role === 'mentor' || msg.sender.role === 'admin' ? 'bg-primary/20 text-primary font-bold' : ''}>
              {msg.sender.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-semibold text-foreground">{msg.sender.full_name}</span>
              {msg.sender.role === 'mentor' && (
                <span className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-sm">Mentor</span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(msg.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-muted-foreground bg-muted/30 p-4 rounded-xl rounded-tl-none border border-border/50 whitespace-pre-wrap">
              {msg.message}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
