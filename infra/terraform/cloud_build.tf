resource "google_cloudbuild_trigger" "statement_parser_main" {
  name     = "statement-parser-main"
  project  = var.project_id
  location = "global"

  github {
    owner = "pabloespl"
    name  = "gastos-dashboard"

    push {
      branch = "^main$"
    }
  }

  filename        = "cloud-run/statement-parser/cloudbuild.yaml"
  included_files  = ["cloud-run/statement-parser/**"]
  service_account = google_service_account.statement_parser_deployer.id
}
