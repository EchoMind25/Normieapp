// @ts-ignore - web-push doesn't have type definitions
import webpush from "web-push";
import { storage } from "./storage";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:support@tryechomind.net";

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

export async function sendStreamNotification(
  title: string,
  message: string,
  streamUrl?: string
): Promise<{ sent: number; failed: number }> {
  if (!pushEnabled) {
    console.log("[Push] Notifications disabled, skipping stream notification");
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await storage.getPushSubscriptionsForAnnouncements();
  console.log(`[Push] Sending stream notification to ${subscriptions.length} subscribers`);

  const pumpFunUrl = streamUrl || "https://pump.fun/coin/FrSFwE2BxWADEyUWFXDMAeomzuB4r83ZvzdG9sevpump";
  
  const payload: PushPayload = {
    title: title || "Normie Nation Stream Alert",
    body: message || "A live stream is happening now! Click to join.",
    icon: "/normie-icon.png",
    badge: "/normie-badge.png",
    url: pumpFunUrl,
    tag: `stream-${Date.now()}`,
  };

  let sent = 0;
  let failed = 0;

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
      sent++;
    } catch (error: any) {
      console.error(`[Push] Failed to send to user ${sub.userId}:`, error.message);
      failed++;
      if (error.statusCode === 410 || error.statusCode === 404) {
        await storage.deletePushSubscription(sub.endpoint);
        console.log("[Push] Removed expired subscription");
      }
    }
  }

  await storage.createBroadcastNotification({
    type: "announcement",
    title: title,
    message: message,
    relatedId: pumpFunUrl,
  });

  console.log(`[Push] Stream notification sent: ${sent} success, ${failed} failed`);
  return { sent, failed };
}

export async function sendWhaleAlertNotification(
  amount: number,
  signature: string
): Promise<{ sent: number; failed: number }> {
  if (!pushEnabled) {
    console.log("[Push] Notifications disabled, skipping whale alert");
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await storage.getPushSubscriptionsForWhaleAlerts();
  console.log(`[Push] Sending whale alert to ${subscriptions.length} subscribers`);

  const formattedAmount = (amount / 1_000_000).toFixed(2);
  
  const payload: PushPayload = {
    title: "WHALE ALERT",
    body: `Someone just bought ${formattedAmount}M $NORMIE! Big money entering!`,
    icon: "/normie-icon.png",
    badge: "/normie-badge.png",
    url: "/",
    tag: `whale-${signature.slice(0, 8)}`,
  };

  let sent = 0;
  let failed = 0;

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
      sent++;
    } catch (error: any) {
      failed++;
      if (error.statusCode === 410 || error.statusCode === 404) {
        await storage.deletePushSubscription(sub.endpoint);
      }
    }
  }

  console.log(`[Push] Whale alert sent: ${sent} success, ${failed} failed`);
  return { sent, failed };
}

export async function sendJeetAlarmNotification(
  amount: number,
  transactionId: string
): Promise<{ sent: number; failed: number }> {
  if (!pushEnabled) {
    console.log("[Push] Notifications disabled, skipping jeet alarm");
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await storage.getPushSubscriptionsForJeetAlarms();
  console.log(`[Push] Sending jeet alarm to ${subscriptions.length} subscribers`);

  const formattedAmount = (amount / 1_000_000).toFixed(2);
  
  const payload: PushPayload = {
    title: "JEET ALARM",
    body: `Paper hands detected! Someone just sold ${formattedAmount}M $NORMIE!`,
    icon: "/normie-icon.png",
    badge: "/normie-badge.png",
    url: "/",
    tag: `jeet-${transactionId.slice(0, 8)}`,
  };

  let sent = 0;
  let failed = 0;

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
      sent++;
    } catch (error: any) {
      failed++;
      if (error.statusCode === 410 || error.statusCode === 404) {
        await storage.deletePushSubscription(sub.endpoint);
      }
    }
  }

  console.log(`[Push] Jeet alarm sent: ${sent} success, ${failed} failed`);
  return { sent, failed };
}

export async function sendArtworkApprovedNotification(
  userId: string,
  artworkTitle: string,
  artworkId: string
): Promise<void> {
  if (!pushEnabled) {
    console.log("[Push] Notifications disabled, skipping artwork approval");
    return;
  }

  // Check if user has artwork notifications enabled
  const user = await storage.getUser(userId);
  if (!user || user.notifyArtworkStatus === false) {
    console.log("[Push] User has artwork notifications disabled");
    return;
  }

  const payload: PushPayload = {
    title: "Artwork Approved!",
    body: `Your artwork "${artworkTitle}" has been approved and is now live in the gallery!`,
    icon: "/normie-icon.png",
    badge: "/normie-badge.png",
    url: "/",
    tag: `artwork-approved-${artworkId}`,
  };

  await sendPushToUser(userId, payload);

  // Create in-app notification
  await storage.createNotification({
    userId,
    type: "artwork_approved",
    title: "Artwork Approved!",
    message: `Your artwork "${artworkTitle}" has been approved and is now live in the gallery!`,
    relatedId: artworkId,
  });

  console.log(`[Push] Artwork approval notification sent to user ${userId}`);
}

export async function sendArtworkRejectedNotification(
  userId: string,
  artworkTitle: string,
  artworkId: string,
  reason?: string
): Promise<void> {
  if (!pushEnabled) {
    console.log("[Push] Notifications disabled, skipping artwork rejection");
    return;
  }

  // Check if user has artwork notifications enabled
  const user = await storage.getUser(userId);
  if (!user || user.notifyArtworkStatus === false) {
    console.log("[Push] User has artwork notifications disabled");
    return;
  }

  const reasonText = reason ? ` Reason: ${reason}` : "";
  
  const payload: PushPayload = {
    title: "Artwork Not Approved",
    body: `Your artwork "${artworkTitle}" was not approved.${reasonText}`,
    icon: "/normie-icon.png",
    badge: "/normie-badge.png",
    url: "/",
    tag: `artwork-rejected-${artworkId}`,
  };

  await sendPushToUser(userId, payload);

  // Create in-app notification
  await storage.createNotification({
    userId,
    type: "artwork_rejected",
    title: "Artwork Not Approved",
    message: `Your artwork "${artworkTitle}" was not approved.${reasonText}`,
    relatedId: artworkId,
  });

  console.log(`[Push] Artwork rejection notification sent to user ${userId}`);
}
