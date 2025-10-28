import { Button } from "@/components/ui/button";
import heroHotelBg from "@/assets/hero-hotel-bg.jpg";

const demoPortals = [
  { name: "QR Portal Demo", url: "#" },
  { name: "Front Desk", url: "#" },
  { name: "Owner Dashboard", url: "#" },
  { name: "Manager Dashboard", url: "#" },
  { name: "Housekeeping", url: "#" },
  { name: "Maintenance", url: "#" },
  { name: "Restaurant POS", url: "#" },
];

const DemoPortalsSection = () => {
  return (
    <section 
      className="py-20 px-4 relative"
      style={{
        backgroundImage: `linear-gradient(rgba(139, 0, 0, 0.95), rgba(139, 0, 0, 0.9)), url(${heroHotelBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            Experience the Platform Live
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Try out different roles and see how LuxuryHotelPro works in real-time
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {demoPortals.map((portal, index) => (
            <Button
              key={index}
              variant="outline"
              size="lg"
              className="bg-accent hover:bg-primary text-accent-foreground hover:text-primary-foreground border-accent transition-all"
            >
              {portal.name}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DemoPortalsSection;
