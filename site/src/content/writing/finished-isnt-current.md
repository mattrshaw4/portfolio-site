---
title: "Finished Isn't the Same as Current"
summary: "Nine things an audit found on a site I had called done."
kind: newsletter
date: 2026-10-09
---

The site was done. I'd been saying so for weeks. Full security header suite, structured data, HSTS with preload, a real CI/CD pipeline through GitHub Actions, seven documented projects. Every piece I checked came back clean.

Then I ran one actual audit against it, and found nine things wrong. None of them were visible on the page. All nine were sitting quietly in versions and configuration nobody looks at once a project feels finished.

The AWS Terraform provider was pinned a full major version behind, stuck on v5 while v6 had shipped over a year earlier and moved into security patches only. Two of my GitHub Actions were three major versions old. There was no Content Security Policy header, even though I'd already added five other security headers in an earlier pass. My Terraform state had no locking and no explicit encryption flag on the backend itself. And the live website's own storage bucket wasn't set to encrypt its contents by default, while the separate state bucket sitting right next to it was.

None of that showed up by looking at the site. It only showed up by checking.

In a kitchen, "looks clean" and "passes health code" are not the same test. You log the walk in temperature even when nothing smells off. You rotate stock by date even when the front of the shelf looks fresh. The habit isn't there to catch what you can already see. It's there to catch what a visual pass will never show you, because by the time it's visible, it's already a problem.

Infrastructure works the same way. A site can run perfectly, load fast, look polished, and still be carrying real gaps that only show up when you stop trusting "it's fine because it works" and actually run the check.

Worth being honest about the other side of this too. Fixing all nine wasn't hard. It was mechanical. Bump the version, run a plan, read the diff, apply, verify with a request header check. None of it needed deep expertise. What it needed was a checklist and the discipline to actually run it against the real thing, instead of assuming a finished looking project doesn't need one.

And this isn't a one time fix either. Six months from now a new major version ships somewhere in this stack, and the same gap reopens quietly in the exact same way. The audit isn't the work. Repeating it is.

Finished and current are different claims. Only one of them holds up without maintenance.

What in your own stack still "works," but hasn't actually been checked in months?
