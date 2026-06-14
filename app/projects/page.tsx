import type { Metadata } from 'next'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'
import { Reveal } from '@/components/reveal'
import { ProjectCard } from '@/components/project-card'
import { projects } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Projects — Mohammad Akbari Monfared',
  description:
    'Production AI/ML projects spanning LLMs, RAG, multi-agent systems, and inference infrastructure.',
}

export default function ProjectsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl lg:max-w-4xl flex-1 px-4 sm:px-6 pb-20 sm:pb-24 pt-14 sm:pt-16">
        <Reveal>
          <p className="mb-3 font-mono text-sm text-accent">Projects</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Things I&apos;ve built
          </h1>
          <p className="mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">
            A selection of production AI systems and tools — from retrieval and
            agents to evaluation and serving infrastructure.
          </p>
        </Reveal>

        <div className="mt-8 rounded-2xl bg-[#1a1a1a] border border-border p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            {projects.map((project, i) => (
              <Reveal key={project.title} delay={i * 70} className="h-full">
                <ProjectCard project={project} />
              </Reveal>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
