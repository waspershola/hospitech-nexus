import { Building2 } from "lucide-react";

const footerLinks = {
  product: ["Features", "Pricing", "Integrations", "API"],
  support: ["Help Center", "Contact", "Reset Password", "Status", "Training"],
  company: ["About", "Blog", "Careers", "Privacy"],
};

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground py-16 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-8 h-8" />
              <span className="text-xl font-display font-bold">
                LUXURYHOTELPRO
              </span>
            </div>
            <p className="text-primary-foreground/80 text-sm">
              Redefining hotel management across Africa with AI-powered, 
              offline-first technology.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link}>
                  <a 
                    href="#" 
                    className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link}>
                  <a 
                    href="#" 
                    className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link}>
                  <a 
                    href="#" 
                    className="text-primary-foreground/70 hover:text-primary-foreground text-sm transition-colors"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 text-center text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} LuxuryHotelPro. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
