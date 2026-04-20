---
name: newapi
description: 查询 new-api 中转站的剩余/已用额度
argument-hint: "[refresh | raw | sites | setup]"
allowed-tools: [Bash, Read]
---

查询 new-api 中转站额度。根据用户参数执行对应命令，并将结果**按原样**展示给用户。

## 执行逻辑

1. 如果参数为空或 `quota`，执行：
   ```bash
   cnq quota
   ```

2. 如果参数是 `refresh`，执行：
   ```bash
   cnq refresh
   ```

3. 如果参数是 `raw`，执行：
   ```bash
   cnq raw
   ```

4. 如果参数是 `sites`，执行：
   ```bash
   cnq sites
   ```

5. 如果参数是 `setup`，告知用户在终端里运行 `cnq setup`（交互式命令无法在此运行）。

## 注意

- 如果报错 `cnq: command not found`，提示用户先运行 `python install.py` 或 `npm link` 注册全局命令。
- 不要对输出做任何修改、翻译或总结，直接原样展示。
