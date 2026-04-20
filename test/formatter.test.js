// 纯函数测试 - 运行: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  quotaToAmount,
  fmtMoney,
  chooseBalanceColor,
  formatStatusLine,
  color,
} from '../src/formatter.js';

test('quotaToAmount: 默认每 500000 = 1', () => {
  assert.equal(quotaToAmount(500000), 1);
  assert.equal(quotaToAmount(1_000_000), 2);
  assert.equal(quotaToAmount(0), 0);
});

test('quotaToAmount: 自定义 per', () => {
  assert.equal(quotaToAmount(100, 100), 1);
});

test('quotaToAmount: 非数字回退到 0', () => {
  assert.equal(quotaToAmount('abc'), 0);
  assert.equal(quotaToAmount(null), 0);
  assert.equal(quotaToAmount(undefined), 0);
});

test('fmtMoney: 保留 4 位小数', () => {
  assert.equal(fmtMoney(1.23456), '$1.2346');
  assert.equal(fmtMoney(0), '$0.0000');
  assert.equal(fmtMoney(100, '¥'), '¥100.0000');
});

test('chooseBalanceColor', () => {
  assert.equal(chooseBalanceColor(0, 1), 'red');
  assert.equal(chooseBalanceColor(-0.5, 1), 'red');
  assert.equal(chooseBalanceColor(0.5, 1), 'yellow');
  assert.equal(chooseBalanceColor(5, 1), 'green');
});

test('color: 禁用时返回原字符串', () => {
  assert.equal(color('abc', 'red', false), 'abc');
});

test('color: 启用时包裹 ANSI', () => {
  const s = color('abc', 'red', true);
  assert.ok(s.startsWith('\x1b[31m'));
  assert.ok(s.endsWith('\x1b[0m'));
});

test('formatStatusLine: 基础渲染（无色）', () => {
  const site = { currency_symbol: '$', quota_per_unit: 500000 };
  const cfg = {
    active: 'default',
    display: { low_balance_threshold: 1, show_used: true },
  };
  const line = formatStatusLine({
    remain: 12.34, used: 7.66, site, cfg, useColor: false,
  });
  assert.match(line, /\$12\.3400/);
  assert.match(line, /已用 \$7\.6600/);
  assert.match(line, /\[default\]/);
});

test('formatStatusLine: show_used=false 不展示已用', () => {
  const site = { currency_symbol: '$', quota_per_unit: 500000 };
  const cfg = {
    active: 'x',
    display: { low_balance_threshold: 1, show_used: false },
  };
  const line = formatStatusLine({
    remain: 3, used: 2, site, cfg, useColor: false,
  });
  assert.doesNotMatch(line, /已用/);
});
