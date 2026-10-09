import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

const SITE = 'https://mattrshaw.com';

export const GET: APIRoute = async () => {
  const projects = (await getCollection('projects')).sort((a, b) => b.data.order - a.data.order);
  const posts = (await getCollection('writing', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  const lines = [
    '# Matt Shaw',
    '',
    '> Cloud DevOps Engineer based in Orillia, Ontario, Canada. 20 years in Hospitality and Retail, now building AWS infrastructure with Terraform and GitHub Actions. Open to Cloud and DevOps roles.',
    '',
    'Matt moved from two decades in hospitality and retail management into cloud engineering, completing the Level Up In Tech Cloud DevOps Engineering program in 2026. He documents the move in his newsletter, Terraforming My Career.',
    '',
    '## Pages',
    '',
    `- [Home](${SITE}/): Who Matt is and what he is building.`,
    `- [Resume](${SITE}/resume/): Work history and skills.`,
    `- [Projects](${SITE}/projects/): ${projects.length} case studies with architecture, decisions and what went wrong.`,
    `- [Writing](${SITE}/writing/): Newsletter issues and articles on AWS, Terraform, Docker and CI/CD.`,
    '',
    '## Projects',
    '',
    ...projects.map((p) => `- [${p.data.title}](${SITE}/projects/${p.id}/): ${p.data.summary}`),
    '',
    '## Writing',
    '',
    ...posts.map((w) => `- [${w.data.title}](${SITE}/writing/${w.id}/): ${w.data.summary}`),
    '',
    '## Elsewhere',
    '',
    '- [Newsletter](https://www.linkedin.com/newsletters/terraforming-my-career-7395876133298343936): Terraforming My Career, a public log of the move from hospitality to cloud infrastructure.',
    '- [GitHub](https://github.com/mattrshaw4): Source code and READMEs for every project.',
    '- [Medium](https://medium.com/@matt.r.shaw4): Long-form write-ups.',
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
