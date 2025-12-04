import { Mail, Lock, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import heroHotelBg from "@/assets/hero-hotel-bg.jpg";

const HeroSection = () => {
  return (
    <section 
      className="relative min-h-screen flex items-center justify-center py-20 px-4"
      style={{
        backgroundImage: `linear-gradient(rgba(139, 0, 0, 0.8), rgba(255, 215, 0, 0.4)), url(${heroHotelBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="container mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-white space-y-6"
          >
            <Badge className="bg-accent text-accent-foreground mb-4">
              Modern Hotel Management
            </Badge>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight">
              Redefining Hotel Management Worldwide
            </h1>
            
            <p className="text-lg md:text-xl text-white/90 max-w-2xl">
              Complete platform with QR room service, front desk PWA, local payments, 
              power tracking, and AI-powered operations. Built for modern hotels across Africa.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              {["No setup fees", "14-day trial", "Cancel anytime"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-accent" />
                  <span className="text-white/90">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right - Login Form */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-card/95 backdrop-blur-xl rounded-3xl p-8 shadow-luxury border border-border"
          >
            <h2 className="text-2xl font-display font-bold text-foreground mb-6">
              Sign In to Dashboard
            </h2>
            
            <form className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    type="email" 
                    placeholder="hotel@example.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input 
                    type="password" 
                    placeholder="••••••••"
                    className="pl-10"
                  />
                </div>
              </div>

              <Button 
                type="submit"
                variant="gold"
                className="w-full font-semibold"
                size="lg"
              >
                Sign In to Dashboard
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </form>

            <div className="mt-6 text-center">
              <a href="#" className="text-sm text-primary hover:underline">
                New hotel? Request a demo →
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
