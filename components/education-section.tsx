import { Reveal } from '@/components/reveal'
import { education } from '@/lib/data'

export function EducationSection() {
  return (
    <section className="mx-auto max-w-3xl lg:max-w-4xl px-4 sm:px-6 py-4">
      <div className="rounded-2xl bg-[#1a1a1a] border border-border p-6 sm:p-8">
      <Reveal>
        <h2 className="mb-10 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Education
        </h2>
      </Reveal>

      <div className="grid gap-5 sm:grid-cols-2">
        {education.map((item, i) => (
          <Reveal key={item.school} delay={i * 80} className="h-full">
            <article className="flex h-full flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-accent/40">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {item.period}
              </span>
              <h3 className="mt-3 text-base font-medium text-foreground">
                {item.degree}
              </h3>
              <p className="mt-1 text-sm text-accent">{item.school}</p>
              {item.detail && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
              )}
            </article>
          </Reveal>
        ))}
      </div>
      </div>
    </section>
  )
}
