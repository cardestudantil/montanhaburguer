import { ArrowRight } from "lucide-react";
import heroImage from "@/../public/images/hero.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-24 lg:px-8 lg:pt-24 lg:pb-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="animate-fade-in-up max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Productivity, reimagined
            </p>
            <h1 className="mt-6 text-5xl leading-[1.05] text-foreground md:text-6xl lg:text-7xl">
              Clarity for your busiest days.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl">
              Stillpoint helps you plan, focus, and reflect — so the important
              things never get lost in the noise.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-medium text-primary-foreground transition-all hover:bg-primary/90"
              >
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-full border border-border bg-card px-7 py-3.5 text-base font-medium text-foreground transition-colors hover:bg-secondary"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required. 14-day free trial.
            </p>
          </div>

          <div className="animate-fade-in animate-delay-200 relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-2xl shadow-foreground/5">
              <img
                src={heroImage}
                alt="A calm wooden desk with a notebook, ceramic cup, and green plant by a sunlit window"
                width={1440}
                height={912}
                className="h-full w-full object-cover"
                priority="true"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden h-32 w-32 rounded-full bg-accent/30 blur-2xl lg:block" />
            <div className="absolute -top-6 -right-6 hidden h-40 w-40 rounded-full bg-primary/10 blur-3xl lg:block" />
          </div>
        </div>
      </div>
    </section>
  );
}
