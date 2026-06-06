# Portfolio Site Runbook
## Static Site on AWS — Terraform + CloudFront + GitHub Actions OIDC

A complete step-by-step guide to recreate mattrshaw.com from scratch.
Full infrastructure as code, automated CI/CD, no stored AWS credentials.

---

## Architecture

```
Browser → Cloudflare DNS → CloudFront (CDN + HTTPS) → S3 (private bucket)
                                                            ↑
                                              GitHub Actions (OIDC auth)
                                                            ↑
                                                      git push to main
```

**Monthly cost:** Under $1 (mostly the domain name)

---

## Prerequisites

- AWS account with CLI configured (`aws configure`)
- Terraform >= 1.6.0 installed
- Git installed
- GitHub account
- Domain purchased (this guide uses Namecheap)
- Cloudflare account (free)

---

## Variables — Customize These

Before starting, decide on your values:

| Variable | This Project | Your Value |
|---|---|---|
| Domain | `mattrshaw.com` | |
| GitHub username | `mattrshaw4` | |
| GitHub repo | `portfolio-site` | |
| AWS region | `us-east-1` | |
| State bucket name | `mattrshaw4-portfolio-tf-state` | |
| Website bucket name | `mattrshaw4-portfolio-website` | |

Replace all occurrences of the left column with your values throughout this guide.

---

## Phase 0 — Domain & Cloudflare Setup

### Step 1 — Purchase domain
Buy your domain from Namecheap (or any registrar). Do not use GoDaddy.

### Step 2 — Create Cloudflare account
Sign up at cloudflare.com (free plan). Select Personal & Professional when prompted.

### Step 3 — Add domain to Cloudflare
- Click **Add a Site** → enter your domain → select **Free plan**
- Cloudflare scans for existing DNS records

### Step 4 — Clean up DNS records
Delete all records Cloudflare found — they are parking page records from the registrar and will conflict with your setup. Delete every A, CNAME, MX, and TXT record shown.

### Step 5 — Copy your Cloudflare nameservers
Cloudflare shows two nameservers in the format `name.ns.cloudflare.com`. Copy both.

### Step 6 — Update nameservers in Namecheap
- Log into Namecheap → Domain List → Manage → Nameservers
- Switch dropdown to **Custom DNS**
- Enter both Cloudflare nameservers
- Save

### Step 7 — Click Done in Cloudflare
Wait for activation email (usually 5–30 minutes). Cloudflare emails you when the domain is active.

---

## Phase 1 — Bootstrap (Remote State Bucket)

The state bucket must exist before the main infrastructure is deployed.

### Step 1 — Create project directory and GitHub repo

Create the repo on GitHub first (Public, no README), then:

```bash
mkdir -p ~/portfolio-site/bootstrap
cd ~/portfolio-site
git init
git branch -M main
git remote add origin git@github.com:mattrshaw4/portfolio-site.git
```

### Step 2 — Create `bootstrap/main.tf`

```bash
cat > ~/portfolio-site/bootstrap/main.tf << 'EOF'
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "tf_state" {
  bucket = "mattrshaw4-portfolio-tf-state"

  tags = {
    Name      = "portfolio-terraform-state"
    Project   = "portfolio-site"
    ManagedBy = "terraform"
    Owner     = "matt"
  }
}

resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket                  = aws_s3_bucket.tf_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

output "state_bucket_name" {
  value = aws_s3_bucket.tf_state.bucket
}
EOF
```

### Step 3 — Apply bootstrap

```bash
cd ~/portfolio-site/bootstrap
terraform init
terraform plan    # verify 4 resources to create
terraform apply   # type yes
```

Note the `state_bucket_name` output value.

---

## Phase 2 — Main Infrastructure (Terraform)

### Step 1 — Create terraform directory

```bash
mkdir -p ~/portfolio-site/terraform
cd ~/portfolio-site/terraform
```

### Step 2 — Create `providers.tf`

```bash
cat > providers.tf << 'EOF'
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "mattrshaw4-portfolio-tf-state"
    key    = "portfolio-site/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}
EOF
```

### Step 3 — Create `variables.tf`

```bash
cat > variables.tf << 'EOF'
variable "domain_name" {
  description = "Primary domain name for the portfolio site"
  type        = string
  default     = "mattrshaw.com"
}

variable "github_repo" {
  description = "GitHub repository path (owner/repo)"
  type        = string
  default     = "mattrshaw4/portfolio-site"
}
EOF
```

### Step 4 — Create `locals.tf`

```bash
cat > locals.tf << 'EOF'
locals {
  common_tags = {
    Project   = "portfolio-site"
    ManagedBy = "terraform"
    Owner     = "matt"
  }
}
EOF
```

### Step 5 — Create `main.tf`

```bash
cat > main.tf << 'EOF'
resource "aws_s3_bucket" "website" {
  bucket = "mattrshaw4-portfolio-website"

  tags = merge(local.common_tags, {
    Name = "portfolio-website"
  })
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "website" {
  bucket     = aws_s3_bucket.website.id
  depends_on = [aws_s3_bucket_public_access_block.website]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontOAC"
      Effect = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.website.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
        }
      }
    }]
  })
}

resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "portfolio-oac"
  description                       = "OAC for mattrshaw.com S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain_name, "www.${var.domain_name}"]

  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  default_cache_behavior {
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cert.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = merge(local.common_tags, {
    Name = "portfolio-cloudfront"
  })
}
EOF
```

### Step 6 — Create `acm.tf`

```bash
cat > acm.tf << 'EOF'
resource "aws_acm_certificate" "cert" {
  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = "portfolio-ssl-cert"
  })
}

resource "aws_acm_certificate_validation" "cert" {
  certificate_arn = aws_acm_certificate.cert.arn
}
EOF
```

### Step 7 — Create `iam.tf`

```bash
cat > iam.tf << 'EOF'
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]
}

resource "aws_iam_role" "github_actions" {
  name = "portfolio-github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
        }
      }
    }]
  })

  tags = merge(local.common_tags, {
    Name = "portfolio-github-actions-role"
  })
}

resource "aws_iam_role_policy" "github_actions" {
  name = "portfolio-deploy-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Deploy"
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:DeleteObject", "s3:GetObject", "s3:ListBucket"]
        Resource = [aws_s3_bucket.website.arn, "${aws_s3_bucket.website.arn}/*"]
      },
      {
        Sid      = "CloudFrontInvalidation"
        Effect   = "Allow"
        Action   = "cloudfront:CreateInvalidation"
        Resource = aws_cloudfront_distribution.website.arn
      }
    ]
  })
}
EOF
```

### Step 8 — Create `outputs.tf`

```bash
cat > outputs.tf << 'EOF'
output "acm_validation_records" {
  description = "Add these CNAMEs to Cloudflare (DNS only - NOT proxied)"
  value = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}

output "cloudfront_domain" {
  description = "Point your domain at this in Cloudflare"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "website_bucket_name" {
  value = aws_s3_bucket.website.bucket
}

output "github_actions_role_arn" {
  description = "Paste into GitHub Actions workflow"
  value       = aws_iam_role.github_actions.arn
}
EOF
```

### Step 9 — Create `terraform.tfvars`

```bash
cat > terraform.tfvars << 'EOF'
domain_name = "mattrshaw.com"
github_repo = "mattrshaw4/portfolio-site"
EOF
```

### Step 10 — Check for existing OIDC provider

```bash
aws iam list-open-id-connect-providers
```

If `token.actions.githubusercontent.com` appears in the output, import it before applying:

```bash
# Get your account ID first
aws sts get-caller-identity --query Account --output text

# Then import
terraform import aws_iam_openid_connect_provider.github \
  arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com
```

### Step 11 — Two-step apply

**Step 1: Create ACM cert only and get validation records**

```bash
terraform init
terraform apply -target=aws_acm_certificate.cert
```

The output shows CNAME records needed to validate the certificate. Example:

```
acm_validation_records = {
  "yourdomain.com" = {
    name  = "_abc123.yourdomain.com."
    type  = "CNAME"
    value = "_xyz789.acm-validations.aws."
  }
  "www.yourdomain.com" = {
    name  = "_def456.www.yourdomain.com."
    type  = "CNAME"
    value = "_ghi012.acm-validations.aws."
  }
}
```

---

## Phase 3 — Add ACM Validation Records to Cloudflare

Go to **Cloudflare → your domain → DNS → Add record** twice.

For each record from the terraform output:

| Field | Value |
|---|---|
| Type | CNAME |
| Name | The `name` value, minus the trailing dot and domain suffix |
| Target | The `value` value, minus the trailing dot |
| Proxy status | **DNS only (gray cloud) — NOT proxied** |

**Critical:** Proxy status must be gray cloud or validation will fail.

**Keep these records permanently** — ACM uses them for annual auto-renewal.

---

## Phase 4 — Full Terraform Apply

Once both CNAME records are saved in Cloudflare:

```bash
terraform apply
```

Terraform polls AWS every 10 seconds waiting for certificate validation. Once Cloudflare propagates the CNAMEs and AWS validates them, Terraform continues and creates everything else. This takes 5–15 minutes.

**Note the outputs when complete:**
- `cloudfront_domain` — needed for DNS
- `github_actions_role_arn` — needed for GitHub Actions
- `website_bucket_name` — needed for deployments

---

## Phase 5 — Add CloudFront DNS Records to Cloudflare

Go to **Cloudflare → your domain → DNS → Add record** twice.

**Record 1 — root domain:**

| Field | Value |
|---|---|
| Type | CNAME |
| Name | `@` |
| Target | Your `cloudfront_domain` output value |
| Proxy status | **DNS only (gray cloud)** |

**Record 2 — www:**

| Field | Value |
|---|---|
| Type | CNAME |
| Name | `www` |
| Target | Your `cloudfront_domain` output value |
| Proxy status | **DNS only (gray cloud)** |

**Why DNS only?** CloudFront is already the CDN. Proxying through Cloudflare on top creates SSL conflicts.

---

## Phase 6 — Website Files

### Step 1 — Create website directory

```bash
mkdir -p ~/portfolio-site/website
```

### Step 2 — Add your site files

Place `index.html`, `style.css`, and `script.js` in `~/portfolio-site/website/`.

### Step 3 — Initial manual deploy

```bash
aws s3 sync ~/portfolio-site/website/ s3://mattrshaw4-portfolio-website --delete
```

Get your CloudFront distribution ID:

```bash
aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Aliases.Items,'mattrshaw.com')].Id" \
  --output text
```

Invalidate the cache:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

Your site should now be live at your domain.

---

## Phase 7 — GitHub Actions CI/CD

### Step 1 — Create workflow file

```bash
mkdir -p ~/portfolio-site/.github/workflows

cat > ~/portfolio-site/.github/workflows/deploy.yml << 'EOF'
name: Deploy Portfolio

on:
  push:
    branches: [main]
    paths:
      - 'website/**'

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::859493431963:role/portfolio-github-actions-role
          aws-region: us-east-1

      - name: Sync website to S3
        run: |
          aws s3 sync website/ s3://mattrshaw4-portfolio-website \
            --delete \
            --cache-control "max-age=86400"

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id EWMC4MU0OKBBB \
            --paths "/*"
EOF
```

Replace `role-to-assume`, `s3://mattrshaw4-portfolio-website`, and `EWMC4MU0OKBBB` with your values.

### Step 2 — Create `.gitignore`

```bash
cat > ~/portfolio-site/.gitignore << 'EOF'
.terraform/
*.tfstate
*.tfstate.backup
.terraform.lock.hcl
terraform.tfvars
.DS_Store
EOF
```

---

## Phase 8 — Git Setup & Push

```bash
cd ~/portfolio-site
git add .
git commit -m "feat: initial portfolio site with Terraform infrastructure and website"
git push -u origin main
```

**Always use SSH, never HTTPS:**
```bash
git remote set-url origin git@github.com:mattrshaw4/portfolio-site.git
```

Go to **github.com/your-username/portfolio-site → Actions** and confirm the Deploy Portfolio workflow runs green.

---

## Ongoing — Making Updates

### Update the website

```bash
# Edit files in ~/portfolio-site/website/
# Then:
git add website/
git commit -m "content: describe your change"
git push
# GitHub Actions auto-deploys in ~30 seconds
```

### Update infrastructure

```bash
cd ~/portfolio-site/terraform
# Edit .tf files
terraform plan
terraform apply
```

---

## .claudeignore Files

Add to each project directory to prevent Claude Code from indexing large binary files:

```bash
# In terraform/ directory
cat > ~/portfolio-site/terraform/.claudeignore << 'EOF'
.terraform/
*.tfstate
*.tfstate.backup
.terraform.lock.hcl
EOF
```

---

## Troubleshooting

**ACM certificate stuck validating**
- Confirm both CNAME records are in Cloudflare with DNS only (gray cloud, not orange)
- Check record names have no trailing dots
- Wait up to 30 minutes for propagation

**CloudFront returns old content**
- Run a cache invalidation: `aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"`

**GitHub Actions OIDC error**
- Confirm `permissions: id-token: write` is in the workflow
- Confirm the IAM role trust policy matches your exact repo name
- If OIDC provider already exists in your account: `terraform import aws_iam_openid_connect_provider.github arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com`

**S3 403 on CloudFront**
- The bucket policy depends on the CloudFront distribution ARN — re-run `terraform apply` to ensure the policy is current
- Confirm OAC is attached to the distribution origin

**Git push rejected (HTTPS)**
- Always use SSH: `git remote set-url origin git@github.com:USERNAME/REPO.git`

---

## Cost Reference

| Service | Monthly Cost |
|---|---|
| S3 (storage + requests) | ~$0.01 |
| CloudFront | Free (within free tier) |
| ACM certificate | $0.00 |
| IAM / OIDC | $0.00 |
| Cloudflare DNS | $0.00 |
| Domain (Namecheap) | ~$0.92 ($11/year) |
| **Total** | **~$1.00** |

---

*Built by Matt Shaw — mattrshaw.com*
