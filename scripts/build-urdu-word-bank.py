"""Build the sourced Urdu word bank; requires pinned upstream files as arguments.
Data adapter licensed GPL-3.0-only. No upstream scansion algorithm is executed.
Usage: python3 scripts/build-urdu-word-bank.py words.txt word_vazn_metadata.json
"""
import gzip, hashlib, json, re, sys, unicodedata
from pathlib import Path
words_path, weights_path = map(Path, sys.argv[1:3])
out = Path(__file__).resolve().parents[1] / 'public/data'
weights = json.loads(weights_path.read_text())
rows = {}
for raw in words_path.read_text().splitlines():
    word = unicodedata.normalize('NFC', raw.replace('_', ' ')).strip()
    if not 1 <= len(word) <= 200 or not re.fullmatch(r'[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\u200c\u200d -]+', word):
        raise ValueError('Unexpected word form; review source before import')
    # Exact source keys only: no pronunciation inference or spelling substitution.
    candidates = [v for v in weights.get(raw, []) if re.fullmatch(r'[=\-x]{1,40}', v)]
    rows[word] = {'headword': word, 'wazan_candidates': sorted(set(candidates))}
body = ''.join(json.dumps(rows[k], ensure_ascii=False, separators=(',', ':'))+'\n' for k in sorted(rows)).encode()
compressed = gzip.compress(body, mtime=0)
(out/'urdu-word-bank.jsonl.gz').write_bytes(compressed)
manifest = {'id':'urduhack-aruuz-20261026-v1','rows':len(rows),'weighted_rows':sum(bool(r['wazan_candidates']) for r in rows.values()),'arabic_meanings':0,'sha256':hashlib.sha256(compressed).hexdigest(),'bytes':len(compressed),'uncompressed_bytes':len(body),'word_source':'https://github.com/urduhack/urdu-words/tree/c37cc6fcf903c4b6c954c9b19f91d3f20ef14de1','wazan_source':'https://github.com/tariquesani/aruuz-nigar/tree/91fa27ac2002d9f36b93b27c6592c9622efd60d9','words_license':'MIT','wazan_license':'GPL-3.0-only','reviewed':False}
(out/'urdu-word-bank.manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(manifest,ensure_ascii=False,indent=2))
