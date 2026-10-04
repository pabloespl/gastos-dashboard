create unique index if not exists transactions_statement_transaction_id_key
on public.transactions(statement_transaction_id)
where statement_transaction_id is not null;
