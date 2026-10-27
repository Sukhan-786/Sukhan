begin;
-- Page through small public metadata before joining the RLS-protected source
-- tables. Deep offsets must not re-check every poem's text and author policies.
alter table public.library_search_documents
  add column form text,
  add column created_at timestamptz,
  add column languages text[];
update public.library_search_documents d set
  form=k.form,created_at=k.created_at,
  languages=(select array_agg(t.language order by t.language) from public.kalam_texts t where t.kalam_id=k.id)
from public.kalam k where k.id=d.kalam_id;
alter table public.library_search_documents
  alter column form set not null,
  alter column created_at set not null,
  alter column languages set not null;
create index library_search_documents_order_idx on public.library_search_documents(created_at desc,kalam_id)
  include (poet_id,form,languages);
create index library_search_documents_languages_idx on public.library_search_documents using gin(languages);

create or replace function private.refresh_library_search_documents(work_ids uuid[])
returns void language plpgsql security definer set search_path='' as $$
begin
  delete from public.library_search_documents d where d.kalam_id=any(work_ids);
  insert into public.library_search_documents(kalam_id,poet_id,search_text,form,created_at,languages)
  select k.id,k.poet_id,public.normalize_search(k.summary||' '||t.texts),k.form,k.created_at,t.languages
  from public.kalam k join public.artists a on a.id=k.poet_id
  cross join lateral (
    select string_agg(kt.title||' '||kt.body,' ' order by kt.language) texts,
      array_agg(kt.language order by kt.language) languages
    from public.kalam_texts kt where kt.kalam_id=k.id
  ) t
  where k.id=any(work_ids) and k.status='published' and a.status='published'
    and t.texts is not null;
end $$;
revoke all on function private.refresh_library_search_documents(uuid[]) from public,anon,authenticated;
drop trigger library_search_work_sync on public.kalam;
create trigger library_search_work_sync
  after insert or update of summary,status,poet_id,form,created_at or delete on public.kalam
  for each row execute function private.sync_library_search_document();

create function public.search_library_page(
  search_query text default '',filter_form text default null,filter_poet uuid default null,
  filter_kind text default null,filter_language text default null,page_number integer default 1
) returns setof public.kalam language plpgsql stable security invoker set search_path='' as $$
begin
  if trim(coalesce(search_query,''))='' then
    return query with page_ids as materialized (
      select d.kalam_id,d.created_at from public.library_search_documents d
      where (filter_form is null or d.form=filter_form)
        and (filter_poet is null or d.poet_id=filter_poet)
        and (filter_language is null or d.languages @> array[filter_language])
        and (filter_kind is null or d.kalam_id in (
          select km.kalam_id from public.kalam_media km join public.media m on m.id=km.media_id
          where m.status='published' and m.kind=filter_kind))
      order by d.created_at desc,d.kalam_id
      limit 25 offset (greatest(1,least(coalesce(page_number,1),10000))-1)*24
    )
    select k.* from page_ids p join public.kalam k on k.id=p.kalam_id
      order by p.created_at desc,p.kalam_id;
  else
    return query with terms as materialized (
      select distinct term,public.literal_search_pattern(term) pattern
      from regexp_split_to_table(trim(public.normalize_search(left(search_query,160))),E'\\s+') term
      where term<>'' limit 12
    ),matched as (
      select t.term,d.kalam_id from terms t join public.library_search_documents d on d.search_text like t.pattern
      union
      select t.term,d.kalam_id from terms t join public.artists a
        on public.normalize_search(a.name||' '||a.name_ur) like t.pattern
        join public.library_search_documents d on d.poet_id=a.id
    ),ids as (
      select m.kalam_id from matched m group by m.kalam_id having count(*)=(select count(*) from terms)
    ),page_ids as materialized (
      select d.kalam_id,d.created_at from ids join public.library_search_documents d using(kalam_id)
      where (filter_form is null or d.form=filter_form)
        and (filter_poet is null or d.poet_id=filter_poet)
        and (filter_language is null or d.languages @> array[filter_language])
        and (filter_kind is null or d.kalam_id in (
          select km.kalam_id from public.kalam_media km join public.media m on m.id=km.media_id
          where m.status='published' and m.kind=filter_kind))
      order by d.created_at desc,d.kalam_id
      limit 25 offset (greatest(1,least(coalesce(page_number,1),10000))-1)*24
    )
    select k.* from page_ids p join public.kalam k on k.id=p.kalam_id
      order by p.created_at desc,p.kalam_id;
  end if;
end $$;
revoke all on function public.search_library_page(text,text,uuid,text,text,integer) from public;
grant execute on function public.search_library_page(text,text,uuid,text,text,integer) to anon,authenticated;
analyze public.library_search_documents;
commit;
