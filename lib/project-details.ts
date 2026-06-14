export type ProjectDetail = {
  slug: string
  overview: string
  architecture: string
  results: string[]
  screenshotCount: number
  screenshots?: string[]
  links: { label: string; url: string }[]
}

export const projectDetails: ProjectDetail[] = [
  {
    slug: 'aime',
    overview: `Traditional recruitment at global scale is manual, slow, and inconsistent. Sourcing candidates across multiple countries, parsing CVs in different formats, and matching them to job descriptions took days of human effort with no standardization.

AIME is a production agentic RAG ecosystem that automates the entire pipeline — from CV ingestion and standardization to semantic matching and job board integration. As Lead System Architect, I designed the full architecture and led a team of two developers from design to production on AWS EC2.

An intelligent ingestion engine monitors a SharePoint Data Lake, using LLMs to detect candidate locations from CV metadata and route files to country-specific S3 buckets and MongoDB collections. A preprocessing layer standardizes every CV into structured summaries and skills taxonomies. The Agentic CV Matcher then performs deep semantic search using RAG over FAISS, dynamically selecting the right geographic context per job description. Integration with 4 global job boards completes the loop — automating ad creation and harvesting external candidates into a unified intelligence hub.`,
    architecture: '/AIme_Arch.png',
    results: [
      '10,000+ CVs processed and standardized autonomously',
      'Multi-day manual recruitment process reduced to minutes',
      'Integrated with 4 global job boards for automated candidate sourcing',
      'Led a team of 2 developers end-to-end from design to production',
      'Deployed on AWS EC2 with MongoDB, S3, and FAISS vector database',
    ],
    screenshotCount: 2,
    screenshots: ['/AIme_ss_1.png', '/AIme_ss_2.png'],
    links: [
      { label: 'Live Product', url: 'https://aimetalent.com' },
    ],
  },
  {
  slug: 'thesis',
  overview: `Aspect-Based Sentiment Analysis (ABSA) requires fine-grained identification of sentiment toward specific aspects in text — but labeled training data is scarce and expensive to produce. This research introduces the first agentic data augmentation framework for ABSA, using a Generator-Evaluator architecture built on a ReAct-style agent framework. A generator agent extracts style policies and produces candidate sentences, while an evaluator agent verifies label consistency before accepting them into the synthetic dataset. This structured pipeline produces significantly cleaner data than naive prompting — the same model, same prompts, but with explicit verification steps making all the difference.`,
  architecture: '/agent_thesis_workflow.png',
  screenshots: ['/Thesis_main_results.png', '/agent_vs_prompting.png', '/fill_gap_final.png'],
  results: [
    'Agentic augmentation achieved 78.17% label consistency in ATE vs 43.89% for raw prompting',
    'T5-Base with agentic mixed data matched or surpassed the heavily pretrained Tk-Instruct baseline',
    'Consistent F1 improvements across ATE and ATSC subtasks on all 4 SemEval datasets',
    'Evaluated across Laptop14, Rest14, Rest15, Rest16 benchmarks using InstructABSA framework',
    'Synthetic-only training gap confirmed — agentic data most effective when mixed 1:1 with real data',
  ],
  screenshotCount: 3,
  links: [
    { label: 'Read Paper', url: 'https://arxiv.org/pdf/2602.16379' },
  ],
  },
  {
    slug: 'sms-forecasting',
    overview: `SMS Group needed to evaluate optimization opportunities in cold rolling mill factories using high-frequency raw sensor signals — but 10 minutes of signals could reach 10GB, making storage and analysis impractical at scale.

Took the project from proof of concept to a production MVP over two years. The core of the system is an ETL pipeline: specialized Python workflows automatically detect steady production phases in raw sensor streams, transform 10GB/10-minute windows into compact high-value summaries, and load them into SQL for downstream modeling — dramatically cutting storage requirements while preserving critical signal information. Worked closely with domain experts through iterative sessions to align processing with industry standards.

Formulated the optimization problem mathematically, designing a custom loss function and testing a wide range of ML approaches. The resulting forecasting and anomaly detection models outperformed standard methods by 30%. The MVP integrates end-to-end with factory systems via gRPC, stores results in SQL databases, and provides real-time dashboards for engineers and managers. It automatically cleans data, segments production phases, and retrains models continuously — supporting predictive maintenance and process optimization.`,
    architecture: '',
    results: [
      'Took the project from proof of concept to production over two years',
      'Custom forecasting and anomaly detection models outperformed standard methods by 30%',
      'Increased factory efficiency by 2%',
      'Reduced storage requirements while preserving signal information from 10GB/10-minute windows',
      'Currently in active use at SMS Group\'s cold rolling mills',
      'End-to-end gRPC integration with factory systems and SQL-backed real-time dashboards',
    ],
    screenshotCount: 2,
    screenshots: ['/SMS_1.png', '/SMS_2.png'],
    links: [],
  },
  {
    slug: 'rag-chatbot',
    overview: 'PLACEHOLDER — Coming soon. RAG backend under construction.',
    architecture: 'PLACEHOLDER — Add architecture diagram here',
    results: [],
    screenshotCount: 0,
    links: [],
  },
]
