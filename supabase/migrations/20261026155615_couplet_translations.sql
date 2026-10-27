begin;
-- Translations attach to an exact passage of the current Persian/Arabic text.
create table public.couplet_translations (
 id uuid primary key default gen_random_uuid(),
 kalam_id uuid not null references public.kalam(id) on delete cascade,
 language text not null check(language in ('fa','ar')),
 target_language text not null check(target_language in ('ur','en','hi','ar','roman','fa') and target_language<>language),
 start_offset integer not null check(start_offset>=0),
 end_offset integer not null check(end_offset>start_offset and end_offset<=200000),
 surface text not null check(length(surface) between 1 and 20000),
 text_hash text not null check(text_hash ~ '^[a-f0-9]{64}$'),
 translation text not null check(length(trim(translation)) between 1 and 12000),
 source_note text not null default '' check(length(source_note)<=2000),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 reviewed_by uuid,reviewed_at timestamptz,
 updated_at timestamptz not null default now(),created_at timestamptz not null default now(),
 check(status<>'published' or (reviewed_at is not null and reviewed_by is not null and length(trim(source_note))>0))
);
create index couplet_translations_work_idx on public.couplet_translations(kalam_id,language,start_offset);
create unique index couplet_translations_live_slot_idx on public.couplet_translations(kalam_id,language,text_hash,start_offset,end_offset,target_language) where status='published';
alter table public.couplet_translations enable row level security;
revoke all on public.couplet_translations from public,anon,authenticated;
grant select(id,kalam_id,language,target_language,start_offset,end_offset,surface,text_hash,translation,source_note,status,reviewed_at,updated_at) on public.couplet_translations to anon,authenticated;
grant insert,update on public.couplet_translations to authenticated;
create policy translations_public_read on public.couplet_translations for select to anon,authenticated using(status='published' and reviewed_at is not null and exists(select 1 from public.kalam k join public.artists a on a.id=k.poet_id join public.kalam_texts t on t.kalam_id=k.id where k.id=couplet_translations.kalam_id and k.status='published' and a.status='published' and t.language=couplet_translations.language and encode(sha256(convert_to(t.body,'UTF8')),'hex')=couplet_translations.text_hash));
create policy translations_staff_read on public.couplet_translations for select to authenticated using((select private.staff_role()) in ('admin','editor'));
create policy translations_staff_insert on public.couplet_translations for insert to authenticated with check((select private.staff_role())='admin' or ((select private.staff_role())='editor' and status='draft'));
create policy translations_staff_update on public.couplet_translations for update to authenticated using((select private.staff_role())='admin' or ((select private.staff_role())='editor' and status='draft')) with check((select private.staff_role())='admin' or ((select private.staff_role())='editor' and status='draft'));
create function private.validate_couplet_translation() returns trigger language plpgsql security invoker set search_path='' as $$
declare original text;
begin
 if TG_OP='UPDATE' and new.kalam_id<>old.kalam_id then raise exception 'Translations cannot move to another work' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.kalam_id::text,1));
 if TG_OP='INSERT' and (select count(*) from public.couplet_translations where kalam_id=new.kalam_id)>=1000 then raise exception 'This work has 1000 translations. Edit an existing entry.' using errcode='22023';end if;
 if new.status<>'archived' then
 select body into original from public.kalam_texts where kalam_id=new.kalam_id and language=new.language;
 if original is null or encode(sha256(convert_to(original,'UTF8')),'hex')<>new.text_hash then raise exception 'Source text changed. Select the passage again.' using errcode='40001';end if;
 if substring(original from new.start_offset+1 for new.end_offset-new.start_offset)<>new.surface then raise exception 'The passage does not match the source text.' using errcode='22023';end if;
 end if;
 if new.status='published' then
 if (select private.staff_role()) is distinct from 'admin' then raise exception 'Administrator review required' using errcode='42501';end if;
 if exists(select 1 from public.couplet_translations t where t.id<>new.id and t.kalam_id=new.kalam_id and t.language=new.language and t.text_hash=new.text_hash and t.target_language=new.target_language and t.status='published' and int4range(t.start_offset,t.end_offset,'[)') && int4range(new.start_offset,new.end_offset,'[)')) then raise exception 'This passage already has a published translation in that language.' using errcode='22023';end if;
 new.reviewed_by=auth.uid();new.reviewed_at=clock_timestamp();
 else new.reviewed_by=null;new.reviewed_at=null;end if;
 new.updated_at=clock_timestamp();return new;
end $$;
revoke all on function private.validate_couplet_translation() from public,anon,authenticated;
create trigger couplet_translations_validate before insert or update on public.couplet_translations for each row execute function private.validate_couplet_translation();
create function public.save_couplet_translation(record_id uuid,payload jsonb,expected_updated_at timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare saved uuid;previous timestamptz;
begin
 if (select private.staff_role()) is null then raise exception 'Staff access required' using errcode='42501';end if;
 if payload->>'status'='published' and payload->>'review_confirmed' is distinct from 'true' then raise exception 'Confirm that you reviewed the translation' using errcode='22023';end if;
 if record_id is not null then
 select updated_at into previous from public.couplet_translations where id=record_id and kalam_id=(payload->>'kalam_id')::uuid for update;
 if not found then raise exception 'Translation unavailable for your role' using errcode='42501';end if;
 if expected_updated_at is null or previous<>expected_updated_at then raise exception 'Translation changed. Reload before saving.' using errcode='40001';end if;
 if payload->>'status'='archived' then update public.couplet_translations set status='archived' where id=record_id returning id into saved;return saved;end if;
 update public.couplet_translations set language=payload->>'language',target_language=payload->>'target_language',start_offset=(payload->>'start_offset')::integer,end_offset=(payload->>'end_offset')::integer,surface=payload->>'surface',text_hash=payload->>'text_hash',translation=payload->>'translation',source_note=payload->>'source_note',status=payload->>'status' where id=record_id returning id into saved;
 else
 insert into public.couplet_translations(kalam_id,language,target_language,start_offset,end_offset,surface,text_hash,translation,source_note,status) values((payload->>'kalam_id')::uuid,payload->>'language',payload->>'target_language',(payload->>'start_offset')::integer,(payload->>'end_offset')::integer,payload->>'surface',payload->>'text_hash',payload->>'translation',payload->>'source_note',payload->>'status') returning id into saved;
 end if;
 if saved is null then raise exception 'Translation could not be saved' using errcode='42501';end if;return saved;
end $$;
revoke all on function public.save_couplet_translation(uuid,jsonb,timestamptz) from public,anon;
grant execute on function public.save_couplet_translation(uuid,jsonb,timestamptz) to authenticated;
commit;
