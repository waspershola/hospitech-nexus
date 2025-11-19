import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, CreditCard, CheckCircle2, XCircle, FileText, Shield, Edit, Trash2 } from 'lucide-react';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { PaymentMethodDrawer } from './PaymentMethodDrawer';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export function PaymentMethodsTab() {
  const { paymentMethods, isLoading, deletePaymentMethod } = usePaymentMethods();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<string | null>(null);

  const handleAddMethod = () => {
    setSelectedMethod(null);
    setDrawerOpen(true);
  };

  const handleEditMethod = (id: string) => {
    setSelectedMethod(id);
    setDrawerOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setMethodToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (methodToDelete) {
      deletePaymentMethod(methodToDelete);
      setDeleteDialogOpen(false);
      setMethodToDelete(null);
    }
  };

  const getMethodTypeIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return '💵';
      case 'card':
        return '💳';
      case 'transfer':
        return '🏦';
      case 'mobile_money':
        return '📱';
      case 'cheque':
        return '📄';
      case 'pos':
        return '🖥️';
      case 'online':
        return '🌐';
      default:
        return '💰';
    }
  };

  const getMethodTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-semibold">Payment Methods</h2>
          <p className="text-muted-foreground">
            Configure payment methods displayed in booking and payment forms
          </p>
        </div>
        <Button onClick={handleAddMethod} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Method
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[180px] rounded-2xl" />
          <Skeleton className="h-[180px] rounded-2xl" />
          <Skeleton className="h-[180px] rounded-2xl" />
        </div>
      ) : paymentMethods.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payment methods configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first payment method to enable payment collection
            </p>
            <Button onClick={handleAddMethod}>
              <Plus className="w-4 h-4 mr-2" />
              Add Method
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paymentMethods.map((method) => (
            <Card
              key={method.id}
              className="rounded-2xl shadow-card hover:shadow-luxury transition-all"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{getMethodTypeIcon(method.method_type)}</div>
                    <div>
                      <CardTitle className="text-lg">{method.method_name}</CardTitle>
                      <CardDescription>{getMethodTypeLabel(method.method_type)}</CardDescription>
                    </div>
                  </div>
                  {method.active ? (
                    <Badge variant="default" className="bg-semantic-success">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="w-3 h-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {method.requires_reference && (
                    <Badge variant="outline" className="gap-1">
                      <FileText className="w-3 h-3" />
                      Requires Reference
                    </Badge>
                  )}
                  {method.requires_approval && (
                    <Badge variant="outline" className="gap-1">
                      <Shield className="w-3 h-3" />
                      Requires Approval
                    </Badge>
                  )}
                  {method.provider_id && (
                    <Badge variant="outline">Provider Linked</Badge>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => handleEditMethod(method.id)}
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteClick(method.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {drawerOpen && (
        <PaymentMethodDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          methodId={selectedMethod}
        />
      )}


      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment method? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
