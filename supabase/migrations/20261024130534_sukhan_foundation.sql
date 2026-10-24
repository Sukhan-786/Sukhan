-- Sukhan Foundation. Apply to a dedicated Supabase project, never the school project.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.staff_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('admin','editor')),
 created_at timestamptz not null default now()
);
alter table public.staff_roles enable row level security;
-- The only SECURITY DEFINER helper. No arguments: a caller can only look up their
-- own role. It lives outside exposed schemas and has a fixed empty search_path.
create function private.staff_role() returns text language sql stable security definer
 set search_path = '' as $$
 select role from public.staff_roles where user_id = (select auth.uid()) and (select auth.uid()) is not null
$$;
revoke all on function private.staff_role() from public, anon;
grant execute on function private.staff_role() to authenticated;
revoke all on public.staff_roles from anon,authenticated;
grant select on public.staff_roles to authenticated;
create policy staff_self_read on public.staff_roles for select to authenticated using (user_id = (select auth.uid()));
-- No client INSERT/UPDATE/DELETE privileges or policies, including for admins.
-- Bootstrap and role changes must be made by a trusted database owner.

create table public.artists (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (length(slug) between 2 and 120 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 name text not null check (length(trim(name)) between 1 and 160),
 name_ur text not null default '' check (length(name_ur)<=160),
 kind text not null default 'poet' check (kind in ('poet','artist','both')),
 bio text not null default '' check (length(bio)<=12000),
 status text not null default 'draft' check (status in ('draft','published')),
 rights_note text not null default '' check (length(rights_note)<=2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (status<>'published' or length(trim(rights_note))>0)
);
create table public.kalam (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (length(slug) between 2 and 120 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 poet_id uuid not null references public.artists(id) on delete restrict,
 form text not null check (form in ('ghazal','nazm','sher','rubai','prose')),
 summary text not null default '' check (length(summary)<=2000),
 status text not null default 'draft' check (status in ('draft','published')),
 rights_note text not null default '' check (length(rights_note)<=2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (status<>'published' or length(trim(rights_note))>0)
);
create table public.kalam_texts (
 kalam_id uuid not null references public.kalam(id) on delete cascade,
 language text not null check (language in ('ur','roman','fa','en')),
 title text not null check (length(trim(title)) between 1 and 300),
 body text not null check (length(trim(body)) between 1 and 100000),
 primary key (kalam_id,language)
);
create table public.media (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) between 1 and 300),
 kind text not null check (kind in ('audio','video')),
 url text not null check (length(url)<=2048 and url ~ '^https://[^/@[:space:]]+([/?#]|$)'),
 caption_url text not null default '' check (length(caption_url)<=2048 and (caption_url='' or caption_url ~ '^https://[^/@[:space:]]+([/?#]|$)')),
 transcript text not null default '' check (length(transcript)<=100000),
 language text not null default 'ur' check (language in ('ur','roman','fa','en')),
 performer_id uuid references public.artists(id) on delete restrict,
 status text not null default 'draft' check (status in ('draft','published')),
 rights_note text not null default '' check (length(rights_note)<=2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (status<>'published' or (length(trim(rights_note))>0 and length(trim(transcript))>0 and (kind<>'video' or caption_url<>'')))
);
create table public.kalam_media (
 kalam_id uuid not null references public.kalam(id) on delete cascade,
 media_id uuid not null references public.media(id) on delete cascade,
 primary key (kalam_id,media_id)
);
create index kalam_poet_id_idx on public.kalam(poet_id);
create index media_performer_id_idx on public.media(performer_id);
create index kalam_media_media_id_idx on public.kalam_media(media_id);
create index kalam_public_order_idx on public.kalam(status,created_at desc,id);
create index artists_public_order_idx on public.artists(status,name);
create index media_public_order_idx on public.media(status,kind,created_at desc);

create function private.touch_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.updated_at=clock_timestamp(); return new; end $$;
revoke all on function private.touch_updated_at() from public;
create trigger artists_updated before update on public.artists for each row execute function private.touch_updated_at();
create trigger kalam_updated before update on public.kalam for each row execute function private.touch_updated_at();
create trigger media_updated before update on public.media for each row execute function private.touch_updated_at();

alter table public.artists enable row level security;
alter table public.kalam enable row level security;
alter table public.kalam_texts enable row level security;
alter table public.media enable row level security;
alter table public.kalam_media enable row level security;
revoke all on public.artists,public.kalam,public.kalam_texts,public.media,public.kalam_media from anon,authenticated;
grant select on public.artists,public.kalam,public.kalam_texts,public.media,public.kalam_media to anon,authenticated;
grant insert,update,delete on public.artists,public.kalam,public.kalam_texts,public.media,public.kalam_media to authenticated;

create policy artists_public_read on public.artists for select to anon,authenticated using (status='published');
create policy kalam_public_read on public.kalam for select to anon,authenticated using (
 status='published' and exists(select 1 from public.artists a where a.id=poet_id and a.status='published')
);
create policy media_public_read on public.media for select to anon,authenticated using (status='published');

-- Separate staff policies are not evaluated for anon. Editors only mutate drafts;
-- admins may publish. SELECT includes published rows so staff can review them.
do $$ declare t text; begin
 foreach t in array array['artists','kalam','media'] loop
 execute format('create policy staff_read on public.%I for select to authenticated using ((select private.staff_role()) in (''admin'',''editor''))',t);
 execute format('create policy staff_insert on public.%I for insert to authenticated with check ((select private.staff_role())=''admin'' or ((select private.staff_role())=''editor'' and status=''draft''))',t);
 execute format('create policy staff_update on public.%I for update to authenticated using ((select private.staff_role())=''admin'' or ((select private.staff_role())=''editor'' and status=''draft'')) with check ((select private.staff_role())=''admin'' or ((select private.staff_role())=''editor'' and status=''draft''))',t);
 execute format('create policy staff_delete on public.%I for delete to authenticated using ((select private.staff_role())=''admin'' or ((select private.staff_role())=''editor'' and status=''draft''))',t);
 end loop;
end $$;
create policy texts_public_read on public.kalam_texts for select to anon,authenticated using (exists(select 1 from public.kalam k where k.id=kalam_id and k.status='published'));
create policy texts_staff_read on public.kalam_texts for select to authenticated using ((select private.staff_role()) in ('admin','editor'));
create policy texts_staff_write on public.kalam_texts for all to authenticated
 using (exists(select 1 from public.kalam k where k.id=kalam_id and ((select private.staff_role())='admin' or ((select private.staff_role())='editor' and k.status='draft'))))
 with check (exists(select 1 from public.kalam k where k.id=kalam_id and ((select private.staff_role())='admin' or ((select private.staff_role())='editor' and k.status='draft'))));
create policy links_public_read on public.kalam_media for select to anon,authenticated using (
 exists(select 1 from public.kalam k where k.id=kalam_id and k.status='published') and exists(select 1 from public.media m where m.id=media_id and m.status='published')
);
create policy links_staff_read on public.kalam_media for select to authenticated using ((select private.staff_role()) in ('admin','editor'));
create policy links_staff_write on public.kalam_media for all to authenticated
 using (exists(select 1 from public.kalam k where k.id=kalam_id and ((select private.staff_role())='admin' or ((select private.staff_role())='editor' and k.status='draft'))))
 with check (exists(select 1 from public.kalam k where k.id=kalam_id and ((select private.staff_role())='admin' or ((select private.staff_role())='editor' and k.status='draft'))));

-- Atomic save: work, translations and media relationships commit or roll back together.
-- SECURITY INVOKER retains every caller's RLS permissions.
create function public.save_kalam(record_id uuid,payload jsonb,expected_updated_at timestamptz default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare saved_id uuid; previous_updated_at timestamptz;
begin
 if jsonb_typeof(payload->'texts') is distinct from 'array' or jsonb_array_length(payload->'texts') not between 1 and 4 then
 raise exception 'One to four language texts required' using errcode='22023'; end if;
 if jsonb_typeof(payload->'media_ids') is distinct from 'array' or jsonb_array_length(payload->'media_ids')>30 then
 raise exception 'Invalid media relationship list' using errcode='22023'; end if;
 if record_id is null then
 insert into public.kalam(slug,poet_id,form,summary,status,rights_note) values(payload->>'slug',(payload->>'poet_id')::uuid,payload->>'form',payload->>'summary',payload->>'status',payload->>'rights_note') returning id into saved_id;
 else
 select updated_at into previous_updated_at from public.kalam where id=record_id for update;
 if not found then raise exception 'Work unavailable' using errcode='42501'; end if;
 if expected_updated_at is null or previous_updated_at<>expected_updated_at then raise exception 'Work changed' using errcode='40001';end if;
 update public.kalam set slug=payload->>'slug',poet_id=(payload->>'poet_id')::uuid,form=payload->>'form',summary=payload->>'summary',status=payload->>'status',rights_note=payload->>'rights_note' where id=record_id returning id into saved_id;
 if saved_id is null then raise exception 'Edit denied' using errcode='42501';end if;
 delete from public.kalam_texts where kalam_id=saved_id;
 delete from public.kalam_media where kalam_id=saved_id;
 end if;
 insert into public.kalam_texts(kalam_id,language,title,body) select saved_id,t->>'language',t->>'title',t->>'body' from jsonb_array_elements(payload->'texts') t;
 insert into public.kalam_media(kalam_id,media_id) select saved_id,v::uuid from jsonb_array_elements_text(payload->'media_ids') v;
 return saved_id;
end $$;
revoke all on function public.save_kalam(uuid,jsonb,timestamptz) from public,anon;
grant execute on function public.save_kalam(uuid,jsonb,timestamptz) to authenticated;

create function public.normalize_search(value text) returns text language sql immutable security invoker set search_path='' as $$
 select lower(translate(regexp_replace(normalize(coalesce(value,''),NFKC),'[ً-ٰٟـ]','','g'),'يىك','ییک'))
$$;
revoke all on function public.normalize_search(text) from public;
grant execute on function public.normalize_search(text) to anon,authenticated;
create function public.search_kalam(search_query text default '',filter_form text default null,filter_poet uuid default null,filter_kind text default null)
returns setof public.kalam language sql stable security invoker set search_path='' as $$
 select k.* from public.kalam k join public.artists a on a.id=k.poet_id
 where k.status='published' and a.status='published'
 and (filter_form is null or k.form=filter_form) and (filter_poet is null or k.poet_id=filter_poet)
 and (filter_kind is null or exists(select 1 from public.kalam_media km join public.media m on m.id=km.media_id where km.kalam_id=k.id and m.status='published' and m.kind=filter_kind))
 and not exists (
 select 1 from regexp_split_to_table(trim(public.normalize_search(left(coalesce(search_query,''),160))),E'\\s+') term
 where term<>'' and position(term in public.normalize_search(concat_ws(' ',k.summary,a.name,a.name_ur,(select string_agg(t.title||' '||t.body,' ') from public.kalam_texts t where t.kalam_id=k.id))))=0
 )
$$;
revoke all on function public.search_kalam(text,text,uuid,text) from public;
grant execute on function public.search_kalam(text,text,uuid,text) to anon,authenticated;
commit;
