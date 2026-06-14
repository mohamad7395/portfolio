'use client'

import { useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

export function FiguresGrid({ screenshots }: { screenshots: string[] }) {
  const [index, setIndex] = useState(-1)

  const slides = screenshots.map((src) => ({ src }))

  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {screenshots.map((src, i) => (
          <button
            key={src}
            onClick={() => setIndex(i)}
            className="block w-full cursor-zoom-in rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <img
              src={src}
              alt=""
              className="w-full rounded-lg border border-border transition-opacity hover:opacity-80"
            />
          </button>
        ))}
      </div>

      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={slides}
        styles={{ container: { padding: '10vh 15vw' } }}
      />
    </>
  )
}
