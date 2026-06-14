import { Reveal } from '@/components/reveal'
import { experience } from '@/lib/data'

export function ExperienceSection() {
  return (
    <section className="mx-auto max-w-3xl lg:max-w-4xl px-4 sm:px-6 py-4">
      <div className="rounded-2xl bg-[#1a1a1a] border border-border p-6 sm:p-8">
      <Reveal>
        <h2 className="mb-10 text-base font-medium uppercase tracking-widest text-muted-foreground">
          Work experience
        </h2>
      </Reveal>

      <ol className="relative border-l border-border pl-6 sm:pl-8">
        {experience.map((item, i) => (
          <Reveal
            as="li"
            key={`${item.company}-${item.role}`}
            delay={i * 80}
            className="relative pb-12 last:pb-0"
          >
            <span
              aria-hidden
              className="absolute -left-[25px] sm:-left-[33px] top-1.5 size-3 rounded-full border-2 border-accent bg-background"
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-base font-medium text-foreground">
                {item.role}
                <span className="text-accent"> · {item.company}</span>
              </h3>
              <span className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                {item.period}
              </span>
            </div>
            {item.location && (
              <p className="mt-1 text-base text-muted-foreground">{item.location}</p>
            )}
            <ul className="mt-4 flex flex-col gap-2">
              {item.points.map((point) => (
                <li
                  key={point}
                  className="relative pl-5 text-base leading-relaxed text-muted-foreground before:absolute before:left-0 before:top-2.5 before:size-1 before:rounded-full before:bg-muted-foreground/60"
                >
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </ol>
      </div>
    </section>
  )
}
