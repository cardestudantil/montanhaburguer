import { Calendar, Focus, Sparkles } from "lucide-react";

const features = [
  {
    icon: Focus,
    title: "Distraction-free focus",
    description:
      "A calm workspace that surfaces what matters and hides everything else until you need it.",
  },
  {
    icon: Calendar,
    title: "Intentional planning",
    description:
      "Plan your week around your energy, not just your calendar. Time blocks that respect your rhythm.",
  },
  {
    icon: Sparkles,
    title: "Gentle reflection",
    description:
      "End each day with a brief prompt that turns scattered effort into clear momentum.",
  },
];

export function Features() {
  return (
    <section id="features" className="px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Features
          </p>
          <h2 className="mt-4 text-4xl text-foreground md:text-5xl">
            Built for depth, not speed.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three simple ideas that make every work session feel more human.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-card p-8 transition-all hover:shadow-lg hover:shadow-foreground/5"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-2xl text-foreground">{feature.title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
