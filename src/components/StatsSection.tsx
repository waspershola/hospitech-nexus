import { Building2, TrendingUp, Zap, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  { icon: Building2, value: "500+", label: "Hotels Worldwide" },
  { icon: TrendingUp, value: "95%", label: "Uptime Guarantee" },
  { icon: Zap, value: "40%", label: "Faster Check-ins" },
  { icon: DollarSign, value: "₦200k+", label: "Avg. Monthly Savings" },
];

const StatsSection = () => {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center space-y-3 p-6 rounded-2xl bg-card hover:shadow-card transition-shadow"
            >
              <stat.icon className="w-10 h-10 mx-auto text-primary" />
              <div className="text-4xl font-display font-bold text-foreground">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
