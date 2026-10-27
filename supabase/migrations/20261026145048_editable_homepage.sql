begin;
-- Live settings are physically separate from the staff-only working draft.
create table public.homepage_public (
 id boolean primary key default true check(id),
 config jsonb not null check(jsonb_typeof(config)='object' and config @> '{"version":1}'::jsonb and octet_length(config::text)<=200000),
 updated_at timestamptz not null default now()
);
create table public.homepage_draft (
 id boolean primary key default true check(id),
 config jsonb not null check(jsonb_typeof(config)='object' and config @> '{"version":1}'::jsonb and octet_length(config::text)<=200000),
 updated_at timestamptz not null default now()
);
insert into public.homepage_public(config) values('{"version":1,"seo_title":"Sukhan — A home for words & voices","seo_description":"Discover Urdu and Persian literature, read poetry in multiple scripts, and explore poets, audio and video.","sections":[{"id":"banner","type":"banner","enabled":true,"title":"Banner","description":"","body":"","href":"/catalogue","button_label":"Explore poetry","urdu":"","roman":"","language":"ur","limit":3,"kalam_ids":[],"artist_ids":[],"slides":[{"eyebrow":"THE SUKHAN COLLECTION","title":"Words that stay","subtitle":"A world of poetry. A home for you.","urdu":"سخن","href":"/catalogue","button_label":"Explore poetry","image_url":""}],"cards":[]},{"id":"daily","type":"daily","enabled":true,"title":"TODAY’S SUKHAN SELECTION","description":"","body":"","href":"/catalogue","button_label":"Explore poetry","urdu":"","roman":"","language":"ur","limit":5,"kalam_ids":[],"artist_ids":[],"slides":[],"cards":[]},{"id":"collections","type":"collections","enabled":true,"title":"EXPLORE SUKHAN","description":"","body":"","href":"/catalogue","button_label":"Explore poetry","urdu":"","roman":"","language":"ur","limit":3,"kalam_ids":[],"artist_ids":[],"slides":[],"cards":[{"title":"Ghazals","description":"A world in every couplet","urdu":"غزل","href":"/catalogue?form=ghazal"},{"title":"Nazms","description":"Poetry, without boundaries","urdu":"نظم","href":"/catalogue?form=nazm"},{"title":"Voices & performances","description":"Words, brought to life","urdu":"آواز","href":"/media"}]},{"id":"word","type":"word","enabled":true,"title":"A WORD TO KEEP","description":"speech · words · poetry","body":"The art of putting a feeling into words.","href":"/catalogue","button_label":"Find your next favourite verse","urdu":"سخن","roman":"sukhan","language":"ur","limit":3,"kalam_ids":[],"artist_ids":[],"slides":[],"cards":[]},{"id":"artists","type":"artists","enabled":true,"title":"POETS & ARTISTS","description":"Discover the people behind the words and the voices behind the verses.","body":"","href":"/artists","button_label":"View all poets & artists","urdu":"","roman":"","language":"ur","limit":4,"kalam_ids":[],"artist_ids":[],"slides":[],"cards":[]},{"id":"library","type":"library","enabled":true,"title":"THE SUKHAN LIBRARY","description":"","body":"","href":"/catalogue","button_label":"See the full collection","urdu":"","roman":"","language":"ur","limit":3,"kalam_ids":[],"artist_ids":[],"slides":[],"cards":[]}]}'::jsonb);
insert into public.homepage_draft(config) select config from public.homepage_public;
alter table public.homepage_public enable row level security;
alter table public.homepage_draft enable row level security;
revoke all on public.homepage_public,public.homepage_draft from public,anon,authenticated;
grant select on public.homepage_public to anon,authenticated;
grant update on public.homepage_public to authenticated;
grant select,update on public.homepage_draft to authenticated;
create policy homepage_live_read on public.homepage_public for select to anon,authenticated using(true);
create policy homepage_admin_publish on public.homepage_public for update to authenticated using((select private.staff_role())='admin') with check((select private.staff_role())='admin');
create policy homepage_draft_staff_read on public.homepage_draft for select to authenticated using((select private.staff_role()) in ('admin','editor'));
create policy homepage_draft_staff_update on public.homepage_draft for update to authenticated using((select private.staff_role()) in ('admin','editor')) with check((select private.staff_role()) in ('admin','editor'));
create function private.touch_homepage() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if jsonb_typeof(new.config->'sections') is distinct from 'array' then raise exception 'Homepage sections must be an array' using errcode='22023'; end if;
 if jsonb_array_length(new.config->'sections') not between 1 and 12 then raise exception 'Choose 1 to 12 homepage sections' using errcode='22023'; end if;
 new.updated_at=clock_timestamp();return new;
end $$;
revoke all on function private.touch_homepage() from public,anon,authenticated;
create trigger homepage_public_touch before update on public.homepage_public for each row execute function private.touch_homepage();
create trigger homepage_draft_touch before update on public.homepage_draft for each row execute function private.touch_homepage();
create function public.save_homepage_draft(payload jsonb,expected_updated_at timestamptz) returns timestamptz language plpgsql security invoker set search_path='' as $$
declare previous timestamptz; saved timestamptz;
begin
 if (select private.staff_role()) is null then raise exception 'Staff access required' using errcode='42501'; end if;
 select updated_at into previous from public.homepage_draft where id for update;
 if not found then raise exception 'Homepage draft unavailable' using errcode='42501'; end if;
 if expected_updated_at is null or expected_updated_at<>previous then raise exception 'The homepage draft changed. Reload before saving.' using errcode='40001'; end if;
 update public.homepage_draft set config=payload where id returning updated_at into saved;return saved;
end $$;
revoke all on function public.save_homepage_draft(jsonb,timestamptz) from public,anon;
grant execute on function public.save_homepage_draft(jsonb,timestamptz) to authenticated;
create function public.publish_homepage(expected_draft_at timestamptz,expected_public_at timestamptz) returns timestamptz language plpgsql security invoker set search_path='' as $$
declare draft public.homepage_draft; live public.homepage_public; saved timestamptz;
begin
 if (select private.staff_role()) is distinct from 'admin' then raise exception 'Administrator access required' using errcode='42501'; end if;
 select * into draft from public.homepage_draft where id for update;
 select * into live from public.homepage_public where id for update;
 if expected_draft_at is null or expected_draft_at<>draft.updated_at or expected_public_at is null or expected_public_at<>live.updated_at then raise exception 'The homepage changed. Reload the preview before publishing.' using errcode='40001'; end if;
 update public.homepage_public set config=draft.config where id returning updated_at into saved;return saved;
end $$;
revoke all on function public.publish_homepage(timestamptz,timestamptz) from public,anon;
grant execute on function public.publish_homepage(timestamptz,timestamptz) to authenticated;
-- Use anonymous/public RLS even when the homepage is previewed by staff.
create function public.homepage_kalam(feed_language text default null,requested_ids uuid[] default '{}') returns setof public.kalam language sql stable security invoker set search_path='' as $$
 select k.* from public.kalam k where k.status='published' and exists(select 1 from public.artists a where a.id=k.poet_id and a.status='published') and cardinality(requested_ids)<=144 and
 (case when cardinality(requested_ids)>0 then k.id=any(requested_ids)
 else feed_language is null or exists(select 1 from public.kalam_texts t where t.kalam_id=k.id and t.language=feed_language) end)
 order by k.created_at desc,k.id limit 144
$$;
revoke all on function public.homepage_kalam(text,uuid[]) from public;
grant execute on function public.homepage_kalam(text,uuid[]) to anon,authenticated;
-- Supabase Storage exists on hosted projects; pure PostgreSQL test projects may omit it.
do $$
begin
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('homepage-assets','homepage-assets',true,3145728,array['image/jpeg','image/png','image/webp','image/avif']) on conflict(id) do nothing;
  execute 'create policy sukhan_homepage_assets_read on storage.objects for select to authenticated using(bucket_id=''homepage-assets'' and (select private.staff_role())=''admin'')';
  execute 'create policy sukhan_homepage_assets_insert on storage.objects for insert to authenticated with check(bucket_id=''homepage-assets'' and (select private.staff_role())=''admin'')';
  execute 'create policy sukhan_homepage_assets_update on storage.objects for update to authenticated using(bucket_id=''homepage-assets'' and (select private.staff_role())=''admin'') with check(bucket_id=''homepage-assets'' and (select private.staff_role())=''admin'')';
 end if;
end $$;
commit;
