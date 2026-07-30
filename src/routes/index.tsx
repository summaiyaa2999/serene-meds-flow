import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/shop/SiteHeader";
import { Hero } from "@/components/shop/Hero";
import { ProductSection } from "@/components/shop/ProductSection";
import { AboutSection, ContactSection, SiteFooter } from "@/components/shop/Sections";
import { CartSheet } from "@/components/shop/CartSheet";
import { useReveal } from "@/hooks/use-shop";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dawaiin — Premium Ayurvedic Medicines Online" },
      {
        name: "description",
        content:
          "Shop classical Ayurvedic churnas, vatis, arishtas and herbal oils from Dawaiin. Lab-tested, small-batch remedies with fast delivery across India.",
      },
      { property: "og:title", content: "Dawaiin — Premium Ayurvedic Medicines Online" },
      {
        property: "og:description",
        content:
          "Classical Ayurvedic remedies prepared the traditional way. Order online with secure payment or WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [cartOpen, setCartOpen] = useState(false);
  useReveal();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader onCartOpen={() => setCartOpen(true)} />
      <main>
        <Hero />
        <ProductSection />
        <AboutSection />
        <ContactSection />
      </main>
      <SiteFooter />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
