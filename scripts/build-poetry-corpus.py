"""Prepare the user-supplied corpora without executing their code or SQL.
Usage: python3 build.py SOURCE_ROOT OUTPUT_DIR
Persian dataset adaptations retain the supplied CC BY-SA 4.0 notice.
"""
from pathlib import Path
import csv, json, gzip, hashlib, re, unicodedata, sys, collections, shutil, uuid
csv.field_size_limit(10000000)
root=Path(sys.argv[1]); source=root/'05_Unified_Website_Import_Ready'; out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
def clean(s):return unicodedata.normalize('NFC',str(s).replace('\r\n','\n').replace('\r','\n')).strip()
def lines(s):return '\n'.join(clean(x) for x in clean(s).split('\n') if clean(x))
ur_alias={
 'احمد فراز':('ahmad-faraz','Ahmad Faraz'),'علامہ اقبال':('allama-iqbal','Allama Iqbal'),'فیض احمد فیض':('faiz-ahmad-faiz','Faiz Ahmad Faiz'),'حیدر علی آتش':('haidar-ali-atish','Haidar Ali Atish'),'جون ایلیا':('jaun-eliya','Jaun Eliya'),'مرزا غالب':('mirza-ghalib','Mirza Ghalib'),'مير تقی میر':('meer-taqi-meer','Meer Taqi Meer'),'منیر نیازی':('muneer-niyazi','Muneer Niyazi'),'نظیر اکبر آبادی':('nazeer-akbarabadi','Nazeer Akbarabadi'),'ندا فاضلی':('nida-fazli','Nida Fazli'),'پروین شاکر':('parveen-shakir','Parveen Shakir'),'قتیل شفائی':('qateel-shifai','Qateel Shifai'),'سراج اورنگ آبادی':('siraj-aurangabadi','Siraj Aurangabadi'),'ریاضؔ خیرآبادی':('riyaz-khairabadi','Riyaz Khairabadi'),'ظفر اقبال':('zafar-iqbal','Zafar Iqbal')}
fa_alias={'اقبال لاهوری':('allama-iqbal','Allama Iqbal'),'امیرخسرو دهلوی':('ameer-khusrau','Ameer Khusrau'),'رودکی':('rudaki','Rudaki'),'فردوسی':('ferdowsi','Ferdowsi'),'حافظ':('hafez','Hafez'),'سعدی':('saadi','Saadi'),'مولوی':('rumi','Rumi'),'خیام':('omar-khayyam','Omar Khayyam'),'عطار':('attar','Attar'),'بیدل دهلوی':('bidel-dehlavi','Bidel Dehlavi')}
urdunames={slug:clean(name) for name,(slug,_) in ur_alias.items()}
seen=set();report={};manifest={'version':1,'datasets':[]};authors={}
def row(poetslug,name,nameur,form,texts,note,prefix):
 primary=texts[0];key=sha((poetslug+'\n'+primary['language']+'\n'+primary['body']).encode())
 if key in seen:return None
 seen.add(key)
 assert all(0<len(t['body'])<=200000 and len(t['title'])<=300 and '\x00' not in t['body'] for t in texts)
 slugbase=re.sub('[^a-z0-9-]','-',prefix.lower()).strip('-');slugbase=re.sub('-+','-',slugbase)[:88].rstrip('-')
 return {'id':str(uuid.uuid5(uuid.UUID('64b5c797-0bf1-598b-b897-c7d43b71979d'),key)),'source_key':key,'slug':slugbase+'-'+key[:24],'poet_slug':poetslug,'poet_name':name,'poet_name_ur':nameur,'form':form,'texts':texts,'source_note':note}
def save_dataset(id,label,filename,rows,rawcount):
 files=[];records=[x for x in rows if x is not None]
 for start in range(0,len(records),2000):
  batch=records[start:start+2000];raw=b''.join((json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n').encode() for x in batch);compressed=gzip.compress(raw,mtime=0)
  name=f'{id}-{start//2000+1:03}.jsonl.gz';(out/name).write_bytes(compressed)
  files.append({'file':name,'rows':len(batch),'offset':start,'sha256':sha(compressed),'bytes':len(compressed),'raw_bytes':len(raw)})
 for x in records:authors[x['poet_slug']]=x['poet_name']
 manifest['datasets'].append({'id':id,'label':label,'source_file':filename,'source_sha256':sha((source/filename).read_bytes()),'rows':len(records),'input_rows':rawcount,'duplicates_removed':rawcount-len(records),'shards':files})
 print(id,len(records),'of',rawcount,'rows;',sum(x['bytes'] for x in files),'compressed bytes')
file='urdu_ghazals_30_poets_multilingual.json';rows=json.loads((source/file).read_text());prepared=[]
for x in rows:
 texts=[]
 for field,lang in [('urdu_text','ur'),('roman_english_text','roman'),('hindi_text','hi')]:
  body=lines(x[field])
  if body:texts.append({'language':lang,'title':body.split('\n')[0][:300],'body':body})
 note=f'User-supplied Urdu corpus: {file}. Poet: {x["poet_name"]}. Dataset poem: {x["poem_slug"]}. The source credits Rekhta. Roman text is Urdu transliteration, not an English translation.'
 prepared.append(row(x['poet_slug'],x['poet_name'],urdunames.get(x['poet_slug'],''),'ghazal',texts,note,x['poem_slug']))
save_dataset('urdu-ghazals-v1','Urdu ghazals · Urdu, Roman Urdu and Hindi',file,prepared,len(rows))
file='urdu_couplets_15_poets_17609_utf8.json';rows=json.loads((source/file).read_text());prepared=[]
for x in rows:
 slug,name=ur_alias[x['poet_urdu']];parts=[clean(p) for p in x['couplet_urdu'].split(';')];assert len(parts)==2
 body='\n'.join(parts);note=f'User-supplied Urdu corpus: {file}. Poet attribution: {x["poet_urdu"]}. Dataset credits Rekhta. Original semicolon between misras restored as a line break.'
 prepared.append(row(slug,name,clean(x['poet_urdu']),'sher',[{'language':'ur','title':parts[0][:300],'body':body}],note,slug+'-sher'))
save_dataset('urdu-couplets-v1','Urdu couplets',file,prepared,len(rows))
file='farsi_chronological_poems.tsv';prepared=[];rawcount=0;odd=0;prose=0
with (source/file).open() as f:
 for x in csv.DictReader(f,delimiter='\t'):
  rawcount+=1;poet=clean(x['poet']);slug,name=fa_alias.get(poet,('persian-poet-'+sha(poet.encode())[:12],poet));segments=[clean(s) for s in re.split(' {4,}',clean(x['poem'])) if clean(s)];odd+=len(segments)%2
  # The supplied prose authors retain paragraph boundaries; uncertain forms stay generic.
  isprose=poet in ['هجویری','نصرالله منشی'];prose+=isprose;body=('\n\n' if isprose else '\n').join(segments)
  title=clean(x['poem_title']) or segments[0];book=clean(x['book_title']);form='prose' if isprose else 'literary-text'
  if not isprose and re.search('غزلیات|غزل',book):form='ghazal'
  elif not isprose and re.search('رباعیات|رباعی',book):form='rubai'
  note=f'User-supplied Chronological Persian Poetry Dataset, extracted from Ganjoor; supplied license CC BY-SA 4.0. Author: {poet}. Collection: {book}. Title: {title}. Adaptation: source space separators restored as line/paragraph breaks; NFC normalization. No translation supplied. Source file: {file}.'
  prepared.append(row(slug,name,urdunames.get(slug,''),form,[{'language':'fa','title':title[:300],'body':body}],note,slug+'-farsi'))
save_dataset('persian-texts-v1','Persian poems and literary texts',file,prepared,rawcount)
manifest['authors']=len(authors);manifest['total_rows']=sum(x['rows'] for x in manifest['datasets']);manifest['notes']={'farsi_odd_segment_rows':odd,'farsi_prose_rows':prose,'missing_hindi_ghazals':9,'translations_supplied':0}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
license=root/'02_Farsi_Persian_Poetry_Shayari/Chronological_Persian_Poetry_TSV_SQL/LICENSE';shutil.copyfile(license,out/'PERSIAN-CC-BY-SA-4.0.txt')
(out/'README.txt').write_text('Sukhan supplied poetry import\n\nUrdu files were supplied by the site owner. Their dataset README credits Rekhta; no independent license for the poems is asserted.\nPersian data: Chronological Persian Poetry Dataset, extracted from Ganjoor. Supplied CC BY-SA 4.0 notice retained in PERSIAN-CC-BY-SA-4.0.txt. Adaptation: space separators restored as line breaks, NFC and exact duplicate removal. Dataset adaptations are shared under the same CC BY-SA 4.0 terms.\nNo translations, audio, biographies or dates were generated. The parallel Roman script is Roman Urdu, not English translation. The separate normalized/stopword-stripped 1.2M-line corpus is excluded to avoid duplicate and damaged literary text.\nSource checksums, row counts and shard checksums are in manifest.json.\n')
print('Total',manifest['total_rows'],'works;',len(authors),'authors; no translations invented')
