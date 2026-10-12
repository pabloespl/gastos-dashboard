resource "google_cloud_run_v2_service" "statement_parser" {
  name     = "statement-parser"
  location = var.region
  project  = var.project_id

  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    service_account                  = google_service_account.statement_parser_runtime.email
    timeout                          = "300s"
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = 0
      max_instance_count = 20
    }

    containers {
      image = "us-east4-docker.pkg.dev/gastos-dashboard-500514/cloud-run-source-deploy/statement-parser:a4ce11749debab87658e341d6bb1f9c7b6dfb4f2"

      ports {
        container_port = 8080
      }

      resources {
        cpu_idle          = true
        startup_cpu_boost = true

        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
      }

      env {
        name  = "SUPABASE_URL"
        value = "https://hwfxyltobyctzreyhxvt.supabase.co"
      }

      env {
        name = "SUPABASE_SECRET_KEY"

        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.supabase_secret_key.secret_id
            version = "latest"
          }
        }
      }

      startup_probe {
        initial_delay_seconds = 0
        timeout_seconds       = 240
        period_seconds        = 240
        failure_threshold     = 1

        tcp_socket {
          port = 8080
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      build_config,
      template[0].containers[0].image,
    ]
  }
}
