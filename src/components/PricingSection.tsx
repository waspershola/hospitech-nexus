import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Starter",
    price: "₦15,000",
    period: "/month",
    rooms: "Up to 20 rooms",
    features: [
      "Front Desk PWA",
      "QR Guest Portal",
      "Basic Reports",
      "Email Support",
      "Local Payments",
    ],
    cta: "Start 14-Day Trial",
    popular: false,
  },
  {
    name: "Professional",
    price: "₦35,000",
    period: "/month",
    rooms: "Up to 50 rooms",
    features: [
      "Everything in Starter",
      "Multi-Property",
      "Power & Fuel Tracking",
      "Advanced Analytics",
      "Priority Support",
      "Custom Branding",
    ],
    cta: "Start 14-Day Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "pricing",
    rooms: "Unlimited rooms",
    features: [
      "Everything in Professional",
      "Dedicated Account Manager",
      "Custom Integrations",
      "SLA Guarantee",
      "Training & Onboarding",
      "White Label Options",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start with a 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`bg-card rounded-3xl p-8 ${
                plan.popular 
                  ? "ring-2 ring-primary shadow-luxury" 
                  : "border border-border"
              } hover:shadow-hover transition-all relative`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-display font-bold text-foreground mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-4xl font-display font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.rooms}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full ${
                  plan.popular
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                    : "bg-accent hover:bg-accent/90 text-accent-foreground"
                }`}
                size="lg"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
