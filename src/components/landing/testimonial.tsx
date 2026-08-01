export function Testimonial() {
  return (
    <section id="about" className="px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <blockquote className="relative rounded-3xl border border-border bg-card px-8 py-12 text-center md:px-16 md:py-20">
          <span className="absolute top-6 left-8 font-heading text-6xl text-primary/20 md:left-12 md:text-8xl">
            &ldquo;
          </span>
          <p className="relative z-10 text-2xl leading-snug text-foreground md:text-3xl">
            Stillpoint gave me back the mental room I didn&apos;t realize I&apos;d
            lost. My days feel slower, but I get more done.
          </p>
          <footer className="mt-8">
            <p className="font-medium text-foreground">Elena R.</p>
            <p className="text-sm text-muted-foreground">
              Product designer, remote since 2019
            </p>
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
