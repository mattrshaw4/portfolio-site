---
title: "Migrating an AEO Agency Off Squarespace"
summary: "Rebuilt Penpixel Creative's own site from Squarespace into a custom Astro build on Cloudflare Pages, with a scoped CSP, HSTS and AI-crawler allowlisting."
stack: ["Astro", "Tailwind CSS", "Cloudflare Pages", "CSP", "HSTS preload", "Cloudflare Turnstile"]
date: 2026-06-29
order: 8
repo: "https://github.com/mattrshaw4/penpixel-site"
liveUrl: "https://penpixelcreative.com"
---

## The problem

An agency that sells AI-search readiness can't run its own site on a platform that hides the technical layer that readiness depends on. The site is the proof of the service, so I rebuilt it from scratch.

## What I built

A static site on Astro 5 and Tailwind CSS 4, deployed to Cloudflare Pages on every push to `main`. It has a blog, service pages, case studies and a contact form. Fonts are self-hosted, so no request leaves for Google Fonts.

I pinned Astro to version 5 on purpose. When I built it, Astro 6 and 7 shipped a Vite that broke the Tailwind plugin.

The contact form runs in a Cloudflare Pages Function: honeypot check, server-side validation, Cloudflare Turnstile verification, then email through Resend. Secrets live in Cloudflare environment variables and never in the repo.

## Built to be read by AI systems

- A `robots.txt` with Content-Signal directives that explicitly welcome AI crawlers. I declined Cloudflare's managed robots.txt so my own rules stay in control.
- Cloudflare's Search, Agent and Training crawler settings are set to allow.
- An `llms.txt` file that gives AI systems a curated map of the site.
- FAQPage structured data on four service pages, with the JSON-LD escaped so it can't break out of its script tag.
- Two to four contextual internal links on each migrated blog post. There were none before.

## Security

- A CSP with `script-src 'self'` plus Turnstile, and `style-src 'self'` with no `unsafe-inline`. The build turns off inline stylesheets to enforce it.
- Security headers set at the edge and reviewed against the OWASP Top 10 (2021).
- Turnstile is verified on the server. Client-side checks are only for user experience.

## What broke

- **Mobile navigation vanished below 640px.** I replaced it with a hamburger menu driven by an external script, because the CSP forbids inline JavaScript.
- **The CSP breaks inline styles silently.** An inline `<style>` or `style=""` throws no build error, so I now check pages in the browser.
- **Email DNS records didn't survive migration.** Resend's MX and TXT records were dropped by Cloudflare's automatic DNS import, and I re-added them by hand.
- **`npm audit` noise.** Of roughly seven advisories, six were dev-only and one affected a code path a static build never runs. I documented them instead of running a forced fix.
