import { ArrowRight } from "lucide-react";

export function Cta() {
  return (
    <section id="pricing" className="px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center md:px-16 md:py-24">
          <div className="absolute top-0 left-0 h-full w-full opacity-10">
            <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white blur-3xl" />
            <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-white blur-3xl" />
          </div>

          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-4xl text-primary-foreground md:text-5xl">
              Begin with stillness.
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Join thousands of people who start their day with intention.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="#"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-background px-7 py-3.5 text-base font-medium text-primary transition-colors hover:bg-background/90"
              >
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-full border border-primary-foreground/30 px-7 py-3.5 text-base font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10"
              >
                Talk to us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
