create table "public"."bank_statement_transactions" (
  "id" bigint generated always as identity not null,
  "statement_id" text not null,
  "operation_date" date not null,
  "reference_code" text not null,
  "location" text,
  "description" text not null,
  "amount" numeric not null,
  "total_amount" numeric,
  "installment_number" integer,
  "installment_count" integer,
  "installment_amount" numeric,
  "currency" text not null default 'CLP'::text,
  "raw_line" text,
  "reconciliation_status" text not null default 'pending'::text,
  "matched_message_id" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
    );


alter table "public"."bank_statement_transactions" enable row level security;


  create table "public"."gmail_backfill_state" (
    "id" text not null,
    "next_page_token" text,
    "completed" boolean not null default false,
    "processed_count" integer not null default 0,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."gmail_backfill_state" enable row level security;


  create table "public"."gmail_raw_messages" (
    "message_id" text not null,
    "thread_id" text,
    "history_id" text,
    "sender" text,
    "subject" text,
    "received_at" timestamp with time zone,
    "body_text" text,
    "raw_message" jsonb,
    "parse_status" text not null default 'pending'::text,
    "parse_error" text,
    "created_at" timestamp with time zone not null default now(),
    "parsed_at" timestamp with time zone
      );


alter table "public"."gmail_raw_messages" enable row level security;


  create table "public"."gmail_sync_state" (
    "email" text not null,
    "history_id" text not null,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."gmail_sync_state" enable row level security;


  create table "public"."transaction_splits" (
    "id" bigint generated always as identity not null,
    "transaction_id" text not null,
    "participant_name" text not null,
    "amount" numeric not null,
    "paid" boolean not null default false,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."transaction_splits" enable row level security;

alter table "public"."transactions" add column "insurance_amount" numeric;

alter table "public"."transactions" add column "insurance_applies" boolean not null default false;

alter table "public"."transactions" add column "insurance_claimed" boolean not null default false;

alter table "public"."transactions" add column "isapre_amount" numeric;

alter table "public"."transactions" add column "isapre_applies" boolean not null default false;

alter table "public"."transactions" add column "isapre_claimed" boolean not null default false;

alter table "public"."transactions" add column "source" text;

alter table "public"."transactions" add column "statement_transaction_id" bigint;

alter table "public"."transactions" alter column "amount" set data type numeric(10,2) using "amount"::numeric(10,2);

alter table "public"."transfers" alter column "inserted_at" set not null;

alter table "public"."transfers" alter column "recipient_name" set not null;

CREATE UNIQUE INDEX bank_statement_transactions_pkey ON public.bank_statement_transactions USING btree (id);

CREATE INDEX bank_statement_transactions_reconciliation_idx ON public.bank_statement_transactions USING btree (reconciliation_status);

CREATE UNIQUE INDEX bank_statement_transactions_statement_id_reference_code_ope_key ON public.bank_statement_transactions USING btree (statement_id, reference_code, operation_date, amount);

CREATE UNIQUE INDEX gmail_backfill_state_pkey ON public.gmail_backfill_state USING btree (id);

CREATE UNIQUE INDEX gmail_raw_messages_pkey ON public.gmail_raw_messages USING btree (message_id);

CREATE UNIQUE INDEX gmail_sync_state_pkey ON public.gmail_sync_state USING btree (email);

CREATE INDEX idx_transaction_splits_transaction_id ON public.transaction_splits USING btree (transaction_id);

CREATE UNIQUE INDEX transaction_splits_pkey ON public.transaction_splits USING btree (id);

CREATE UNIQUE INDEX transactions_message_id_key ON public.transactions USING btree (message_id);

alter table "public"."bank_statement_transactions" add constraint "bank_statement_transactions_pkey" PRIMARY KEY using index "bank_statement_transactions_pkey";

alter table "public"."gmail_backfill_state" add constraint "gmail_backfill_state_pkey" PRIMARY KEY using index "gmail_backfill_state_pkey";

alter table "public"."gmail_raw_messages" add constraint "gmail_raw_messages_pkey" PRIMARY KEY using index "gmail_raw_messages_pkey";

alter table "public"."gmail_sync_state" add constraint "gmail_sync_state_pkey" PRIMARY KEY using index "gmail_sync_state_pkey";

alter table "public"."transaction_splits" add constraint "transaction_splits_pkey" PRIMARY KEY using index "transaction_splits_pkey";

alter table "public"."bank_statement_transactions" add constraint "bank_statement_transactions_statement_id_reference_code_ope_key" UNIQUE using index "bank_statement_transactions_statement_id_reference_code_ope_key";

alter table "public"."transaction_splits" add constraint "transaction_splits_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public.transactions(message_id) ON DELETE CASCADE not valid;

alter table "public"."transaction_splits" validate constraint "transaction_splits_transaction_id_fkey";

alter table "public"."transactions" add constraint "transactions_message_id_key" UNIQUE using index "transactions_message_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.advance_gmail_history(p_email text, p_history_id text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  insert into gmail_sync_state (
    email,
    history_id,
    updated_at
  )
  values (
    p_email,
    p_history_id,
    now()
  )
  on conflict (email)
  do update set
    history_id = case
      when gmail_sync_state.history_id::numeric
           < excluded.history_id::numeric
      then excluded.history_id
      else gmail_sync_state.history_id
    end,
    updated_at = now();
$function$
;

grant delete on table "public"."bank_statement_transactions" to "anon";

grant insert on table "public"."bank_statement_transactions" to "anon";

grant references on table "public"."bank_statement_transactions" to "anon";

grant select on table "public"."bank_statement_transactions" to "anon";

grant trigger on table "public"."bank_statement_transactions" to "anon";

grant truncate on table "public"."bank_statement_transactions" to "anon";

grant update on table "public"."bank_statement_transactions" to "anon";

grant delete on table "public"."bank_statement_transactions" to "authenticated";

grant insert on table "public"."bank_statement_transactions" to "authenticated";

grant references on table "public"."bank_statement_transactions" to "authenticated";

grant select on table "public"."bank_statement_transactions" to "authenticated";

grant trigger on table "public"."bank_statement_transactions" to "authenticated";

grant truncate on table "public"."bank_statement_transactions" to "authenticated";

grant update on table "public"."bank_statement_transactions" to "authenticated";

grant delete on table "public"."bank_statement_transactions" to "service_role";

grant insert on table "public"."bank_statement_transactions" to "service_role";

grant references on table "public"."bank_statement_transactions" to "service_role";

grant select on table "public"."bank_statement_transactions" to "service_role";

grant trigger on table "public"."bank_statement_transactions" to "service_role";

grant truncate on table "public"."bank_statement_transactions" to "service_role";

grant update on table "public"."bank_statement_transactions" to "service_role";

grant delete on table "public"."gmail_backfill_state" to "anon";

grant insert on table "public"."gmail_backfill_state" to "anon";

grant references on table "public"."gmail_backfill_state" to "anon";

grant select on table "public"."gmail_backfill_state" to "anon";

grant trigger on table "public"."gmail_backfill_state" to "anon";

grant truncate on table "public"."gmail_backfill_state" to "anon";

grant update on table "public"."gmail_backfill_state" to "anon";

grant delete on table "public"."gmail_backfill_state" to "authenticated";

grant insert on table "public"."gmail_backfill_state" to "authenticated";

grant references on table "public"."gmail_backfill_state" to "authenticated";

grant select on table "public"."gmail_backfill_state" to "authenticated";

grant trigger on table "public"."gmail_backfill_state" to "authenticated";

grant truncate on table "public"."gmail_backfill_state" to "authenticated";

grant update on table "public"."gmail_backfill_state" to "authenticated";

grant delete on table "public"."gmail_backfill_state" to "service_role";

grant insert on table "public"."gmail_backfill_state" to "service_role";

grant references on table "public"."gmail_backfill_state" to "service_role";

grant select on table "public"."gmail_backfill_state" to "service_role";

grant trigger on table "public"."gmail_backfill_state" to "service_role";

grant truncate on table "public"."gmail_backfill_state" to "service_role";

grant update on table "public"."gmail_backfill_state" to "service_role";

grant delete on table "public"."gmail_raw_messages" to "anon";

grant insert on table "public"."gmail_raw_messages" to "anon";

grant references on table "public"."gmail_raw_messages" to "anon";

grant select on table "public"."gmail_raw_messages" to "anon";

grant trigger on table "public"."gmail_raw_messages" to "anon";

grant truncate on table "public"."gmail_raw_messages" to "anon";

grant update on table "public"."gmail_raw_messages" to "anon";

grant delete on table "public"."gmail_raw_messages" to "authenticated";

grant insert on table "public"."gmail_raw_messages" to "authenticated";

grant references on table "public"."gmail_raw_messages" to "authenticated";

grant select on table "public"."gmail_raw_messages" to "authenticated";

grant trigger on table "public"."gmail_raw_messages" to "authenticated";

grant truncate on table "public"."gmail_raw_messages" to "authenticated";

grant update on table "public"."gmail_raw_messages" to "authenticated";

grant delete on table "public"."gmail_raw_messages" to "service_role";

grant insert on table "public"."gmail_raw_messages" to "service_role";

grant references on table "public"."gmail_raw_messages" to "service_role";

grant select on table "public"."gmail_raw_messages" to "service_role";

grant trigger on table "public"."gmail_raw_messages" to "service_role";

grant truncate on table "public"."gmail_raw_messages" to "service_role";

grant update on table "public"."gmail_raw_messages" to "service_role";

grant delete on table "public"."gmail_sync_state" to "anon";

grant insert on table "public"."gmail_sync_state" to "anon";

grant references on table "public"."gmail_sync_state" to "anon";

grant select on table "public"."gmail_sync_state" to "anon";

grant trigger on table "public"."gmail_sync_state" to "anon";

grant truncate on table "public"."gmail_sync_state" to "anon";

grant update on table "public"."gmail_sync_state" to "anon";

grant delete on table "public"."gmail_sync_state" to "authenticated";

grant insert on table "public"."gmail_sync_state" to "authenticated";

grant references on table "public"."gmail_sync_state" to "authenticated";

grant select on table "public"."gmail_sync_state" to "authenticated";

grant trigger on table "public"."gmail_sync_state" to "authenticated";

grant truncate on table "public"."gmail_sync_state" to "authenticated";

grant update on table "public"."gmail_sync_state" to "authenticated";

grant delete on table "public"."gmail_sync_state" to "service_role";

grant insert on table "public"."gmail_sync_state" to "service_role";

grant references on table "public"."gmail_sync_state" to "service_role";

grant select on table "public"."gmail_sync_state" to "service_role";

grant trigger on table "public"."gmail_sync_state" to "service_role";

grant truncate on table "public"."gmail_sync_state" to "service_role";

grant update on table "public"."gmail_sync_state" to "service_role";

grant delete on table "public"."transaction_splits" to "anon";

grant insert on table "public"."transaction_splits" to "anon";

grant references on table "public"."transaction_splits" to "anon";

grant select on table "public"."transaction_splits" to "anon";

grant trigger on table "public"."transaction_splits" to "anon";

grant truncate on table "public"."transaction_splits" to "anon";

grant update on table "public"."transaction_splits" to "anon";

grant delete on table "public"."transaction_splits" to "authenticated";

grant insert on table "public"."transaction_splits" to "authenticated";

grant references on table "public"."transaction_splits" to "authenticated";

grant select on table "public"."transaction_splits" to "authenticated";

grant trigger on table "public"."transaction_splits" to "authenticated";

grant truncate on table "public"."transaction_splits" to "authenticated";

grant update on table "public"."transaction_splits" to "authenticated";

grant delete on table "public"."transaction_splits" to "service_role";

grant insert on table "public"."transaction_splits" to "service_role";

grant references on table "public"."transaction_splits" to "service_role";

grant select on table "public"."transaction_splits" to "service_role";

grant trigger on table "public"."transaction_splits" to "service_role";

grant truncate on table "public"."transaction_splits" to "service_role";

grant update on table "public"."transaction_splits" to "service_role";


  create policy "solo propietario"
  on "public"."transaction_splits"
  as permissive
  for all
  to public
using (((auth.jwt() ->> 'email'::text) = 'pablo.ezp@gmail.com'::text))
with check (((auth.jwt() ->> 'email'::text) = 'pablo.ezp@gmail.com'::text));



