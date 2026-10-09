# ─── S3 Website Bucket ───────────────────────────────────────────────────────
# Private bucket - only CloudFront can read from it via OAC
# No public access - this is the modern, secure approach

resource "aws_s3_bucket" "website" {
  bucket = "mattrshaw4-portfolio-website"

  tags = merge(local.common_tags, {
    Name = "portfolio-website"
  })
}

resource "aws_s3_bucket_server_side_encryption_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket policy: only allow CloudFront OAC to read objects
resource "aws_s3_bucket_policy" "website" {
  bucket     = aws_s3_bucket.website.id
  depends_on = [aws_s3_bucket_public_access_block.website]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.website.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
          }
        }
      }
    ]
  })
}

# ─── Origin Access Control ────────────────────────────────────────────────────
# OAC is the modern replacement for OAI - signs requests from CloudFront to S3

resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "portfolio-oac"
  description                       = "OAC for mattrshaw.com S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ─── Edge URL handling ────────────────────────────────────────────────────────
# Serves directory index files, enforces trailing slashes, redirects www to apex

resource "aws_cloudfront_function" "url_rewrite" {
  name    = "portfolio-url-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Directory index rewrite, trailing slash redirect, www to apex redirect"
  publish = true
  code    = file("${path.module}/functions/url-rewrite.js")
}

# AWS-managed cache policy: gzip + brotli, honors origin Cache-Control within 1s to 1y
data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

# ─── CloudFront Distribution ──────────────────────────────────────────────────

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
    target_origin_id           = "S3Origin"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.url_rewrite.arn
    }
  }

  # Serve index.html for any 404 - handles direct URL navigation
  # (replaced in Stage B with a real 404 page once the Astro site is live)
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
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
