export const profile = {
  name: 'Mohammad Akbari Monfared',
  role: 'AI/ML Engineer',
  tagline:
    'AI/ML Engineer with 5+ years shipping production AI — LLMs, RAG, and multi-agent systems.',
  github: 'https://github.com/mohamad7395',
  linkedin: 'https://www.linkedin.com/in/mohamad-akbari-6a7888229/',
}

export const bio = [
  'AI/ML Engineer with 4+ years designing and deploying production-grade AI systems across natural language, agentic, and industrial domains. Specialized in LLMs, RAG, and multi-agent systems, with a track record of taking solutions from design to production on AWS.',
  'Experienced building RAG pipelines with LangChain, LangGraph, and FAISS, integrating models from OpenAI, Anthropic, and Gemini. Strong background in time-series forecasting and anomaly detection for industrial systems. Master\'s from the University of Bonn. Published at EACL 2026. Full working rights in Germany.',
]

export type Project = {
  title: string
  description: string
  tags: string[]
  slug: string
  status: 'live' | 'showcase'
  demo?: string
  repo?: string
}

export const projects: Project[] = [
  {
    title: 'AIME — Agentic Recruitment Platform',
    description: 'End-to-end agentic RAG ecosystem that automates global candidate sourcing, standardization, and matching at scale.',
    tags: ['LangChain', 'LangGraph', 'RAG', 'FAISS', 'AWS', 'MongoDB', 'FastAPI', 'Python'],
    slug: 'aime',
    status: 'showcase',
    demo: 'https://aimetalent.com',
  },
  {
    title: 'LLM Agentic Framework for ABSA',
    description: 'First agentic framework for Aspect-Based Sentiment Analysis using Generator-Evaluator LLM-as-judge workflow. Published at EACL 2026.',
    tags: ['Python', 'Hugging Face', 'Ollama', 'ReAct Agents', 'Tool Calling', 'LLM Evaluation', 'Prompt Engineering', 'NLP'],
    slug: 'thesis',
    status: 'showcase',
    demo: 'https://arxiv.org/pdf/2602.16379',
  },
  {
    title: 'Industrial Time-Series Forecasting',
    description: 'End-to-end ML system for cold rolling mill optimization — from proof of concept to production deployment.',
    tags: ['Python', 'ETL', 'Time-Series Forecasting', 'Anomaly Detection', 'PyTorch', 'TensorFlow', 'Scikit-learn', 'XGBoost', 'pandas', 'NumPy', 'gRPC', 'SQL', 'Grafana'],
    slug: 'sms-forecasting',
    status: 'showcase',
  },
  {
    title: 'RAG Portfolio Chatbot',
    description: 'Ask me anything about my experience, projects, and skills. Powered by a RAG pipeline indexed on my CV and project descriptions.',
    tags: ['RAG', 'LangChain', 'FastAPI', 'AWS', 'Next.js'],
    slug: 'rag-chatbot',
    status: 'live',
  },

]

export type Experience = {
  role: string
  company: string
  period: string
  location?: string
  points: string[]
}

export const experience: Experience[] = [
  {
    role: 'Lead AI Engineer',
    company: 'DCV Technologies GmbH',
    period: 'Sep 2025 — Present',
    location: 'Hamburg, DE',
    points: [
      'Led the full product lifecycle for two live AI products at DCV, owning design, implementation, delivery, and alignment with non-technical founders and business teams.',
      'Built and shipped AIME (aimetalent.com), an agentic RAG product that cut a multi-day manual recruitment process to minutes by automating global sourcing and matching, now used daily by recruiters.',
      'Engineered an agentic CV Matcher using RAG and deep semantic search, delivering high-precision candidate ranking and discovery across large databases.',
      'Built an automated ETL pipeline that ingests CVs from a data lake, routes them by detected location, and uses LLMs to extract and structure profiles before loading them into vector and document databases (FAISS, MongoDB), triggered end-to-end without manual steps.',
      'Designed and shipped a recruitment CRM with a team of two developers, covering the full lifecycle from client contact to commission payout by automating invoicing, margin calculation, and contract generation.',
      'Owned cloud and deployment for both products on AWS, building CI/CD pipelines with Docker for automated testing and deployment to EC2 across staging and production, with data storage on S3, MongoDB, and RDS.',
    ],
  },
  {
    role: 'Data Scientist (Part-time)',
    company: 'SMS Group GmbH',
    period: 'Aug 2022 — Aug 2025',
    location: 'Mönchengladbach, DE',
    points: [
      'Built and shipped an AI product for cold-rolling mills, taking it from idea to a system used in factories today, increasing production efficiency by 2%.',
      'Designed an ETL pipeline processing high-frequency sensor data (10GB per 10-minute window), extracting compact, high-value summaries that resolved storage bottlenecks while preserving critical information.',
      'Developed a custom statistical forecasting and anomaly-detection model as the core of the product, outperforming standard benchmarks by 30%.',
      'Deployed end-to-end with integration into factory systems via gRPC and SQL, delivering real-time dashboards in Grafana that served predictions and monitored model performance and data drift.',
      'Partnered with domain experts and senior management to translate operational challenges into the product roadmap and retraining logic that improved plant-level productivity.',
    ],
  },
  {
    role: "Student Researcher — Master's Thesis",
    company: 'CAISA Lab, B-IT',
    period: 'Aug 2024 — Aug 2025',
    location: 'Bonn, DE',
    points: [
      'Developed the first agentic framework for Aspect-Based Sentiment Analysis (ABSA), using an LLM "Generator-Evaluator" (LLM-as-judge) workflow to produce label-consistent synthetic data; published at EACL 2026.',
      'Closed the performance gap for lightweight models with self-reflection logic, yielding a 6% F1-score improvement over standard augmentation.',
      'Designed a systematic evaluation framework across four SemEval benchmarks, proving agentic augmentation can match real-world data performance in low-resource scenarios.',
      'Engineered the end-to-end Python pipeline studying task complexity and data ratios on downstream ML performance for data-scarce training strategies.',
    ],
  },
  {
    role: 'Junior Software Developer',
    company: 'Nexus',
    period: 'Jun 2019 — Jun 2021',
    location: 'London, UK',
    points: [
      'Developed and maintained Python scripts automating internal data reporting workflows, saving the operations team several hours per week with repeatable pipelines.',
      'Built and consumed RESTful API endpoints, working across request/response cycles, authentication flows, and backend service integration.',
      'Queried and maintained SQL databases as part of feature delivery, developing strong proficiency in structured data systems and schema design.',
      'Contributed to a shared codebase using Git, following code review processes and resolving merge conflicts independently.',
    ],
  },
]

export type Education = {
  degree: string
  school: string
  period: string
  detail?: string
}

export const education: Education[] = [
  {
    degree: 'Master of Computer Science',
    school: 'University of Bonn',
    period: '2021 — 2025',
    detail: 'Bonn, Germany',
  },
  {
    degree: 'Bachelor of Computer Science',
    school: 'Sharif University of Technology',
    period: '2014 — 2019',
    detail: 'Tehran, Iran',
  },
]

export type Publication = {
  title: string
  venue: string
  year: string
  link: string
}

export const publications: Publication[] = [
  {
    title:
      'Label-Consistent Data Generation for Aspect-Based Sentiment Analysis Using LLM Agents',
    venue: 'EACL 2026',
    year: '2026',
    link: 'https://arxiv.org/pdf/2602.16379',
  },
  {
    title:
      'Mitigating the Performance and Quality of Parallelized Compressive Sensing Reconstruction Using Image Stitching',
    venue: 'ACM',
    year: '2019',
    link: 'https://doi.org/10.1145/3299874.3317991',
  },
]

export const skillGroups: { category: string; items: string[] }[] = [
  {
    category: 'Generative AI & Agents',
    items: [
      'LangChain',
      'LangGraph',
      'LlamaIndex',
      'OpenAI',
      'Anthropic',
      'Gemini',
      'Hugging Face',
      'Ollama',
      'RAG',
      'Multi-Agent Systems',
      'Prompt Engineering',
      'Tool Calling',
      'MCP',
    ],
  },
  {
    category: 'Machine Learning',
    items: [
      'PyTorch',
      'TensorFlow',
      'Scikit-learn',
      'XGBoost',
      'pandas',
      'NumPy',
      'Time-Series Forecasting',
      'Anomaly Detection',
    ],
  },
  {
    category: 'Infrastructure & DevOps',
    items: ['AWS (EC2, S3, VPC)', 'Docker', 'FastAPI', 'gRPC', 'CI/CD', 'Git'],
  },
  {
    category: 'Databases',
    items: ['MongoDB', 'PostgreSQL', 'InfluxDB', 'FAISS', 'Pinecone', 'Chroma'],
  },
  {
    category: 'Languages',
    items: ['Python', 'Java', 'JavaScript', 'SQL'],
  },
]
