# mattrshaw.com — Portfolio Infrastructure

Personal portfolio site for Matt Shaw, Cloud DevOps Engineer. Built as a real infrastructure project — Terraform-provisioned, GitHub Actions deployed, CloudFront-distributed.

**Live site:** [mattrshaw.com](https://mattrshaw.com)

---

## Architecture

```
Browser → Cloudflare DNS → CloudFront (CDN + HTTPS) → S3 (private bucket)
                                                            ↑
                                              GitHub Actions (OIDC auth)
                                                            ↑
                                                      git push to main
```

No long-lived AWS credentials stored anywhere. GitHub Actions authenticates via OIDC federation — a signed JWT token is exchanged for a short-lived IAM role session on every deploy.

---

## Stack

| Layer | Technology |
|---|---|
| DNS | Cloudflare (free tier) |
| CDN + HTTPS | AWS CloudFront |
| SSL Certificate | AWS ACM (DNS validated) |
| Origin | AWS S3 (private, OAC access only) |
| Infrastructure | Terraform (remote state in S3) |
| CI/CD | GitHub Actions with OIDC auth |
| Auth | IAM OIDC — no stored keys |

---

## Project Structure

```
portfolio-site/
├── website/                  # Static site files
│   ├── index.html
│   ├── style.css
│   └── script.js
├── terraform/                # Main infrastructure
│   ├── providers.tf          # AWS provider + S3 backend
│   ├── main.tf               # S3 bucket + CloudFront + OAC
│   ├── acm.tf                # SSL certificate (DNS validated)
│   ├── iam.tf                # GitHub Actions OIDC role
│   ├── variables.tf
│   ├── locals.tf
│   ├── outputs.tf
│   └── terraform.tfvars
├── bootstrap/                # Remote state bucket
│   └── main.tf
├── .github/
│   └── workflows/
│       └── deploy.yml        # Auto-deploy on push to website/
└── .gitignore
```

---

## Infrastructure Details

### S3 + CloudFront (OAC)

The S3 bucket is fully private. CloudFront accesses it via Origin Access Control (OAC) — the modern replacement for OAI. The bucket policy allows only CloudFront's service principal with the specific distribution ARN as a condition, meaning no other CloudFront distribution can access this bucket even with the correct ARN format.

### ACM Certificate

The SSL certificate covers both `mattrshaw.com` and `www.mattrshaw.com`. Validated via DNS CNAME records in Cloudflare. ACM auto-renews annually using the same validation records — no manual intervention needed.

### GitHub Actions OIDC

No AWS access keys are stored in GitHub Secrets. The workflow assumes an IAM role via OIDC web identity federation. The role trust policy restricts assumption to the specific repository (`mattrshaw4/portfolio-site`) only.

The IAM role has minimum required permissions:
- `s3:PutObject`, `s3:DeleteObject`, `s3:GetObject`, `s3:ListBucket` on the website bucket
- `cloudfront:CreateInvalidation` on the distribution

### Remote State

Terraform state is stored in a separate S3 bucket (`mattrshaw4-portfolio-tf-state`) with versioning and AES256 encryption enabled. The bootstrap directory provisions this bucket independently so it exists before the main infrastructure is applied.

---

## Deployment

### Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.6.0
- A domain name with Cloudflare as DNS provider

### Deploy Infrastructure

```bash
# Step 1 — Bootstrap the remote state bucket
cd bootstrap/
terraform init
terraform apply

# Step 2 — Deploy main infrastructure
cd ../terraform/
terraform init
terraform apply -target=aws_acm_certificate.cert

# Add ACM validation CNAME records to Cloudflare (output from above)
# Then run full apply — Terraform waits for cert validation automatically

terraform apply
```

### Deploy Website

Pushing to `main` triggers the GitHub Actions workflow automatically.

For manual deployment:

```bash
aws s3 sync website/ s3://mattrshaw4-portfolio-website --delete
aws cloudfront create-invalidation \
  --distribution-id EWMC4MU0OKBBB \
  --paths "/*"
```

---

## CI/CD Pipeline

The `deploy.yml` workflow triggers on any push to `main` that modifies files under `website/`. It will not run for changes to Terraform files, the README, or other non-website content.

```
git push → GitHub Actions → OIDC token → IAM role → S3 sync → CloudFront invalidation
```

Total deploy time: under 30 seconds from push to live.

---

## Author

**Matt Shaw** — Cloud Engineer  
20 years in professional kitchens. Now building cloud infrastructure.

[mattrshaw.com](https://mattrshaw.com) · [GitHub](https://github.com/mattrshaw4) · [LinkedIn](https://www.linkedin.com/in/matt-r-shaw-) · [Newsletter](https://medium.com/@matt.r.shaw4)
