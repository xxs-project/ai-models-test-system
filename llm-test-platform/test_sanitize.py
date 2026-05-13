import re
val = "1024 1024 1 1, 2048 2048 1 1"
dangerous_chars = r'[;|&$`\<>!#?{}\[\]\n\r\(\)\'\"]| '
print('Sanitized:', re.sub(dangerous_chars, '', val))
