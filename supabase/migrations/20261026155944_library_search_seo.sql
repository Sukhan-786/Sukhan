begin;
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
grant usage on schema extensions to anon,authenticated;
-- Expression indexes keep literal Unicode substring searches without duplicating poem bodies.
create index kalam_text_search_trgm_idx on public.kalam_texts using gin(public.normalize_search(title||' '||body) extensions.gin_trgm_ops);
create index artist_search_trgm_idx on public.artists using gin(public.normalize_search(name||' '||name_ur) extensions.gin_trgm_ops);
create index kalam_summary_search_trgm_idx on public.kalam using gin(public.normalize_search(summary) extensions.gin_trgm_ops);
create function public.literal_search_pattern(value text) returns text language sql immutable security invoker set search_path='' as $$
 select '%'||replace(replace(replace(value,E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_')||'%'
$$;
revoke all on function public.literal_search_pattern(text) from public;
grant execute on function public.literal_search_pattern(text) to anon,authenticated;
create or replace function public.search_kalam(search_query text default '',filter_form text default null,filter_poet uuid default null,filter_kind text default null) returns setof public.kalam language plpgsql stable security invoker set search_path='' as $$
begin
 if trim(coalesce(search_query,''))='' then
 return query select k.* from public.kalam k join public.artists a on a.id=k.poet_id where k.status='published' and a.status='published' and (filter_form is null or k.form=filter_form) and (filter_poet is null or k.poet_id=filter_poet) and (filter_kind is null or exists(select 1 from public.kalam_media km join public.media m on m.id=km.media_id where km.kalam_id=k.id and m.status='published' and m.kind=filter_kind));
 else
 return query with terms as materialized (
 select distinct term,public.literal_search_pattern(term) pattern from regexp_split_to_table(trim(public.normalize_search(left(search_query,160))),E'\\s+') term where term<>'' limit 12
 ),matched as (
 select t.term,kt.kalam_id from terms t join public.kalam_texts kt on public.normalize_search(kt.title||' '||kt.body) like t.pattern
 union select t.term,k.id from terms t join public.kalam k on public.normalize_search(k.summary) like t.pattern
 union select t.term,k.id from terms t join public.artists a on public.normalize_search(a.name||' '||a.name_ur) like t.pattern join public.kalam k on k.poet_id=a.id
 ),ids as(select m.kalam_id from matched m group by m.kalam_id having count(*)=(select count(*) from terms))
 select k.* from ids join public.kalam k on k.id=ids.kalam_id join public.artists a on a.id=k.poet_id where k.status='published' and a.status='published' and (filter_form is null or k.form=filter_form) and (filter_poet is null or k.poet_id=filter_poet) and (filter_kind is null or exists(select 1 from public.kalam_media km join public.media m on m.id=km.media_id where km.kalam_id=k.id and m.status='published' and m.kind=filter_kind));
 end if;
end $$;
create function public.search_library(search_query text default '',filter_form text default null,filter_poet uuid default null,filter_kind text default null,filter_language text default null) returns setof public.kalam language sql stable security invoker set search_path='' as $$
 select k.* from public.search_kalam(search_query,filter_form,filter_poet,filter_kind) k where filter_language is null or exists(select 1 from public.kalam_texts t where t.kalam_id=k.id and t.language=filter_language)
$$;
revoke all on function public.search_library(text,text,uuid,text,text) from public;
grant execute on function public.search_library(text,text,uuid,text,text) to anon,authenticated;
create function public.sitemap_counts() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('poetry',(select count(*) from public.kalam k join public.artists a on a.id=k.poet_id where k.status='published' and a.status='published'),'dictionary',(select count(*) from public.dictionary_entries where status='published' and reviewed_at is not null))
$$;
revoke all on function public.sitemap_counts() from public;
grant execute on function public.sitemap_counts() to anon,authenticated;
create function public.sitemap_poetry(page_number integer) returns table(slug text,updated_at timestamptz) language sql stable security invoker set search_path='' as $$
 select k.slug,k.updated_at from public.kalam k join public.artists a on a.id=k.poet_id where k.status='published' and a.status='published' and page_number between 0 and 9999 order by k.id limit 1000 offset greatest(0,least(page_number,9999))*1000
$$;
revoke all on function public.sitemap_poetry(integer) from public;
grant execute on function public.sitemap_poetry(integer) to anon,authenticated;
commit;
