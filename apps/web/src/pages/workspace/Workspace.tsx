import { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Briefcase, Users2, Handshake } from "lucide-react";
import { JobsPanel } from "./JobsPanel";
import { TalentPanel } from "./TalentPanel";
import { CollaboratePanel } from "./CollaboratePanel";

export default function Workspace() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const [tab, setTab] = useState(params.get("tab") ?? "work");

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Turn your body of work, Trust Score, and availability into your next paid opportunity.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="work" className="gap-1.5">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Find Opportunities</span>
              <span className="sm:hidden">Work</span>
            </TabsTrigger>
            <TabsTrigger value="talent" className="gap-1.5">
              <Users2 className="w-4 h-4" />
              <span className="hidden sm:inline">Hire Talent</span>
              <span className="sm:hidden">Talent</span>
            </TabsTrigger>
            <TabsTrigger value="collaborate" className="gap-1.5">
              <Handshake className="w-4 h-4" />
              <span className="hidden sm:inline">Collaborate</span>
              <span className="sm:hidden">Collab</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="work">
            <JobsPanel />
          </TabsContent>

          <TabsContent value="talent">
            <TalentPanel />
          </TabsContent>

          <TabsContent value="collaborate">
            <CollaboratePanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
