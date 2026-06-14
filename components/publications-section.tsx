import { ArrowUpRight } from 'lucide-react'
import { Reveal } from '@/components/reveal'
import { publications } from '@/lib/data'

export function PublicationsSection() {
  return (
    <section className="mx-auto max-w-3xl lg:max-w-4xl px-4 sm:px-6 py-4">
      <div className="rounded-2xl bg-[#1a1a1a] border border-border p-6 sm:p-8">
      <Reveal>
        <h2 className="mb-10 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Publications
        </h2>
      </Reveal>

      <ul className="flex flex-col">
        {publications.map((item, i) => (
          <Reveal as="li" key={item.title} delay={i * 80}>
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start justify-between gap-4 border-t border-border py-5 transition-colors last:border-b hover:border-accent/40"
            >
              <div>
                <h3 className="text-base font-medium text-foreground transition-colors group-hover:text-accent">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.venue} · {item.year}
                </p>
              </div>
              <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" />
            </a>
          </Reveal>
        ))}
      </ul>
      </div>
    </section>
  )
}
