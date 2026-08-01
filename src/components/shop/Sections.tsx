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
            <p className="eyebrow"></p>
            <p className="mt-2 text-sm text-foreground/80">
              HEALING THROUGH CENTURIES OF UNANI WISDOM
            </p>
          </div>
        </div>

        <div className="reveal">
          <p className="eyebrow">Our roots</p>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl uppercase">
            DAWAIIN : THE ESSENCE  OF UNANI MEDICINE
          </h2>
          <div className="mt-5 leading-relaxed text-muted-foreground space-y-4">
            <p>
              Unani medicine is a system of medicine based on natural drugs, mostly from plant-origin medicine, hence called Natural Medicine or Herbal Medicine
              This system was started in Unan [Greece/Greek] in 460 B.C and enriched in Rome, Persia, Arab and India hence called Unani Medicine
            </p>
            <p>
              It is based on Heath-Disease philosophy of Hippocrates, the Father of Unani Medicine
              According to Unani Systems, physicians only help the Tabiyat [Natural defense of the body] of the patients to regain health in a disease condition
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Leaf, t: "Pure herbs", d: "No fillers, no artificial colour" },
              { icon: ShieldCheck, t: "Lab tested", d: "Every batch, every time" },
              { icon: Truck, t: "Fast dispatch", d: "Shipped within 48 hours" },
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
        <p className="eyebrow"></p>
        <h2 className="mt-4 font-display text-4xl sm:text-5xl"></h2>
        <p className="mt-4 text-muted-foreground">
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {[
          {
            icon: MapPin,
            title: "Address",
            lines: ["Dawaiin Store", "Hamdard Nagar B, Gali No-1 Jamalapur", "Aligarh, Uttar Pradesh 202002"],
          },
          {
            icon: Phone,
            title: "Phone & WhatsApp",
            lines: ["+91-7078718575", "Orders, refills & dispatch updates"],
          },
          {
            icon: Mail,
            title: "Email",
            lines: ["shahrukhchoudhary7078718575@gmail.com", ""],
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
          <span className="font-medium">Store hours:</span> Monday – Sunday, 9:00 AM – 9:00 PM 

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
            Classical Ayurvedic, Unani , Desi remedies delivered across India.
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
            <p>Hamdard Nagar B Gali No-1 Jamalpur, Aligarh 202002</p>
            <p>+917078718575</p>
            <p>Gmail<br />shahrukhchoudhary7078718575@gmail.com</p>
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
