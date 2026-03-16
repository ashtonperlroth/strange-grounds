import { Bookmark } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function SavedTripsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Saved Trips</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your bookmarked trip briefings and conditions reports
        </p>
      </div>

      <EmptyState
        icon={<Bookmark className="h-8 w-8" />}
        title="No saved trips yet"
        description="Search a location and save your first briefing. Saved trips let you track changing conditions over time."
      />
    </div>
  );
}
