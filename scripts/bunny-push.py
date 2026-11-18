#!/usr/bin/env python3
"""Push files to Bunny Stream from single-use Dropbox links.
usage: bunny-push.py links.json   (links.json: [{"url":..., "proj":..., "rel":...}, ...])
Downloads start right away (links expire after 15 min), several at a time; each file is uploaded and
removed locally. Titles are "<project> — <file>"; existing titles are skipped. Results go to media-map.json."""
import json, os, sys, subprocess, concurrent.futures as cf, urllib.request, threading
env = {}
for l in open(os.path.join(os.path.dirname(__file__), '..', '.env')):
    if '=' in l and not l.startswith('#'): k, v = l.strip().split('=', 1); env[k] = v
KEY, LIB = env['BUNNY_API_KEY'], env['BUNNY_LIBRARY_ID']
API = f'https://video.bunnycdn.com/library/{LIB}'
TMP = '/tmp/claude-0/-home-claude/45ca3937-4198-5528-9abf-30d542b45b80/scratchpad/dl'
MAP = os.path.join(os.path.dirname(__file__), 'media-map.json')
lock = threading.Lock()
upslots = threading.Semaphore(4)  # many downloads at once (links expire), a few uploads at once

def req(method, path, body=None):
    r = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={'AccessKey': KEY, 'Content-Type': 'application/json', 'accept': 'application/json'})
    return json.load(urllib.request.urlopen(r, timeout=60))

def all_videos():
    out, page = [], 1
    while True:
        d = req('GET', f'/videos?page={page}&itemsPerPage=100')
        out += d['items']
        if len(out) >= d['totalItems'] or not d['items']: return out
        page += 1

def collections():
    d = req('GET', '/collections?itemsPerPage=100')
    return {c['name']: c['guid'] for c in d['items']}

def main():
    items = json.load(open(sys.argv[1]))
    os.makedirs(TMP, exist_ok=True)
    mp = json.load(open(MAP)) if os.path.exists(MAP) else {}
    vids = all_videos()
    have = {v['title']: v['guid'] for v in vids if v['storageSize'] or v['status'] not in (0, 6)}
    empty = {v['title']: v['guid'] for v in vids if not v['storageSize'] and v['status'] in (0, 6)}
    cols = collections()
    for it in items:
        if it['proj'] not in cols: cols[it['proj']] = req('POST', '/collections', {'name': it['proj']})['guid']
    def one(it):
        title = f"{it['proj']} — {os.path.basename(it['rel'])}"
        key = f"{it['proj']}/{it['rel']}"
        if title in have:
            with lock: mp[key] = have[title]
            return f'skip {title}'
        if it.get('file'): f = it['file']
        else:
            f = os.path.join(TMP, it['url'].split('/get/')[1][:24].replace('/', '_'))
            subprocess.run(['curl', '-sS', '--fail', '--retry', '2', '-o', f, it['url']], check=True)
        if empty.get(title): req('DELETE', f'/videos/{empty[title]}')  # a failed upload can't be retried in place
        g = req('POST', '/videos', {'title': title, 'collectionId': cols[it['proj']]})['guid']
        with upslots:
            for attempt in range(4):
                r = subprocess.run(['curl', '-sS', '--fail', '-X', 'PUT', '-H', f'AccessKey: {KEY}', '-H', 'Content-Type: application/octet-stream',
                                    '-T', f, '-o', '/dev/null', f'{API}/videos/{g}'])
                if r.returncode == 0: break
                req('DELETE', f'/videos/{g}'); g = req('POST', '/videos', {'title': title, 'collectionId': cols[it['proj']]})['guid']
            else: return f'FAILED upload {title} (kept {f})'
        os.remove(f)
        with lock:
            mp[key] = g
            json.dump(mp, open(MAP, 'w'), indent=1, ensure_ascii=False)
        return f'ok {title} {g}'
    with cf.ThreadPoolExecutor(int(os.environ.get('PAR', '6'))) as ex:
        def safe(it):
            try: return one(it)
            except Exception as e: return f"FAILED {it['proj']}/{it['rel']}: {e}"
        for r in ex.map(safe, items):
            print(r, flush=True)
    json.dump(mp, open(MAP, 'w'), indent=1, ensure_ascii=False)

main()
