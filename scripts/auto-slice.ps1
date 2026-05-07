# scripts/auto-slice.ps1
#
# Drains the open-issues queue by running one fresh `claude -p` per issue.
# Each iteration gets a clean context window (new process). Workers commit
# and push to the `dev` branch. Skips issues whose title contains "HITL".
#
# Dependency-aware: parses "## Blocked by" from each issue body and skips
# any issue whose blockers are still OPEN. This makes the loop safe for
# DAG-shaped slice dependencies (May 2026 rebuild has 35 slices with a
# non-linear dep tree).
#
# Killswitch: create file `scripts/.auto-slice-stop` from any terminal to
# stop the loop after the current iteration finishes. Delete it to resume.
#
# Per-slice claude output is captured to `scripts/.auto-slice-<N>.log` for
# debugging. The summary log is `scripts/auto-slice.log`.
#
# Usage: pwsh scripts/auto-slice.ps1

$ErrorActionPreference = "Stop"

$RepoRoot       = (git rev-parse --show-toplevel).Trim()
$StopFile       = Join-Path $RepoRoot "scripts/.auto-slice-stop"
$LogFile        = Join-Path $RepoRoot "scripts/auto-slice.log"
$PromptPath     = Join-Path $RepoRoot "scripts/auto-slice-prompt.md"
$PromptTemplate = Get-Content $PromptPath -Raw

function Log([string]$msg, [string]$color = "White") {
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line  = "[$stamp] $msg"
    Write-Host $line -ForegroundColor $color
    Add-Content -Path $LogFile -Value $line
}

function Format-Duration([TimeSpan]$d) {
    if ($d.TotalHours -ge 1) {
        return ("{0:0}h{1:00}m{2:00}s" -f [int]$d.TotalHours, $d.Minutes, $d.Seconds)
    }
    return ("{0:00}m{1:00}s" -f $d.Minutes, $d.Seconds)
}

# Parse "## Blocked by" section from an issue body. Returns array of
# blocker issue numbers, or @() if "None".
function Get-BlockedByIssues([int]$issueNumber) {
    try {
        $body = (gh issue view $issueNumber --json body -q '.body' 2>$null) -join "`n"
    } catch {
        return @()
    }
    if (-not $body) { return @() }
    # Capture content under "## Blocked by" up to the next "## " or end-of-body.
    $m = [regex]::Match($body, '(?ms)##\s*Blocked\s*by\s*\r?\n(.*?)(?=^##\s|\Z)')
    if (-not $m.Success) { return @() }
    $section = $m.Groups[1].Value
    if ($section -match '(?i)\bNone\b') { return @() }
    $nums = [regex]::Matches($section, '#(\d+)') |
        ForEach-Object { [int]$_.Groups[1].Value } |
        Sort-Object -Unique
    return @($nums)
}

# Returns @{ ready = $true } if all blockers closed, else
# @{ ready = $false; openBlockers = @(N1, N2) }.
function Test-BlockersClear([int]$issueNumber) {
    $blockers = Get-BlockedByIssues $issueNumber
    if ($blockers.Count -eq 0) {
        return @{ ready = $true; openBlockers = @() }
    }
    $open = @()
    foreach ($b in $blockers) {
        $state = (gh issue view $b --json state -q '.state' 2>$null).Trim()
        if ($state -ne "CLOSED") { $open += $b }
    }
    if ($open.Count -eq 0) {
        return @{ ready = $true; openBlockers = @() }
    }
    return @{ ready = $false; openBlockers = $open }
}

# --- Safety: must be on dev branch ---
$current = (git rev-parse --abbrev-ref HEAD).Trim()
if ($current -ne "dev") {
    Write-Host "Not on dev branch (currently '$current'). Refusing to run." -ForegroundColor Red
    Write-Host "Run: git checkout dev"
    exit 1
}

$loopStart = Get-Date
Log "================================================================" "Cyan"
Log "auto-slice loop starting on branch dev" "Cyan"
Log "================================================================" "Cyan"

# Issues we've already worked this run. If a worker leaves an issue open
# (blocker), we don't want to pick it up again on the next iteration and
# loop forever — skip it for the rest of this run. Restart the script to
# retry blocked issues.
$attempted     = @{}
$durations     = @()  # per-slice durations for ETA estimation
$closedCount   = 0
$openLeftCount = 0
$skipReasons   = @{}  # issueNumber -> reason string for end-of-run summary

while ($true) {
    if (Test-Path $StopFile) {
        Log "killswitch present at $StopFile — halting." "Yellow"
        break
    }

    # Sync dev with remote so each iteration starts from a known base.
    # On the very first run origin/dev may not exist yet; skip in that case.
    $hasRemoteDev = git ls-remote --heads origin dev 2>$null
    if ($hasRemoteDev) {
        git fetch origin dev 2>&1 | Out-Null
        git reset --hard origin/dev 2>&1 | Out-Null
        $devSha = (git rev-parse --short HEAD).Trim()
        Log "synced dev to origin/dev @ $devSha" "DarkGray"
    }

    # Pull all open issues (titles + numbers).
    $issuesJson = gh issue list --state open --json number,title --limit 200
    if ($LASTEXITCODE -ne 0) {
        Log "gh issue list failed — halting." "Red"
        break
    }
    $issues = $issuesJson | ConvertFrom-Json | Sort-Object number

    # Find next actionable issue: not HITL, not already attempted this run,
    # and all "## Blocked by" references are CLOSED.
    $next = $null
    $skippedThisPass = @()
    foreach ($iss in $issues) {
        if ($iss.title -match "HITL")               { continue }
        if ($attempted.ContainsKey($iss.number))    { continue }

        $check = Test-BlockersClear $iss.number
        if (-not $check.ready) {
            $blockers = ($check.openBlockers | ForEach-Object { "#$_" }) -join ", "
            $skippedThisPass += "#$($iss.number) (waiting on $blockers)"
            $skipReasons[$iss.number] = "waiting on $blockers"
            continue
        }

        $next = $iss
        break
    }

    if ($skippedThisPass.Count -gt 0) {
        Log "deferred (open blockers): $($skippedThisPass -join '; ')" "DarkYellow"
    }

    if (-not $next) {
        Log "no actionable open issues remain — done." "Green"
        break
    }

    $num   = $next.number
    $title = $next.title
    $attempted[$num] = $true

    # Progress estimate
    $remaining = ($issues | Where-Object {
        $_.title -notmatch "HITL" -and -not $attempted.ContainsKey($_.number)
    }).Count
    if ($durations.Count -gt 0) {
        $avg = ($durations | Measure-Object -Average).Average
        $eta = [TimeSpan]::FromSeconds($avg * $remaining)
        $etaStr = " (eta for remaining ${remaining}: $(Format-Duration $eta))"
    } else {
        $etaStr = ""
    }

    Log ""
    Log "----------------------------------------------------------------" "Cyan"
    Log "starting #$num : $title$etaStr" "Cyan"
    Log "----------------------------------------------------------------" "Cyan"

    $prompt = $PromptTemplate.
        Replace("{{ISSUE_NUMBER}}", "$num").
        Replace("{{ISSUE_TITLE}}", $title)

    $perSliceLog = Join-Path $RepoRoot "scripts/.auto-slice-$num.log"
    $sliceStart  = Get-Date
    $headBefore  = (git rev-parse HEAD).Trim()

    # Pipe prompt into a fresh claude process. Capture stdout+stderr to a
    # per-slice log file (and tee to console for live visibility).
    $prompt | claude -p --dangerously-skip-permissions 2>&1 |
        Tee-Object -FilePath $perSliceLog
    $code = $LASTEXITCODE

    $sliceEnd      = Get-Date
    $sliceDuration = $sliceEnd - $sliceStart
    $durations    += $sliceDuration.TotalSeconds

    # What did the worker actually commit?
    $headAfter = (git rev-parse HEAD).Trim()
    if ($headAfter -ne $headBefore) {
        $commitSha     = (git rev-parse --short HEAD).Trim()
        $commitSubject = (git log -1 --pretty=%s).Trim()
        Log "  commit: $commitSha — $commitSubject" "DarkGray"
    } else {
        Log "  commit: (none — no new commit on dev)" "DarkGray"
    }

    if ($code -ne 0) {
        Log "claude exited $code on #$num — halting loop." "Red"
        Log "  per-slice log: $perSliceLog" "DarkGray"
        break
    }

    # Re-read issue state to log outcome. We do not gate the loop on this —
    # the worker is responsible for closing on success or leaving open with
    # a blocker comment.
    $stateRaw = (gh issue view $num --json state --jq '.state').Trim()
    $state    = $stateRaw.ToUpper()
    $cmtCount = (gh issue view $num --json comments --jq '.comments | length').Trim()

    $resultColor = if ($state -eq "CLOSED") { "Green" } else { "Yellow" }
    $tag         = if ($state -eq "CLOSED") { "CLOSED" } else { "STILL OPEN" }
    if ($state -eq "CLOSED") { $closedCount++ } else { $openLeftCount++ }

    Log "  result: $tag (comments=$cmtCount, took $(Format-Duration $sliceDuration))" $resultColor
}

# End-of-run summary
$loopElapsed = (Get-Date) - $loopStart
Log ""
Log "================================================================" "Cyan"
Log "auto-slice summary" "Cyan"
Log "----------------------------------------------------------------" "Cyan"
Log "  total elapsed:   $(Format-Duration $loopElapsed)"
Log "  attempted:       $($attempted.Count)"
Log "  closed:          $closedCount" "Green"
Log "  left open:       $openLeftCount" "Yellow"
if ($skipReasons.Count -gt 0) {
    Log "  deferred (blocker still open):" "DarkYellow"
    foreach ($k in ($skipReasons.Keys | Sort-Object)) {
        Log "    #$k -> $($skipReasons[$k])" "DarkYellow"
    }
}
$openTotal = (gh issue list --state open --limit 200 | Measure-Object).Count
Log "  open issues remaining on tracker: $openTotal"
Log "================================================================" "Cyan"
