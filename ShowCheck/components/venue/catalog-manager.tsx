"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useEvent, type MenuItem, type CostBreakdown } from "@/components/event-context"
import {
  Plus,
  Trash2,
  Edit2,
  Package,
  Volume2,
  Lightbulb,
  Guitar,
  Shield,
  Wine,
  X,
  ChevronDown,
} from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"

const categoryIcons: Record<string, React.ReactNode> = {
  Sound: <Volume2 className="w-4 h-4" />,
  Lights: <Lightbulb className="w-4 h-4" />,
  Backline: <Guitar className="w-4 h-4" />,
  Security: <Shield className="w-4 h-4" />,
  Bar: <Wine className="w-4 h-4" />,
}

const subcategories = ["Sound", "Lights", "Backline", "Security", "Bar"]
const costCategories = ["Equipment", "Labor", "Venue", "Admin", "Maintenance", "Supplies", "Food"]

export function CatalogManager() {
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem } = useEvent()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    basePrice: 0,
    category: "production" as "production" | "staffing" | "hospitality",
    subcategory: "Sound",
    costBreakdown: [] as CostBreakdown[],
    mandatoryLabor: null as { name: string; cost: number } | null,
  })

  const nonHouseItems = menuItems.filter(
    (item) => !item.isHouseMinimum && item.subcategory !== "Green Room"
  )

  const groupedItems = nonHouseItems.reduce(
    (acc, item) => {
      if (!acc[item.subcategory]) {
        acc[item.subcategory] = []
      }
      acc[item.subcategory].push(item)
      return acc
    },
    {} as Record<string, MenuItem[]>
  )

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      basePrice: 0,
      category: "production",
      subcategory: "Sound",
      costBreakdown: [],
      mandatoryLabor: null,
    })
    setEditingItem(null)
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description,
      basePrice: item.basePrice,
      category: item.category,
      subcategory: item.subcategory,
      costBreakdown: [...item.costBreakdown],
      mandatoryLabor: item.mandatoryLabor || null,
    })
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (editingItem) {
      updateMenuItem(editingItem.id, formData)
    } else {
      addMenuItem({
        id: `item-${Date.now()}`,
        ...formData,
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
        { id: `cost-${Date.now()}`, name: "", amount: 0, category: "Equipment" },
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
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
              <Package className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <CardTitle>Catalog Manager</CardTitle>
              <CardDescription>Create and manage menu items with nested cost breakdowns</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                      {categoryIcons[subcategory] || <Package className="w-4 h-4" />}
                    </div>
                    <span className="font-medium text-foreground">{subcategory}</span>
                    <Badge variant="secondary">{items.length} items</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-2 pl-11">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{item.name}</span>
                            {item.mandatoryLabor && (
                              <Badge variant="outline" className="text-xs text-warning border-warning/30">
                                +Labor Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-foreground">
                            ${item.basePrice.toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMenuItem(item.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {Object.keys(groupedItems).length === 0 && (
            <div className="text-center py-12 bg-secondary/20 rounded-lg">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No catalog items yet</p>
              <p className="text-sm text-muted-foreground">Add your first item to get started</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-border">
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
                  <DialogDescription>
                    Configure the item details and cost breakdown
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
                        placeholder="e.g., Premium Sound Package"
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
                      placeholder="Brief description of the item..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value: "production" | "staffing" | "hospitality") =>
                          setFormData((prev) => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="production">Production</SelectItem>
                          <SelectItem value="staffing">Staffing</SelectItem>
                          <SelectItem value="hospitality">Hospitality</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Subcategory</Label>
                      <Select
                        value={formData.subcategory}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, subcategory: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategories.map((sub) => (
                            <SelectItem key={sub} value={sub}>
                              {sub}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Mandatory Labor (Optional)</Label>
                      {formData.mandatoryLabor ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData((prev) => ({ ...prev, mandatoryLabor: null }))}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              mandatoryLabor: { name: "", cost: 0 },
                            }))
                          }
                        >
                          Add Labor
                        </Button>
                      )}
                    </div>
                    {formData.mandatoryLabor && (
                      <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                        <Input
                          value={formData.mandatoryLabor.name}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              mandatoryLabor: { ...prev.mandatoryLabor!, name: e.target.value },
                            }))
                          }
                          placeholder="e.g., FOH Engineer"
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={formData.mandatoryLabor.cost}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              mandatoryLabor: {
                                ...prev.mandatoryLabor!,
                                cost: Number(e.target.value),
                              },
                            }))
                          }
                          placeholder="Cost"
                          className="w-24"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!formData.name || formData.basePrice <= 0}>
                    {editingItem ? "Update" : "Create"} Item
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
