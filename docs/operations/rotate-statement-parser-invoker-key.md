# Rotación de la clave del invocador de `statement-parser`

## Alcance

Este runbook rota de forma segura la clave JSON de larga duración usada por la función `gmail-webhook` de Supabase para invocar el servicio privado de Cloud Run `statement-parser`.

- Proyecto GCP: `gastos-dashboard-500514`
- Cuenta de servicio invocadora: `statement-parser-invoker@gastos-dashboard-500514.iam.gserviceaccount.com`
- Secreto de Supabase: `GOOGLE_CLOUD_RUN_INVOKER_CREDENTIALS`
- Cadencia: cada 90 días, o inmediatamente si se sospecha una exposición

La función usa esta credencial para firmar una aserción JWT de cuenta de servicio, intercambiarla por credenciales OAuth, llamar a IAM Credentials `generateIdToken` e invocar Cloud Run.

> Nunca incluir una clave privada, token o valor secreto real en este runbook, el repositorio, un chat o un ticket.

## Rotación programada

### 1. Inventariar las claves actuales

```bash
gcloud iam service-accounts keys list \
  --iam-account=statement-parser-invoker@gastos-dashboard-500514.iam.gserviceaccount.com \
  --project=gastos-dashboard-500514 \
  --format="table(name.basename(),keyType,validAfterTime,validBeforeTime,disabled)"
```

Estado esperado antes de rotar:

- una clave `SYSTEM_MANAGED`;
- una clave `USER_MANAGED`.

Registrar de forma segura el ID de la clave `USER_MANAGED` actual para distinguirla de la nueva. No registrar su contenido.

### 2. Crear una segunda clave `USER_MANAGED`

Ejecutar el comando desde una ubicación temporal local y fuera del repositorio. El nombre siguiente es solo un ejemplo:

```bash
gcloud iam service-accounts keys create statement-parser-invoker-new.json \
  --iam-account=statement-parser-invoker@gastos-dashboard-500514.iam.gserviceaccount.com \
  --project=gastos-dashboard-500514
```

> **Material sensible:** el archivo JSON contiene una clave privada. No guardarlo dentro del repositorio, no confirmarlo en Git, no pegarlo en chats y no conservarlo. Eliminarlo inmediatamente después de actualizar Supabase.

### 3. Actualizar el secreto de Supabase

Reemplazar el valor de `GOOGLE_CLOUD_RUN_INVOKER_CREDENTIALS` por el contenido JSON completo de la clave nueva.

- No cambiar el nombre del secreto.
- No copiar el valor en logs, documentación, terminales compartidos ni gestores no autorizados.
- Mantener disponible de forma segura el valor anterior solo durante la ventana de validación, para permitir rollback.

### 4. Validar el flujo completo

Antes de borrar la clave anterior, procesar un correo histórico de cartola mediante el flujo normal de etiquetas de Gmail.

Confirmar en los logs, en orden, los siguientes eventos:

- `Statement message detected`
- `PDF attachment found`
- `Cloud Run request`
- `Parser response status=200`
- `Statement reconciliation completed`
- `Missing transaction repair completed`
- `Checkpoint advanced`

Además, verificar que:

- `statement-parser` continúa siendo privado;
- su cuenta de servicio de ejecución es `statement-parser-runtime@gastos-dashboard-500514.iam.gserviceaccount.com`.

No continuar si falta alguna validación.

### 5. Eliminar la clave anterior

Volver a listar las claves para identificar el ID anterior y comprobar cuál es el nuevo:

```bash
gcloud iam service-accounts keys list \
  --iam-account=statement-parser-invoker@gastos-dashboard-500514.iam.gserviceaccount.com \
  --project=gastos-dashboard-500514 \
  --format="table(name.basename(),keyType,validAfterTime,validBeforeTime,disabled)"
```

Solo después de una validación exitosa, eliminar la clave `USER_MANAGED` anterior:

```bash
gcloud iam service-accounts keys delete OLD_KEY_ID \
  --iam-account=statement-parser-invoker@gastos-dashboard-500514.iam.gserviceaccount.com \
  --project=gastos-dashboard-500514
```

Verificar cuidadosamente `OLD_KEY_ID`: nunca eliminar por error la clave nueva y nunca eliminar claves `SYSTEM_MANAGED`.

### 6. Verificar el estado final

```bash
gcloud iam service-accounts keys list \
  --iam-account=statement-parser-invoker@gastos-dashboard-500514.iam.gserviceaccount.com \
  --project=gastos-dashboard-500514 \
  --format="table(name.basename(),keyType,validAfterTime,validBeforeTime,disabled)"
```

Estado final esperado:

- una clave `SYSTEM_MANAGED`;
- una clave `USER_MANAGED` (la nueva).

### 7. Eliminar el archivo temporal

Después de actualizar Supabase, eliminar de forma segura el archivo JSON temporal local. Confirmar también que no quedó dentro del repositorio, respaldos no autorizados ni papelera. El contenido de la clave nunca debe pasarse directamente por la línea de comandos; si solo se usó la ruta del archivo, el historial podría conservar su nombre o ubicación, pero no el contenido secreto. No usar comandos con rutas ambiguas: revisar la ruta exacta antes de eliminarlo.

## Rollback

Si la clave nueva falla antes de eliminar la anterior:

1. Restaurar `GOOGLE_CLOUD_RUN_INVOKER_CREDENTIALS` al valor JSON de la clave anterior.
2. Verificar nuevamente el flujo completo de cartolas.
3. Investigar la clave nueva por separado.
4. No eliminar la clave anterior hasta que la nueva funcione de extremo a extremo.

## Rotación por incidente

Si se sospecha una exposición:

1. Crear una clave nueva.
2. Actualizar inmediatamente el secreto de Supabase.
3. Validar el flujo completo.
4. Eliminar inmediatamente la clave anterior tras una validación exitosa.
5. Inspeccionar los logs en busca de invocaciones sospechosas a `statement-parser`.

## Notas de seguridad

- La cuenta de servicio no tiene roles a nivel de proyecto, por lo que la clave tiene un radio de impacto mínimo.
- Sus permisos se limitan a `roles/run.invoker` sobre `statement-parser` y `roles/iam.serviceAccountOpenIdTokenCreator` sobre sí misma: puede invocar únicamente ese servicio y acuñar su propio ID token.
- Workload Identity Federation sería preferible si Supabase ofrece en el futuro una identidad de carga federada adecuada.
- No administrar el valor de la clave JSON mediante Terraform.
