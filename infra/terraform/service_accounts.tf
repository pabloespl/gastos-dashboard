resource "google_service_account" "statement_parser_invoker" {
  account_id   = "statement-parser-invoker"
  display_name = "statement-parser-invoker"
  project      = var.project_id
}

resource "google_service_account" "gmail_webhook_push" {
  account_id   = "gmail-webhook-push"
  display_name = "Gmail webhook PubSub push"
  project      = var.project_id
}

resource "google_service_account" "statement_parser_runtime" {
  account_id   = "statement-parser-runtime"
  display_name = "Statement parser runtime"
  project      = var.project_id
}

resource "google_service_account" "statement_parser_deployer" {
  account_id   = "statement-parser-deployer"
  display_name = "Statement parser deployer"
  project      = var.project_id
}
