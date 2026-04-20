#!/usr/bin/env python3
"""claude-newapi-quota 一键安装脚本
用法: python install.py
功能: npm link + 交互配置 + 写入 Claude Code statusLine + 安装 /quota 命令
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
DIM = "\033[90m"
RESET = "\033[0m"

HOME = Path.home()
SCRIPT_DIR = Path(__file__).resolve().parent
CFG_DIR = HOME / ".claude-newapi-quota"
CFG_FILE = CFG_DIR / "config.json"
CLAUDE_DIR = HOME / ".claude"
CLAUDE_SETTINGS = CLAUDE_DIR / "settings.json"
CLAUDE_CMD_DIR = CLAUDE_DIR / "commands"
CLAUDE_CMD_FILE = CLAUDE_CMD_DIR / "quota.md"
SRC_CMD_FILE = SCRIPT_DIR / "claude-plugin" / "commands" / "quota.md"


def info(step, msg):
    print(f"{GREEN}[{step}]{RESET} {msg}")


def warn(msg):
    print(f"  {YELLOW}{msg}{RESET}")


def fail(msg):
    print(f"\n  {RED}[X] {msg}{RESET}\n")
    input("按回车键退出...")
    sys.exit(1)


def dim(msg):
    print(f"  {DIM}{msg}{RESET}")


def run(cmd, **kwargs):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, **kwargs)


def check_node():
    r = run("node --version")
    if r.returncode != 0:
        fail("未检测到 Node.js，请先安装 Node.js 18+: https://nodejs.org")
    ver = r.stdout.strip().lstrip("v")
    major = int(ver.split(".")[0])
    if major < 18:
        fail(f"Node.js 版本过低 (v{ver})，需要 18+，请升级。")
    return ver


def npm_link():
    r = run("npm link", cwd=str(SCRIPT_DIR))
    if r.returncode != 0:
        fail(f"npm link 失败:\n{r.stderr}")
    # 验证
    if not shutil.which("cnq") or not shutil.which("cnq-statusline"):
        fail("npm link 后找不到 cnq / cnq-statusline，请检查 npm 全局 bin 是否在 PATH 中。")
    dim(f"cnq           -> {shutil.which('cnq')}")
    dim(f"cnq-statusline -> {shutil.which('cnq-statusline')}")


def ask(prompt, default=None, required=False):
    hint = f" ({default})" if default else ""
    while True:
        val = input(f"  {prompt}{hint}: ").strip()
        if not val:
            val = default
        if required and not val:
            print(f"  {YELLOW}↪ 不能为空{RESET}")
            continue
        return val


def setup_config():
    if CFG_FILE.exists():
        try:
            cfg = json.loads(CFG_FILE.read_text("utf-8"))
            if cfg.get("active") and cfg.get("sites"):
                warn(f"已有配置 (激活站点: {cfg['active']})，跳过。如需修改运行: cnq setup")
                return
        except Exception:
            pass

    print()
    base_url = ask("new-api 站点地址 (例: https://xxx.com)", required=True).rstrip("/")

    print()
    print("  认证方式:")
    print("    1) access_token（推荐，面板 → 安全设置 → 系统访问令牌）")
    print("    2) API Key (sk- 开头)")
    auth_choice = ask("选择 [1/2]", default="1")

    if auth_choice == "2":
        auth_type = "api_key"
        token = ask("API Key (sk-xxx)", required=True)
        user_id = None
    else:
        auth_type = "access_token"
        token = ask("access_token", required=True)
        uid = ask("用户 ID (面板个人信息页可见)", default="1")
        user_id = int(uid)

    per = int(ask("额度单位 (默认 500000 quota = 1$)", default="500000"))
    symbol = ask("货币符号", default="$")

    cfg = {
        "sites": {
            "default": {
                "base_url": base_url,
                "auth_type": auth_type,
                "access_token": token,
                "user_id": user_id,
                "quota_per_unit": per,
                "currency_symbol": symbol,
            }
        },
        "active": "default",
        "cache_ttl_seconds": 30,
        "display": {
            "low_balance_threshold": 1,
            "show_used": True,
            "show_requests": False,
            "compact": False,
        },
    }

    CFG_DIR.mkdir(parents=True, exist_ok=True)
    CFG_FILE.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")
    dim(f"配置已写入: {CFG_FILE}")

    # 联通测试
    print("  测试连接...")
    r = run("cnq refresh")
    if r.returncode == 0:
        for line in r.stdout.strip().splitlines():
            print(f"  {line}")
        print(f"  {GREEN}OK{RESET}")
    else:
        warn(f"连接测试失败: {r.stderr.strip()}")
        warn("配置已保存，稍后可用 cnq setup 修改。")


def setup_statusline():
    settings = {}
    if CLAUDE_SETTINGS.exists():
        try:
            settings = json.loads(CLAUDE_SETTINGS.read_text("utf-8"))
        except Exception:
            pass

    if "statusLine" in settings:
        warn("statusLine 已存在，跳过。")
        return

    settings["statusLine"] = {
        "type": "command",
        "command": "cnq-statusline",
        "padding": 0,
    }
    CLAUDE_DIR.mkdir(parents=True, exist_ok=True)
    CLAUDE_SETTINGS.write_text(json.dumps(settings, indent=2, ensure_ascii=False), encoding="utf-8")
    dim(f"已写入 {CLAUDE_SETTINGS}")


def setup_slash_command():
    if not SRC_CMD_FILE.exists():
        warn(f"找不到源文件 {SRC_CMD_FILE}，跳过。")
        return
    CLAUDE_CMD_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(str(SRC_CMD_FILE), str(CLAUDE_CMD_FILE))
    dim(f"已安装到 {CLAUDE_CMD_FILE}")


def main():
    # Windows 终端启用 ANSI 颜色
    if sys.platform == "win32":
        os.system("")

    print(f"\n{CYAN}============================={RESET}")
    print(f"{CYAN}  claude-newapi-quota 安装器{RESET}")
    print(f"{CYAN}============================={RESET}\n")

    ver = check_node()
    info("1/5", f"Node.js v{ver}  OK")

    info("2/5", "注册全局命令 (npm link)...")
    npm_link()

    info("3/5", "站点配置...")
    setup_config()

    info("4/5", "集成 Claude Code statusLine...")
    setup_statusline()

    info("5/5", "安装 /quota slash 命令...")
    setup_slash_command()

    print(f"\n{CYAN}============================={RESET}")
    print(f"{GREEN}  安装完成!{RESET}")
    print(f"{CYAN}============================={RESET}\n")
    print("  cnq            查看额度")
    print("  cnq refresh    跳过缓存刷新")
    print("  cnq setup      修改站点配置")
    print("  /quota         Claude Code 对话中查询")
    print(f"\n  {YELLOW}[!] 请重启 Claude Code 让 statusLine 生效。{RESET}\n")
    input("按回车键退出...")


if __name__ == "__main__":
    main()
