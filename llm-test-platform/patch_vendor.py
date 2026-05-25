import sys

with open('src/pages/Board.tsx', 'r') as f:
    content = f.read()

vendor_function = """
const getModelVendor = (modelName: string) => {
  if (!modelName) return '未知厂商';
  const name = modelName.toLowerCase();
  if (name.includes('gpt') || name.includes('o1') || name.includes('codex') || name.includes('dall')) return 'OpenAI';
  if (name.includes('claude')) return 'Anthropic';
  if (name.includes('gemini') || name.includes('palm') || name.includes('gemma')) return 'Google';
  if (name.includes('grok')) return 'xAI';
  if (name.includes('command')) return 'Cohere';
  if (name.includes('pi-') || name === 'pi') return 'Inflection AI';
  if (name.includes('mistral') || name.includes('mixtral') || name.includes('codestral')) return 'Mistral AI';
  if (name.includes('llama')) return 'Meta';
  if (name.includes('phi')) return 'Microsoft';
  if (name.includes('dbrx')) return 'Databricks';
  if (name.includes('nemotron')) return 'NVIDIA';
  if (name.includes('starcoder') || name.includes('zephyr')) return 'Hugging Face';
  if (name.includes('ernie') || name.includes('文心')) return '百度';
  if (name.includes('doubao') || name.includes('豆包') || name.includes('hailuo') || name.includes('海螺') || name.includes('bytedance')) return '字节跳动';
  if (name.includes('qwen') || name.includes('通义')) return '阿里巴巴/阿里云';
  if (name.includes('hunyuan') || name.includes('混元')) return '腾讯';
  if (name.includes('kimi') || name.includes('moonshot') || name.includes('claw') || name.includes('k0-') || name.includes('k1.') || name.includes('k2')) return '月之暗面';
  if (name.includes('abab') || name.includes('minimax') || name.includes('vl-01') || name.includes('m1') || name.includes('m2')) return '稀宇科技 MiniMax';
  if (name.includes('spark') || name.includes('星火')) return '科大讯飞';
  if (name.includes('pangu') || name.includes('盘古')) return '华为';
  if (name.includes('sensenova') || name.includes('日日新')) return '商汤科技';
  if (name.includes('tiangong') || name.includes('天工')) return '昆仑万维';
  if (name.includes('taichu') || name.includes('太初')) return '中科院自动化所';
  if (name.includes('wudao') || name.includes('悟道')) return '智源研究院';
  if (name.includes('glm') || name.includes('zhipu') || name.includes('chatglm')) return '智谱AI';
  if (name.includes('deepseek')) return '深度求索 DeepSeek';
  if (name.includes('baichuan') || name.includes('百川')) return '百川智能';
  if (name.includes('yi-') || name.includes('零一万物')) return '零一万物';
  if (name.includes('moss')) return '复旦大学';
  if (name.includes('linly')) return '中科院';
  if (name.includes('internlm') || name.includes('internvl') || name.includes('书生')) return '上海AI实验室/商汤';
  return '未知厂商';
};

function EvalLadderBoard() {"""

content = content.replace('function EvalLadderBoard() {', vendor_function)

old_ladder_column_item = """<div className="flex-1 text-sm font-semibold text-slate-700 truncate" title={item.model_name}>
                {item.model_name}
              </div>"""

new_ladder_column_item = """<div className="flex-1 truncate" title={item.model_name}>
                <div className="text-sm font-semibold text-slate-700 truncate">{item.model_name}</div>
                <div className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">{getModelVendor(item.model_name)}</div>
              </div>"""

content = content.replace(old_ladder_column_item, new_ladder_column_item)

with open('src/pages/Board.tsx', 'w') as f:
    f.write(content)
print("Vendor parsing logic added.")
