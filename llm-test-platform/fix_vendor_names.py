import sys

with open('src/pages/Board.tsx', 'r') as f:
    content = f.read()

content = content.replace("return '阿里巴巴/阿里云';", "return '阿里巴巴';")
content = content.replace("return '稀宇科技 MiniMax';", "return '稀宇科技';")
content = content.replace("return '深度求索 DeepSeek';", "return '深度求索';")

with open('src/pages/Board.tsx', 'w') as f:
    f.write(content)
print("Vendor names updated.")
