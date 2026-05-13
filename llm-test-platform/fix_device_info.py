import re
with open("backend/main.py", "r") as f:
    content = f.read()

replacement = """    device_info = None
    if task.test_type == 1 and task.test_mode == 1 and task.startup_mode == 'api':
        import urllib.parse
        parsed_url = urllib.parse.urlparse(task.base_url) if task.base_url else None
        api_ip = parsed_url.hostname if parsed_url and parsed_url.hostname else (task.base_url.split('://')[-1].split(':')[0].split('/')[0] if task.base_url else '')
        api_password = task.api_key or ''
        device_info = {
            'ip': api_ip,
            'port': 22,
            'username': 'root',
            'password': api_password
        }

    if not device_info and task.device_id:"""

pattern = r"    device_info = None\n    if task\.device_id:"

new_content = re.sub(pattern, replacement, content)

with open("backend/main.py", "w") as f:
    f.write(new_content)
