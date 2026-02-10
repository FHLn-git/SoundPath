"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useEvent, type MenuItem } from "@/components/event-context"
import {
  Volume2,
  Lightbulb,
  Guitar,
  Shield,
  Wine,
  Coffee,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  Plus,
  Minus,
} from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const categoryIcons: Record<string, React.ReactNode> = {
  Sound: <Volume2 className="w-4 h-4" />,
  Lights: <Lightbulb className="w-4 h-4" />,
  Backline: <Guitar className="w-4 h-4" />,
  Security: <Shield className="w-4 h-4" />,
  Bar: <Wine className="w-4 h-4" />,
  "Green Room": <Coffee className="w-4 h-4" />,
}

export function ShowBuilder() {
  const { menuItems, currentEvent, toggleEventItem, updateGreenRoomItem } = useEvent()

  const productionItems = menuItems.filter(
    (item) => item.category === "production" && !item.isHouseMinimum
  )
  const staffingItems = menuItems.filter(
    (item) => item.category === "staffing" && !item.isHouseMinimum
  )
  const hospitalityItems = menuItems.filter(
    (item) => item.category === "hospitality" && !item.isHouseMinimum
  )

  const groupBySubcategory = (items: MenuItem[]) => {
    return items.reduce(
      (acc, item) => {
        if (!acc[item.subcategory]) {
          acc[item.subcategory] = []
        }
        acc[item.subcategory].push(item)
        return acc
      },
      {} as Record<string, MenuItem[]>
    )
  }

  const isItemSelected = (itemId: string) => {
    return currentEvent?.selectedItems.includes(itemId) || false
  }

  const getGreenRoomQuantity = (itemId: string) => {
    return currentEvent?.greenRoomItems.find((g) => g.id === itemId)?.quantity || 0
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Show Builder</CardTitle>
        <CardDescription>Select your production needs and add-ons</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="production" className="space-y-4">
          <TabsList className="w-full justify-start bg-secondary/50 p-1">
            <TabsTrigger value="production" className="gap-2 data-[state=active]:bg-card">
              <Volume2 className="w-4 h-4" />
              Production
            </TabsTrigger>
            <TabsTrigger value="staffing" className="gap-2 data-[state=active]:bg-card">
              <Shield className="w-4 h-4" />
              Staffing
            </TabsTrigger>
            <TabsTrigger value="hospitality" className="gap-2 data-[state=active]:bg-card">
              <Coffee className="w-4 h-4" />
              Green Room
            </TabsTrigger>
          </TabsList>

          <TabsContent value="production" className="space-y-4">
            <MenuSection
              groupedItems={groupBySubcategory(productionItems)}
              isItemSelected={isItemSelected}
              onToggle={toggleEventItem}
            />
          </TabsContent>

          <TabsContent value="staffing" className="space-y-4">
            <MenuSection
              groupedItems={groupBySubcategory(staffingItems)}
              isItemSelected={isItemSelected}
              onToggle={toggleEventItem}
            />
          </TabsContent>

          <TabsContent value="hospitality" className="space-y-4">
            <GreenRoomBuilder
              items={hospitalityItems}
              getQuantity={getGreenRoomQuantity}
              onUpdateQuantity={updateGreenRoomItem}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

interface MenuSectionProps {
  groupedItems: Record<string, MenuItem[]>
  isItemSelected: (id: string) => boolean
  onToggle: (id: string) => void
}

function MenuSection({ groupedItems, isItemSelected, onToggle }: MenuSectionProps) {
  return (
    <Accordion type="multiple" className="space-y-3">
      {Object.entries(groupedItems).map(([subcategory, items]) => (
        <AccordionItem
          key={subcategory}
          value={subcategory}
          className="border border-border rounded-lg px-4 bg-secondary/20"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-secondary">
                {categoryIcons[subcategory] || <Volume2 className="w-4 h-4" />}
              </div>
              <span className="font-medium text-foreground">{subcategory}</span>
              <Badge variant="secondary">{items.length} options</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3">
              {items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  isSelected={isItemSelected(item.id)}
                  onToggle={() => onToggle(item.id)}
                />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

interface MenuItemCardProps {
  item: MenuItem
  isSelected: boolean
  onToggle: () => void
}

function MenuItemCard({ item, isSelected, onToggle }: MenuItemCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const totalCost = item.basePrice + (item.mandatoryLabor?.cost || 0)

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        isSelected
          ? "bg-primary/10 border-primary/30"
          : "bg-background/50 border-border/50 hover:border-border"
      }`}
    >
      <div className="flex items-start gap-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-foreground">{item.name}</h4>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold text-foreground">${totalCost.toLocaleString()}</p>
              {item.mandatoryLabor && (
                <p className="text-xs text-muted-foreground">
                  incl. ${item.mandatoryLabor.cost} labor
                </p>
              )}
            </div>
          </div>

          {item.mandatoryLabor && isSelected && (
            <div className="mt-3 p-2 bg-warning/10 border border-warning/20 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning shrink-0" />
              <p className="text-sm text-warning">
                Includes mandatory {item.mandatoryLabor.name} (${item.mandatoryLabor.cost})
              </p>
            </div>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-2 gap-1 text-muted-foreground">
                <Info className="w-3 h-3" />
                View Cost Breakdown
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{item.name}</DialogTitle>
                <DialogDescription>{item.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Info className="w-4 h-4" />
                  <span>Nested Cost Breakdown</span>
                </div>
                {item.costBreakdown.map((cost) => (
                  <div
                    key={cost.id}
                    className="flex items-center justify-between py-2 px-3 bg-secondary/30 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        {cost.category}
                      </Badge>
                      <span className="text-sm text-foreground">{cost.name}</span>
                    </div>
                    <span className="font-medium text-foreground">
                      ${cost.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
                {item.mandatoryLabor && (
                  <div className="flex items-center justify-between py-2 px-3 bg-warning/10 border border-warning/20 rounded-md">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs text-warning border-warning/30">
                        Required
                      </Badge>
                      <span className="text-sm text-foreground">{item.mandatoryLabor.name}</span>
                    </div>
                    <span className="font-medium text-warning">
                      ${item.mandatoryLabor.cost.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="text-lg font-bold text-foreground">
                    ${totalCost.toLocaleString()}
                  </span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}

interface GreenRoomBuilderProps {
  items: MenuItem[]
  getQuantity: (id: string) => number
  onUpdateQuantity: (id: string, quantity: number) => void
}

function GreenRoomBuilder({ items, getQuantity, onUpdateQuantity }: GreenRoomBuilderProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-secondary/30 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Coffee className="w-4 h-4 text-primary" />
          <h4 className="font-medium text-foreground">Green Room Shopping List</h4>
        </div>
        <p className="text-sm text-muted-foreground">
          Build your hospitality package by selecting quantities for each item
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const quantity = getQuantity(item.id)
          const itemTotal = item.basePrice * quantity

          return (
            <div
              key={item.id}
              className={`p-4 rounded-lg border transition-all ${
                quantity > 0
                  ? "bg-primary/10 border-primary/30"
                  : "bg-background/50 border-border/50"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-foreground">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Badge variant="outline">${item.basePrice}/ea</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => onUpdateQuantity(item.id, Math.max(0, quantity - 1))}
                    disabled={quantity === 0}
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
                {quantity > 0 && (
                  <span className="font-medium text-primary">${itemTotal.toLocaleString()}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
