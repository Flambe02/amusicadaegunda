Param(
  [Parameter(Position=0, Mandatory=$false)] [string]$Message = "chore: update",
  [Parameter(Position=1, Mandatory=$false)] [string]$Tag,
  [Parameter(Mandatory=$false)] [switch]$NoTag
)

function Run($cmd) {
  Write-Host "→ $cmd" -ForegroundColor Cyan
  & powershell -NoProfile -Command $cmd
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Command failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
  }
}

# 1) Stage all changes
Run "git add -A"

# 2) Commit (skip if nothing to commit)
$commitNeeded = (git status --porcelain) -ne $null
if ($commitNeeded) {
  $safeMsg = $Message.Replace('"','\"')
  Run "git commit -m \"$safeMsg\""
} else {
  Write-Host "Nothing to commit." -ForegroundColor Yellow
}

# 3) Ensure upstream is set for current branch
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
$upstream = (git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>$null)
if (-not $upstream) {
  Write-Host "No upstream for $branch. Setting origin/$branch..." -ForegroundColor Yellow
  Run "git push --set-upstream origin $branch"
} else {
  Run "git push"
}

# 4) Optional tag
if (-not $NoTag) {
  if ($Tag) {
    Run "git tag -a $Tag -m \"$Message\""
    Run "git push --tags"
  } else {
    Write-Host "No tag provided. Skipping tag." -ForegroundColor Yellow
  }
}

Write-Host "Done." -ForegroundColor Green
