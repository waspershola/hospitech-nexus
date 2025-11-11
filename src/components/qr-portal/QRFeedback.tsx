import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQRToken } from '@/hooks/useQRToken';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Star, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type FeedbackCategory = 'service' | 'cleanliness' | 'food' | 'overall' | 'staff';

export function QRFeedback() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { qrData } = useQRToken();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState<FeedbackCategory>('overall');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = useMutation({
    mutationFn: async () => {
      if (!token || rating === 0 || !qrData?.tenant_id) {
        toast.error('Session not ready. Please wait and try again.');
        return;
      }

      const { error } = await supabase
        .from('guest_feedback')
        .insert({
          tenant_id: qrData?.tenant_id,
          qr_token: token,
          rating,
          category,
          comment,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast.success('Thank you for your feedback!');
    },
    onError: () => {
      toast.error('Failed to submit feedback');
    },
  });

  if (!qrData || !qrData.tenant_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading your session...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-green-50/30 dark:to-green-950/10 flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-12 pb-8">
            <div className="mb-6 flex justify-center">
              <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-6">
              Your feedback helps us improve our service and provide you with a better experience.
            </p>
            <Button
              onClick={() => navigate(`/qr/${token}`)}
              className="w-full"
            >
              Return to Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/qr/${token}`)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Share Your Feedback</h1>
            <p className="text-muted-foreground mt-1">Help us serve you better</p>
          </div>
        </div>

        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Rate Your Experience</CardTitle>
            <CardDescription>
              Your honest feedback is invaluable to us
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Star Rating */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Overall Rating</Label>
              <div className="flex justify-center gap-2 py-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-all duration-200 hover:scale-125 focus:outline-none focus:ring-2 focus:ring-accent rounded-full p-1"
                  >
                    <Star
                      className={`h-12 w-12 transition-all duration-200 ${
                        star <= (hoverRating || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300 dark:text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {rating === 1 && "We're sorry to hear that"}
                  {rating === 2 && "We can do better"}
                  {rating === 3 && "Thank you for your feedback"}
                  {rating === 4 && "Great! We're glad you enjoyed"}
                  {rating === 5 && "Excellent! Thank you!"}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as FeedbackCategory)}>
                <SelectTrigger id="category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall Experience</SelectItem>
                  <SelectItem value="service">Service Quality</SelectItem>
                  <SelectItem value="cleanliness">Cleanliness</SelectItem>
                  <SelectItem value="food">Food & Beverage</SelectItem>
                  <SelectItem value="staff">Staff Interaction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label htmlFor="comment">Additional Comments (Optional)</Label>
              <Textarea
                id="comment"
                placeholder="Tell us more about your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <Button
              onClick={() => submitFeedback.mutate()}
              disabled={rating === 0 || submitFeedback.isPending}
              className="w-full"
              size="lg"
            >
              {submitFeedback.isPending ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-dashed border-2">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Your feedback is anonymous and will be used solely to improve our services.
              Thank you for taking the time to share your thoughts with us.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}