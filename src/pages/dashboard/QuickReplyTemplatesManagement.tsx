import { useState } from 'react';
import { useQuickReplyTemplates } from '@/hooks/useQuickReplyTemplates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, Save, X, Zap } from 'lucide-react';
import { toast } from 'sonner';

const SERVICE_CATEGORIES = [
  { value: 'room_service', label: 'Room Service' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'concierge', label: 'Concierge' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'spa', label: 'Spa' },
  { value: 'digital_menu', label: 'Digital Menu' },
];

export default function QuickReplyTemplatesManagement() {
  const [selectedCategory, setSelectedCategory] = useState<string>('room_service');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ text: '', displayOrder: 0 });

  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, isCreating, isUpdating, isDeleting } = useQuickReplyTemplates(selectedCategory);

  const handleEdit = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const handleSave = (id: string, displayOrder: number) => {
    updateTemplate({
      id,
      template_text: editText,
      display_order: displayOrder,
    });
    setEditingId(null);
    setEditText('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(id);
    }
  };

  const handleAdd = () => {
    if (!newTemplate.text.trim()) {
      toast.error('Template text cannot be empty');
      return;
    }

    createTemplate({
      service_category: selectedCategory,
      template_text: newTemplate.text.trim(),
      display_order: templates.length,
      is_active: true,
    });

    setNewTemplate({ text: '', displayOrder: 0 });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Quick Reply Templates
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage pre-defined quick reply templates for different service categories
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Category</CardTitle>
          <CardDescription>
            Select a service category to view and manage its quick reply templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="category" className="min-w-[100px]">Category:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger id="category" className="w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Templates</CardTitle>
            <CardDescription>
              Quick reply templates for {SERVICE_CATEGORIES.find(c => c.value === selectedCategory)?.label}
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddForm && (
            <Card className="border-primary">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-template">Template Text</Label>
                  <Textarea
                    id="new-template"
                    placeholder="Enter quick reply message..."
                    value={newTemplate.text}
                    onChange={(e) => setNewTemplate({ ...newTemplate, text: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAdd} disabled={isCreating}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowAddForm(false);
                    setNewTemplate({ text: '', displayOrder: 0 });
                  }}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates found for this category. Add your first template above.
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template, index) => (
                <Card key={template.id} className="hover:bg-accent/50 transition-colors">
                  <CardContent className="pt-6">
                    {editingId === template.id ? (
                      <div className="space-y-4">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSave(template.id, template.display_order)}>
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">#{index + 1}</Badge>
                            <Zap className="h-3 w-3 text-primary" />
                          </div>
                          <p className="text-sm">{template.template_text}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(template.id, template.template_text)}
                            disabled={isUpdating}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(template.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">💡 How Quick Replies Work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • Quick reply templates appear as clickable buttons in the QR Request Drawer
          </p>
          <p>
            • Staff can send a template with one click instead of typing manually
          </p>
          <p>
            • Templates are category-specific (e.g., Room Service templates only appear for room service requests)
          </p>
          <p>
            • The order shown here is the order they'll appear in the drawer
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
