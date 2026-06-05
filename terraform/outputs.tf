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
  description = "Point mattrshaw.com and www at this in Cloudflare"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "website_bucket_name" {
  description = "S3 bucket for your site files"
  value       = aws_s3_bucket.website.bucket
}

output "github_actions_role_arn" {
  description = "Paste this into your GitHub Actions deploy workflow"
  value       = aws_iam_role.github_actions.arn
}
