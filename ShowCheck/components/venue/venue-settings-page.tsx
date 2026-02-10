"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Building2, Link2, FolderOpen, Mail, Image, Wrench } from "lucide-react"
import { VenueDetailsSettings } from "@/components/venue/venue-details-settings"
import { StageManagementCard } from "@/components/venue/stage-management-card"
import { BaseConfiguration } from "@/components/venue/base-configuration"
import { CatalogManager } from "@/components/venue/catalog-manager"
import { AdvanceTemplatesCard } from "@/components/venue/advance-templates-card"
import { OfferTemplatesCard } from "@/components/venue/offer-templates-card"
import { VenueIntegrationsCard } from "@/components/venue/venue-integrations-card"
import { VenueAssetsCard } from "@/components/venue/venue-assets-card"
import { GreenRoomCatalog } from "@/components/venue/green-room-catalog"
import { DeleteVenueCard } from "@/components/venue/delete-venue-card"
import type { OfferTemplateRow } from "@/lib/venue-types"
import type { Venue } from "@/lib/venue-types"

interface VenueSettingsPageProps {
  onBack: () => void
  venueId: string | null
  venue: Venue | null
  onUseOfferTemplate?: (template: OfferTemplateRow) => void
}

export function VenueSettingsPage({
  onBack,
  venueId,
  venue,
  onUseOfferTemplate,
}: VenueSettingsPageProps) {
  const [settingsSubTab, setSettingsSubTab] = useState<"details" | "integrations" | "assets">("details")

  return (
    <div className="space-y-6">
      {/* Header: back + title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Venue settings</h1>
            <p className="text-sm text-muted-foreground">
              Details, stages, integrations, and assets
            </p>
          </div>
        </div>
      </div>

      <Tabs
        value={settingsSubTab}
        onValueChange={(v) => setSettingsSubTab(v as "details" | "integrations" | "assets")}
        className="space-y-6"
      >
        <TabsList className="bg-secondary/50 p-1 h-auto flex-wrap w-full sm:w-auto">
          <TabsTrigger value="details" className="gap-2 data-[state=active]:bg-card">
            <Building2 className="w-4 h-4" />
            Venue details
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2 data-[state=active]:bg-card">
            <Link2 className="w-4 h-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-2 data-[state=active]:bg-card">
            <FolderOpen className="w-4 h-4" />
            Assets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-0">
          <VenueDetailsSettings />
          <StageManagementCard venueId={venueId} />
          <BaseConfiguration />
          <CatalogManager />
          <AdvanceTemplatesCard venueId={venueId} />
          <OfferTemplatesCard
            venueId={venueId}
            venueGroupId={venue?.group_id ?? null}
            onUseTemplate={onUseOfferTemplate}
          />
          <DeleteVenueCard />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6 mt-0">
          <VenueIntegrationsCard />
          <Card className="border-border bg-card border-dashed">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Email notifications</CardTitle>
                  <CardDescription>
                    Notify artists or staff when offers are sent, holds change, or settlements are ready.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon. Connect an email provider to send automated updates from Venue.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-6 mt-0">
          <VenueAssetsCard venueId={venueId} />
          <GreenRoomCatalog />
          <Card className="border-border bg-card border-dashed">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                  <Image className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Branding & logo</CardTitle>
                  <CardDescription>
                    Upload your venue logo for advance pages, contracts, and exports.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon. Logo upload will appear here and in Assets.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card border-dashed">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                  <Wrench className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">Production & tech</CardTitle>
                  <CardDescription>
                    Stage specs, input lists, and production requirements.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Stage technical specs live in Stage management. Dedicated production docs coming later.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
