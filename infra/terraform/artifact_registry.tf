resource "google_artifact_registry_repository" "cloud_run_source_deploy" {
  project       = var.project_id
  location      = var.region
  repository_id = "cloud-run-source-deploy"
  format        = "DOCKER"
  description   = "Cloud Run Source Deployments"
}

resource "google_artifact_registry_repository_iam_member" "statement_parser_deployer_writer" {
  project    = google_artifact_registry_repository.cloud_run_source_deploy.project
  location   = google_artifact_registry_repository.cloud_run_source_deploy.location
  repository = google_artifact_registry_repository.cloud_run_source_deploy.repository_id
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.statement_parser_deployer.email}"
}
