-- Reemplaza el job para autenticar la renovacion con el secreto dedicado de Vault.
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
    do $job$
    declare
      v_cron_secret text;
    begin
      select decrypted_secret
      into strict v_cron_secret
      from vault.decrypted_secrets
      where name = 'renew_gmail_watch_secret';

      if nullif(v_cron_secret, '') is null then
        raise exception 'El secreto renew_gmail_watch_secret no tiene un valor valido en Vault';
      end if;

      perform net.http_post(
        url := 'https://hwfxyltobyctzreyhxvt.supabase.co/functions/v1/renew-gmail-watch',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Cron-Secret', v_cron_secret
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 5000
      );
    end;
    $job$;
  $cron$
);
