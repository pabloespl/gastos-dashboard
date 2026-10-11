provider "google" {
  project = var.project_id
  region  = var.region
}

provider "vercel" {
  team = "pabloespl1"
}
