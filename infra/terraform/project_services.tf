locals {
  required_project_services = toset([
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "gmail.googleapis.com",
    "iamcredentials.googleapis.com",
    "pubsub.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "serviceusage.googleapis.com",
  ])
}

resource "google_project_service" "required" {
  for_each = local.required_project_services

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}
