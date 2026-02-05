"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useEvent } from "@/components/event-context"
import {
  Calculator,
  Lock,
  Plus,
  Minus,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const BUDGET_THRESHOLD = 5000 // Example threshold for "over budget" state

export function SettlementSidebar() {
  const { menuItems, currentEvent, houseMinimums, getTotalBudget, getHouseMinimumTotal } = useEvent()
  const [isExpanded, setIsExpanded] = useState(true)
  const [showHouseDetails, setShowHouseDetails] = useState(false)
  const [showAddOnsDetails, setShowAddOnsDetails] = useState(true)
  const [showGreenRoomDetails, setShowGreenRoomDetails] = useState(true)

  const totalBudget = getTotalBudget()
  const houseMinimumTotal = getHouseMinimumTotal()
  const isOverBudget = totalBudget > BUDGET_THRESHOLD

  // Calculate add-ons total
  const selectedAddOns = currentEvent?.selectedItems
    .map((id) => menuItems.find((m) => m.id === id && !m.isHouseMinimum))
    .filter(Boolean) || []
  
  const addOnsTotal = selectedAddOns.reduce((sum, item) => {
    if (!item) return sum
    return sum + item.basePrice + (item.mandatoryLabor?.cost || 0)
  }, 0)

  // Calculate green room total
  const greenRoomItems = currentEvent?.greenRoomItems
    .map((g) => {
      const item = menuItems.find((m) => m.id === g.id)
      return item ? { ...item, quantity: g.quantity } : null
    })
    .filter(Boolean) || []

  const greenRoomTotal = greenRoomItems.reduce((sum, item) => {
    if (!item) return sum
    return sum + item.basePrice * (item as any).quantity
  }, 0)

  return (
    <div className="lg:w-80 lg:sticky lg:top-24 lg:self-start">
      <Card
        className={`border-2 transition-colors ${
          isOverBudget ? "border-warning/50 bg-warning/5" : "border-primary/30 bg-card"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                  isOverBudget ? "bg-warning/20" : "bg-primary/20"
                }`}
              >
                <Calculator className={`w-5 h-5 ${isOverBudget ? "text-warning" : "text-primary"}`} />
              </div>
              <CardTitle className="text-lg">Settlement</CardTitle>
            </div>
            <Badge
              variant={isOverBudget ? "destructive" : "default"}
              className={isOverBudget ? "bg-warning text-warning-foreground" : "bg-primary text-primary-foreground"}
            >
              {isOverBudget ? "Over Budget" : "In Budget"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Display */}
          <div
            className={`p-4 rounded-lg text-center ${
              isOverBudget ? "bg-warning/10 border border-warning/20" : "bg-primary/10 border border-primary/20"
            }`}
          >
            <p className="text-sm text-muted-foreground mb-1">Estimated Total</p>
            <p className={`text-4xl font-bold ${isOverBudget ? "text-warning" : "text-primary"}`}>
              ${totalBudget.toLocaleString()}
            </p>
            {isOverBudget && (
              <p className="text-xs text-warning mt-2 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                ${(totalBudget - BUDGET_THRESHOLD).toLocaleString()} over threshold
              </p>
            )}
          </div>

          <Separator />

          {/* House Minimums Section */}
          <Collapsible open={showHouseDetails} onOpenChange={setShowHouseDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">House Minimums</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    ${houseMinimumTotal.toLocaleString()}
                  </span>
                  {showHouseDetails ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-1 pl-6">
                {houseMinimums.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ${item.basePrice.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Add-ons Section */}
          {selectedAddOns.length > 0 && (
            <>
              <Separator />
              <Collapsible open={showAddOnsDetails} onOpenChange={setShowAddOnsDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Add-ons</span>
                      <Badge variant="secondary" className="text-xs">
                        {selectedAddOns.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        ${addOnsTotal.toLocaleString()}
                      </span>
                      {showAddOnsDetails ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-1 pl-6">
                    {selectedAddOns.map((item) => {
                      if (!item) return null
                      const itemTotal = item.basePrice + (item.mandatoryLabor?.cost || 0)
                      return (
                        <div key={item.id} className="flex items-center justify-between py-1">
                          <div className="flex flex-col">
                            <span className="text-xs text-foreground">{item.name}</span>
                            {item.mandatoryLabor && (
                              <span className="text-xs text-warning">
                                + {item.mandatoryLabor.name}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-foreground">${itemTotal.toLocaleString()}</span>
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* Green Room Section */}
          {greenRoomItems.length > 0 && (
            <>
              <Separator />
              <Collapsible open={showGreenRoomDetails} onOpenChange={setShowGreenRoomDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">Green Room</span>
                      <Badge variant="secondary" className="text-xs">
                        {greenRoomItems.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        ${greenRoomTotal.toLocaleString()}
                      </span>
                      {showGreenRoomDetails ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-1 pl-6">
                    {greenRoomItems.map((item) => {
                      if (!item) return null
                      const itemWithQty = item as typeof item & { quantity: number }
                      return (
                        <div key={item.id} className="flex items-center justify-between py-1">
                          <span className="text-xs text-foreground">
                            {item.name} x{itemWithQty.quantity}
                          </span>
                          <span className="text-xs text-foreground">
                            ${(item.basePrice * itemWithQty.quantity).toLocaleString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          <Separator />

          {/* Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">${totalBudget.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Budget Threshold</span>
              <span className="text-foreground">${BUDGET_THRESHOLD.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-medium">
              <span className={isOverBudget ? "text-warning" : "text-primary"}>
                {isOverBudget ? "Over by" : "Remaining"}
              </span>
              <span className={isOverBudget ? "text-warning" : "text-primary"}>
                ${Math.abs(BUDGET_THRESHOLD - totalBudget).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button className="w-full gap-2" variant={isOverBudget ? "outline" : "default"}>
              <CheckCircle2 className="w-4 h-4" />
              Confirm Settlement
            </Button>
            <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
