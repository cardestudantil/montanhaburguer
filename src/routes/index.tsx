import { createFileRoute } from "@tanstack/react-router";

import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Testimonial } from "@/components/landing/testimonial";
import { Cta } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stillpoint — Clarity for your busiest days" },
      {
        name: "description",
        content:
          "Stillpoint helps you plan, focus, and reflect. A calm productivity app for people who want depth, not speed.",
      },
      { property: "og:title", content: "Stillpoint — Clarity for your busiest days" },
      {
        property: "og:description",
        content:
          "Stillpoint helps you plan, focus, and reflect. A calm productivity app for people who want depth, not speed.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://id-preview--fadf1df4-c57f-401f-a34e-779bd13978d9.lovable.app/images/hero.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Stillpoint — Clarity for your busiest days" },
      {
        name: "twitter:description",
        content:
          "Stillpoint helps you plan, focus, and reflect. A calm productivity app for people who want depth, not speed.",
      },
      { name: "twitter:image", content: "https://id-preview--fadf1df4-c57f-401f-a34e-779bd13978d9.lovable.app/images/hero.jpg" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <Testimonial />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
