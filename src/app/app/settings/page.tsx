import { User, SlidersHorizontal, Info } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and application preferences
        </p>
      </div>

      {/* Account */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <User size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Account</h2>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sign in to save trips, track conditions over time, and receive
            alerts. Authentication will be available in a future update.
          </p>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              Preferences
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="text-sm text-foreground">Units</p>
                <p className="text-xs text-muted-foreground">
                  Imperial (miles, feet, Fahrenheit)
                </p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                Default
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div>
                <p className="text-sm text-foreground">Default Activity</p>
                <p className="text-xs text-muted-foreground">Backpacking</p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                Default
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-foreground">Map Style</p>
                <p className="text-xs text-muted-foreground">Terrain</p>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                Default
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Settings will be available after authentication is implemented.
          </p>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Info size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">About</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="font-mono text-xs text-foreground">2.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Data Sources
              </span>
              <span className="font-mono text-xs text-foreground">
                7 active
              </span>
            </div>
            <p className="text-sm text-muted-foreground pt-2">
              Strange Grounds synthesizes multi-source environmental data into
              AI-generated briefings for backcountry travel planning.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
