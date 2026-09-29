/**
 * Resume data for Vishnu Vasavan — the single source of truth for
 * the 3D Robot Factory (zones, panels, holo screens), the V-26 assistant
 * (src/app/api/chat/route.ts) and the offline fallback.
 */

export type SkillGroup = { group: string; icon: string; items: string[] };
export type Project = { id: string; name: string; sub: string; tech: string[]; points: string[] };
export type Zone = { id: string; num: string; code: string; title: string; nav: string; z: number };

export const DATA = {
  name: 'Vishnu Vasavan',
  role: 'Software Engineer',
  location: 'Bangalore, India',
  phone: '+91 62827 49334',
  phoneHref: 'tel:+916282749334',
  email: 'vishnuvasavan26@gmail.com',
  linkedin: 'linkedin.com/in/v-vishnu-vish260623',
  github: 'github.com/Vishnu2663',
  summary: 'Software Engineer with hands-on experience building scalable backend applications using Node.js, Express.js, PostgreSQL, and AWS. Skilled in REST APIs, GraphQL, SQL optimization, stored procedures, and Odoo ERP integration. Currently contributing to production platforms — Prezence, Glyd, and Salary365 — delivering reliable, performant, and enterprise-grade backend systems.',
  focus: ['Backend', 'Cloud', 'Databases', 'APIs', 'AWS', 'DevOps'],
  languages: ['English', 'Kannada', 'Tamil', 'Malayalam', 'Hindi'],
  skills: [
    { group: 'Languages', icon: 'LNG', items: ['JavaScript', 'Java', 'SQL'] },
    { group: 'Backend', icon: 'API', items: ['Node.js', 'Express.js', 'REST APIs', 'GraphQL', 'Microservices'] },
    { group: 'Databases', icon: 'DB', items: ['PostgreSQL', 'MySQL', 'DynamoDB', 'Functions', 'Stored Procedures'] },
    { group: 'Cloud & AWS', icon: 'AWS', items: ['Lambda', 'S3', 'EC2', 'DynamoDB', 'AppSync'] },
    { group: 'Enterprise', icon: 'ERP', items: ['Odoo ERP', 'JSON-RPC', 'API Integration'] },
    { group: 'Tools & DevOps', icon: 'OPS', items: ['Git', 'GitHub', 'Docker', 'Maven', 'Postman', 'VS Code', 'Agile'] },
  ],
  experience: {
    company: 'Mobi80 Solutions', title: 'Software Engineer', location: 'Bangalore, India', dates: 'Dec 2025 — Present',
    points: [
      'Engineered scalable REST and GraphQL APIs with Node.js and Express.js across server-based and serverless architectures.',
      'Designed and optimized PostgreSQL queries, functions, and stored procedures for high-volume production workloads.',
      'Integrated AWS services (Lambda, S3, DynamoDB, AppSync) with Odoo ERP for invoicing, synchronization, and workflow automation.',
      'Resolved production issues, debugged critical incidents, and collaborated with cross-functional teams in an Agile environment.',
      'Improved backend performance through SQL tuning, indexing strategies, and API-level caching.',
    ],
  },
  projects: [
    { id: 'presence', name: 'Prezence', sub: 'Attendance Management Platform', tech: ['Node.js', 'PostgreSQL', 'AWS', 'GraphQL', 'AppSync'],
      points: ['Built backend APIs for real-time attendance tracking and workforce management.', 'Authored PostgreSQL functions and optimized SQL for reporting-heavy workloads.', 'Integrated AWS AppSync, Lambda, and S3 for authentication and backend workflows.'] },
    { id: 'glyd', name: 'Glyd', sub: 'Employee Travel & Expense Management', tech: ['Node.js', 'PostgreSQL', 'REST APIs'],
      points: ['Developed and maintained backend APIs for travel requests and expense processing.', 'Implemented core business logic, validations, and complex database operations.', 'Optimized SQL queries and indexes to reduce backend response times.'] },
    { id: 'salary365', name: 'Salary365', sub: 'Payroll Management Platform', tech: ['Node.js', 'PostgreSQL', 'AWS', 'Odoo ERP'],
      points: ['Delivered backend APIs for employee management and end-to-end payroll processing.', 'Implemented salary advance workflows and business-rule-driven validations.', 'Integrated Odoo ERP for invoice generation and bidirectional data synchronization.'] },
  ],
  academic: [
    { name: 'Sentiment Analysis on Social Media', sub: 'Machine Learning', text: 'Built a sentiment analysis model to classify social media text using machine learning techniques.' },
    { name: 'Dockerized Spring Boot Application', sub: 'Containerized CI Workflow', text: 'Containerized a Spring Boot application with Docker and set up a CI workflow for automated builds and deployments.' },
    { name: 'Java Web Application Deployment', sub: 'AWS EC2', text: 'Deployed a Java web application on AWS EC2 with proper configuration and environment setup.' },
  ],
  education: [
    { school: 'Sapthagiri College of Engineering', city: 'Bangalore', degree: 'B.E. Electronics & Communication', year: '2025', score: 'CGPA: 7.9' },
    { school: 'Seshadripuram PU College', city: 'Bangalore', degree: 'Pre-University (PUC)', year: '2021', score: 'Percentage: 86%' },
    { school: 'Rajarajeshwari English High School', city: 'Bangalore', degree: 'SSLC', year: '2019', score: 'Percentage: 89.28%' },
  ],
  certifications: ['Java Full Stack Development', 'IBM SkillBuild Certification', 'DevOps Certification'],
};

/** Factory zones, in walking order. `z` is the platform position along the factory hall. */
export const ZONES: Zone[] = [
  { id: 'about', num: '01', code: 'IDENTITY CORE', title: 'ABOUT ME', nav: 'ABOUT', z: -14 },
  { id: 'skills', num: '02', code: 'SKILL MODULES', title: 'TECHNICAL SKILLS', nav: 'SKILLS', z: -42 },
  { id: 'experience', num: '03', code: 'CAREER DATABASE', title: 'EXPERIENCE', nav: 'EXPERIENCE', z: -70 },
  { id: 'projects', num: '04', code: 'PROJECT WORKSHOP', title: 'PROJECTS', nav: 'PROJECTS', z: -98 },
  { id: 'education', num: '05', code: 'KNOWLEDGE ARCHIVE', title: 'EDUCATION', nav: 'EDUCATION', z: -126 },
  { id: 'contact', num: '06', code: 'COMMUNICATION HUB', title: 'CONTACT', nav: 'CONTACT', z: -154 },
];

/** Plain-text dossier used to ground the V-26 assistant. */
export function resumeAsText(): string {
  const D = DATA;
  return [
    `NAME: ${D.name}`, `ROLE: ${D.role}`, `LOCATION: ${D.location}`, `PHONE: ${D.phone}`, `EMAIL: ${D.email}`,
    `LINKEDIN: ${D.linkedin}`, `GITHUB: ${D.github}`, `SUMMARY: ${D.summary}`,
    'TECHNICAL SKILLS:', ...D.skills.map((g) => `- ${g.group}: ${g.items.join(', ')}`),
    `PROFESSIONAL EXPERIENCE: ${D.experience.company} — ${D.experience.title}, ${D.experience.location}, ${D.experience.dates}`,
    ...D.experience.points.map((p) => `- ${p}`),
    'PROFESSIONAL PROJECTS:',
    ...D.projects.flatMap((p) => [`- ${p.name} — ${p.sub} (${p.tech.join(', ')})`, ...p.points.map((x) => `  * ${x}`)]),
    'ACADEMIC PROJECTS:', ...D.academic.map((a) => `- ${a.name} — ${a.sub}: ${a.text}`),
    'EDUCATION:', ...D.education.map((e) => `- ${e.school}, ${e.city} — ${e.degree}, ${e.year}, ${e.score}`),
    `CERTIFICATIONS: ${D.certifications.join('; ')}`, `LANGUAGES: ${D.languages.join(', ')}`,
  ].join('\n');
}
