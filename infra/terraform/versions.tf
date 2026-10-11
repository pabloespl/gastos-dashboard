terraform {
  required_version = ">= 1.16.0, < 2.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.0"
    }

    vercel = {
      source  = "vercel/vercel"
      version = "~> 5.17.0"
    }
  }
}
