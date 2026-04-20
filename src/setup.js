// 交互式配置向导
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadConfig, saveConfig } from './config.js';
import { NewApiClient } from './api.js';
import { quotaToAmount, fmtMoney } from './formatter.js';

async function ask(rl, question, { def, required = false } = {}) {
  const hint = def != null && def !== '' ? ` (${def})` : '';
  while (true) {
    const line = (await rl.question(`${question}${hint}: `)).trim();
    const val = line || def;
    if (required && (val == null || val === '')) {
      console.log('  ↪ 不能为空，请重新输入');
      continue;
    }
    return val;
  }
}

export async function runSetup() {
  const cfg = await loadConfig();
  const rl = readline.createInterface({ input, output });
  try {
    console.log('\n🔧 配置 new-api 中转站\n');

    const existing = Object.keys(cfg.sites);
    if (existing.length > 0) {
      console.log(`已有站点: ${existing.join(', ')}（当前激活: ${cfg.active ?? '无'}）\n`);
    }

    const name = await ask(rl, '站点名称（用于切换标识）', { def: 'default' });
    const base_url = (await ask(rl, 'new-api 站点地址（例: https://xxx.com）', { required: true }))
      .replace(/\/+$/, '');

    console.log('\n认证方式：');
    console.log('  1) access_token   — 推荐。在 new-api 面板 → 个人设置 → 生成系统访问令牌');
    console.log('  2) API Key (sk-)  — 兼容模式，部分站点不支持查询用户总额度');
    const authChoice = await ask(rl, '选择 [1/2]', { def: '1' });

    let auth_type, access_token, user_id;
    if (authChoice === '2') {
      auth_type = 'api_key';
      access_token = await ask(rl, 'API Key（sk-xxx）', { required: true });
    } else {
      auth_type = 'access_token';
      access_token = await ask(rl, 'access_token', { required: true });
      const uid = await ask(rl, '用户 ID（面板个人信息页可见，不确定填 1）', { def: '1' });
      user_id = Number(uid);
    }

    const per = Number(await ask(rl, '额度单位（默认 500000 quota = 1$）', { def: '500000' }));
    const symbol = await ask(rl, '货币符号', { def: '$' });

    const site = {
      base_url,
      auth_type,
      access_token,
      user_id,
      quota_per_unit: per,
      currency_symbol: symbol,
    };

    console.log('\n🔎 正在测试连接...');
    const client = new NewApiClient(site);
    try {
      const self = await client.fetchSelf();
      const remain = quotaToAmount(self.quota ?? 0, per);
      console.log(`✅ 连接成功！用户: ${self.username ?? '(匿名)'}, 剩余: ${fmtMoney(remain, symbol)}`);
    } catch (e) {
      console.log(`⚠️  测试失败: ${e.message}`);
      const yn = await ask(rl, '仍然保存？[y/N]', { def: 'N' });
      if (!/^y/i.test(yn)) {
        console.log('已取消，未写入配置。');
        return;
      }
    }

    cfg.sites[name] = site;
    cfg.active = name;
    await saveConfig(cfg);
    console.log(`\n✨ 已保存到配置文件，当前激活站点: ${name}`);
    console.log(`   后续可用 \`cnq quota\` 查看额度，\`cnq sites\` 列表，\`cnq use <name>\` 切换。\n`);
  } finally {
    rl.close();
  }
}
