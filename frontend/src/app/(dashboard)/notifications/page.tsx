import { ModulePage } from "@/components/layout/module-page";

export default function NotificationsPage() {
  return (
    <ModulePage
      phase="Phase 5"
      moduleKey="notifications"
      title="Notifications"
      description="Announcements, reminders, alerts, and audience-based communication for operational follow-up."
      workflows={[
        {
          name: "Announcements",
          description: "Publish hostel-wide notices with clear audience targeting, readable summaries, and mobile-safe review flows.",
          tag: "Broadcast",
          iconKey: "announcements",
        },
        {
          name: "Reminder Queue",
          description: "Track fee reminders, attendance nudges, and operational alerts without losing urgency or context.",
          tag: "Alerts",
          iconKey: "reports_overview",
        },
      ]}
      mobileBehavior={[
        "Notifications should prioritize unread and urgent items first on small screens before secondary history.",
        "Announcement cards should keep title, audience, status, and publish action visible without requiring wide layouts.",
        "Reminder actions should stay thumb-friendly and avoid cluttered multi-button rows on mobile devices.",
      ]}
    />
  );
}
