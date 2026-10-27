begin;
-- Materialize a small published ID list before checking the original source RLS.
create or replace function public.homepage_kalam(feed_language text default null,requested_ids uuid[] default '{}')
returns setof public.kalam language sql stable security invoker set search_path='' as $$
 with chosen as materialized (
   select d.kalam_id,d.created_at from public.library_search_documents d
   where cardinality(requested_ids)<=144 and
     case when cardinality(requested_ids)>0 then d.kalam_id=any(requested_ids)
       else feed_language is null or d.languages @> array[feed_language] end
   order by d.created_at desc,d.kalam_id limit case when cardinality(requested_ids)>0 then 144 else 24 end
 ) select k.* from chosen p join public.kalam k on k.id=p.kalam_id
   order by p.created_at desc,p.kalam_id
$$;
revoke all on function public.homepage_kalam(text,uuid[]) from public;
grant execute on function public.homepage_kalam(text,uuid[]) to anon,authenticated;
commit;
