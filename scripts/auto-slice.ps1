# scripts/auto-slice.ps1
#
# Drains the open-issues queue by running one fresh `claude -p` per issue.
# Each iteration gets a clean context window (new process). Workers commit
# and push to the `dev` branch. Skips issues whose title contains "HITL".
#
# Killswitch: create file `scripts/.auto-slice-stop` from any terminal to
# stop the loop after the current iteration finishes. Delete it to resume.
#
# Usage: pwsh scripts/auto-slice.ps1

$ErrorActionPreference = "Stop"

$RepoRoot       = (git rev-parse --show-toplevel).Trim()
$StopFile       = Join-Path $RepoRoot "scripts/.auto-slice-stop"
$LogFile        = Join-Path $RepoRoot "scripts/auto-slice.log"
$PromptPath     = Join-Path $RepoRoot "scripts/auto-slice-prompt.md"
$PromptTemplate = Get-Content $PromptPath -Raw

function Log($msg) {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line  = "[$stamp] $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

# --- Safety: must be on dev branch ---
$current = (git rev-parse --abbrev-ref HEAD).Trim()
if ($current -ne "dev") {
    Write-Host "Not on dev branch (currently '$current'). Refusing to run." -ForegroundColor Red
    Write-Host "Run: git checkout dev"
    exit 1
}

Log "auto-slice loop starting on branch dev"

# Issues we've already worked this run. If a worker leaves an issue open
# (blocker), we don't want to pick it up again on the next iteration and
# loop forever — skip it for the rest of this run. Restart the script to
# retry blocked issues.
$attempted = @{}

while ($true) {
    if (Test-Path $StopFile) {
        Log "killswitch present at $StopFile — halting."
        break
    }

    # Sync dev with remote so each iteration starts from a known base.
    # On the very first run origin/dev may not exist yet; skip in that case.
    $hasRemoteDev = git ls-remote --heads origin dev 2>$null
    if ($hasRemoteDev) {
        git fetch origin dev 2>&1 | Out-Null
        git reset --hard origin/dev 2>&1 | Out-Null
    }

    # Pick the next open, non-HITL issue with the lowest number.
    $issuesJson = gh issue list --state open --json number,title --limit 100
    if ($LASTEXITCODE -ne 0) {
        Log "gh issue list failed — halting."
        break
    }
    $issues = $issuesJson | ConvertFrom-Json | Sort-Object number
    $next   = $issues |
        Where-Object { $_.title -notmatch "HITL" } |
        Where-Object { -not $attempted.ContainsKey($_.number) } |
        Select-Object -First 1

    if (-not $next) {
        Log "no actionable open issues remain — done."
        break
    }

    $num   = $next.number
    $title = $next.title
    $attempted[$num] = $true
    Log "starting #$num : $title"

    $prompt = $PromptTemplate.
        Replace("{{ISSUE_NUMBER}}", "$num").
        Replace("{{ISSUE_TITLE}}", $title)

    # Pipe prompt into a fresh claude process. New process = new context window.
    $prompt | claude -p --dangerously-skip-permissions
    $code = $LASTEXITCODE

    if ($code -ne 0) {
        Log "claude exited $code on #$num — halting loop."
        break
    }

    # Re-read issue state to log outcome. We do not gate the loop on this —
    # the worker is responsible for closing on success or leaving open with
    # a blocker comment. The reset --hard at top of next iteration drops any
    # uncommitted residue.
    $state = (gh issue view $num --json state --jq '.state').Trim()
    Log "finished #$num — issue state: $state"
}

Log "auto-slice loop exiting"
