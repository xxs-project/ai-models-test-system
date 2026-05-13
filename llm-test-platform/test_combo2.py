import json

def parse_combos(raw_combos):
    parsed_combos_str = raw_combos
    try:
        if raw_combos:
            parsed = json.loads(raw_combos)
            if isinstance(parsed, list):
                combo_list = []
                for p in parsed:
                    if isinstance(p, dict):
                        in_len = str(p.get('input_len', '') or '').strip()
                        out_len = str(p.get('output_len', '') or '').strip()
                        prompts = str(p.get('num_prompts', '') or '').strip()
                        conc = str(p.get('max_concurrency', '') or '').strip()
                        
                        if in_len == 'None': in_len = ''
                        if out_len == 'None': out_len = ''
                        if prompts == 'None': prompts = ''
                        if conc == 'None': conc = ''
                        
                        # 如果未设置有效的组合参数 (输入或输出为空)，则跳过
                        if not in_len and not out_len:
                            continue
                            
                        # 如果有部分为空，则给出默认值
                        in_len = in_len or '1024'
                        out_len = out_len or '1024'
                        prompts = prompts or '1'
                        conc = conc or '1'
                        combo_list.append(f"{in_len} {out_len} {prompts} {conc}")
                
                parsed_combos_str = ",".join(combo_list) if combo_list else ""
            elif not parsed:
                parsed_combos_str = ""
    except Exception:
        pass
    return parsed_combos_str

print("Test 1:", parse_combos('[{"input_len": "", "output_len": "", "num_prompts": "1", "max_concurrency": "1"}]'))
print("Test 2:", parse_combos('[{"input_len": null, "output_len": null, "num_prompts": "1", "max_concurrency": "1"}]'))
print("Test 3:", parse_combos('[{"input_len": "2048", "output_len": "2048", "num_prompts": "2", "max_concurrency": "2"}]'))
print("Test 4:", parse_combos('[{"input_len": "", "output_len": "", "num_prompts": "", "max_concurrency": ""}]'))

