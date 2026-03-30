Write-Host "Removing generated/tracked artifacts from Git index..." -ForegroundColor Cyan

git rm --cached main.js 2>$null
git rm -r --cached node_modules 2>$null
git rm -r --cached release-assets 2>$null

Write-Host "Done. Now run:" -ForegroundColor Green
Write-Host "  npm install" -ForegroundColor Yellow
Write-Host "  npm run build" -ForegroundColor Yellow
Write-Host "Then attach main.js, manifest.json and styles.css to the GitHub release." -ForegroundColor Yellow
