"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useEvent, type MenuItem } from "@/components/event-context"
import { Coffee, Plus, Edit2, Trash2, UtensilsCrossed, Wine, Laptop, Sofa } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const categoryOptions = ["Drinks", "Food", "Tech", "Comfort"] as const
type CategoryType = typeof categoryOptions[number]

const categoryIcons: Record<CategoryType, React.ReactNode> = {
  Drinks: <Wine className="w-4 h-4" />,
  Food: <UtensilsCrossed className="w-4 h-4" />,
  Tech: <Laptop className="w-4 h-4" />,
  Comfort: <Sofa className="w-4 h-4" />,
}

interface GreenRoomItemFormData {
  name: string
  category: CategoryType
  venueCost: number
  promoterPrice: number
}

export function GreenRoomCatalog() {
  const { menuItems, addMenuItem, updateMenuItem, deleteMenuItem } = useEvent()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [formData, setFormData] = useState<GreenRoomItemFormData>({
    name: "",
    category: "Drinks",
    venueCost: 0,
    promoterPrice: 0,
  })

  // Filter for Green Room hospitality items with the new category subcategories
  const allGreenRoomItems = menuItems.filter(
    (item) =>
      item.category === "hospitality" &&
      !item.isHouseMinimum &&
      categoryOptions.includes(item.subcategory as CategoryType)
  )

  const resetForm = () => {
    setFormData({
      name: "",
      category: "Drinks",
      venueCost: 0,
      promoterPrice: 0,
    })
    setEditingItem(null)
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setIsFormOpen(true)
    // Extract venue cost from costBreakdown if it exists
    const venueCostEntry = item.costBreakdown.find((cost) => cost.category === "Venue")
    const venueCost = venueCostEntry?.amount || 0

    setFormData({
      name: item.name,
      category: (item.subcategory as CategoryType) || "Drinks",
      venueCost,
      promoterPrice: item.basePrice,
    })
  }

  const handleSave = () => {
    if (!formData.name || formData.promoterPrice <= 0) {
      return
    }

    const itemData: Partial<MenuItem> = {
      name: formData.name,
      description: `${formData.category} item for green room hospitality`,
      basePrice: formData.promoterPrice,
      category: "hospitality",
      subcategory: formData.category,
      costBreakdown: [
        {
          id: `venue-cost-${Date.now()}`,
          name: "Venue Cost",
          amount: formData.venueCost,
          category: "Venue",
        },
      ],
    }

    if (editingItem) {
      updateMenuItem(editingItem.id, itemData)
    } else {
      addMenuItem({
        id: `green-room-${Date.now()}`,
        ...itemData,
      } as MenuItem)
    }

    setIsFormOpen(false)
    resetForm()
    setEditingItem(null)
  }

  const handleDelete = (itemId: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteMenuItem(itemId)
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
            <Coffee className="w-5 h-5 text-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle>Green Room & Hospitality</CardTitle>
            <CardDescription>
              Manage your master catalog of green room items. These will be available to promoters in the wizard.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form Section */}
        <div className="border border-border rounded-lg p-4 bg-secondary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">
              {editingItem ? "Edit Item" : "Add New Item"}
            </h3>
          </div>

          {(isFormOpen || editingItem) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-name">Item Name</Label>
                <Input
                  id="item-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., 12pk Sparkling Water"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: CategoryType) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          {categoryIcons[cat]}
                          {cat}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue-cost">Venue Cost</Label>
                <Input
                  id="venue-cost"
                  type="number"
                  step="0.01"
                  value={formData.venueCost}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      venueCost: Number(e.target.value),
                    }))
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promoter-price">Promoter Price</Label>
                <Input
                  id="promoter-price"
                  type="number"
                  step="0.01"
                  value={formData.promoterPrice}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      promoterPrice: Number(e.target.value),
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            {(!isFormOpen && !editingItem) ? (
              <Button
                onClick={() => setIsFormOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsFormOpen(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!formData.name || formData.promoterPrice <= 0}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Save Item
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Items Table */}
        {allGreenRoomItems.length > 0 ? (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Venue Cost</TableHead>
                  <TableHead className="text-right">Promoter Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allGreenRoomItems.map((item) => {
                  const venueCostEntry = item.costBreakdown.find(
                    (cost) => cost.category === "Venue"
                  )
                  const venueCost = venueCostEntry?.amount || 0

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {categoryIcons[item.subcategory as CategoryType]}
                          {item.subcategory}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${venueCost.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${item.basePrice.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(item)}
                            className="h-8 w-8"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 bg-secondary/20 rounded-lg border border-border">
            <Coffee className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No green room items yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first item to get started
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
