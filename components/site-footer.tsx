import { GithubIcon, LinkedinIcon } from '@/components/icons'
import { profile } from '@/lib/data'

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-3xl lg:max-w-4xl flex-col items-start justify-between gap-4 px-4 sm:px-6 py-10 sm:flex-row sm:items-center">
        <p className="text-sm text-muted-foreground">
          {`© ${new Date().getFullYear()} ${profile.name}`}
        </p>
        <div className="flex items-center gap-4">
          <a
            href={profile.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <GithubIcon className="size-5" />
          </a>
          <a
            href={profile.linkedin}
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <LinkedinIcon className="size-5" />
          </a>
        </div>
      </div>
    </footer>
  )
}
