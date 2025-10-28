import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Header = () => {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary" />
            <span className="text-2xl font-display font-bold text-foreground">
              LUXURYHOTELPRO
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("features")}
              className="text-foreground hover:text-primary transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="text-foreground hover:text-primary transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection("testimonials")}
              className="text-foreground hover:text-primary transition-colors"
            >
              Reviews
            </button>
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <Link to="/auth/login">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                Sign In
              </Button>
            </Link>
            <Link to="/auth/signup">
              <Button 
                size="sm"
                className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90"
              >
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
