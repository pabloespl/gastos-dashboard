terraform {
  backend "gcs" {
    bucket = "gastos-dashboard-500514-terraform-state"
    prefix = "gastos-dashboard/prod"
  }
}
