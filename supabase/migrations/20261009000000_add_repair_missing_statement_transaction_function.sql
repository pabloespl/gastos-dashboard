create or replace function public.repair_missing_statement_transaction(
  p_statement_transaction_id bigint,
  p_datetime timestamptz
)
returns table (
  repaired boolean,
  inserted boolean,
  message_id text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_statement public.bank_statement_transactions%rowtype;
  v_message_id text;
  v_inserted boolean := false;
begin
  select stmt.*
  into v_statement
  from public.bank_statement_transactions as stmt
  where stmt.id = p_statement_transaction_id
    and stmt.reconciliation_status = 'missing'
  for update;

  if not found then
    return query select false, false, null::text;
    return;
  end if;

  select tx.message_id
  into v_message_id
  from public.transactions as tx
  where tx.statement_transaction_id = v_statement.id
  limit 1;

  if v_message_id is null then
    insert into public.transactions as tx (
      message_id,
      datetime,
      merchant,
      amount,
      currency,
      source,
      statement_transaction_id
    )
    values (
      'statement:' || v_statement.id,
      p_datetime,
      v_statement.description,
      v_statement.amount,
      v_statement.currency,
      'statement',
      v_statement.id
    )
    on conflict (statement_transaction_id)
      where statement_transaction_id is not null
      do nothing
    returning tx.message_id into v_message_id;

    v_inserted := found;

    if v_message_id is null then
      select tx.message_id
      into v_message_id
      from public.transactions as tx
      where tx.statement_transaction_id = v_statement.id;
    end if;
  end if;

  update public.bank_statement_transactions as stmt
  set reconciliation_status = 'repaired',
      matched_message_id = v_message_id,
      updated_at = now()
  where stmt.id = v_statement.id
    and stmt.reconciliation_status = 'missing';

  if not found then
    raise exception 'Statement row is no longer in missing state';
  end if;

  return query select true, v_inserted, v_message_id;
end;
$$;

revoke all on function public.repair_missing_statement_transaction(bigint, timestamptz)
from public, anon, authenticated;

grant execute on function public.repair_missing_statement_transaction(bigint, timestamptz)
to service_role;
