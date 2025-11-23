import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQRToken } from '@/hooks/useQRToken';
import { useGuestInfo } from '@/hooks/useGuestInfo';
import { usePlatformFee } from '@/hooks/usePlatformFee';
import { calculateQRPlatformFee } from '@/lib/finance/platformFee';
import { useQRPayment } from '@/components/qr-portal/useQRPayment';
import { QRPaymentOptions } from '@/components/qr-portal/QRPaymentOptions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Minus, ShoppingCart, Loader2, Utensils } from 'lucide-react';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  image_url: string;
  is_available: boolean;
  preparation_time?: string;
  dietary_tags?: string[];
}

interface CartItem extends MenuItem {
  quantity: number;
}

export function QRRoomService() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { qrData } = useQRToken(token);
  const { guestInfo, saveGuestInfo } = useGuestInfo(token);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [guestName, setGuestName] = useState(guestInfo?.name || '');
  const [guestPhone, setGuestPhone] = useState(guestInfo?.phone || '');
  
  const { 
    paymentChoice, 
    setPaymentChoice,
    getPaymentMetadata 
  } = useQRPayment();

  const { data: platformFeeConfig } = usePlatformFee(qrData?.tenant_id);

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['room-service-items', qrData?.tenant_id],
    queryFn: async () => {
      if (!qrData?.tenant_id) return [];
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('tenant_id', qrData.tenant_id)
        .eq('is_available', true)
        .eq('status', 'approved')
        .eq('menu_type', 'room_service')
        .order('category', { ascending: true })
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: !!qrData?.tenant_id,
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!token || cart.length === 0 || !qrData?.tenant_id) {
        toast.error('Session not ready. Please wait and try again.');
        return;
      }

      const items = cart.map(item => ({
        item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const paymentMetadata = getPaymentMetadata();
      
      // Call edge function to create request with platform fee calculation
      const { data, error } = await supabase.functions.invoke('qr-request', {
        body: {
          action: 'create_request',
          type: 'room_service',
          qr_token: token,
          guest_name: guestName.trim() || 'Guest',
          guest_contact: guestPhone.trim(),
          service_category: 'room_service',
          note: `Room Service Order: ${cart.length} items - ${items.map(i => `${i.quantity}x ${i.name}`).join(', ')}`,
          priority: 'normal',
          guest_contact: guestPhone,
          payment_choice: paymentChoice,
          // PHASE-1B: Fix metadata structure
          metadata: {
            qr_token: token,
            room_number: (qrData as any)?.room?.number || 'N/A',
            guest_label: 'Guest',
            service_category: 'room_service',
            guest_order_items: items,
            special_instructions: specialInstructions,
            ...paymentMetadata,
            payment_info: {
              billable: true,
              subtotal: subtotal,
              currency: 'NGN',
              location: 'Restaurant POS',
              status: 'pending'
            }
          }
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to create order');

      return { order: data.order, request: data.request };
    },
    onSuccess: (data) => {
      toast.success('Room service order placed successfully!');
      
      // Show folio feedback if "Bill to Room" was selected
      if (paymentChoice === 'bill_to_room') {
        toast.info('Charged to your room folio', {
          description: 'This will appear on your final bill at checkout.'
        });
      }
      
      setCart([]);
      setSpecialInstructions('');
      setIsCartOpen(false);
      if (data?.order) {
        navigate(`/qr/${token}/order/${data.order.id}`);
      }
    },
    onError: () => {
      toast.error('Failed to place order');
    },
  });

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart`);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId) {
          const newQuantity = item.quantity + delta;
          return { ...item, quantity: Math.max(0, newQuantity) };
        }
        return item;
      }).filter(item => item.quantity > 0);
      return updated;
    });
  };

  const categories = ['all', ...new Set(menuItems.map(item => item.category))];
  const filteredItems = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate platform fee
  const platformFeeBreakdown = calculateQRPlatformFee(cartTotal, platformFeeConfig || null);
  const finalTotal = platformFeeBreakdown.totalAmount;

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
              <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                Room Service
              </h1>
              <p className="text-sm text-muted-foreground">{qrData?.tenant?.hotel_name}</p>
            </div>
          </div>

          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild>
              <Button size="lg" className="relative rounded-full shadow-lg hover:shadow-xl transition-all">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Cart
                {cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground">
                    {cartCount > 99 ? '99+' : cartCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">Your Order</SheetTitle>
              </SheetHeader>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-6 mt-6">
                  {cart.map(item => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b border-border">
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-accent font-semibold mt-1">
                          {item.currency} {item.price.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="h-8 w-8 p-0 rounded-full"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="h-8 w-8 p-0 rounded-full"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="space-y-3">
                    <Label htmlFor="instructions">Delivery Instructions</Label>
                    <Textarea
                      id="instructions"
                      placeholder="Room number, special requests, allergies..."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Guest Information */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="guest-name">Your Name</Label>
                        <Input
                          id="guest-name"
                          placeholder="Enter your name"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guest-phone-input">Phone Number</Label>
                        <Input
                          id="guest-phone-input"
                          type="tel"
                          placeholder="+234 xxx xxx xxxx"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Options */}
                  <QRPaymentOptions
                    guestPhone={guestPhone}
                    onPhoneChange={setGuestPhone}
                    paymentChoice={paymentChoice}
                    onPaymentChoiceChange={setPaymentChoice}
                  />

                  <div className="pt-4 border-t border-border space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{cart[0]?.currency || 'NGN'} {cartTotal.toFixed(2)}</span>
                    </div>
                    
                    {platformFeeBreakdown.platformFee > 0 && platformFeeConfig && platformFeeConfig.payer === 'guest' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Platform Fee {platformFeeConfig.fee_type === 'flat' ? '(Flat)' : `(${platformFeeConfig.qr_fee}%)`}
                        </span>
                        <span className="text-muted-foreground">
                          +{cart[0]?.currency || 'NGN'} {platformFeeBreakdown.platformFee.toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                      <span>Total:</span>
                      <span className="text-accent">
                        {cart[0]?.currency || 'NGN'} {finalTotal.toFixed(2)}
                      </span>
                    </div>
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => createOrder.mutate()}
                      disabled={createOrder.isPending || !qrData?.tenant_id}
                    >
                      {createOrder.isPending ? 'Placing Order...' : 'Place Order'}
                    </Button>
                  </div>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Menu Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {menuItems.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Utensils className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Room service menu coming soon</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="space-y-6">
            <TabsList className="flex flex-wrap gap-2 bg-card p-2 rounded-xl shadow-md h-auto">
              {categories.map(category => (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  className="capitalize rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {category.replace('_', ' ')}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeCategory} className="mt-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map(item => (
                  <Card 
                    key={item.id}
                    className="group overflow-hidden hover:shadow-2xl hover:shadow-accent/20 transition-all duration-500 hover:scale-[1.02] border-2 border-transparent hover:border-accent/30"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      {item.dietary_tags && item.dietary_tags.length > 0 && (
                        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                          {item.dietary_tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <CardHeader className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="font-display text-lg leading-tight">
                          {item.name}
                        </CardTitle>
                        <span className="text-xl font-bold text-accent whitespace-nowrap">
                          {item.currency} {item.price.toFixed(2)}
                        </span>
                      </div>
                      <CardDescription className="text-sm line-clamp-2">
                        {item.description}
                      </CardDescription>
                      {item.preparation_time && (
                        <p className="text-xs text-muted-foreground">
                          ⏱️ {item.preparation_time}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => addToCart(item)}
                        className="w-full rounded-full shadow-md hover:shadow-lg transition-all"
                        size="lg"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Order
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {filteredItems.length === 0 && menuItems.length > 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No items available in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
