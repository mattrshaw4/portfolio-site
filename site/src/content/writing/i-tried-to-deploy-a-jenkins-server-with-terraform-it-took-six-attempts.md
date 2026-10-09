---
title: "I Tried to Deploy a Jenkins Server with Terraform. It Took Six Attempts."
summary: "Here’s what broke, why it broke, and what I actually learned."
kind: medium
date: 2026-04-19
mediumUrl: "https://medium.com/@matt.r.shaw4/i-tried-to-deploy-a-jenkins-server-with-terraform-it-took-six-attempts-dcd6c14a29d2"
tags: ["devops","cloud-computing","aws","jenkins","terraform"]
---

_Here’s what broke, why it broke, and what I actually learned._

![](/images/writing/i-tried-to-deploy-a-jenkins-server-with-terraform-it-took-six-attempts/img-1.png)

Prompt: Claude Image: Chat GTP

It was a Sunday morning. I had a pot of coffee, a clear task, and what I thought was a reasonable expectation: spin up a Jenkins CI/CD server on AWS using Terraform, document it, push it to GitHub. A few hours, tops.

Four hours later I was staring at my sixth terraform apply and whispering at my screen like that was going to help.

The server finally came up. Jenkins loaded in the browser. I took the screenshot I needed for my documentation — and sat there for a minute before typing a single word.

Not because I was proud. Because I was thinking about how different this was from what I expected, and how much closer it felt to real engineering than anything I’d done before.

## The Problem

The assignment was straightforward enough. Use Terraform to provision a Jenkins server on an EC2 instance in your Default VPC. Bootstrap Jenkins with a user data script. Lock down SSH to your IP. Create a private S3 bucket for artifacts. Push the code to GitHub.

I’ve been studying cloud DevOps for months. I know what Terraform does. I know what Jenkins is. I know what EC2 is. On paper this was a connect-the-dots exercise.

What I didn’t account for was the gap between knowing how things work in theory and actually getting them to work together on a real machine, in a real AWS account, with real package managers and real GPG keys and real OS differences that nobody warned me about.

That gap is where most of the learning lives. I just didn’t know that going in.

## What Broke (All Six Times)

Here’s the full breakdown. I’m documenting this not to complain, but because every one of these failures taught me something I wouldn’t have found in a tutorial.

## Failure 1 — Wrong AMI

I hardcoded an AMI ID I found online for Amazon Linux 2023. Turns out it was actually Amazon Linux 2 is a different operating system entirely. The cloud-init log told me when it printed Cloud-init v. 19.3-46.amzn2.

**What I learned:** Never hardcode AMI IDs. They differ by region and rotate when Amazon pushes OS updates. The right move is a Terraform data "aws\_ami" block with filters that resolve the latest correct AMI dynamically. I changed my main.tf to use that pattern. One less thing to maintain manually.

## Failure 2 — Java 17 Is No Longer Enough

Jenkins started, ran for about two seconds, and crashed. The log said:

```
Running with Java 17... which is older than the minimum required version (Java 21).Supported Java versions are: [21, 25]
```

Jenkins had quietly updated its minimum Java requirement. My bootstrap script installed Java 17 because that’s what a lot of guides still reference. The guides were behind.

**What I learned:** Always check current runtime requirements against official documentation before writing a bootstrap script. The Jenkins Java support page is updated with each major release. The guide you’re following might not be.

## Failure 3 — wget Doesn't Come With Amazon Linux 2023

Once I was on the right OS with the right Java version, the script failed because wget isn't installed on AL2023 by default. I'd used wget to download the Jenkins repo file. AL2023 ships lean — it doesn't include tools it considers optional.

```
line 11: wget: command not found
```

**What I learned:** Don’t assume tool availability across distributions. curl is the right choice for AL2023 — it ships by default. One character change, but it matters.

## Failure 4 — GPG Key Import Order

With curl in place, the repo file downloaded — but dnf still refused to load it. The problem was ordering. I was importing the Jenkins GPG signing key _after_ writing the repo file. dnf validates the key at load time, not at install time. By the time it saw the repo, it was looking for a key that hadn't been imported yet.

**What I learned:** Sequencing matters in bootstrap scripts. When dnf encounters a repo with gpgcheck=1, it checks for the key immediately. Import the key first, then add the repo. Always.

## Failure 5 — Nested Heredocs Don’t Play Well With Terraform

To write the repo file cleanly inside the user\_data block, I tried using a heredoc inside a heredoc — a shell << 'REPO' block inside Terraform's <<-USERDATA. The file was being written but dnf couldn't parse it. Something in the formatting was getting mangled by the time it hit the instance.

I switched to printf to write the repo file inline:

```
printf '[jenkins]\nname=Jenkins-stable\nbaseurl=https://pkg.jenkins.io/redhat-stable\ngpgcheck=0\nenabled=1\n' > /etc/yum.repos.d/jenkins.repo
```

**What I learned:** Avoid nested heredocs in Terraform user\_data. Terraform processes the outer heredoc before the shell sees it, and things can get mangled. printf is cleaner and more predictable.

## Failure 6 — Jenkins Rotated Their GPG Key

Almost there. The repo was loading. dnf found Jenkins. Then:

```
GPG check FAILEDThe GPG keys listed for the "Jenkins-stable" repository are already installedbut they are not correct for this package.
```

Jenkins had rotated their package signing key. The key URL in the repo pointed to jenkins.io-2023.key, but the current package — jenkins-2.555.1 — was signed with a newer key. The mismatch killed the install.

For this foundational project I set gpgcheck=0 to unblock the deployment. That's not something you'd do in production — in a real environment you'd identify the current verified key from the official Jenkins docs and pin it explicitly. But for a learning project with a clear scope, it was the right call to make, documented transparently.

**What I learned:** GPG key rotation is a real operational problem, not a theoretical one. Production Jenkins deployments need a documented process for key rotation — and infrastructure teams need to know when upstream vendors rotate keys so they can update before pipelines break.

## The Framework — What the Terraform Code Actually Does

Once everything was working, here’s what the final main.tf provisions:

**The AMI data source**: Instead of a hardcoded ID, Terraform looks up the latest Amazon Linux 2023 AMI by name filter at apply time. This means the code stays correct as Amazon releases OS updates.

**The Security Group:** Port 22 locked to my specific IP address (plus the EC2 Instance Connect CIDR range for us-east-1), port 8080 open for the Jenkins UI, all outbound allowed so Jenkins can download plugins.

**The EC2 instance:** t2.micro running AL2023 with user\_data\_replace\_on\_change = true, which tells Terraform to destroy and recreate the instance if the bootstrap script changes. Without this flag, Terraform just updates state without re-running the script on the existing instance.

**The bootstrap script**: Installs Java 21, writes the Jenkins repo file, clears the dnf cache, installs Jenkins, enables and starts the service. Every step echoes a log message to /var/log/user-data.log so failures are visible and debuggable.

**The S3 bucket: P**rivate artifact storage with all four public access block settings explicitly enabled. AWS has a default block at the account level now, but explicitly blocking it in code means the intent is documented and enforced even if account defaults change.

**The outputs:** After apply, Terraform prints the public IP, the full Jenkins URL, and the S3 bucket name. No digging through the console to find what you deployed.

## The Limitations

A few things I’d do differently in a non-foundational context:

**No key pair on the EC2 instance.** I relied on EC2 Instance Connect for terminal access, which works — but only if the Instance Connect IP range is in your Security Group. I learned this the hard way when the direct connect failed on the first attempt.

**gpgcheck=0 in the Jenkins repo.** Acceptable for a learning project. Not acceptable in production. The right approach is to pin the current verified signing key and have a runbook for rotating it.

**Monolith** **main.tf.** Everything in one file is fine when you're learning and want to see the whole picture at once. As projects grow, you'd split this into modules — a network module, a compute module, a storage module — so components can be reused across environments.

**No remote state.** The terraform.tfstate file lives locally. In a team environment you'd store state in S3 with DynamoDB locking so multiple engineers can work on the same infrastructure without stepping on each other.

**No key pair** means no direct SSH without Instance Connect. For anything beyond a learning project, you’d generate a key pair and reference it in the instance block.

## What I Actually Took Away From This

At failure four I had a choice. Shut down the computer, tell myself I’d come back to it, and quietly move on to the next project. Nobody would have known. I kept going instead. Not because I was certain I’d fix it, But I’d been here before. Twenty years in a kitchen teaches you that panicking when service falls apart doesn’t unsauce the pasta. You breathe, you read the situation, you make the next move. So that’s what I did. I read the log. I made the next move. Six times. The six failures weren’t a sign that I did something wrong. They were the actual curriculum.

In a kitchen, your first service in a new station is never smooth. You don’t know where things are, you don’t know the rhythm of the equipment, you haven’t hit the failure modes yet. The second service is better. The third is better still. You’re not learning the recipe you’re learning the environment.

That’s what this project was. I knew the recipe: Terraform, EC2, user\_data, Jenkins. What I didn’t know was the environment: which AMI is actually AL2023, what AL2023 ships with by default, what Jenkins requires this month, how dnf handles GPG validation at repo load time.

That knowledge doesn’t come from documentation. It comes from watching things break and figuring out why.

The other thing I took away: logging matters before you need it. The single most useful change I made across all six iterations was adding exec > /var/log/user-data.log 2>&1 to the top of the bootstrap script. Before that, I was relying on cloud-init's output log, which truncates and sometimes doesn't capture the right lines. Once I had my own log file, I could see exactly which step failed and move straight to the fix.

In production, you’d ship logs to CloudWatch. Same principle if something breaks at 2 AM, you want to know exactly where it stopped.

## Try It Yourself

The full code is on GitHub: [github.com/mattrshaw4/jenkins-terraform](https://github.com/mattrshaw4/jenkins-terraform)

Clone it, update the IP address in the Security Group, run terraform apply, and you'll have a Jenkins server running in about six minutes. The README walks through every step including the cleanup command to avoid AWS charges when you're done.
