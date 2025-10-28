import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FontSelectorProps {
  headingFont: string;
  bodyFont: string;
  onHeadingChange: (font: string) => void;
  onBodyChange: (font: string) => void;
}

const FONT_PAIRS = [
  { id: 'playfair-inter', heading: 'Playfair Display', body: 'Inter', label: 'Playfair + Inter (Elegant)' },
  { id: 'cormorant-lato', heading: 'Cormorant Garamond', body: 'Lato', label: 'Cormorant + Lato (Classic)' },
  { id: 'libre-nunito', heading: 'Libre Baskerville', body: 'Nunito', label: 'Libre + Nunito (Modern)' },
  { id: 'crimson-work', heading: 'Crimson Text', body: 'Work Sans', label: 'Crimson + Work Sans (Professional)' },
];

const HEADING_FONTS = [
  'Playfair Display',
  'Cormorant Garamond',
  'Libre Baskerville',
  'Crimson Text',
  'Merriweather',
  'Lora'
];

const BODY_FONTS = [
  'Inter',
  'Lato',
  'Nunito',
  'Work Sans',
  'Open Sans',
  'Roboto'
];

export function FontSelector({ headingFont, bodyFont, onHeadingChange, onBodyChange }: FontSelectorProps) {
  const currentPairId = FONT_PAIRS.find(
    pair => pair.heading === headingFont && pair.body === bodyFont
  )?.id;

  const handlePairSelect = (pairId: string) => {
    const pair = FONT_PAIRS.find(p => p.id === pairId);
    if (pair) {
      onHeadingChange(pair.heading);
      onBodyChange(pair.body);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Font Pair Presets</Label>
        <Select value={currentPairId || ''} onValueChange={handlePairSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a font combination" />
          </SelectTrigger>
          <SelectContent>
            {FONT_PAIRS.map(pair => (
              <SelectItem key={pair.id} value={pair.id}>
                <span style={{ fontFamily: `"${pair.heading}", serif` }}>
                  {pair.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Heading Font</Label>
          <Select value={headingFont} onValueChange={onHeadingChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HEADING_FONTS.map(font => (
                <SelectItem key={font} value={font}>
                  <span style={{ fontFamily: `"${font}", serif` }}>{font}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Body Font</Label>
          <Select value={bodyFont} onValueChange={onBodyChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BODY_FONTS.map(font => (
                <SelectItem key={font} value={font}>
                  <span style={{ fontFamily: `"${font}", sans-serif` }}>{font}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
