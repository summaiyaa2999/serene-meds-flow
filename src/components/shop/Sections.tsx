import { Leaf, ShieldCheck, Truck, MapPin, Phone, Mail, Clock } from "lucide-react";
import { useParallax, useSettings } from "@/hooks/use-shop";
import texture from "@/assets/texture-herbs.jpg";

export function AboutSection() {
  const y = useParallax();
  return (
    <section id="about" className="relative overflow-hidden bg-cream py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-6 lg:grid-cols-2">
        <div className="reveal relative overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)]">
          <img
            src={texture}
            alt="Ayurvedic herbal powders in wooden bowls"
            width={1400}
            height={900}
            loading="lazy"
            className="h-[26rem] w-full object-cover"
            style={{ transform: `translate3d(0, ${Math.max(-40, Math.min(40, (y - 1200) * 0.05))}px, 0) scale(1.1)` }}
          />
          <div className="glass absolute bottom-5 left-5 right-5 rounded-2xl p-5">
            <p className="eyebrow">Prepared the slow way</p>
            <p className="mt-2 text-sm text-foreground/80">
              Sun-dried herbs, copper vessels, and formulations verified batch by batch.
            </p>
          </div>
        </div>

        <div className="reveal">
          <p className="eyebrow">Our roots</p>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl">
            Three generations of vaidyas, one honest promise
          </h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            Dawaiin began as a small dispensary where remedies were ground fresh each morning.
            Today we still follow the same classical texts — Sharangdhar Samhita, Bhaishajya
            Ratnavali — while adding modern quality checks, heavy-metal testing and airtight
            packaging so nothing is lost between our kitchen and your home.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Leaf, t: "Pure herbs", d: "No fillers, no artificial colour" },
              { icon: ShieldCheck, t: "Lab tested", d: "Every batch, every time" },
              { icon: Truck, t: "Fast dispatch", d: "Shipped within 24 hours" },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border bg-card p-5">
                <f.icon className="h-5 w-5 text-primary" />
                <p className="mt-3 font-medium">{f.t}</p>
                <p className="mt-1 text-xs text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ContactSection() {
  const { settings } = useSettings();
  return (
    <section id="contact" className="mx-auto max-w-7xl px-5 py-24 sm:px-6 sm:py-32">
      <div className="reveal max-w-2xl">
        <p className="eyebrow">Visit us</p>
        <h2 className="mt-4 font-display text-4xl sm:text-5xl">Come by the dispensary</h2>
        <p className="mt-4 text-muted-foreground">
          Consultations are free on weekdays. Call ahead and our vaidya will keep your
          formulation ready.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {[
          {
            icon: MapPin,
            title: "Address",
            lines: ["Dawaiin Ayurvedic Store", "Main Bazaar Road, Near Clock Tower", "Lucknow, Uttar Pradesh 226001"],
          },
          {
            icon: Phone,
            title: "Phone & WhatsApp",
            lines: [`+${settings.whatsappNumber}`, "Orders, refills & dispatch updates"],
          },
          {
            icon: Mail,
            title: "Email",
            lines: ["care@dawaiin.com", "We reply within one working day"],
          },
        ].map((c) => (
          <div key={c.title} className="reveal rounded-3xl border bg-card p-7">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[image:var(--gradient-leaf)] text-primary-foreground">
              <c.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-5 font-display text-2xl">{c.title}</h3>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              {c.lines.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="glass reveal mt-6 flex flex-wrap items-center gap-4 rounded-3xl p-6">
        <Clock className="h-5 w-5 text-primary" />
        <p className="text-sm">
          <span className="font-medium">Store hours:</span> Monday – Saturday, 9:30 AM – 8:30 PM ·
          Sunday, 10 AM – 2 PM
        </p>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const { settings } = useSettings();
  return (
    <footer className="border-t bg-primary py-14 text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-3xl">Dawaiin</p>
          <p className="mt-3 max-w-xs text-sm text-primary-foreground/75">
            Classical Ayurvedic remedies, prepared in small batches and delivered across India.
          </p>
        </div>
        <div>
          <p className="eyebrow text-primary-foreground/70">Explore</p>
          <div className="mt-4 space-y-2 text-sm">
            <a className="block hover:underline" href="#shop">All medicines</a>
            <a className="block hover:underline" href="#about">Our tradition</a>
            <a className="block hover:underline" href="#contact">Store & contact</a>
          </div>
        </div>
        <div>
          <p className="eyebrow text-primary-foreground/70">Reach us</p>
          <div className="mt-4 space-y-2 text-sm text-primary-foreground/85">
            <p>Main Bazaar Road, Lucknow 226001</p>
            <p>+{settings.whatsappNumber}</p>
            <p>care@dawaiin.com</p>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-7xl border-t border-primary-foreground/15 px-5 pt-6 text-xs text-primary-foreground/60 sm:px-6">
        © {new Date().getFullYear()} Dawaiin Ayurvedic Apothecary. Products are traditional
        preparations and not a substitute for medical advice.
      </div>
    </footer>
  );
}
