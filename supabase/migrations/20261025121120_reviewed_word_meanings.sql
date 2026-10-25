-- Contextual, editor-written meanings. No external dictionary or translation service.
begin;
create table public.word_meanings (
 id uuid primary key default gen_random_uuid(),
 kalam_id uuid not null references public.kalam(id) on delete cascade,
 language text not null check (language in ('ur','en','hi','ar','roman','fa')),
 start_offset integer not null check (start_offset>=0),
 end_offset integer not null check (end_offset>start_offset and end_offset<=100000),
 surface text not null check (length(trim(surface)) between 1 and 200),
 text_hash text not null check (text_hash ~ '^[a-f0-9]{64}$'),
 meaning_ur text not null default '' check (length(meaning_ur)<=1000),
 meaning_en text not null default '' check (length(meaning_en)<=1000),
 meaning_hi text not null default '' check (length(meaning_hi)<=1000),
 meaning_ar text not null default '' check (length(meaning_ar)<=1000),
 context_note text not null default '' check (length(context_note)<=1000),
 source_note text not null default '' check (length(source_note)<=1000),
 status text not null default 'draft' check (status in ('draft','published','archived')),
 reviewed_by uuid,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (length(trim(meaning_ur||meaning_en||meaning_hi||meaning_ar))>0),
 check (status<>'published' or (reviewed_by is not null and reviewed_at is not null and length(trim(source_note))>0))
);
create index word_meanings_work_idx on public.word_meanings(kalam_id,language,start_offset);
alter table public.word_meanings enable row level security;
revoke all on public.word_meanings from public,anon,authenticated;
-- Reviewer UUIDs are retained for owner audit, not exposed to the public API.
grant select(id,kalam_id,language,start_offset,end_offset,surface,text_hash,meaning_ur,meaning_en,meaning_hi,meaning_ar,context_note,source_note,status,reviewed_at,updated_at) on public.word_meanings to anon,authenticated;
grant insert,update on public.word_meanings to authenticated;
create policy meanings_public_read on public.word_meanings for select to anon,authenticated using (
 status='published' and reviewed_at is not null and exists (
 select 1 from public.kalam k join public.artists a on a.id=k.poet_id join public.kalam_texts t on t.kalam_id=k.id
 where k.id=word_meanings.kalam_id and k.status='published' and a.status='published' and t.language=word_meanings.language
 and encode(sha256(convert_to(t.body,'UTF8')),'hex')=word_meanings.text_hash
 ));
create policy meanings_staff_read on public.word_meanings for select to authenticated using ((select private.staff_role()) in ('admin','editor'));
create policy meanings_staff_insert on public.word_meanings for insert to authenticated with check ((select private.staff_role())='admin' or ((select private.staff_role())='editor' and status='draft'));
create policy meanings_staff_update on public.word_meanings for update to authenticated
 using ((select private.staff_role())='admin' or ((select private.staff_role())='editor' and status='draft'))
 with check ((select private.staff_role())='admin' or ((select private.staff_role())='editor' and status='draft'));

create function private.validate_word_meaning() returns trigger language plpgsql security invoker set search_path='' as $$
declare original text;
begin
 if TG_OP='UPDATE' and new.kalam_id<>old.kalam_id then raise exception 'A meaning cannot move to another work' using errcode='22023'; end if;
 -- Serialize review and quota checks within a work, including direct API writes.
 perform pg_advisory_xact_lock(hashtextextended(new.kalam_id::text,0));
 if TG_OP='INSERT' and (select count(*) from public.word_meanings where kalam_id=new.kalam_id)>=500 then
 raise exception 'This work already has 500 meanings; edit or reuse an existing entry' using errcode='22023'; end if;
 if new.status<>'archived' then
 select body into original from public.kalam_texts where kalam_id=new.kalam_id and language=new.language;
 if original is null or encode(sha256(convert_to(original,'UTF8')),'hex')<>new.text_hash then
 raise exception 'Poem text changed; select the word again' using errcode='40001'; end if;
 if substring(original from new.start_offset+1 for new.end_offset-new.start_offset)<>new.surface then
 raise exception 'The selected word does not match this text' using errcode='22023'; end if;
 end if;
 if new.status='published' then
 if (select private.staff_role()) is distinct from 'admin' then raise exception 'Administrator review required' using errcode='42501'; end if;
 if exists(select 1 from public.word_meanings m where m.kalam_id=new.kalam_id and m.language=new.language and m.text_hash=new.text_hash and m.status='published' and m.id<>new.id and int4range(m.start_offset,m.end_offset,'[)') && int4range(new.start_offset,new.end_offset,'[)')) then
 raise exception 'This passage already has a published meaning; edit that entry or withdraw it first' using errcode='22023'; end if;
 new.reviewed_by=auth.uid(); new.reviewed_at=clock_timestamp();
 else new.reviewed_by=null; new.reviewed_at=null;
 end if;
 new.updated_at=clock_timestamp();
 return new;
end $$;
revoke all on function private.validate_word_meaning() from public,anon,authenticated;
create trigger word_meanings_validate before insert or update on public.word_meanings for each row execute function private.validate_word_meaning();

create function public.save_word_meaning(record_id uuid,payload jsonb,expected_updated_at timestamptz default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare saved_id uuid; previous_updated_at timestamptz;
begin
 if (select private.staff_role()) is null then raise exception 'Staff access required' using errcode='42501'; end if;
 if payload->>'status'='published' and (payload->>'review_confirmed') is distinct from 'true' then raise exception 'Confirm that you reviewed this meaning' using errcode='22023'; end if;
 if record_id is not null then
 select updated_at into previous_updated_at from public.word_meanings where id=record_id and kalam_id=(payload->>'kalam_id')::uuid for update;
 if not found then raise exception 'Meaning unavailable for your role' using errcode='42501'; end if;
 if expected_updated_at is null or previous_updated_at<>expected_updated_at then raise exception 'This meaning changed; reload before saving' using errcode='40001'; end if;
 if payload->>'status'='archived' then
 update public.word_meanings set status='archived' where id=record_id returning id into saved_id;
 return saved_id;
 end if;
 update public.word_meanings set language=payload->>'language',start_offset=(payload->>'start_offset')::integer,end_offset=(payload->>'end_offset')::integer,surface=payload->>'surface',text_hash=payload->>'text_hash',meaning_ur=payload->>'meaning_ur',meaning_en=payload->>'meaning_en',meaning_hi=payload->>'meaning_hi',meaning_ar=payload->>'meaning_ar',context_note=payload->>'context_note',source_note=payload->>'source_note',status=payload->>'status' where id=record_id returning id into saved_id;
 else
 insert into public.word_meanings(kalam_id,language,start_offset,end_offset,surface,text_hash,meaning_ur,meaning_en,meaning_hi,meaning_ar,context_note,source_note,status)
 values ((payload->>'kalam_id')::uuid,payload->>'language',(payload->>'start_offset')::integer,(payload->>'end_offset')::integer,payload->>'surface',payload->>'text_hash',payload->>'meaning_ur',payload->>'meaning_en',payload->>'meaning_hi',payload->>'meaning_ar',payload->>'context_note',payload->>'source_note',payload->>'status') returning id into saved_id;
 end if;
 if saved_id is null then raise exception 'Meaning could not be saved' using errcode='42501'; end if;
 return saved_id;
end $$;
revoke all on function public.save_word_meaning(uuid,jsonb,timestamptz) from public,anon;
grant execute on function public.save_word_meaning(uuid,jsonb,timestamptz) to authenticated;
commit;
