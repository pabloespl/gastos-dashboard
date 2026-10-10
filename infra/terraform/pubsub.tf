locals {
  gmail_webhook_url = "https://${var.supabase_project_ref}.supabase.co/functions/v1/gmail-webhook"
}

resource "google_pubsub_topic" "gmail_bank_transactions" {
  name    = "gmail-bank-transactions"
  project = var.project_id
}

resource "google_pubsub_subscription" "gmail_bank_transactions_supabase" {
  name    = "gmail-bank-transactions-supabase"
  project = var.project_id
  topic   = google_pubsub_topic.gmail_bank_transactions.id

  push_config {
    push_endpoint = local.gmail_webhook_url

    oidc_token {
      service_account_email = google_service_account.gmail_webhook_push.email
      audience              = local.gmail_webhook_url
    }
  }
}
