import { Bookmark } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export default function SavedTripsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Saved Trips"
        description="Your bookmarked trip briefings and conditions reports"
      />

      <EmptyState
        icon={<Bookmark className="h-8 w-8" />}
        title="No saved trips yet"
        description="Search a location and save your first briefing. Saved trips let you track changing conditions over time."
      />
    </div>
  );
}
