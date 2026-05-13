import json

def format_custom_combos(combo_str: str) -> str:
    if not combo_str:
        return ""
    try:
        parsed = json.loads(combo_str)
        if isinstance(parsed, list):
            combos = []
            for p in parsed:
                if not isinstance(p, dict):
                    continue
                in_len_val = p.get('input_len', '')
                out_len_val = p.get('output_len', '')
                prompts_val = p.get('num_prompts', '')
                conc_val = p.get('max_concurrency', '')
                
                in_len = str(in_len_val).strip() if in_len_val is not None else ""
                out_len = str(out_len_val).strip() if out_len_val is not None else ""
                prompts = str(prompts_val).strip() if prompts_val is not None else ""
                conc = str(conc_val).strip() if conc_val is not None else ""
                
                if in_len in ('None', '0', ''): in_len = ""
                if out_len in ('None', '0', ''): out_len = ""
                if prompts in ('None', '0', ''): prompts = ""
                if conc in ('None', '0', ''): conc = ""
                
                if not in_len or not out_len or not prompts or not conc:
                    continue
                    
                combos.append(f"{in_len} {out_len} {prompts} {conc}")
            return ",".join(combos)
    except Exception:
        pass
    return combo_str

