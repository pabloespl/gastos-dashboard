create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Elimina cualquier versión previa, incluida la creada manualmente en el Dashboard.
do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'renew-gmail-watch-daily'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end;
$$;

select cron.schedule(
  'renew-gmail-watch-daily',
  '0 8 * * *',
  $cron$
    select net.http_post(
      url := 'https://hwfxyltobyctzreyhxvt.supabase.co/functions/v1/renew-gmail-watch',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 5000
    );
  $cron$
);
