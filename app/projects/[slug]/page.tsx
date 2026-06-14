import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'
import { Reveal } from '@/components/reveal'
import { projects } from '@/lib/data'
import { projectDetails } from '@/lib/project-details'
import { FiguresGrid } from '@/components/figures-grid'

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const project = projects.find((p) => p.slug === slug)
  if (!project) return {}
  return {
    title: `${project.title} — Mohammad Akbari Monfared`,
    description: project.description,
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = projects.find((p) => p.slug === slug)
  if (!project) notFound()

  const detail = projectDetails.find((d) => d.slug === slug)
  const isImageFile = (s: string) => /\.(png|jpe?g|webp|svg)$/i.test(s)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl lg:max-w-4xl flex-1 px-4 sm:px-6 pb-20 sm:pb-24 pt-14 sm:pt-16">
        {/* Back button */}
        <Reveal>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 font-mono text-base text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            All projects
          </Link>
        </Reveal>

        {/* Title + status badge */}
        <Reveal className="mt-8">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium ${
                project.status === 'live'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {project.status === 'live' ? 'Live Demo' : 'Case Study'}
            </span>
          </div>
          <h1 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            {project.title}
          </h1>
        </Reveal>

        {/* One-liner description */}
        <Reveal delay={60} className="mt-4">
          <p className="text-pretty leading-relaxed text-muted-foreground">
            {project.description}
          </p>
        </Reveal>

        {/* Tech stack */}
        <Reveal delay={65} className="mt-5">
          <ul className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-border px-2.5 py-1 font-mono text-sm text-muted-foreground"
              >
                {tag}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Links */}
        {detail && detail.links.length > 0 && (
          <Reveal delay={70} className="mt-6">
            <div className="flex flex-wrap gap-4">
              {detail.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-base font-medium text-accent transition-opacity hover:opacity-75"
                >
                  <ArrowUpRight className="size-4" />
                  {link.label}
                </a>
              ))}
            </div>
          </Reveal>
        )}

        {/* Overview */}
        <Reveal delay={80} className="mt-6">
          <div className="rounded-2xl bg-[#1a1a1a] border border-border p-6 sm:p-8">
            <h2 className="text-base font-medium uppercase tracking-widest text-muted-foreground">
              Overview
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              {detail?.overview ?? 'Overview coming soon.'}
            </p>
          </div>
        </Reveal>

        {/* Architecture — hidden when empty */}
        {detail?.architecture && (
          <Reveal delay={100} className="mt-6">
            <div className="rounded-2xl bg-[#1a1a1a] border border-border p-6 sm:p-8">
              <h2 className="text-base font-medium uppercase tracking-widest text-muted-foreground">
                Architecture
              </h2>
              {isImageFile(detail.architecture) ? (
                <div className="mt-4 mx-auto w-[85%] flex justify-center rounded-xl bg-gray-100 p-4 sm:p-6">
                  <img
                    src={detail.architecture}
                    alt="Architecture diagram"
                    className="block w-full max-w-[500px] rounded-lg"
                  />
                </div>
              ) : (
                <div className="mt-4 flex aspect-video items-center justify-center rounded-lg bg-muted">
                  <span className="text-base text-muted-foreground">
                    Architecture diagram coming soon
                  </span>
                </div>
              )}
            </div>
          </Reveal>
        )}

        {/* Results */}
        <Reveal delay={120} className="mt-6">
          <div className="rounded-2xl bg-[#1a1a1a] border border-border p-6 sm:p-8">
            <h2 className="text-base font-medium uppercase tracking-widest text-muted-foreground">
              Results
            </h2>
            {detail && detail.results.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {detail.results.map((r) => (
                  <li key={r} className="flex gap-2 text-pretty leading-relaxed text-muted-foreground">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
                Key outcomes and metrics coming soon.
              </p>
            )}
          </div>
        </Reveal>

        {/* Screenshots / Figures */}
        {detail && (detail.screenshots?.length ?? detail.screenshotCount) > 0 && (
          <Reveal delay={140} className="mt-6">
            <div className="rounded-2xl bg-[#1a1a1a] border border-border p-6 sm:p-8">
              <h2 className="text-base font-medium uppercase tracking-widest text-muted-foreground">
                {detail.screenshots?.length ? 'Figures' : 'Screenshots'}
              </h2>
              {detail.screenshots?.length ? (
                <FiguresGrid screenshots={detail.screenshots} />
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: detail.screenshotCount }).map((_, i) => (
                    <div
                      key={i}
                      className="flex aspect-video items-center justify-center rounded-lg bg-muted"
                    >
                      <span className="text-base text-muted-foreground">
                        Screenshot coming soon
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        )}


      </main>
      <SiteFooter />
    </div>
  )
}
