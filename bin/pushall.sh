#!/usr/bin/env bash
# 一次推到全部**未被禁用**的远程。
#
# 为什么需要它：本仓库有两个远程 —— `origin` 是自建 NAS（主），`github` 是异地副本。
# 平时 `git push` 只推一个，很容易漏掉另一个，而"备份"的整个价值恰恰就在那份副本上。
# 脚本不写死远程名，有几个推几个，以后加/换远程不用改它。
#
# 用法： bin/pushall.sh   或   git pushall
#
# ── 怎么禁用某个远程 ────────────────────────────────────────────────────────
# 用户 2026-09-18 的要求：**默认不推 github**。禁用方式是在远程上设一个哨兵 pushurl：
#
#     git config remote.github.pushurl 'disabled://github-push-disabled'
#
# 本脚本看到这个 sentinel 就**跳过**该远程（记进"已跳过"，不算失败、不影响退出码）。
# 裸 `git push github` 也会因此立刻失败（`remote helper 'disabled' aborted session`），
# 不会发起网络请求 —— 新会话即使不知道这条约定，也推不上去。
# 想恢复推送（**只在用户明确要求时**）：
#
#     git config remote.github.pushurl https://github.com/yijiezhong/dsh-output-setting.git
#     git push github master
#     git config remote.github.pushurl 'disabled://github-push-disabled'   # 推完立刻恢复
#
# ── 其它约定 ────────────────────────────────────────────────────────────────
# 一个远程推失败时会继续推其余远程，最后汇总退出码：某个远程连不上不该让另一个也漏推。
#
# 本脚本由 dsh-testhud 的 bin/pushall.sh 移植而来，仅把保护目录名从写死的
# "dsh-testhud" 改为按仓库目录名推导，因此两个仓库可以共用同一份逻辑。
set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || exit 1

# 按仓库目录名推导保护目录：~/.dsh/<仓库名>/no-push-remotes.txt
# （本地保护文件与 git 配置互为冗余，语义更明确，告诉 agent 不要再推这个远程。）
PROTECT_DIR="${DSH_HOME:-$HOME/.dsh}/$(basename "$(pwd)")"
PROTECT_FILE="$PROTECT_DIR/no-push-remotes.txt"
SENTINEL='disabled://'

branch=$(git rev-parse --abbrev-ref HEAD)

if [ "$branch" = "HEAD" ]; then
    echo "当前不在任何分支上（detached HEAD），先切回分支再推。" >&2
    exit 1
fi

remotes=$(git remote)
if [ -z "$remotes" ]; then
    echo "这个仓库没有配置任何远程。" >&2
    exit 1
fi

# 某个远程是否被禁用：哨兵 pushurl 或保护文件列出它的名字，二者任一即跳过。
remote_disabled() {
    local name=$1 pushurl
    pushurl=$(git config --get "remote.$name.pushurl" 2>/dev/null || true)
    case "$pushurl" in "$SENTINEL"*) return 0 ;; esac
    if [ -f "$PROTECT_FILE" ] && grep -qxF "$name" "$PROTECT_FILE" 2>/dev/null; then
        return 0
    fi
    return 1
}

failed=""
skipped=""
for remote in $remotes; do
    if remote_disabled "$remote"; then
        echo "→ ${remote}（已禁用，跳过）"
        skipped="$skipped $remote"
        continue
    fi
    echo "→ $remote"
    if ! git push "$remote" "$branch"; then
        echo "  ✗ $remote 推送失败（继续推其余远程）" >&2
        failed="$failed $remote"
    fi
done

# 推完核一遍，别让"推送成功"只停留在命令的退出码上。
echo
echo "各远程上 $branch 的 HEAD："
for remote in $remotes; do
    if remote_disabled "$remote"; then
        printf "  %-8s %s\n" "$remote" "（已禁用，未推送）"
    else
        printf "  %-8s %s\n" "$remote" "$(git ls-remote "$remote" "refs/heads/$branch" 2>/dev/null | cut -f1)"
    fi
done
printf "  %-8s %s\n" "本地" "$(git rev-parse HEAD)"

if [ -n "$skipped" ]; then
    echo
    echo "已按要求跳过：${skipped}（要恢复推送，见本脚本顶部注释）"
fi

if [ -n "$failed" ]; then
    echo
    echo "以下远程没推成功：$failed" >&2
    exit 1
fi
