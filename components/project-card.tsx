import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { GithubIcon } from '@/components/icons'
import type { Project } from '@/lib/data'

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group relative flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/20">
      {/* Full-card overlay link (keeps inner repo/demo links clickable by stacking) */}
      <Link
        href={`/projects/${project.slug}`}
        aria-label={`View ${project.title} project`}
        className="absolute inset-0 z-0 rounded-lg"
      >
        <span className="sr-only">View {project.title} project</span>
      </Link>

      <div className="relative z-10 flex items-start justify-between gap-4 pointer-events-none">
        <h3 className="text-lg font-medium text-card-foreground">
          {project.title}
        </h3>
        <div className="flex items-center gap-3 text-muted-foreground">
          {project.repo && (
            <a
              href={project.repo}
              target="_blank"
              rel="noreferrer"
              aria-label={`${project.title} repository`}
              className="relative z-20 pointer-events-auto transition-colors hover:text-foreground"
            >
              <GithubIcon className="size-[18px]" />
            </a>
          )}
          {project.demo && (
            <a
              href={project.demo}
              target="_blank"
              rel="noreferrer"
              aria-label={`${project.title} live demo`}
              className="relative z-20 pointer-events-auto transition-colors hover:text-accent"
            >
              <ArrowUpRight className="size-[18px]" />
            </a>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-3 flex-1 pointer-events-none">
        <p className="text-pretty text-base leading-relaxed text-muted-foreground">
          {project.description}
        </p>

        <ul className="mt-5 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-border px-2.5 py-1 font-mono text-sm text-muted-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium ${
              project.status === 'live'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {project.status === 'live' ? 'Live Demo' : 'Case Study'}
          </span>

          <span className="ml-auto text-base font-medium text-accent">
            View project →
          </span>
        </div>
      </div>
    </article>
  )
}
