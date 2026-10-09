---
title: "The Jenkins Job That Took 6 Tries"
summary: "Provisioned Jenkins on EC2 with Terraform and documented all six failed attempts: AMI, Java version, wget, GPG order, nested heredocs and key rotation."
stack: ["Terraform", "AWS EC2", "Jenkins", "Amazon Linux 2023", "S3"]
date: 2026-04-19
order: 6
writeup: "i-tried-to-deploy-a-jenkins-server-with-terraform-it-took-six-attempts"
---

## The goal

Use Terraform to deploy a Jenkins CI/CD server on an EC2 t2.micro running Amazon Linux 2023. A user data script bootstraps Jenkins, SSH is restricted to my IP, and a private S3 bucket with every public-access block enabled holds artifacts. It took six attempts and about four hours.

## The six failures

1. **Wrong AMI.** A hardcoded ID turned out to be Amazon Linux 2, not AL2023. The cloud-init log gave it away. A `data "aws_ami"` block now resolves the latest AL2023 image.
2. **Java 17 was too old.** Jenkins required Java 21. I had followed guides that still referenced Java 17, and now I check runtime requirements against the official docs.
3. **`wget` was missing.** AL2023 doesn't ship it, so I switched to `curl`.
4. **GPG import order.** I imported the Jenkins signing key after writing the repo file, and dnf checks the key as soon as it loads the repo. The fix is to import the key first.
5. **Nested heredocs.** A shell heredoc inside Terraform's heredoc was mangled before it reached the instance. A single `printf` writes the repo file instead.
6. **Key rotation.** dnf reported `GPG check FAILED` because the current package was signed with a newer key than the one the repo file pointed to.

## The working setup

The AMI comes from a data source and `user_data_replace_on_change` recreates the instance when the bootstrap script changes. Each step logs to `/var/log/user-data.log`, and the outputs are the public IP, the Jenkins URL and the bucket name.

The most useful single change was redirecting all script output to its own log file at the top of the bootstrap script, so the evidence exists before you need it.

## What I'd change

- I unblocked attempt six with `gpgcheck=0`. That is not acceptable for production, so the next version pins the correct signing key.
- There is no EC2 key pair, so access relies on EC2 Instance Connect.
- Everything lives in a single `main.tf` with local state. A team would use remote state in S3 with locking and split the file into modules.

The six failures were the curriculum. Knowing what an AMI contains, what the OS ships and how dnf checks signatures comes from watching it break.
