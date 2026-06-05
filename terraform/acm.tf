# ─── ACM SSL Certificate ──────────────────────────────────────────────────────
# Covers mattrshaw.com AND www.mattrshaw.com
# Must be in us-east-1 for CloudFront — which is already our region

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

# Terraform polls AWS until the cert shows as validated
# This only completes after you add the CNAME records to Cloudflare
resource "aws_acm_certificate_validation" "cert" {
  certificate_arn = aws_acm_certificate.cert.arn
}
