resource "google_cloud_run_v2_service_iam_member" "statement_parser_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.statement_parser.name

  role   = "roles/run.invoker"
  member = "serviceAccount:${google_service_account.statement_parser_invoker.email}"
}

resource "google_service_account_iam_member" "statement_parser_token_creator" {
  service_account_id = google_service_account.statement_parser_invoker.name

  role   = "roles/iam.serviceAccountOpenIdTokenCreator"
  member = "serviceAccount:${google_service_account.statement_parser_invoker.email}"
}

resource "google_project_iam_member" "pubsub_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"

  member = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "statement_parser_deployer_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.statement_parser_deployer.email}"
}

resource "google_project_iam_member" "statement_parser_deployer_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.statement_parser_deployer.email}"
}

resource "google_service_account_iam_member" "statement_parser_deployer_runtime_user" {
  service_account_id = google_service_account.statement_parser_runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.statement_parser_deployer.email}"
}
