-- Staff-only listing. Every query keeps the caller's RLS permissions.
begin;
create index kalam_editorial_order_idx on public.kalam(updated_at desc,id desc);
create index artists_editorial_order_idx on public.artists(updated_at desc,id desc);
create index media_editorial_order_idx on public.media(updated_at desc,id desc);

create function public.editorial_page(
 record_type text, search_query text default '', filter_status text default '',
 filter_type text default '', cursor_time timestamptz default null,
 cursor_id uuid default null, previous_page boolean default false
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare answer jsonb;
begin
 if coalesce((select private.staff_role()),'') not in ('admin','editor') then
  raise exception 'Staff access required' using errcode='42501';
 end if;
 if record_type not in ('kalam','artists','media') or record_type is null then
  raise exception 'Invalid record type' using errcode='22023';
 end if;
 with source as (
  select k.id,k.slug,coalesce(t.title,k.slug) title,k.status,k.form kind,k.updated_at,a.name poet,
   coalesce(t.scripts,'[]'::jsonb) scripts,concat_ws(' ',k.slug,a.name,a.name_ur,t.titles) search_text
  from public.kalam k join public.artists a on a.id=k.poet_id
  left join lateral (
   select (array_agg(title order by case language when 'en' then 1 when 'roman' then 2 when 'ur' then 3 else 4 end))[1] title,
    jsonb_agg(language order by language) scripts,string_agg(title,' ') titles
   from public.kalam_texts where kalam_id=k.id
  ) t on true where record_type='kalam'
  union all
  select a.id,a.slug,a.name,a.status,a.kind,a.updated_at,null,'[]'::jsonb,concat_ws(' ',a.slug,a.name,a.name_ur)
  from public.artists a where record_type='artists'
  union all
  select m.id,''::text,m.title,m.status,m.kind,m.updated_at,a.name,'[]'::jsonb,concat_ws(' ',m.title,a.name,a.name_ur)
  from public.media m left join public.artists a on a.id=m.performer_id where record_type='media'
 ), filtered as (
  select * from source s where (coalesce(filter_status,'')='' or s.status=filter_status)
   and (coalesce(filter_type,'')='' or s.kind=filter_type)
   and not exists (
    select 1 from regexp_split_to_table(trim(public.normalize_search(left(coalesce(search_query,''),160))),E'\\s+') term
    where term<>'' and position(term in public.normalize_search(s.search_text))=0
   )
 ), windowed as (
  select * from filtered s where cursor_time is null or cursor_id is null
   or (not previous_page and (s.updated_at,s.id)<(cursor_time,cursor_id))
   or (previous_page and (s.updated_at,s.id)>(cursor_time,cursor_id))
  order by case when previous_page then s.updated_at end asc,case when previous_page then s.id end asc,
   case when not previous_page then s.updated_at end desc,case when not previous_page then s.id end desc limit 26
 ), selected as (
  select * from windowed s order by case when previous_page then s.updated_at end asc,case when previous_page then s.id end asc,
   case when not previous_page then s.updated_at end desc,case when not previous_page then s.id end desc limit 25
 )
 select jsonb_build_object('total',(select count(*) from filtered),'has_more',(select count(*)>25 from windowed),
  'items',coalesce((select jsonb_agg(to_jsonb(s)-'search_text' order by s.updated_at desc,s.id desc) from selected s),'[]'::jsonb)) into answer;
 return answer;
end $$;
revoke all on function public.editorial_page(text,text,text,text,timestamptz,uuid,boolean) from public,anon;
grant execute on function public.editorial_page(text,text,text,text,timestamptz,uuid,boolean) to authenticated;

create function public.editorial_overview() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare answer jsonb;
begin
 if coalesce((select private.staff_role()),'') not in ('admin','editor') then
  raise exception 'Staff access required' using errcode='42501';
 end if;
 select jsonb_object_agg(record_type,counts) into answer from (
  select 'kalam' record_type,jsonb_build_object('total',count(*),'draft',count(*) filter(where status='draft'),'published',count(*) filter(where status='published')) counts from public.kalam
  union all select 'artists',jsonb_build_object('total',count(*),'draft',count(*) filter(where status='draft'),'published',count(*) filter(where status='published')) from public.artists
  union all select 'media',jsonb_build_object('total',count(*),'draft',count(*) filter(where status='draft'),'published',count(*) filter(where status='published')) from public.media
 ) s;
 return answer;
end $$;
revoke all on function public.editorial_overview() from public,anon;
grant execute on function public.editorial_overview() to authenticated;
commit;
