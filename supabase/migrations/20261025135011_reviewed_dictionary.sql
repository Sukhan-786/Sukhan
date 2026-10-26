begin;
create table public.dictionary_entries (
 id uuid primary key default gen_random_uuid(),
 word_id text not null unique check (length(word_id)<=100 and word_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 roman text not null default '' check(length(roman)<=200),
 urdu text not null default '' check(length(urdu)<=200),
 hindi text not null default '' check(length(hindi)<=200),
 english text not null default '' check(length(english)<=200),
 arabic text not null default '' check(length(arabic)<=200),
 persian text not null default '' check(length(persian)<=200),
 part_of_speech text not null check(part_of_speech in ('verb','noun','adjective','adverb','pronoun','preposition','postposition','conjunction','interjection','particle','phrase','other')),
 english_meanings text[] not null check(array_ndims(english_meanings)=1 and cardinality(english_meanings) between 1 and 20 and array_position(english_meanings,null) is null),
 root_word text not null default '' check(length(root_word)<=200),
 audio_url text check(audio_url is null or (length(audio_url)<=2048 and audio_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$' and audio_url !~ '^https://[^/]*@')),
 source_note text not null default '' check(length(source_note)<=1000),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 reviewed_by uuid, reviewed_at timestamptz,
 updated_at timestamptz not null default now(),
 lookup_keys text[] generated always as (array[
 'roman:'||trim(public.normalize_search(roman)), 'ur:'||trim(public.normalize_search(urdu)),
 'hi:'||trim(public.normalize_search(hindi)), 'en:'||trim(public.normalize_search(english)),
 'ar:'||trim(public.normalize_search(arabic)), 'fa:'||trim(public.normalize_search(persian))]) stored,
 check(length(trim(roman||urdu||hindi||english||arabic||persian))>0),
 check(status<>'published' or (reviewed_by is not null and reviewed_at is not null and length(trim(source_note))>0))
);
create index dictionary_lookup_idx on public.dictionary_entries using gin(lookup_keys);
alter table public.dictionary_entries enable row level security;
revoke all on public.dictionary_entries from public,anon,authenticated;
grant select(id,word_id,roman,urdu,hindi,english,arabic,persian,part_of_speech,english_meanings,root_word,audio_url,source_note,status,reviewed_at,updated_at,lookup_keys) on public.dictionary_entries to anon,authenticated;
grant insert,update on public.dictionary_entries to authenticated;
create policy dictionary_public_read on public.dictionary_entries for select to anon,authenticated using(status='published' and reviewed_at is not null);
create policy dictionary_staff_read on public.dictionary_entries for select to authenticated using((select private.staff_role()) in ('admin','editor'));
create policy dictionary_staff_insert on public.dictionary_entries for insert to authenticated with check((select private.staff_role())='admin' or ((select private.staff_role())='editor' and status='draft'));
create policy dictionary_staff_update on public.dictionary_entries for update to authenticated using((select private.staff_role())='admin' or ((select private.staff_role())='editor' and status='draft')) with check((select private.staff_role())='admin' or ((select private.staff_role())='editor' and status='draft'));
create function private.validate_dictionary_entry() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' and new.word_id<>old.word_id then raise exception 'The word ID cannot change after saving' using errcode='22023'; end if;
 if exists(select 1 from unnest(new.english_meanings) m where length(trim(m)) not between 1 and 500) then raise exception 'Each English meaning must contain 1 to 500 characters' using errcode='22023'; end if;
 if new.status='published' then
  if (select private.staff_role()) is distinct from 'admin' then raise exception 'Administrator review required' using errcode='42501'; end if;
  new.reviewed_by=auth.uid();new.reviewed_at=clock_timestamp();
 else new.reviewed_by=null;new.reviewed_at=null;
 end if;
 new.updated_at=clock_timestamp();return new;
end $$;
revoke all on function private.validate_dictionary_entry() from public,anon,authenticated;
create trigger dictionary_validate before insert or update on public.dictionary_entries for each row execute function private.validate_dictionary_entry();
create function public.lookup_dictionary(lookup_language text,lookup_word text) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'word_id',d.word_id,'roman',d.roman,'urdu',d.urdu,'hindi',d.hindi,'english',d.english,'arabic',d.arabic,'persian',d.persian,'part_of_speech',d.part_of_speech,'english_meanings',d.english_meanings,'root_word',d.root_word,'audio_url',d.audio_url,'source_note',d.source_note,'status',d.status,'reviewed_at',d.reviewed_at,'updated_at',d.updated_at)),'[]'::jsonb)
 from (select id,word_id,roman,urdu,hindi,english,arabic,persian,part_of_speech,english_meanings,root_word,audio_url,source_note,status,reviewed_at,updated_at from public.dictionary_entries
 where lookup_language in ('roman','ur','hi','en','ar','fa') and length(trim(lookup_word)) between 1 and 200 and lookup_keys @> array[lookup_language||':'||trim(public.normalize_search(lookup_word))] order by word_id limit 10) d
$$;
revoke all on function public.lookup_dictionary(text,text) from public;
grant execute on function public.lookup_dictionary(text,text) to anon,authenticated;
create function public.save_dictionary_entry(record_id uuid,payload jsonb,expected_updated_at timestamptz default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare saved_id uuid; previous_version timestamptz; definitions text[];
begin
 if (select private.staff_role()) is null then raise exception 'Staff access required' using errcode='42501'; end if;
 if payload->>'status'='published' and payload->>'review_confirmed' is distinct from 'true' then raise exception 'Confirm your review before publishing' using errcode='22023'; end if;
 if jsonb_typeof(payload->'english_meanings') is distinct from 'array' then raise exception 'English meanings must be an array' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'english_meanings') m where jsonb_typeof(m)<>'string') then raise exception 'English meanings must be strings' using errcode='22023'; end if;
 definitions=array(select jsonb_array_elements_text(payload->'english_meanings'));
 if record_id is null then
 insert into public.dictionary_entries(word_id,roman,urdu,hindi,english,arabic,persian,part_of_speech,english_meanings,root_word,audio_url,source_note,status)
 values(payload->>'word_id',coalesce(payload->>'roman',''),coalesce(payload->>'urdu',''),coalesce(payload->>'hindi',''),coalesce(payload->>'english',''),coalesce(payload->>'arabic',''),coalesce(payload->>'persian',''),payload->>'part_of_speech',definitions,coalesce(payload->>'root_word',''),nullif(payload->>'audio_url',''),coalesce(payload->>'source_note',''),payload->>'status') returning id into saved_id;
 else
 select updated_at into previous_version from public.dictionary_entries where id=record_id for update;
 if not found then raise exception 'Dictionary entry unavailable for your role' using errcode='42501'; end if;
 if expected_updated_at is null or previous_version<>expected_updated_at then raise exception 'This entry changed; reload before saving' using errcode='40001'; end if;
 update public.dictionary_entries set word_id=payload->>'word_id',roman=coalesce(payload->>'roman',''),urdu=coalesce(payload->>'urdu',''),hindi=coalesce(payload->>'hindi',''),english=coalesce(payload->>'english',''),arabic=coalesce(payload->>'arabic',''),persian=coalesce(payload->>'persian',''),part_of_speech=payload->>'part_of_speech',english_meanings=definitions,root_word=coalesce(payload->>'root_word',''),audio_url=nullif(payload->>'audio_url',''),source_note=coalesce(payload->>'source_note',''),status=payload->>'status' where id=record_id returning id into saved_id;
 end if;
 if saved_id is null then raise exception 'Entry could not be saved' using errcode='42501'; end if;
 return saved_id;
end $$;
revoke all on function public.save_dictionary_entry(uuid,jsonb,timestamptz) from public,anon;
grant execute on function public.save_dictionary_entry(uuid,jsonb,timestamptz) to authenticated;
commit;
