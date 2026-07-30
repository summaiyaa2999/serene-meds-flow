import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParallax } from "@/hooks/use-shop";
import hero from "@/assets/hero-ayurveda.jpg";

export function Hero() {
  const y = useParallax();

  return (
    <section id="home" className="relative min-h-[100svh] overflow-hidden">
      <div className="absolute inset-0" style={{ transform: `translate3d(0, ${y * 0.28}px, 0) scale(1.12)` }}>
        <img
          src={hero}
          alt="Brass mortar and pestle with fresh ayurvedic herbs, turmeric and amla"
          width={1600}
          height={1104}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-[image:var(--gradient-hero)]" />
      <div className="absolute inset-0 bg-background/35" />

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-5 pt-40 pb-24 sm:px-6">
        <div
          className="max-w-2xl"
          style={{ transform: `translate3d(0, ${y * -0.06}px, 0)`, opacity: Math.max(0, 1 - y / 620) }}
        >
          <p className="eyebrow">Kerala sourced · Vaidya formulated · Small batch</p>
          <h1 className="mt-6 font-display text-5xl leading-[1.02] sm:text-7xl">
            The quiet science of <span className="text-gradient-leaf">healing</span>, bottled with care.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/75 sm:text-lg">
            Dawaiin brings you classical Ayurvedic churnas, vatis, arishtas and taila — prepared
            the traditional way, tested in modern labs, and delivered to your door across India.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full px-8 shadow-[var(--shadow-lift)]">
              <a href="#shop">
                Browse the apothecary <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="glass rounded-full px-8">
              <a href="#about">Our tradition</a>
            </Button>
          </div>

          <div className="mt-14 grid max-w-lg grid-cols-3 gap-3">
            {[
              { k: "45+", v: "Years of practice" },
              { k: "100%", v: "Natural ingredients" },
              { k: "20k+", v: "Families served" },
            ].map((s) => (
              <div key={s.v} className="glass rounded-2xl px-4 py-4">
                <p className="font-display text-2xl text-primary">{s.k}</p>
                <p className="mt-1 text-[0.7rem] uppercase tracking-widest text-muted-foreground">{s.v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass animate-float absolute right-6 top-1/3 hidden items-center gap-2 rounded-full px-5 py-3 xl:flex">
          <Sparkles className="h-4 w-4 text-gold" />
          <span className="text-xs uppercase tracking-[0.25em]">Ayush licensed</span>
        </div>
      </div>
    </section>
  );
}
