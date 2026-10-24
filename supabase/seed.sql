-- Optional original demonstration content. Apply only to a fresh development project.
begin;
insert into public.artists (id,slug,name,name_ur,kind,bio,status,rights_note) values ('10000000-0000-4000-8000-000000000001','sukhan-studio','Sukhan Studio','سخن اسٹوڈیو','both','Original demonstration verses created for the Sukhan foundation. Replace these with verified, permission-cleared work before launch.','published','Original illustrative sample content; editorial review required before launch.') on conflict do nothing;
insert into public.kalam (id,slug,poet_id,form,summary,status,rights_note,updated_at) values ('20000000-0000-4000-8000-000000000001','a-lamp-of-words','10000000-0000-4000-8000-000000000001','nazm','A small meditation on words, light, and the company we find in a poem.','published','Original demonstration verse, not attributed to a historical poet.','2026-10-24T00:00:00Z') on conflict do nothing;
insert into public.kalam_texts (kalam_id,language,title,body) values ('20000000-0000-4000-8000-000000000001','ur','لفظوں کا چراغ','لفظوں کا چراغ جلتا ہے
خاموشی میں راستہ ملتا ہے

تم ایک صدا بن کر آؤ
دل سے دل کا در کھلتا ہے') on conflict do nothing;
insert into public.kalam_texts (kalam_id,language,title,body) values ('20000000-0000-4000-8000-000000000001','roman','Lafzon ka charagh','Lafzon ka charagh jalta hai
Khamoshi mein rasta milta hai

Tum ek sada ban kar aao
Dil se dil ka dar khulta hai') on conflict do nothing;
insert into public.kalam_texts (kalam_id,language,title,body) values ('20000000-0000-4000-8000-000000000001','en','A lamp of words','A lamp of words is burning,
A path appears in quiet.

Come as a voice,
And heart opens to heart.') on conflict do nothing;
insert into public.kalam_texts (kalam_id,language,title,body) values ('20000000-0000-4000-8000-000000000001','fa','چراغ واژه‌ها','چراغ واژه‌ها روشن است
در سکوت راهی پیدا می‌شود

چون صدایی بیا
تا دری از دل به دل گشوده شود') on conflict do nothing;
insert into public.kalam (id,slug,poet_id,form,summary,status,rights_note,updated_at) values ('20000000-0000-4000-8000-000000000002','the-evening-page','10000000-0000-4000-8000-000000000001','sher','An evening, an open page, and a moment to begin again.','published','Original demonstration verse.','2026-10-24T00:00:00Z') on conflict do nothing;
insert into public.kalam_texts (kalam_id,language,title,body) values ('20000000-0000-4000-8000-000000000002','en','The evening page','The evening leaves a page beside the door;
We write a little, then we listen more.') on conflict do nothing;
insert into public.kalam_texts (kalam_id,language,title,body) values ('20000000-0000-4000-8000-000000000002','roman','Shaam ka safha','Shaam dar par ek safha chhor jaati hai
Kuchh likhte hain, phir khamoshi aati hai') on conflict do nothing;
commit;
