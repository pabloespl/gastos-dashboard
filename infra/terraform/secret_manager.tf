resource "google_secret_manager_secret" "supabase_secret_key" {
  secret_id = "supabase-secret-key"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "statement_parser_runtime_secret_accessor" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.supabase_secret_key.secret_id

  role   = "roles/secretmanager.secretAccessor"
  member = "serviceAccount:${google_service_account.statement_parser_runtime.email}"
}
