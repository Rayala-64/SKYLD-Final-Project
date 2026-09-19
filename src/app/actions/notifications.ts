"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  action_url?: string;
  entity_type?: string | null;
  entity_id?: string | null;
  read_at?: string | null;
  created_at: string;
}

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

function resolveActionUrl(type: string, entityType?: string | null): string {
  if (type === "CHAMPIONSHIP_UPDATE" || entityType === "CHAMPIONSHIP") {
    return "/vault/championship";
  }
  if (type === "MASTER_EVALUATION_COMPLETED" || type === "POD_CHALLENGE_GRADED") {
    return "/vault/championship";
  }
  if (type === "BUDDY_REVIEW_ASSIGNED" || type === "PEER_REVIEW_ASSIGNED") {
    return "/vault/review";
  }
  return "/vault/dashboard";
}

/**
 * Fetch all notifications for the currently logged-in user
 */
export async function getUserNotifications(): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { notifications: [], unreadCount: 0 };
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, message, entity_type, entity_id, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Error fetching notifications:", error);
      return { notifications: [], unreadCount: 0 };
    }

    const notifications: NotificationItem[] = (data || []).map((n) => ({
      ...n,
      action_url: resolveActionUrl(n.type, n.entity_type),
    }));

    const unreadCount = notifications.filter((n) => !n.read_at).length;

    return { notifications, unreadCount };
  } catch (err) {
    console.error("getUserNotifications error:", err);
    return { notifications: [], unreadCount: 0 };
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error marking notification as read:", error);
    throw new Error("Failed to update notification");
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Error marking all notifications as read:", error);
    throw new Error("Failed to mark all as read");
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Send an in-app notification to a specific user (Admin / Server Action Trigger)
 */
export async function sendInAppNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}) {
  const adminClient = getAdminClient();

  const { data, error } = await adminClient
    .from("notifications")
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to send in-app notification:", error);
    return { success: false, error: error.message };
  }

  return { success: true, notification: data };
}

/**
 * Send a quick buddy nudge alert
 */
export async function sendBuddyNudge(targetStudentId: string, customMessage?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch sender name
  const { data: sender } = await supabase.from("users").select("full_name").eq("id", user.id).single();
  const senderName = sender?.full_name || "Your buddy";

  const message = customMessage || `${senderName} is nudging you to complete your daily 10-step word ritual! Let's keep the streak alive 🔥`;

  return await sendInAppNotification({
    userId: targetStudentId,
    type: "SYSTEM",
    title: `⚡ Buddy Nudge from ${senderName}`,
    message,
    entityType: "BUDDY_NUDGE",
    entityId: user.id,
  });
}
