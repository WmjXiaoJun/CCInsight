# -*- coding: utf-8 -*-
import json, re

def fix_package(path):
    with open(path, 'rb') as f:
        raw = f.read()
    text = raw.decode('utf-8', errors='replace')
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # fix description only
        def replace_desc(m):
            return '"description": "CCInsight - CCInsight project"'
        text2 = re.sub(r'"description": "[^"]*"', replace_desc, text)
        data = json.loads(text2)

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'OK: {path}')

fix_package(r'd:/BaiduSyncdisk/wmj_work/CC CODE/CCInsight/backend/package.json')
fix_package(r'd:/BaiduSyncdisk/wmj_work/CC CODE/CCInsight/gitnexus-shared/package.json')
print('All done')
