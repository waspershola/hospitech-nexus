import { Button } from "@/components/ui/button";
import sunsetHotelBg from "@/assets/sunset-hotel-bg.jpg";

const CTASection = () => {
  return (
    <section 
      className="py-32 px-4 relative"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(139, 0, 0, 0.9), rgba(255, 215, 0, 0.8)), url(${sunsetHotelBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-5xl md:text-6xl font-display font-bold text-white mb-6">
          Start Managing Smarter
        </h2>
        <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
          Join hundreds of hotels already using LuxuryHotelPro. 
          14-day free trial, no credit card required.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8 py-6"
          >
            Start Free Trial
          </Button>
          <Button 
            size="lg"
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-lg px-8 py-6 backdrop-blur-sm"
          >
            Book a Demo
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
