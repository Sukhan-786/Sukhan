begin;
-- LIKE/normalization cannot be pushed below the original tables' privacy policies.
-- Index only already-public text, without changing those tables' RLS protections.
create table public.library_search_documents (
  kalam_id uuid primary key references public.kalam(id) on delete cascade,
  poet_id uuid not null references public.artists(id) on delete cascade,
  search_text text not null
);
create index library_search_documents_poet_idx on public.library_search_documents(poet_id);
alter table public.library_search_documents enable row level security;
revoke all on public.library_search_documents from public,anon,authenticated;
grant select on public.library_search_documents to anon,authenticated;
-- Every row is a projection of a published work with a published author.
create policy published_search_read on public.library_search_documents for select
  to anon,authenticated using (true);

-- Internal trigger maintenance only. No API role can invoke these functions or
-- write search documents. Source writes still require their existing RLS policies.
create function private.refresh_library_search_documents(work_ids uuid[])
returns void language plpgsql security definer set search_path='' as $$
begin
  delete from public.library_search_documents d where d.kalam_id=any(work_ids);
  insert into public.library_search_documents(kalam_id,poet_id,search_text)
  select k.id,k.poet_id,public.normalize_search(k.summary||' '||t.texts)
  from public.kalam k join public.artists a on a.id=k.poet_id
  cross join lateral (
    select string_agg(kt.title||' '||kt.body,' ' order by kt.language) texts
    from public.kalam_texts kt where kt.kalam_id=k.id
  ) t
  where k.id=any(work_ids) and k.status='published' and a.status='published'
    and t.texts is not null;
end $$;
revoke all on function private.refresh_library_search_documents(uuid[])
  from public,anon,authenticated;

create function private.sync_library_search_document()
returns trigger language plpgsql security definer set search_path='' as $$
declare work_ids uuid[];
begin
  if tg_table_name='artists' then
    if new.status is not distinct from old.status then return new; end if;
    select coalesce(array_agg(k.id),'{}'::uuid[]) into work_ids
      from public.kalam k where k.poet_id=new.id;
  elsif tg_table_name='kalam' then
    work_ids=array[case when tg_op='DELETE' then old.id else new.id end];
  else
    if tg_op='UPDATE' then work_ids=array[old.kalam_id,new.kalam_id];
    elsif tg_op='DELETE' then work_ids=array[old.kalam_id];
    else work_ids=array[new.kalam_id]; end if;
  end if;
  perform private.refresh_library_search_documents(work_ids);
  return null;
end $$;
revoke all on function private.sync_library_search_document()
  from public,anon,authenticated;
create trigger library_search_work_sync
  after insert or update of summary,status,poet_id or delete on public.kalam
  for each row execute function private.sync_library_search_document();
create trigger library_search_text_sync
  after insert or update or delete on public.kalam_texts
  for each row execute function private.sync_library_search_document();
create trigger library_search_author_sync
  after update of status on public.artists
  for each row execute function private.sync_library_search_document();

-- Backfill and install triggers in the same transaction: no publication change
-- can slip between the backfill and the start of automatic maintenance.
select private.refresh_library_search_documents(array(select id from public.kalam));
create index library_search_documents_trgm_idx on public.library_search_documents
  using gin(search_text extensions.gin_trgm_ops);
-- These indexes cannot accelerate anonymous normalized-body searches under RLS.
drop index public.kalam_text_search_trgm_idx;
drop index public.kalam_summary_search_trgm_idx;

create or replace function public.search_kalam(
  search_query text default '',filter_form text default null,
  filter_poet uuid default null,filter_kind text default null
) returns setof public.kalam language plpgsql stable security invoker
set search_path='' as $$
begin
  if trim(coalesce(search_query,''))='' then
    return query select k.* from public.kalam k join public.artists a on a.id=k.poet_id
    where k.status='published' and a.status='published'
      and (filter_form is null or k.form=filter_form)
      and (filter_poet is null or k.poet_id=filter_poet)
      and (filter_kind is null or exists(
        select 1 from public.kalam_media km join public.media m on m.id=km.media_id
        where km.kalam_id=k.id and m.status='published' and m.kind=filter_kind));
  else
    return query with terms as materialized (
      select distinct term,public.literal_search_pattern(term) pattern
      from regexp_split_to_table(trim(public.normalize_search(left(search_query,160))),E'\\s+') term
      where term<>'' limit 12
    ),matched as (
      select t.term,d.kalam_id from terms t join public.library_search_documents d
        on d.search_text like t.pattern
      union
      select t.term,k.id from terms t join public.artists a
        on public.normalize_search(a.name||' '||a.name_ur) like t.pattern
        join public.kalam k on k.poet_id=a.id
    ),ids as (
      select m.kalam_id from matched m group by m.kalam_id
      having count(*)=(select count(*) from terms)
    )
    select k.* from ids join public.kalam k on k.id=ids.kalam_id
      join public.artists a on a.id=k.poet_id
    where k.status='published' and a.status='published'
      and (filter_form is null or k.form=filter_form)
      and (filter_poet is null or k.poet_id=filter_poet)
      and (filter_kind is null or exists(
        select 1 from public.kalam_media km join public.media m on m.id=km.media_id
        where km.kalam_id=k.id and m.status='published' and m.kind=filter_kind));
  end if;
end $$;
analyze public.library_search_documents;
analyze public.kalam;
analyze public.kalam_texts;
analyze public.artists;
commit;
