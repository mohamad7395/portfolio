import {
  siLangchain,
  siLanggraph,
  siAnthropic,
  siGooglegemini,
  siHuggingface,
  siOllama,
  siPytorch,
  siTensorflow,
  siScikitlearn,
  siPandas,
  siNumpy,
  siDocker,
  siFastapi,
  siGit,
  siMongodb,
  siPostgresql,
  siInfluxdb,
  siPython,
  siJavascript,
  type SimpleIcon,
} from 'simple-icons'

// Maps a skill name to its simple-icons logo, when one is available.
// Skills without an entry render as text-only chips.
export const skillIcons: Record<string, SimpleIcon> = {
  LangChain: siLangchain,
  LangGraph: siLanggraph,
  Anthropic: siAnthropic,
  Gemini: siGooglegemini,
  'Hugging Face': siHuggingface,
  Ollama: siOllama,
  PyTorch: siPytorch,
  TensorFlow: siTensorflow,
  'Scikit-learn': siScikitlearn,
  pandas: siPandas,
  NumPy: siNumpy,
  Docker: siDocker,
  FastAPI: siFastapi,
  Git: siGit,
  MongoDB: siMongodb,
  PostgreSQL: siPostgresql,
  InfluxDB: siInfluxdb,
  Python: siPython,
  JavaScript: siJavascript,
}

// Returns true when the brand color is too dark to read on a dark background.
function isDark(hex: string): boolean {
  const n = parseInt(hex, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  // Perceived luminance (0-255)
  return 0.299 * r + 0.587 * g + 0.114 * b < 60
}

export function brandColor(icon: SimpleIcon): string | undefined {
  return isDark(icon.hex) ? undefined : `#${icon.hex}`
}
