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
                        # Fix for None
                        in_len_val = p.get('input_len', '')
                        out_len_val = p.get('output_len', '')
                        prompts_val = p.get('num_prompts', '')
                        conc_val = p.get('max_concurrency', '')

                        in_len = str(in_len_val).strip() if in_len_val is not None else ""
                        out_len = str(out_len_val).strip() if out_len_val is not None else ""
                        prompts = str(prompts_val).strip() if prompts_val is not None else ""
                        conc = str(conc_val).strip() if conc_val is not None else ""
                        
                        # 如果全部为空，则跳过
                        if not in_len and not out_len and not prompts and not conc:
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
