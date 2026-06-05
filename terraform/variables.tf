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
