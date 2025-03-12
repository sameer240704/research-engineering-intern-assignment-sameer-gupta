import json
import os

def convert_jsonl_to_json(input_jsonl_file, output_json_folder):
    os.makedirs(output_json_folder, exist_ok=True)
    
    base_name = os.path.splitext(os.path.basename(input_jsonl_file))[0]
    output_json_file = os.path.join(output_json_folder, base_name + '.json')

    data = []
    with open(input_jsonl_file, 'r') as jsonl_file:
        for line_number, line in enumerate(jsonl_file, start=1):
            line = line.strip()
            if not line:  
                continue
            try:
                data.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON on line {line_number}: {e}")
                continue
    
    with open(output_json_file, 'w') as json_file:
        json.dump(data, json_file, indent=4)
    
    print(f"Converted {input_jsonl_file} to {output_json_file}")

input_jsonl_file = '/home/sameer42/Desktop/Projects/research-engineering-intern-assignment-sameer-gupta/ai-server/data/data.jsonl' 
output_json_folder = '/home/sameer42/Desktop/Projects/research-engineering-intern-assignment-sameer-gupta/ai-server/data/'  

convert_jsonl_to_json(input_jsonl_file, output_json_folder)