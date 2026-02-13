import json
import os

def sync_translations():
    locales_dir = "/home/ubuntu/zigd-platform/client/public/locales"
    en_path = os.path.join(locales_dir, "en", "translation.json")
    
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
    
    for lang in ["sn", "nd", "de"]:
        lang_path = os.path.join(locales_dir, lang, "translation.json")
        if not os.path.exists(lang_path):
            continue
            
        with open(lang_path, 'r', encoding='utf-8') as f:
            lang_data = json.load(f)
            
        # Update missing keys from English
        def update_recursive(target, source):
            for key, value in source.items():
                if key not in target:
                    target[key] = value
                elif isinstance(value, dict) and isinstance(target.get(key), dict):
                    update_recursive(target[key], value)
            return target
            
        updated_data = update_recursive(lang_data, en_data)
        
        with open(lang_path, 'w', encoding='utf-8') as f:
            json.dump(updated_data, f, indent=2, ensure_ascii=False)
        print(f"Synced {lang}")

if __name__ == "__main__":
    sync_translations()
