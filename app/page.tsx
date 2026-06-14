import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'
import { Hero } from '@/components/hero'
import { Reveal } from '@/components/reveal'
import { ProjectCard } from '@/components/project-card'
import { ExperienceSection } from '@/components/experience-section'
import { EducationSection } from '@/components/education-section'
import { PublicationsSection } from '@/components/publications-section'
import { projects } from '@/lib/data'

export default function HomePage() {
  const featured = projects.slice(0, 4)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <Hero />

        <ExperienceSection />
        <EducationSection />
        <PublicationsSection />

        <section className="mx-auto max-w-3xl lg:max-w-4xl px-4 sm:px-6 py-4 pb-12 sm:pb-16">
          <div className="rounded-2xl bg-[#1a1a1a] border border-border p-6 sm:p-8">
            <Reveal className="mb-8 flex items-end justify-between">
              <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                Selected work
              </h2>
              <Link
                href="/projects"
                className="group inline-flex items-center gap-1 text-sm text-foreground transition-colors hover:text-accent"
              >
                All projects
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-2">
              {featured.map((project, i) => (
                <Reveal key={project.title} delay={i * 80} className="h-full">
                  <ProjectCard project={project} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
