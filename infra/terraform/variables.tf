variable "project_id" {
  description = "ID del proyecto de Google Cloud."
  type        = string
  default     = "gastos-dashboard-500514"
}

variable "region" {
  description = "Región predeterminada para los recursos de Google Cloud."
  type        = string
  default     = "us-east4"
}

variable "supabase_project_ref" {
  description = "Referencia del proyecto de Supabase usada para construir el endpoint del webhook."
  type        = string
  default     = "hwfxyltobyctzreyhxvt"
}
