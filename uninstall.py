#!/usr/bin/env python3
"""claude-newapi-quota 一键卸载脚本
用法: python uninstall.py
功能: 移除全局命令 + 删除配置/缓存 + 清理 Claude Code 集成
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
CLAUDE_SETTINGS = HOME / ".claude" / "settings.json"
CLAUDE_CMD_FILE = HOME / ".claude" / "commands" / "quota.md"


def info(step, msg):
    print(f"{GREEN}[{step}]{RESET} {msg}")


def dim(msg):
    print(f"  {DIM}{msg}{RESET}")


def warn(msg):
    print(f"  {YELLOW}{msg}{RESET}")


def run(cmd, **kwargs):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, **kwargs)


def remove_npm_link():
    run("npm unlink -g claude-newapi-quota", cwd=str(SCRIPT_DIR))
    # 二次确认
    if shutil.which("cnq"):
        warn("cnq 命令仍存在，可能需要手动 npm unlink。")
    else:
        dim("OK")


def remove_config():
    if CFG_DIR.exists():
        shutil.rmtree(CFG_DIR)
        dim(f"已删除 {CFG_DIR}")
    else:
        dim(f"{CFG_DIR} 不存在，跳过。")


def remove_statusline():
    if not CLAUDE_SETTINGS.exists():
        dim("settings.json 不存在，跳过。")
        return

    try:
        settings = json.loads(CLAUDE_SETTINGS.read_text("utf-8"))
    except Exception:
        dim("settings.json 解析失败，跳过。")
        return

    if "statusLine" not in settings:
        dim("settings.json 中无 statusLine，跳过。")
        return

    del settings["statusLine"]
    CLAUDE_SETTINGS.write_text(json.dumps(settings, indent=2, ensure_ascii=False), encoding="utf-8")
    dim(f"已从 {CLAUDE_SETTINGS} 移除 statusLine")


def remove_slash_command():
    if CLAUDE_CMD_FILE.exists():
        CLAUDE_CMD_FILE.unlink()
        dim(f"已删除 {CLAUDE_CMD_FILE}")
        # 如果 commands 目录空了一起删
        cmd_dir = CLAUDE_CMD_FILE.parent
        if cmd_dir.exists() and not any(cmd_dir.iterdir()):
            cmd_dir.rmdir()
    else:
        dim(f"{CLAUDE_CMD_FILE} 不存在，跳过。")


def main():
    if sys.platform == "win32":
        os.system("")

    print(f"\n{CYAN}============================={RESET}")
    print(f"{CYAN}  claude-newapi-quota 卸载器{RESET}")
    print(f"{CYAN}============================={RESET}\n")

    confirm = input("确认卸载？将移除全局命令、配置文件和 Claude Code 集成 [y/N]: ").strip()
    if confirm.lower() != "y":
        print("已取消。")
        input("按回车键退出...")
        return

    print()
    info("1/4", "移除全局命令 (npm unlink)...")
    remove_npm_link()

    info("2/4", "删除配置和缓存...")
    remove_config()

    info("3/4", "清理 Claude Code statusLine...")
    remove_statusline()

    info("4/4", "删除 /quota slash 命令...")
    remove_slash_command()

    print(f"\n{CYAN}============================={RESET}")
    print(f"{GREEN}  卸载完成!{RESET}")
    print(f"{CYAN}============================={RESET}\n")
    print("  已移除:")
    print("    - cnq / cnq-statusline 全局命令")
    print("    - ~/.claude-newapi-quota/ 配置和缓存")
    print("    - ~/.claude/settings.json 中的 statusLine")
    print("    - ~/.claude/commands/quota.md")
    print(f"\n  {YELLOW}[!] 请重启 Claude Code 让变更生效。{RESET}")
    print(f"  {DIM}[i] 项目源码未删除，如需彻底清理请手动删除本目录。{RESET}\n")
    input("按回车键退出...")


if __name__ == "__main__":
    main()
