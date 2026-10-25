-- Extend existing text and recording languages without changing RLS or existing content.
begin;
alter table public.kalam_texts drop constraint kalam_texts_language_check;
alter table public.kalam_texts add constraint kalam_texts_language_check check (language in ('ur','roman','fa','en','hi','ar'));
alter table public.media drop constraint media_language_check;
alter table public.media add constraint media_language_check check (language in ('ur','roman','fa','en','hi','ar'));

create or replace function public.save_kalam(record_id uuid,payload jsonb,expected_updated_at timestamptz default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare saved_id uuid; previous_updated_at timestamptz;
begin
 if jsonb_typeof(payload->'texts') is distinct from 'array' or jsonb_array_length(payload->'texts') not between 1 and 6 then
 raise exception 'One to six language texts required' using errcode='22023'; end if;
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
-- CREATE OR REPLACE preserves the existing grants and SECURITY INVOKER behavior.
commit;
