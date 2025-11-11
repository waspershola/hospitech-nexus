import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQRToken } from '@/hooks/useQRToken';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Minus, ShoppingCart, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface LaundryItem {
  id: string;
  item_name: string;
  category: string;
  service_type: string;
  price: number;
  currency: string;
  turnaround_time: string;
  image_url?: string;
}

interface CartItem extends LaundryItem {
  quantity: number;
  selected_service_type: string;
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  wash_only: 'Wash Only',
  wash_iron: 'Wash & Iron',
  dry_clean: 'Dry Clean',
  iron_only: 'Iron Only',
};

export function QRLaundryService() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { qrData } = useQRToken();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: laundryItems = [], isLoading } = useQuery({
    queryKey: ['laundry-items', qrData?.tenant_id],
    queryFn: async () => {
      if (!qrData?.tenant_id) return [];
      const { data, error } = await supabase
        .from('laundry_items')
        .select('*')
        .eq('tenant_id', qrData.tenant_id)
        .eq('is_available', true)
        .eq('status', 'approved')
        .order('category', { ascending: true })
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as LaundryItem[];
    },
    enabled: !!qrData?.tenant_id,
  });

  const createLaundryRequest = useMutation({
    mutationFn: async () => {
      if (!token || cart.length === 0 || !qrData?.tenant_id) {
        toast.error('Session not ready. Please wait and try again.');
        return;
      }

      const items = cart.map(item => ({
        item_id: item.id,
        item_name: item.item_name,
        quantity: item.quantity,
        service_type: item.selected_service_type,
        price: item.price,
      }));

      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const { data: request, error } = await supabase
        .from('requests')
        .insert({
          tenant_id: qrData?.tenant_id,
          qr_token: token,
          type: 'laundry',
          service_category: 'laundry',
          assigned_department: 'laundry',
          note: `Laundry Service: ${cart.length} items - ${items.map(i => `${i.quantity}x ${i.item_name} (${SERVICE_TYPE_LABELS[i.service_type]})`).join(', ')}${specialInstructions ? ` | Instructions: ${specialInstructions}` : ''}`,
          priority: 'normal',
          guest_name: 'Guest',
          status: 'pending',
          metadata: { items, total, currency: cart[0]?.currency || 'NGN' },
        })
        .select()
        .single();

      if (error) throw error;
      return request;
    },
    onSuccess: (data) => {
      toast.success('Laundry request submitted successfully!');
      setCart([]);
      setSpecialInstructions('');
      if (data) {
        navigate(`/qr/${token}/chat/${data.id}`);
      }
    },
    onError: () => {
      toast.error('Failed to submit laundry request');
    },
  });

  const addToCart = (item: LaundryItem, serviceType: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.selected_service_type === serviceType);
      if (existing) {
        return prev.map(i => 
          i.id === item.id && i.selected_service_type === serviceType
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1, selected_service_type: serviceType }];
    });
    toast.success(`${item.item_name} (${SERVICE_TYPE_LABELS[serviceType]}) added to cart`);
  };

  const updateQuantity = (itemId: string, serviceType: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === itemId && item.selected_service_type === serviceType) {
          const newQuantity = item.quantity + delta;
          return { ...item, quantity: Math.max(0, newQuantity) };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const categories = ['all', ...new Set(laundryItems.map(item => item.category))];
  const filteredItems = activeCategory === 'all' 
    ? laundryItems 
    : laundryItems.filter(item => item.category === activeCategory);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (isLoading || !qrData || !qrData.tenant_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading your session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/qr/${token}`)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Laundry Service</h1>
              <p className="text-sm text-muted-foreground">{qrData?.tenant?.hotel_name}</p>
            </div>
          </div>

          <Button 
            size="lg" 
            className="relative rounded-full shadow-lg"
            onClick={() => cartCount > 0 && document.getElementById('cart-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Cart
            {cartCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                {cartCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex flex-wrap gap-2 bg-card p-2 rounded-xl shadow-md h-auto">
            {categories.map(category => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="capitalize rounded-lg"
              >
                {category.replace('_', ' ')}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map(item => (
                <LaundryItemCard
                  key={item.id}
                  item={item}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No items available in this category</p>
          </div>
        )}

        {/* Cart Section */}
        {cart.length > 0 && (
          <Card id="cart-section" className="shadow-xl border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Your Laundry Request</CardTitle>
              <CardDescription>Review your items and submit your request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {cart.map((item, idx) => (
                <div key={`${item.id}-${item.selected_service_type}-${idx}`} className="flex gap-4 pb-4 border-b border-border">
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.item_name}</h4>
                    <p className="text-sm text-muted-foreground">{SERVICE_TYPE_LABELS[item.selected_service_type]}</p>
                    <p className="text-sm text-accent font-semibold mt-1">
                      {item.currency} {item.price.toFixed(2)} each
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.selected_service_type, -1)}
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.selected_service_type, 1)}
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {item.turnaround_time && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {item.turnaround_time}
                    </div>
                  )}
                </div>
              ))}

              <div className="space-y-3">
                <Label htmlFor="instructions">Special Instructions (optional)</Label>
                <Textarea
                  id="instructions"
                  placeholder="Any special requests or stain information..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span className="text-accent">
                    {cart[0]?.currency || 'NGN'} {cartTotal.toFixed(2)}
                  </span>
                </div>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => createLaundryRequest.mutate()}
                  disabled={createLaundryRequest.isPending || !qrData?.tenant_id}
                >
                  {createLaundryRequest.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function LaundryItemCard({ 
  item, 
  onAddToCart 
}: { 
  item: LaundryItem; 
  onAddToCart: (item: LaundryItem, serviceType: string) => void;
}) {
  const [selectedServiceType, setSelectedServiceType] = useState(item.service_type);

  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-display text-lg">
            {item.item_name}
          </CardTitle>
          <Badge variant="secondary" className="capitalize">
            {item.category}
          </Badge>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`service-${item.id}`} className="text-sm">Service Type</Label>
          <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
            <SelectTrigger id={`service-${item.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wash_only">Wash Only</SelectItem>
              <SelectItem value="wash_iron">Wash & Iron</SelectItem>
              <SelectItem value="dry_clean">Dry Clean</SelectItem>
              <SelectItem value="iron_only">Iron Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-accent">
            {item.currency} {item.price.toFixed(2)}
          </span>
          {item.turnaround_time && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {item.turnaround_time}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => onAddToCart(item, selectedServiceType)}
          className="w-full rounded-full"
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}
