export interface Job {
  role: string;
  org: string;
  years?: string;
  note?: string;
}
export interface Training {
  name: string;
  org: string;
  detail?: string;
}
export interface SkillGroup {
  group: string;
  items: string[];
}

export const resume = {
  headline:
    'Cloud DevOps Engineer with 20 years in hospitality and retail, now building AWS infrastructure with Terraform and GitHub Actions.',
  experienceIntro: 'Two decades managing commercial kitchens.',
  experience: [
    { role: 'First Cook', org: 'Horseshoe Resort', years: '', note: '' },
    { role: 'Food Service', org: 'Costco Wholesale Canada', years: '', note: '' },
  ] as Job[],
  training: [
    {
      name: 'Cloud DevOps Engineering program',
      org: 'Level Up In Tech',
      detail: '37 weeks · graduated May 2026',
    },
    { name: 'Google Cybersecurity Professional Certificate', org: 'Google', detail: '' },
  ] as Training[],
  skills: [
    { group: 'Cloud & Infrastructure', items: ['AWS EC2', 'S3', 'CloudFront', 'Lambda', 'IAM', 'CloudWatch', 'Bedrock'] },
    { group: 'Infrastructure as Code', items: ['Terraform', 'HCL', 'Remote State', 'S3 Backend'] },
    { group: 'Containers', items: ['Docker', 'Docker Swarm'] },
    { group: 'CI/CD & Automation', items: ['GitHub Actions', 'Jenkins', 'OIDC Auth', 'Bash', 'Python'] },
    { group: 'Systems & Local AI', items: ['Ubuntu Linux', 'systemd', 'Ollama', 'CrewAI'] },
  ] as SkillGroup[],
};
