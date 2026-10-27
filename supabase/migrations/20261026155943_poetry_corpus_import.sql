begin;
-- Preserve the two long supplied Persian works in full, and leave uncertain forms generic.
alter table public.kalam_texts drop constraint kalam_texts_body_check;
alter table public.kalam_texts add constraint kalam_texts_body_check check(length(trim(body)) between 1 and 200000);
alter table public.kalam drop constraint kalam_form_check;
alter table public.kalam add constraint kalam_form_check check(form in ('ghazal','nazm','sher','rubai','prose','literary-text'));
create table public.poetry_imports (
 source_id text primary key,
 total integer not null check(total>0),processed integer not null default 0 check(processed>=0 and processed<=total),
 inserted integer not null default 0 check(inserted>=0 and inserted<=processed),
 skipped integer not null default 0 check(skipped>=0 and inserted+skipped=processed),
 updated_at timestamptz not null default now()
);
insert into public.poetry_imports(source_id,total) values('urdu-ghazals-v1',1314),('urdu-couplets-v1',17439),('persian-texts-v1',54430);
create table public.poetry_import_records (
 source_key text primary key check(source_key ~ '^[a-f0-9]{64}$'),
 source_id text not null references public.poetry_imports(source_id),
 kalam_id uuid references public.kalam(id) on delete set null,
 outcome text not null check(outcome in ('inserted','conflict')),
 created_at timestamptz not null default now()
);
create index poetry_import_records_source_idx on public.poetry_import_records(source_id,outcome);
create index poetry_import_records_kalam_idx on public.poetry_import_records(kalam_id);
alter table public.poetry_imports enable row level security;
alter table public.poetry_import_records enable row level security;
revoke all on public.poetry_imports,public.poetry_import_records from public,anon,authenticated;
grant select,update on public.poetry_imports to authenticated;
grant select,insert on public.poetry_import_records to authenticated;
create policy poetry_imports_admin_read on public.poetry_imports for select to authenticated using((select private.staff_role())='admin');
create policy poetry_imports_admin_update on public.poetry_imports for update to authenticated using((select private.staff_role())='admin') with check((select private.staff_role())='admin');
create policy poetry_import_records_admin_read on public.poetry_import_records for select to authenticated using((select private.staff_role())='admin');
create policy poetry_import_records_admin_insert on public.poetry_import_records for insert to authenticated with check((select private.staff_role())='admin');
create function public.import_poetry_batch(dataset_id text,batch_offset integer,batch_rows jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare progress public.poetry_imports;row_count integer;added integer;created_ids uuid[];
begin
 if (select private.staff_role()) is distinct from 'admin' then raise exception 'Administrator access required' using errcode='42501';end if;
 if jsonb_typeof(batch_rows) is distinct from 'array' then raise exception 'Invalid poetry batch' using errcode='22023';end if;
 row_count=jsonb_array_length(batch_rows);
 if row_count not between 1 and 200 or octet_length(batch_rows::text)>900000 then raise exception 'Poetry batch is too large' using errcode='22023';end if;
 select * into progress from public.poetry_imports where source_id=dataset_id for update;
 if not found then raise exception 'Unknown supplied dataset' using errcode='22023';end if;
 if batch_offset<progress.processed then return to_jsonb(progress);end if;
 if batch_offset<>progress.processed then raise exception 'Import progress changed. Resume.' using errcode='40001';end if;
 if batch_offset+row_count>progress.total then raise exception 'Unexpected source row count' using errcode='22023';end if;
 if (select count(distinct v->>'source_key') from jsonb_array_elements(batch_rows) v)<>row_count or (select count(distinct v->>'id') from jsonb_array_elements(batch_rows) v)<>row_count then raise exception 'Duplicate source rows in batch' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(batch_rows) v where v->>'source_key' is distinct from encode(sha256(convert_to((v->>'poet_slug')||E'\n'||(v->'texts'->0->>'language')||E'\n'||(v->'texts'->0->>'body'),'UTF8')),'hex') or jsonb_typeof(v->'texts') is distinct from 'array' or jsonb_array_length(v->'texts') not between 1 and 6 or length(trim(v->>'source_note')) not between 1 and 2000) then raise exception 'Source identity or text metadata is invalid' using errcode='22023';end if;
 -- Existing poet profiles, drafts, poems and translations are never overwritten.
 insert into public.artists(slug,name,name_ur,kind,status,rights_note)
 select distinct on(v->>'poet_slug') v->>'poet_slug',v->>'poet_name',coalesce(v->>'poet_name_ur',''),'poet','published','Profile name supplied with the poetry dataset. No biography or life dates have been inferred.' from jsonb_array_elements(batch_rows) v order by v->>'poet_slug' on conflict(slug) do nothing;
 with created as (
 insert into public.kalam(id,slug,poet_id,form,summary,status,rights_note)
 select (v->>'id')::uuid,v->>'slug',a.id,v->>'form','', 'published',v->>'source_note' from jsonb_array_elements(batch_rows) v join public.artists a on a.slug=v->>'poet_slug' and a.status='published'
 where not exists(select 1 from public.poetry_import_records p where p.source_key=v->>'source_key')
 on conflict do nothing returning id
 ) select coalesce(array_agg(id),'{}'::uuid[]),count(*) into created_ids,added from created;
 insert into public.kalam_texts(kalam_id,language,title,body)
 select (v->>'id')::uuid,t->>'language',t->>'title',t->>'body' from jsonb_array_elements(batch_rows) v cross join lateral jsonb_array_elements(v->'texts') t where (v->>'id')::uuid=any(created_ids);
 insert into public.poetry_import_records(source_key,source_id,kalam_id,outcome)
 select v->>'source_key',dataset_id,case when (v->>'id')::uuid=any(created_ids) then (v->>'id')::uuid else null end,case when (v->>'id')::uuid=any(created_ids) then 'inserted' else 'conflict' end from jsonb_array_elements(batch_rows) v on conflict(source_key) do nothing;
 update public.poetry_imports set processed=processed+row_count,inserted=inserted+added,skipped=skipped+row_count-added,updated_at=clock_timestamp() where source_id=dataset_id returning * into progress;
 return to_jsonb(progress);
end $$;
revoke all on function public.import_poetry_batch(text,integer,jsonb) from public,anon;
grant execute on function public.import_poetry_batch(text,integer,jsonb) to authenticated;
commit;
