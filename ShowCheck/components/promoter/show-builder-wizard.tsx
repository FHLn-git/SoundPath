"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useEvent, type MenuItem } from "@/components/event-context"
import {
  Volume2,
  Lightbulb,
  Guitar,
  Shield,
  Wine,
  Coffee,
  Truck,
  Clock,
  Info,
  Plus,
  Minus,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  Users,
  UtensilsCrossed,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const STEPS = [
  { id: 1, name: "Production", description: "Sound & Lights" },
  { id: 2, name: "Staffing", description: "Security & Bar" },
  { id: 3, name: "Green Room", description: "Hospitality" },
  { id: 4, name: "Logistics", description: "Times & Requests" },
  { id: 5, name: "Summary", description: "Review & Finalize" },
]

const categoryIcons: Record<string, React.ReactNode> = {
  Sound: <Volume2 className="w-5 h-5" />,
  Lights: <Lightbulb className="w-5 h-5" />,
  Backline: <Guitar className="w-5 h-5" />,
  Security: <Shield className="w-5 h-5" />,
  Bar: <Wine className="w-5 h-5" />,
  "Green Room": <Coffee className="w-5 h-5" />,
}

export function ShowBuilderWizard() {
  const {
    menuItems,
    currentEvent,
    toggleEventItem,
    updateGreenRoomItem,
    updateEventTimes,
    updateSpecialRequests,
    finalizeWizard,
    getHouseMinimumTotal,
    getTotalBudget,
  } = useEvent()

  const [currentStep, setCurrentStep] = useState(1)

  const productionItems = menuItems.filter(
    (item) => item.category === "production" && !item.isHouseMinimum
  )
  const staffingItems = menuItems.filter(
    (item) => item.category === "staffing" && !item.isHouseMinimum
  )
  const hospitalityItems = menuItems.filter(
    (item) => item.category === "hospitality" && !item.isHouseMinimum
  )

  const isItemSelected = (itemId: string) => {
    return currentEvent?.selectedItems.includes(itemId) || false
  }

  const getGreenRoomQuantity = (itemId: string) => {
    return currentEvent?.greenRoomItems.find((g) => g.id === itemId)?.quantity || 0
  }

  const houseMinTotal = getHouseMinimumTotal()
  const currentTotal = getTotalBudget()
  const addOnsTotal = currentTotal - houseMinTotal

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinalize = () => {
    finalizeWizard()
  }

  return (
    <Card className="border-border bg-card overflow-hidden">
      {/* Progress Bar */}
      <div className="bg-secondary/30 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    currentStep > step.id
                      ? "bg-primary text-primary-foreground"
                      : currentStep === step.id
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-card"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                <div className="hidden sm:block mt-2 text-center">
                  <p className={`text-xs font-medium ${currentStep >= step.id ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`hidden sm:block w-12 lg:w-20 h-0.5 mx-2 ${currentStep > step.id ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* House Minimum Baseline - Always Visible */}
        <div className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded-lg mt-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">House Minimum (Baseline)</span>
          </div>
          <span className="font-semibold text-foreground">${houseMinTotal.toLocaleString()}</span>
        </div>
        {addOnsTotal > 0 && (
          <div className="flex items-center justify-between py-2 px-3 bg-primary/10 rounded-lg mt-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary">Add-Ons Selected</span>
            </div>
            <span className="font-semibold text-primary">+${addOnsTotal.toLocaleString()}</span>
          </div>
        )}
      </div>

      <CardContent className="p-6">
        {/* Step 1: Production */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Volume2 className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Production Setup</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Select your sound, lighting, and backline requirements. Each card shows the total cost with detailed breakdowns available.
            </p>
            <ProductionCards
              items={productionItems}
              isItemSelected={isItemSelected}
              onToggle={toggleEventItem}
            />
          </div>
        )}

        {/* Step 2: Staffing */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Staffing & Security</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Add security guards, bartenders, or stagehands beyond the house minimum staff.
            </p>
            <StaffingSelector
              items={staffingItems}
              isItemSelected={isItemSelected}
              onToggle={toggleEventItem}
            />
          </div>
        )}

        {/* Step 3: Green Room */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">The Green Room</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Build your hospitality package. Add catering, rider items, and drinks for your artists.
            </p>
            <GreenRoomGrid
              items={hospitalityItems}
              getQuantity={getGreenRoomQuantity}
              onUpdateQuantity={updateGreenRoomItem}
            />
          </div>
        )}

        {/* Step 4: Logistics */}
        {currentStep === 4 && (
          <LogisticsForm
            currentEvent={currentEvent}
            onUpdateTimes={updateEventTimes}
            onUpdateRequests={updateSpecialRequests}
          />
        )}

        {/* Step 5: Summary */}
        {currentStep === 5 && (
          <SummaryPage
            menuItems={menuItems}
            currentEvent={currentEvent}
            houseMinTotal={houseMinTotal}
            currentTotal={currentTotal}
            getGreenRoomQuantity={getGreenRoomQuantity}
          />
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="gap-2 bg-transparent"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </span>
            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} className="gap-2">
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleFinalize} className="gap-2 bg-primary hover:bg-primary/90">
                <Check className="w-4 h-4" />
                Finalize Selection
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Production Cards with Tooltips
function ProductionCards({
  items,
  isItemSelected,
  onToggle,
}: {
  items: MenuItem[]
  isItemSelected: (id: string) => boolean
  onToggle: (id: string) => void
}) {
  const groupBySubcategory = (items: MenuItem[]) => {
    return items.reduce(
      (acc, item) => {
        if (!acc[item.subcategory]) acc[item.subcategory] = []
        acc[item.subcategory].push(item)
        return acc
      },
      {} as Record<string, MenuItem[]>
    )
  }

  const grouped = groupBySubcategory(items)

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([subcategory, subItems]) => (
        <div key={subcategory}>
          <div className="flex items-center gap-2 mb-3">
            {categoryIcons[subcategory] || <Volume2 className="w-4 h-4" />}
            <h4 className="font-medium text-foreground">{subcategory}</h4>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {subItems.map((item) => (
              <ProductionCard
                key={item.id}
                item={item}
                isSelected={isItemSelected(item.id)}
                onToggle={() => onToggle(item.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ProductionCard({
  item,
  isSelected,
  onToggle,
}: {
  item: MenuItem
  isSelected: boolean
  onToggle: () => void
}) {
  const totalCost = item.basePrice + (item.mandatoryLabor?.cost || 0)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={onToggle}
            className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
              isSelected
                ? "bg-primary/10 border-primary shadow-lg shadow-primary/10"
                : "bg-card border-border hover:border-muted-foreground/30 hover:shadow-md"
            }`}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${isSelected ? "bg-primary/20" : "bg-secondary"}`}>
                {categoryIcons[item.subcategory] || <Volume2 className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="font-medium text-foreground">{item.name}</h5>
                <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
              <span className="text-lg font-bold text-foreground">${totalCost.toLocaleString()}</span>
              {item.mandatoryLabor && (
                <Badge variant="outline" className="text-xs text-warning border-warning/30">
                  +Labor
                </Badge>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-4">
          <p className="font-medium mb-2">Cost Breakdown</p>
          <div className="space-y-1 text-sm">
            {item.costBreakdown.map((cost) => (
              <div key={cost.id} className="flex justify-between">
                <span className="text-muted-foreground">{cost.name}</span>
                <span>${cost.amount}</span>
              </div>
            ))}
            {item.mandatoryLabor && (
              <div className="flex justify-between text-warning pt-1 border-t border-border">
                <span>{item.mandatoryLabor.name}</span>
                <span>${item.mandatoryLabor.cost}</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Staffing Selector with Quantity Controls
function StaffingSelector({
  items,
  isItemSelected,
  onToggle,
}: {
  items: MenuItem[]
  isItemSelected: (id: string) => boolean
  onToggle: (id: string) => void
}) {
  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const selected = isItemSelected(item.id)
        return (
          <div
            key={item.id}
            className={`p-4 rounded-xl border-2 transition-all ${
              selected
                ? "bg-primary/10 border-primary"
                : "bg-card border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${selected ? "bg-primary/20" : "bg-secondary"}`}>
                  {categoryIcons[item.subcategory] || <Shield className="w-5 h-5" />}
                </div>
                <div>
                  <h5 className="font-medium text-foreground">{item.name}</h5>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-foreground">${item.basePrice.toLocaleString()}</span>
                <Button
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToggle(item.id)}
                  className={selected ? "" : "bg-transparent"}
                >
                  {selected ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Added
                    </>
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Green Room Shopping Grid
function GreenRoomGrid({
  items,
  getQuantity,
  onUpdateQuantity,
}: {
  items: MenuItem[]
  getQuantity: (id: string) => number
  onUpdateQuantity: (id: string, quantity: number) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const quantity = getQuantity(item.id)
        const itemTotal = item.basePrice * quantity

        return (
          <div
            key={item.id}
            className={`p-4 rounded-xl border-2 transition-all ${
              quantity > 0
                ? "bg-primary/10 border-primary"
                : "bg-card border-border hover:border-muted-foreground/30"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-muted-foreground" />
                <h5 className="font-medium text-foreground">{item.name}</h5>
              </div>
              <Badge variant="outline" className="text-xs">${item.basePrice}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{item.description}</p>

            {quantity === 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 bg-transparent"
                onClick={() => onUpdateQuantity(item.id, 1)}
              >
                <Plus className="w-4 h-4" />
                Add to Rider
              </Button>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => onUpdateQuantity(item.id, Math.max(0, quantity - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-medium text-foreground">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => onUpdateQuantity(item.id, quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <span className="font-bold text-primary">${itemTotal.toLocaleString()}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Logistics Form
function LogisticsForm({
  currentEvent,
  onUpdateTimes,
  onUpdateRequests,
}: {
  currentEvent: any
  onUpdateTimes: (times: any) => void
  onUpdateRequests: (requests: string) => void
}) {
  const [times, setTimes] = useState({
    loadIn: currentEvent?.loadIn || "14:00",
    soundcheck: currentEvent?.soundcheck || "16:00",
    doors: currentEvent?.doors || "19:00",
    curfew: currentEvent?.curfew || "23:00",
    loadOut: currentEvent?.loadOut || "00:00",
  })
  const [requests, setRequests] = useState(currentEvent?.specialRequests || "")

  const handleTimeChange = (key: string, value: string) => {
    const newTimes = { ...times, [key]: value }
    setTimes(newTimes)
    onUpdateTimes(newTimes)
  }

  const handleRequestsChange = (value: string) => {
    setRequests(value)
    onUpdateRequests(value)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Truck className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Logistics & Timing</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="loadIn" className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-warning" />
            Load-In
          </Label>
          <Input
            id="loadIn"
            type="time"
            value={times.loadIn}
            onChange={(e) => handleTimeChange("loadIn", e.target.value)}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="soundcheck" className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            Soundcheck
          </Label>
          <Input
            id="soundcheck"
            type="time"
            value={times.soundcheck}
            onChange={(e) => handleTimeChange("soundcheck", e.target.value)}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="doors" className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Doors
          </Label>
          <Input
            id="doors"
            type="time"
            value={times.doors}
            onChange={(e) => handleTimeChange("doors", e.target.value)}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="curfew" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            Curfew
          </Label>
          <Input
            id="curfew"
            type="time"
            value={times.curfew}
            onChange={(e) => handleTimeChange("curfew", e.target.value)}
            className="bg-background"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="loadOut" className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-warning" />
            Load-Out
          </Label>
          <Input
            id="loadOut"
            type="time"
            value={times.loadOut}
            onChange={(e) => handleTimeChange("loadOut", e.target.value)}
            className="bg-background"
          />
        </div>
      </div>

      <div className="space-y-2 pt-4">
        <Label htmlFor="requests">Special Requests</Label>
        <Textarea
          id="requests"
          placeholder="Enter any special requests, notes, or requirements for the venue..."
          value={requests}
          onChange={(e) => handleRequestsChange(e.target.value)}
          className="min-h-[120px] bg-background"
        />
      </div>
    </div>
  )
}

// Summary Page
function SummaryPage({
  menuItems,
  currentEvent,
  houseMinTotal,
  currentTotal,
  getGreenRoomQuantity,
}: {
  menuItems: MenuItem[]
  currentEvent: any
  houseMinTotal: number
  currentTotal: number
  getGreenRoomQuantity: (id: string) => number
}) {
  const selectedProductionItems = menuItems.filter(
    (item) => item.category === "production" && !item.isHouseMinimum && currentEvent?.selectedItems.includes(item.id)
  )
  const selectedStaffingItems = menuItems.filter(
    (item) => item.category === "staffing" && !item.isHouseMinimum && currentEvent?.selectedItems.includes(item.id)
  )
  const greenRoomItems = menuItems.filter(
    (item) => item.category === "hospitality" && getGreenRoomQuantity(item.id) > 0
  )

  const addOnsTotal = currentTotal - houseMinTotal

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Review Your Selection</h3>
      </div>

      {/* Cost Summary Card */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted-foreground">House Minimum</span>
          <span className="font-medium text-foreground">${houseMinTotal.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-muted-foreground">Add-Ons</span>
          <span className="font-medium text-primary">+${addOnsTotal.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <span className="text-lg font-semibold text-foreground">Total Estimated Cost</span>
          <span className="text-2xl font-bold text-foreground">${currentTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* Selected Items */}
      <div className="grid gap-4 sm:grid-cols-2">
        {selectedProductionItems.length > 0 && (
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Production
            </h4>
            <ul className="space-y-2">
              {selectedProductionItems.map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="text-foreground">${(item.basePrice + (item.mandatoryLabor?.cost || 0)).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedStaffingItems.length > 0 && (
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Staffing
            </h4>
            <ul className="space-y-2">
              {selectedStaffingItems.map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="text-foreground">${item.basePrice.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {greenRoomItems.length > 0 && (
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Coffee className="w-4 h-4" />
              Green Room
            </h4>
            <ul className="space-y-2">
              {greenRoomItems.map((item) => {
                const qty = getGreenRoomQuantity(item.id)
                return (
                  <li key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name} x{qty}</span>
                    <span className="text-foreground">${(item.basePrice * qty).toLocaleString()}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {currentEvent?.specialRequests && (
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Special Requests
            </h4>
            <p className="text-sm text-muted-foreground">{currentEvent.specialRequests}</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-warning">Ready to Submit</p>
            <p className="text-sm text-warning/80">
              Clicking "Finalize Selection" will submit your show build for venue approval. You can request changes after submission.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
