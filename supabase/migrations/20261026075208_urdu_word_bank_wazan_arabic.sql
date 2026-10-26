begin;
alter table public.dictionary_entries
 add column arabic_meanings text[] not null default '{}',
 add column urdu_meanings text[] not null default '{}',
 add column wazan text[] not null default '{}',
 add column wazan_note text not null default '' check(length(wazan_note)<=1000);
alter table public.dictionary_entries drop constraint dictionary_entries_english_meanings_check;
alter table public.dictionary_entries add constraint dictionary_definition_arrays check (
 cardinality(english_meanings)<=20 and cardinality(arabic_meanings)<=20 and cardinality(urdu_meanings)<=20 and cardinality(wazan)<=20
 and coalesce(array_ndims(english_meanings),1)=1 and coalesce(array_ndims(arabic_meanings),1)=1 and coalesce(array_ndims(urdu_meanings),1)=1 and coalesce(array_ndims(wazan),1)=1
 and array_position(english_meanings,null) is null and array_position(arabic_meanings,null) is null and array_position(urdu_meanings,null) is null and array_position(wazan,null) is null
 and (status<>'published' or cardinality(english_meanings)+cardinality(arabic_meanings)+cardinality(urdu_meanings)>0));
grant select(arabic_meanings,urdu_meanings,wazan,wazan_note) on public.dictionary_entries to anon,authenticated;
create or replace function private.validate_dictionary_entry() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' and new.word_id<>old.word_id then raise exception 'The word ID cannot change after saving' using errcode='22023'; end if;
 if exists(select 1 from unnest(new.english_meanings||new.arabic_meanings||new.urdu_meanings) m where length(trim(m)) not between 1 and 500) then raise exception 'Each meaning must contain 1 to 500 characters' using errcode='22023'; end if;
 if exists(select 1 from unnest(new.wazan) m where m !~ '^[12]{1,40}$') then raise exception 'Wazan patterns use 1 for short and 2 for long syllables' using errcode='22023'; end if;
 if new.status='published' then
  if (select private.staff_role()) is distinct from 'admin' then raise exception 'Administrator review required' using errcode='42501'; end if;
  new.reviewed_by=auth.uid();new.reviewed_at=clock_timestamp();
 else new.reviewed_by=null;new.reviewed_at=null;
 end if;
 new.updated_at=clock_timestamp();return new;
end $$;
create or replace function public.lookup_dictionary(lookup_language text,lookup_word text) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'word_id',d.word_id,'roman',d.roman,'urdu',d.urdu,'hindi',d.hindi,'english',d.english,'arabic',d.arabic,'persian',d.persian,'part_of_speech',d.part_of_speech,'english_meanings',d.english_meanings,'arabic_meanings',d.arabic_meanings,'urdu_meanings',d.urdu_meanings,'wazan',d.wazan,'wazan_note',d.wazan_note,'root_word',d.root_word,'audio_url',d.audio_url,'source_note',d.source_note,'status',d.status,'reviewed_at',d.reviewed_at,'updated_at',d.updated_at)),'[]'::jsonb)
 from (select id,word_id,roman,urdu,hindi,english,arabic,persian,part_of_speech,english_meanings,arabic_meanings,urdu_meanings,wazan,wazan_note,root_word,audio_url,source_note,status,reviewed_at,updated_at from public.dictionary_entries
 where lookup_language in ('roman','ur','hi','en','ar','fa') and length(trim(lookup_word)) between 1 and 200 and lookup_keys @> array[lookup_language||':'||trim(public.normalize_search(lookup_word))] order by word_id limit 10) d
$$;
create or replace function public.save_dictionary_entry(record_id uuid,payload jsonb,expected_updated_at timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare saved_id uuid; previous_version timestamptz; definitions text[]; arabic_definitions text[]; urdu_definitions text[]; weights text[]; field_name text;
begin
 if (select private.staff_role()) is null then raise exception 'Staff access required' using errcode='42501'; end if;
 if payload->>'status'='published' and payload->>'review_confirmed' is distinct from 'true' then raise exception 'Confirm your review before publishing' using errcode='22023'; end if;
 foreach field_name in array array['arabic_meanings','urdu_meanings','wazan'] loop
  if payload ? field_name and (jsonb_typeof(payload->field_name) is distinct from 'array') then raise exception 'Meaning and wazan fields must be arrays' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(payload->field_name,'[]'::jsonb)) m where jsonb_typeof(m)<>'string') then raise exception 'Meaning and wazan arrays must contain strings' using errcode='22023'; end if;
 end loop;
 arabic_definitions=array(select jsonb_array_elements_text(coalesce(payload->'arabic_meanings','[]'::jsonb)));
 urdu_definitions=array(select jsonb_array_elements_text(coalesce(payload->'urdu_meanings','[]'::jsonb)));
 weights=array(select jsonb_array_elements_text(coalesce(payload->'wazan','[]'::jsonb)));
 if jsonb_typeof(payload->'english_meanings') is distinct from 'array' then raise exception 'English meanings must be an array' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'english_meanings') m where jsonb_typeof(m)<>'string') then raise exception 'English meanings must be strings' using errcode='22023'; end if;
 definitions=array(select jsonb_array_elements_text(payload->'english_meanings'));
 if record_id is null then
 insert into public.dictionary_entries(word_id,roman,urdu,hindi,english,arabic,persian,part_of_speech,english_meanings,arabic_meanings,urdu_meanings,wazan,wazan_note,root_word,audio_url,source_note,status)
 values(payload->>'word_id',coalesce(payload->>'roman',''),coalesce(payload->>'urdu',''),coalesce(payload->>'hindi',''),coalesce(payload->>'english',''),coalesce(payload->>'arabic',''),coalesce(payload->>'persian',''),payload->>'part_of_speech',definitions,arabic_definitions,urdu_definitions,weights,coalesce(payload->>'wazan_note',''),coalesce(payload->>'root_word',''),nullif(payload->>'audio_url',''),coalesce(payload->>'source_note',''),payload->>'status') returning id into saved_id;
 else
 select updated_at into previous_version from public.dictionary_entries where id=record_id for update;
 if not found then raise exception 'Dictionary entry unavailable for your role' using errcode='42501'; end if;
 if expected_updated_at is null or previous_version<>expected_updated_at then raise exception 'This entry changed; reload before saving' using errcode='40001'; end if;
 update public.dictionary_entries set word_id=payload->>'word_id',roman=coalesce(payload->>'roman',''),urdu=coalesce(payload->>'urdu',''),hindi=coalesce(payload->>'hindi',''),english=coalesce(payload->>'english',''),arabic=coalesce(payload->>'arabic',''),persian=coalesce(payload->>'persian',''),part_of_speech=payload->>'part_of_speech',english_meanings=definitions,arabic_meanings=arabic_definitions,urdu_meanings=urdu_definitions,wazan=weights,wazan_note=coalesce(payload->>'wazan_note',''),root_word=coalesce(payload->>'root_word',''),audio_url=nullif(payload->>'audio_url',''),source_note=coalesce(payload->>'source_note',''),status=payload->>'status' where id=record_id returning id into saved_id;
 end if;
 if saved_id is null then raise exception 'Entry could not be saved' using errcode='42501'; end if;
 return saved_id;
end $$;

-- A sourced word bank is separate from reviewed definitions. It never publishes drafts.
create table public.urdu_word_bank (
 headword text primary key check(length(trim(headword)) between 1 and 200 and headword !~ '[[:cntrl:]]'),
 search_key text generated always as (trim(public.normalize_search(headword))) stored,
 wazan_candidates text[] not null default '{}' check(cardinality(wazan_candidates)<=20 and coalesce(array_ndims(wazan_candidates),1)=1 and array_position(wazan_candidates,null) is null),
 constraint word_bank_wazan_format check(cardinality(wazan_candidates)=0 or array_to_string(wazan_candidates,',') ~ '^[=x-]{1,40}(,[=x-]{1,40})*$'),
 source_id text not null default 'urduhack-aruuz-20261026-v1' check(source_id='urduhack-aruuz-20261026-v1')
);
create index urdu_word_bank_search_idx on public.urdu_word_bank(search_key text_pattern_ops,headword);
alter table public.urdu_word_bank enable row level security;
revoke all on public.urdu_word_bank from public,anon,authenticated;
grant select on public.urdu_word_bank to anon,authenticated;
grant insert on public.urdu_word_bank to authenticated;
create policy word_bank_read on public.urdu_word_bank for select to anon,authenticated using(true);
create policy word_bank_admin_insert on public.urdu_word_bank for insert to authenticated with check((select private.staff_role())='admin');
create table public.word_bank_import (
 source_id text primary key check(source_id='urduhack-aruuz-20261026-v1'),
 processed integer not null default 0 check(processed between 0 and 154781),
 inserted integer not null default 0 check(inserted between 0 and 154781),
 updated_at timestamptz not null default now()
);
insert into public.word_bank_import(source_id) values('urduhack-aruuz-20261026-v1');
alter table public.word_bank_import enable row level security;
revoke all on public.word_bank_import from public,anon,authenticated;
grant select,update on public.word_bank_import to authenticated;
create policy word_bank_import_admin on public.word_bank_import for all to authenticated using((select private.staff_role())='admin') with check((select private.staff_role())='admin');
create function public.import_urdu_word_batch(batch_offset integer,batch_rows jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare progress public.word_bank_import; batch_size integer; added integer;
begin
 if (select private.staff_role()) is distinct from 'admin' then raise exception 'Administrator access required' using errcode='42501'; end if;
 select * into progress from public.word_bank_import where source_id='urduhack-aruuz-20261026-v1' for update;
 if batch_offset is null or batch_offset<0 then raise exception 'Invalid import offset' using errcode='22023'; end if;
 -- A lost response can be retried; committed batches are never applied twice.
 if batch_offset<progress.processed then return to_jsonb(progress); end if;
 if batch_offset<>progress.processed then raise exception 'Import progress changed. Resume from saved progress.' using errcode='40001'; end if;
 if jsonb_typeof(batch_rows) is distinct from 'array' then raise exception 'Choose an array of word rows' using errcode='22023'; end if;
 batch_size=jsonb_array_length(batch_rows);
 if batch_size not between 1 and 1000 or progress.processed+batch_size>154781 then raise exception 'Import batches must contain 1 to 1000 words within the source total' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(batch_rows) r where jsonb_typeof(r) is distinct from 'object' or jsonb_typeof(r->'headword') is distinct from 'string' or length(trim(r->>'headword')) not between 1 and 200 or jsonb_typeof(r->'wazan_candidates') is distinct from 'array') then raise exception 'Invalid word bank row' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(batch_rows) r cross join lateral jsonb_array_elements(r->'wazan_candidates') w where jsonb_typeof(w)<>'string' or (w#>>'{}') !~ '^[=x-]{1,40}$') then raise exception 'Invalid source wazan candidate' using errcode='22023'; end if;
 insert into public.urdu_word_bank(headword,wazan_candidates)
 select r->>'headword',array(select jsonb_array_elements_text(r->'wazan_candidates')) from jsonb_array_elements(batch_rows) r on conflict(headword) do nothing;
 get diagnostics added=row_count;
 update public.word_bank_import set processed=processed+batch_size,inserted=inserted+added,updated_at=clock_timestamp() where source_id=progress.source_id returning * into progress;
 return to_jsonb(progress);
end $$;
revoke all on function public.import_urdu_word_batch(integer,jsonb) from public,anon;
grant execute on function public.import_urdu_word_batch(integer,jsonb) to authenticated;
create function public.lookup_urdu_word_bank(lookup_word text) returns setof public.urdu_word_bank language sql stable security invoker set search_path='' as $$
 select * from public.urdu_word_bank where length(trim(lookup_word)) between 1 and 200 and search_key=trim(public.normalize_search(lookup_word)) order by headword limit 10
$$;
revoke all on function public.lookup_urdu_word_bank(text) from public;
grant execute on function public.lookup_urdu_word_bank(text) to anon,authenticated;
-- Prefix search uses literal text, never treats a user's % or _ as a wildcard.
create function public.search_urdu_word_bank(prefix text,after_word text default '') returns setof public.urdu_word_bank language sql stable security invoker set search_path='' as $$
 select * from public.urdu_word_bank where length(prefix)<=200 and headword>coalesce(after_word,'') and search_key like replace(replace(replace(trim(public.normalize_search(prefix)),E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_')||'%' order by headword limit 51
$$;
revoke all on function public.search_urdu_word_bank(text,text) from public;
grant execute on function public.search_urdu_word_bank(text,text) to anon,authenticated;
commit;
