# -*- coding: utf-8 -*-
path = r'd:/BaiduSyncdisk/wmj_work/CC CODE/CCInsight/backend/src/core/ingestion/process-processor.ts'
with open(path, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

print(f'Total lines: {len(lines)}')
if len(lines) > 325:
    for i in range(324, 328):
        print(f'Line {i+1}: {repr(lines[i][:100])}')
