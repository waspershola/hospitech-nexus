import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useRoomCategories } from '@/hooks/useRoomCategories';
import { CategoryForm } from '@/modules/categories/CategoryForm';

export default function RoomCategories() {
  const { categories, isLoading, deleteCategory } = useRoomCategories();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Room Categories</h1>
          <p className="text-muted-foreground mt-1">
            Manage room types, rates, and amenities
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No categories yet</p>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Category
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card key={category.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.short_code}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingCategory(category);
                      setIsFormOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this category?')) {
                        deleteCategory(category.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {category.description || 'No description'}
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Rate:</span>
                  <span className="font-medium">₦{category.base_rate}/night</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Occupancy:</span>
                  <span className="font-medium">{category.max_occupancy} guests</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CategoryForm
        open={isFormOpen}
        category={editingCategory}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCategory(null);
        }}
      />
    </div>
  );
}
