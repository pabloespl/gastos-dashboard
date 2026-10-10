output "statement_parser_invoker_email" {
  description = "Correo de la cuenta de servicio que invoca el parser de cartolas."
  value       = google_service_account.statement_parser_invoker.email
}

output "gmail_webhook_push_email" {
  description = "Correo de la cuenta de servicio usada por el push OIDC de Pub/Sub."
  value       = google_service_account.gmail_webhook_push.email
}

output "gmail_bank_transactions_topic_id" {
  description = "ID del tópico de transacciones bancarias de Gmail."
  value       = google_pubsub_topic.gmail_bank_transactions.id
}

output "gmail_bank_transactions_subscription_id" {
  description = "ID de la suscripción push hacia Supabase."
  value       = google_pubsub_subscription.gmail_bank_transactions_supabase.id
}
