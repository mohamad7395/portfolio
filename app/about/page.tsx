import type { Metadata } from 'next'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'
import { Reveal } from '@/components/reveal'
import { SkillBadge } from '@/components/skill-badge'
import { bio, skillGroups } from '@/lib/data'

export const metadata: Metadata = {
  title: 'About — Mohammad Akbari Monfared',
  description:
    'AI/ML Engineer building production systems with LLMs, RAG, and multi-agent architectures.',
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl lg:max-w-4xl flex-1 px-4 sm:px-6 pb-20 sm:pb-24 pt-14 sm:pt-16">
        <Reveal>
          <p className="mb-3 font-mono text-sm text-accent">About</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Background
          </h1>
        </Reveal>

        <div className="mt-8 rounded-2xl bg-[#1a1a1a] border border-border p-6 sm:p-8 space-y-5">
          {bio.map((paragraph, i) => (
            <Reveal key={i} delay={i * 80}>
              <p className="text-pretty leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            </Reveal>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-[#1a1a1a] border border-border p-6 sm:p-8">
          <Reveal>
            <h2 className="mb-8 text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Skills
            </h2>
          </Reveal>

          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {skillGroups.map((group, i) => (
              <Reveal key={group.category} delay={i * 70}>
                <h3 className="font-mono text-sm text-foreground">
                  {group.category}
                </h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <SkillBadge key={item} name={item} />
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
