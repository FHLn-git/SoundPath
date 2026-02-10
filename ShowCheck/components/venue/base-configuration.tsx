"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEvent, type MenuItem, type CostBreakdown } from "@/components/event-context"
import { Lock, DollarSign, Info, Plus, X, ChevronDown, Edit2 } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"

const costCategories = ["Equipment", "Labor", "Venue", "Admin", "Maintenance", "Supplies", "Food", "Insurance"]

export function BaseConfiguration() {
  const { houseMinimums, getHouseMinimumTotal, addMenuItem, updateMenuItem } = useEvent()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    basePrice: 0,
    costBreakdown: [] as CostBreakdown[],
  })

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      basePrice: 0,
      costBreakdown: [],
    })
    setEditingItem(null)
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description,
      basePrice: item.basePrice,
      costBreakdown: [...item.costBreakdown],
    })
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (editingItem) {
      updateMenuItem(editingItem.id, {
        ...formData,
        isHouseMinimum: true,
        category: "production",
        subcategory: "House Minimums",
      })
    } else {
      addMenuItem({
        id: `house-min-${Date.now()}`,
        ...formData,
        isHouseMinimum: true,
        category: "production",
        subcategory: "House Minimums",
      })
    }
    setIsDialogOpen(false)
    resetForm()
  }

  const addCostBreakdown = () => {
    setFormData((prev) => ({
      ...prev,
      costBreakdown: [
        ...prev.costBreakdown,
        { id: `cost-${Date.now()}`, name: "", amount: 0, category: "Admin" },
      ],
    }))
  }

  const updateCostBreakdown = (index: number, updates: Partial<CostBreakdown>) => {
    setFormData((prev) => ({
      ...prev,
      costBreakdown: prev.costBreakdown.map((cost, i) =>
        i === index ? { ...cost, ...updates } : cost
      ),
    }))
  }

  const removeCostBreakdown = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      costBreakdown: prev.costBreakdown.filter((_, i) => i !== index),
    }))
  }

  const calculateBreakdownTotal = () => {
    return formData.costBreakdown.reduce((sum, cost) => sum + cost.amount, 0)
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>House Minimums</CardTitle>
                <CardDescription>Non-negotiable base costs for every event</CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-1">
              <DollarSign className="w-4 h-4 mr-1" />
              {getHouseMinimumTotal().toLocaleString()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-3">
            {houseMinimums.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="border border-border rounded-lg px-4 bg-secondary/30"
              >
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 flex-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Checkbox
                              checked
                              disabled
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Required for all events</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="text-sm text-muted-foreground">{item.description}</span>
                    </div>
                    <Badge variant="outline" className="ml-auto mr-4">
                      ${item.basePrice.toLocaleString()}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(item)
                      }}
                      className="shrink-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="pl-10 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Info className="w-3 h-3" />
                      <span>Cost Breakdown</span>
                    </div>
                    {item.costBreakdown.map((cost) => (
                      <div
                        key={cost.id}
                        className="flex items-center justify-between py-2 px-3 bg-background/50 rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-xs">
                            {cost.category}
                          </Badge>
                          <span className="text-sm text-foreground">{cost.name}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          ${cost.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              House minimums are automatically applied to every event and cannot be removed.
              These cover essential operational costs including insurance, administrative fees, and basic staffing.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Add House Minimum
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Edit House Minimum" : "Add New House Minimum"}</DialogTitle>
                  <DialogDescription>
                    Configure the house minimum details and cost breakdown
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Item Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Venue Insurance"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="basePrice">Base Price</Label>
                      <Input
                        id="basePrice"
                        type="number"
                        value={formData.basePrice}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, basePrice: Number(e.target.value) }))
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Brief description of the house minimum..."
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Cost Breakdown</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addCostBreakdown}>
                        <Plus className="w-3 h-3 mr-1" />
                        Add Line
                      </Button>
                    </div>

                    {formData.costBreakdown.length > 0 ? (
                      <div className="space-y-2">
                        {formData.costBreakdown.map((cost, index) => (
                          <div
                            key={cost.id}
                            className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg"
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="w-28 justify-between bg-transparent">
                                  {cost.category}
                                  <ChevronDown className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {costCategories.map((cat) => (
                                  <DropdownMenuItem
                                    key={cat}
                                    onClick={() => updateCostBreakdown(index, { category: cat })}
                                  >
                                    {cat}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Input
                              value={cost.name}
                              onChange={(e) =>
                                updateCostBreakdown(index, { name: e.target.value })
                              }
                              placeholder="Cost name"
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              value={cost.amount}
                              onChange={(e) =>
                                updateCostBreakdown(index, { amount: Number(e.target.value) })
                              }
                              className="w-24"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCostBreakdown(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex justify-end pt-2 border-t border-border">
                          <span className="text-sm text-muted-foreground">
                            Breakdown Total:{" "}
                            <span className="font-medium text-foreground">
                              ${calculateBreakdownTotal().toLocaleString()}
                            </span>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4 bg-secondary/20 rounded-lg">
                        No cost breakdown items. Click &quot;Add Line&quot; to add.
                      </p>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!formData.name || formData.basePrice <= 0}>
                    {editingItem ? "Update" : "Create"} House Minimum
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
