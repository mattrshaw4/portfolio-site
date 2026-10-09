---
title: "I Built 28 AWS Resources for $22/Month. Here Are the 5 Things That Went Wrong."
summary: "What building auto-scaling AWS infrastructure in Terraform looks like: 28 resources, five things that went wrong, and about $22 a month."
kind: medium
date: 2026-06-29
mediumUrl: "https://medium.com/@matt.r.shaw4/i-built-28-aws-resources-for-22-month-here-are-the-5-things-that-went-wrong-736eb94bf4bf"
tags: ["aws","terraform","cost-optimization","engineering","devops"]
---

## What building auto-scaling AWS infrastructure actually looks like

![](/images/writing/i-built-28-aws-resources-for-22-month-here-are-the-5-things-that-went-wrong/img-1.jpg)

I typed mkdir and got an error.

Not a Terraform error. Not an AWS error. A missing mkdir. One of the most fundamental commands in Linux. The kind of thing that's supposed to just work.

That was minute three of a build session that would eventually provision 28 AWS resources across 8 phases, produce a live URL served by two EC2 instances in different availability zones, and cost me about $0.70 a day to run.

But first, I had to figure out why my machine didn’t have mkdir.

## What I Was Building

The project is called terraform-aws-autoscale-infra. The goal was straightforward in concept: build production-grade, cost-optimized, highly available web infrastructure on AWS, provisioned entirely with Terraform, with every architectural decision documented and justified.

Not a tutorial project. A decision-making project.

The business case I wanted to demonstrate: a fixed t3.medium instance running 24/7 costs about $33/month and gives you roughly 99.5% availability in a single AZ. This project an Application Load Balancer distributing traffic across an Auto Scaling Group of t3.micro instances in two availability zones runs at about $22/month at typical load and delivers 99.95% availability.

The $11/month difference in AWS cost is almost irrelevant. The real saving is operational. Manual provisioning at a $75/hr consulting rate means every infrastructure change costs $150-$300 in engineering time. This project’s provisioning cost is terraform apply$0, reproducible in under 10 minutes.

That’s the story I wanted to tell. Here’s the build that got me there.

## Failure #1: My Machine Didn’t Have mkdir

I’m running Ubuntu 26.04 LTS on my desktop. What I didn’t fully appreciate until this build was that Ubuntu 26.04 ships with **uutils** a Rust-based re-implementation of GNU coreutils as the default userland.

Roughly 80 standard Linux commands now run as Rust binaries. And somewhere in that transition, mkdir wasn't properly linked on my system.

```
Command 'mkdir' not found, did you mean:  command 'mkdir' from deb coreutils-from-gnu  command 'mkdir' from deb coreutils-from-uutils
```

My first instinct was to install coreutils-from-gnu. That failed too:

```
Error: Unable to satisfy dependencies. Reached two conflicting assignments:  coreutils-from-gnu is selected for install  coreutils-from-gnu is not selected because coreutils-from-uutils Conflicts
```

The fix was unglamorous: python3 -c "import os; os.makedirs('path', exist\_ok=True)". Python3 is always present. It worked. We moved on.

**What I learned:** Know your environment before you trust it. Ubuntu 26.04 is a significant release kernel 7.0, sudo-rs replacing GNU sudo, uutils replacing coreutils, post-quantum SSH by default. A good chunk of advice that was correct on 24.04 breaks or changes on 26.04. The tools you assume are there might not be.

## Failure #2: I Exposed My AWS Credentials in a Screenshot

This one I’ll be direct about because it’s the failure most worth documenting.

I was configuring AWS credentials on my desktop, A machine I hadn’t set up for AWS CLI access yet. I ran aws configure, entered my credentials, and then shared a screenshot to verify the setup was working.

The screenshot showed the Access Key ID and Secret Access Key in plain text.

The fix took about 90 seconds: IAM console, deactivate the key, delete it, generate a new one, reconfigure. AWS credentials compromised via exposed screenshots get picked up by automated scanners within minutes. The speed of rotation matters.

**What I learned:** Before you share any terminal screenshot, scroll up. Credentials appear in aws configure output and they stay visible in your terminal history. Rotate immediately if you're uncertain. The 90 seconds to rotate is always faster than the damage control if you don't.

The deeper lesson: this is exactly why IAM roles with OIDC are the right approach for CI/CD pipelines. No static credentials. Nothing to accidentally expose.

## Failure #3: An Em Dash Broke AWS

I write with em dashes. The kind that looks like this. Not a hyphen. A proper em dash.

When I wrote security group rule descriptions “HTTP from ALB only no direct internet access” those descriptions went into Terraform HCL files and eventually into AWS API calls.

AWS security group rule descriptions have a strict character allowlist: ^\[0-9A-Za-z\_ .:/()#,@\\\[\\\]+=&;{}!$\*-\]\*$

The em dash is not in that list.

```
Error: "egress.0.description" doesn't comply with restrictions:"All outbound — ALB forwards to EC2 instances"
```

Exit code 3 from terraform plan. The fix was a single sed command:

```
sed -i 's/—/-/g' security_groups.tf
```

**What I learned:** AWS character restrictions in description fields are stricter than you’d expect. Special characters, smart quotes, em dashes anything outside basic ASCII in API strings will fail validation. Write descriptions in plain ASCII. Your infrastructure doesn’t care about typography.

## Failure #4: The File in the Wrong Directory

Midway through Phase 4, I ran nano variables.tf from the wrong directory. Instead of adding four new variables to the project's existing variables.tf, I created a fresh file in my home directory.

The symptom was subtle: cat variables.tf showed only the four new variables, not the ten I expected.

```
# The giveaway: wrong promptknightofcash@hostname:~$ cat variables.tf    # home directory# vs the correct:knightofcash@hostname:~/terraform-aws-autoscale-infra$ cat variables.tf
```

Fix: delete the misplaced file, navigate to the correct directory, add the variables to the right file.

**What I learned:** pwd before you write. This is embarrassingly simple and I still walked into it. When you're context-switching between bootstrap and the main project directory, it's easy to lose track of where your terminal is sitting. Check before you create.

## Failure #5: The CI Pipeline Failed on Formatting

Phase 7 was the GitHub Actions CI/CD pipeline. I pushed the workflow file, watched the Actions tab, and got a red X.

The error: Terraform exited with exit code 3.

terraform fmt -check returns exit code 3 when it finds files that need formatting. When you write Terraform in nano and paste content, the whitespace doesn't always match what terraform fmt expects. Indentation, alignment, spacing — all of it is checked.

```
terraform fmt -recursive
```

That command auto-corrected every .tf file in the project. One push later, the pipeline went green.

There was also a Node.js 20 deprecation warning in the runner — the pinned action versions needed updating to Node.js 24-compatible releases. A three-line fix in the workflow YAML.

**What I learned:** terraform fmt -recursive before every commit. Make it muscle memory. The CI pipeline will enforce it anyway better to fix it locally than debug it in a runner. Also: action version strings matter. @v4 and @v4.2.2 are different things.

## What Actually Got Built

After all of that, here’s what the project produces:

A VPC spanning two availability zones. An Application Load Balancer that distributes traffic between them. An Auto Scaling Group that maintains between one and four EC2 instances based on CPU load, scaling out when average CPU exceeds 70% for four consecutive minutes and scaling in when it drops below 20%.

Remote state stored in S3 with native locking no DynamoDB table required. Terraform 1.11 deprecated dynamodb\_table in favor of use\_lockfile = true, which uses S3 conditional writes to prevent concurrent applies.

EC2 instances accessed via SSM Session Manager. No SSH keys, no open port 22, no bastion host. IAM instance profiles grant the minimum permissions needed.

IMDSv2 required on the launch template. Dynamic AMI lookup via data source, no hard coded AMI IDs that go stale.

A GitHub Actions CI pipeline that validates formatting, syntax, and backend connectivity on every push. A plan that runs on every pull request.

28 resources total. Every one of them has a reason in the README.

## The Kitchen Analogy, Honestly

The prep cook analogy gets used a lot in my writing. Kitchens and cloud systems fail the same way under unexpected load, when a critical component goes down, when a process that should be automatic isn’t.

The thing that made this project feel real was the staffing model. An Auto Scaling Group is exactly how a good kitchen operates: you don’t have a full line team standing around at 7am when you’re serving four covers. You staff up for the dinner rush, run lean during prep, and scale back after close.

The infrastructure does the same thing. Two instances at typical load. One at minimum. Four at peak. The CloudWatch alarms are the sous chef watching ticket volume and calling for more hands when the board fills up.

That’s not a metaphor I forced onto the project after the fact. It’s the actual operational model, described in infrastructure code.

## The Numbers

Building this cost roughly $3 in AWS charges a few hours of EC2 and ALB running while I was building and testing.

Running it costs ~$22/month at typical load, ~$14/month at minimum capacity.

Rebuilding it from scratch costs $0 in AWS charges and about 10 minutes of terraform apply waiting.

That last number is the one that matters for a portfolio project. Infrastructure you can destroy and recreate on demand is infrastructure you can demonstrate on demand.

The full project is on GitHub: [github.com/mattrshaw4/terraform-aws-autoscale-infra](https://github.com/mattrshaw4/terraform-aws-autoscale-infra)

I write about this transition from professional kitchen to cloud infrastructure in my newsletter [_Terraforming My Career_](https://www.linkedin.com/newsletters/terraforming-my-career-7395876133298343936). If you’re building in public and want to follow along, you can find it on Medium.

_Matt Shaw — Cloud Engineer_ [_mattrshaw.com_](https://mattrshaw.com/) _·_ [_LinkedIn_](https://linkedin.com/in/mattrshaw4)
