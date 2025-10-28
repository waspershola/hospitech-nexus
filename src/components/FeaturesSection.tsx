import { Building2, Smartphone, Users, BarChart3, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Building2,
    title: "Multi-Property Management",
    description: "Manage unlimited hotels from one dashboard. Complete tenant isolation with custom branding per property.",
  },
  {
    icon: Smartphone,
    title: "QR Room Service",
    description: "Guests scan QR codes for instant room service, maintenance requests, and real-time updates. No app needed.",
  },
  {
    icon: Users,
    title: "Front Desk PWA",
    description: "Offline-first progressive web app. 3-click check-ins, works without internet, syncs automatically.",
  },
  {
    icon: BarChart3,
    title: "Power & Fuel Tracking",
    description: "Monitor generator usage, fuel consumption, and power costs. Built specifically for African hotels.",
  },
  {
    icon: Shield,
    title: "Local Payments",
    description: "Integrated with Moniepoint, Opay, Zenith Bank. Support for cash, POS, transfers, and pay-later.",
  },
  {
    icon: Zap,
    title: "Africa-First Design",
    description: "Built for unstable power, intermittent internet, and local payment methods. Optimized for your reality.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Built for Modern Hotels
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to run a world-class hotel, designed for African realities
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card p-8 rounded-2xl shadow-card hover:shadow-hover transition-all group"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-display font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
