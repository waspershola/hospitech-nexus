import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface InitialCreditInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function InitialCreditInput({
  value,
  onChange,
  disabled,
}: InitialCreditInputProps) {
  const numericValue = parseInt(value) || 0;
  const totalCredits = 100 + numericValue; // 100 trial credits + additional

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="initial_credits">Additional SMS Credits (optional)</Label>
          <Badge variant="secondary" className="text-xs">
            {totalCredits} total credits
          </Badge>
        </div>
        <Input
          id="initial_credits"
          type="number"
          min="0"
          step="100"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., 500"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          All new tenants receive 100 free trial credits. Add more if needed.
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Trial credits:</span>
          <span className="font-medium">100</span>
        </div>
        {numericValue > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Additional credits:</span>
            <span className="font-medium">+{numericValue}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border">
          <span>Total starting balance:</span>
          <span>{totalCredits}</span>
        </div>
      </div>
    </div>
  );
}
