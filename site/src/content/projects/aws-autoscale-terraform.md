---
title: "28 AWS Resources for $22/Month"
summary: "Auto-scaling, highly available AWS infrastructure in Terraform: ALB, two availability zones, CloudWatch scaling and S3 state with native locking."
stack: ["Terraform", "AWS EC2", "ALB", "Auto Scaling", "CloudWatch", "GitHub Actions"]
date: 2026-06-29
order: 7
repo: "https://github.com/mattrshaw4/terraform-aws-autoscale-infra"
writeup: "i-built-28-aws-resources-for-22-month-here-are-the-5-things-that-went-wrong"
---

## What it builds

An internet-facing Application Load Balancer in front of an Auto Scaling Group of t3.micro instances running Amazon Linux 2023 and Apache, spread across two public subnets in us-east-1a and us-east-1b. The group runs a minimum of 1, desired 2 and maximum 4. CloudWatch alarms add an instance when CPU passes 70% and remove one when it drops below 20%.

## The 28 resources

- Remote state: 5 (versioned, encrypted, public access blocked, native locking)
- Networking: 8 (VPC, two subnets, internet gateway, route tables)
- Security groups: 2
- Compute: 5 (IAM role and SSM profile, launch template, Auto Scaling Group)
- Load balancer: 4 (ALB, target group, listener, attachment)
- Scaling: 4 (CloudWatch alarms and scale-out and scale-in policies)

## Design decisions

- S3 native state locking (`use_lockfile`) instead of DynamoDB.
- The AMI is resolved with a data source. A hardcoded AMI ID had broken an earlier Jenkins build.
- The instance security group allows port 80 only from the load balancer's security group, not from a CIDR range.
- IMDSv2 is required. Access is through SSM Session Manager, so port 22 is never open.
- The ALB drops invalid header fields and uses defensive desync mitigation.
- `create_before_destroy` on the Auto Scaling Group and `prevent_destroy` on the state bucket.

## Cost

About $22.19 a month at typical load with two instances, and about $14.70 at minimum capacity with one. The load balancer is roughly $7.00, each t3.micro roughly $7.49, S3 state about a cent, and the two CloudWatch alarms about $0.20.

## Five things that went wrong

1. **`mkdir` was missing.** Ubuntu 26.04 uses the Rust-based uutils instead of GNU coreutils, and `mkdir` wasn't linked. I worked around it with a Python one-liner.
2. **I exposed credentials.** A screenshot of `aws configure` output showed an access key and secret. I rotated the key in the IAM console, and it's a good argument for OIDC roles over static credentials.
3. **AWS rejected an em dash.** Security group rule descriptions have a restricted character set, and a `sed` command replaced the dashes.
4. **A file landed in the wrong directory.** I created `variables.tf` in my home directory instead of the project folder, then deleted the stray file and edited the right one.
5. **CI failed on formatting.** `terraform fmt -check` exited with code 3. `terraform fmt -recursive` fixed the files, and I updated the action versions to clear a Node.js 20 deprecation warning.

## CI

GitHub Actions runs `terraform fmt`, `validate` and `plan` on every push and pull request.
