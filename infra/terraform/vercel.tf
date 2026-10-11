resource "vercel_project" "gastos_dashboard" {
  name         = "gastos-dashboard"
  framework    = "nextjs"
  node_version = "24.x"

  git_repository = {
    type              = "github"
    repo              = "pabloespl/gastos-dashboard"
    production_branch = "main"
  }
}
