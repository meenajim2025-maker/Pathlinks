import json
import os

filepath = '/Users/jimmypaul/emis pathlinks project/scripts/management-content.json'

with open(filepath, 'r') as f:
    data = json.load(f)

count = 0
for tmpl in data.get('templates', []):
    for step in tmpl.get('steps', []):
        for opt in step.get('options', []):
            guidance = opt.get('guidance', '')
            if guidance and not guidance.startswith('MANAGEMENT PLAN:'):
                opt['guidance'] = 'MANAGEMENT PLAN:\n' + guidance
                count += 1

with open(filepath, 'w') as f:
    json.dump(data, f, indent=2)

print(f"Updated {count} guidance strings in management-content.json")
