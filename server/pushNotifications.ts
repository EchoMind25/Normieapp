// @ts-ignore - web-push doesn't have type definitions
import webpush from "web-push";
import { storage } from "./storage";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@normienation.app";

let pushEnabled = false;

export function initializePushNotifications() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("[Push] VAPID keys not configured - push notifications disabled");
    console.log("[Push] Generate keys with: npx web-push generate-vapid-keys");
    return;
  }

  try {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    pushEnabled = true;
    console.log("[Push] Push notifications enabled");
  } catch (error) {
    console.error("[Push] Failed to initialize:", error);
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export function isPushEnabled(): boolean {
  return pushEnabled;
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!pushEnabled) {
    console.log("[Push] Notifications disabled, skipping");
    return;
  }

  const subscriptions = await storage.getPushSubscriptionsByUser(userId);
  
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dhKey,
            auth: sub.authKey,
          },
        },
        JSON.stringify(payload)
      );
    } catch (error: any) {
      console.error(`[Push] Failed to send to subscription:`, error.message);
      if (error.statusCode === 410 || error.statusCode === 404) {
        await storage.deletePushSubscription(sub.endpoint);
        console.log("[Push] Removed expired subscription");
      }
    }
  }
}

export async function sendPushNotificationForNewPoll(
  pollId: string,
  pollQuestion: string
): Promise<void> {
  if (!pushEnabled) {
    console.log("[Push] Notifications disabled, skipping new poll notification");
    return;
  }

  const subscriptions = await storage.getPushSubscriptionsForNewPolls();
  console.log(`[Push] Sending new poll notification to ${subscriptions.length} subscribers`);

  const payload: PushPayload = {
    title: "New Poll on Normie Nation",
    body: pollQuestion.length > 100 ? pollQuestion.substring(0, 97) + "..." : pollQuestion,
    icon: "/normie-icon.png",
    badge: "/normie-badge.png",
    url: "/",
    tag: `poll-${pollId}`,
  };

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dhKey,
            auth: sub.authKey,
          },
        },
        JSON.stringify(payload)
      );
    } catch (error: any) {
      console.error(`[Push] Failed to send to user ${sub.userId}:`, error.message);
      if (error.statusCode === 410 || error.statusCode === 404) {
        await storage.deletePushSubscription(sub.endpoint);
        console.log("[Push] Removed expired subscription");
      }
    }
  }

  await storage.createBroadcastNotification({
    type: "new_poll",
    title: "New Poll Available",
    message: pollQuestion,
    relatedId: pollId,
  });
}
