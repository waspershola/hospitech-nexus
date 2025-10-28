import { Star } from "lucide-react";
import diningHotelBg from "@/assets/dining-hotel-bg.jpg";

const testimonials = [
  {
    name: "Adebayo Okafor",
    role: "General Manager",
    hotel: "Lagos Grand Hotel",
    quote: "LuxuryHotelPro transformed our operations. Check-ins are 3x faster, and our guests love the QR room service. Best investment we've made.",
    rating: 5,
  },
  {
    name: "Fatima Al-Hassan",
    role: "Owner",
    hotel: "Abuja Executive Suites",
    quote: "The offline-first design is a game-changer. Even when power goes out, our front desk keeps working. Finally, a system built for Africa.",
    rating: 5,
  },
  {
    name: "Chidi Nwosu",
    role: "Operations Director",
    hotel: "Victoria Island Resort",
    quote: "Managing 3 properties used to be a nightmare. Now I monitor everything from my phone. The fuel tracking alone saved us ₦500k last month.",
    rating: 5,
  },
];

const TestimonialsSection = () => {
  return (
    <section 
      id="testimonials"
      className="py-20 px-4 relative"
      style={{
        backgroundImage: `linear-gradient(rgba(255, 215, 0, 0.9), rgba(255, 215, 0, 0.95)), url(${diningHotelBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-accent-foreground mb-4">
            Loved by Hotel Operators
          </h2>
          <p className="text-lg text-accent-foreground/80 max-w-2xl mx-auto">
            Join hundreds of hotels already transforming their operations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-card hover:shadow-hover transition-all"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                ))}
              </div>
              
              <p className="text-foreground/90 leading-relaxed mb-6">
                "{testimonial.quote}"
              </p>

              <div className="border-t border-border pt-4">
                <div className="font-semibold text-foreground">
                  {testimonial.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {testimonial.role}, {testimonial.hotel}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
