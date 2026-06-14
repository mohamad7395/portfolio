import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { GithubIcon, LinkedinIcon } from '@/components/icons'
import { profile } from '@/lib/data'

export function Hero() {
  return (
    <section className="mx-auto max-w-3xl lg:max-w-4xl px-4 sm:px-6 pb-20 sm:pb-24 pt-16 sm:pt-20 lg:pt-28">
      <div className="flex flex-col-reverse items-start gap-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <Reveal>
            <p className="mb-4 font-mono text-sm text-accent">{profile.role}</p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {profile.name}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              {profile.tagline}
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/projects"
                className="group inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                View projects
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a
                href={profile.github}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <GithubIcon className="size-5" />
              </a>
              <a
                href={profile.linkedin}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <LinkedinIcon className="size-5" />
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <div className="relative size-28 shrink-0 overflow-hidden rounded-full border border-border sm:size-36">
            <Image
              src="/profile.png"
              alt={`Portrait of ${profile.name}`}
              fill
              priority
              sizes="(max-width: 640px) 7rem, 9rem"
              className="object-cover"
            />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
