import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRoomCategories } from '@/hooks/useRoomCategories';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  short_code: z.string().min(2, 'Code must be at least 2 characters').max(10),
  description: z.string().optional(),
  base_rate: z.number().min(0, 'Rate must be positive'),
  max_occupancy: z.number().min(1, 'Must accommodate at least 1 guest'),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  open: boolean;
  category?: any;
  onClose: () => void;
}

export function CategoryForm({ open, category, onClose }: CategoryFormProps) {
  const { createCategory, updateCategory } = useRoomCategories();

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: category ? {
      name: category.name,
      short_code: category.short_code,
      description: category.description || '',
      base_rate: category.base_rate,
      max_occupancy: category.max_occupancy,
    } : {
      name: '',
      short_code: '',
      description: '',
      base_rate: 0,
      max_occupancy: 2,
    },
  });

  const onSubmit = (data: CategoryFormData) => {
    const formData = { ...data, amenities: [] };
    if (category) {
      updateCategory({ id: category.id, ...formData });
    } else {
      createCategory(formData);
    }
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'Add New Category'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Deluxe Suite"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="short_code">Short Code *</Label>
            <Input
              id="short_code"
              {...register('short_code')}
              placeholder="DLX"
            />
            {errors.short_code && (
              <p className="text-sm text-destructive">{errors.short_code.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Luxury room with premium amenities..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_rate">Base Rate (₦) *</Label>
              <Input
                id="base_rate"
                type="number"
                step="0.01"
                {...register('base_rate', { valueAsNumber: true })}
              />
              {errors.base_rate && (
                <p className="text-sm text-destructive">{errors.base_rate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_occupancy">Max Guests *</Label>
              <Input
                id="max_occupancy"
                type="number"
                {...register('max_occupancy', { valueAsNumber: true })}
              />
              {errors.max_occupancy && (
                <p className="text-sm text-destructive">{errors.max_occupancy.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                category ? 'Update' : 'Create'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
