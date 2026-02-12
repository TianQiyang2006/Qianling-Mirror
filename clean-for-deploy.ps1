# 前灵镜 - 发布前清理脚本
# 使用方法: 在PowerShell中运行 .\clean-for-deploy.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  前灵镜 - 发布前清理脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 停止Node.js服务器
Write-Host "[1/5] 停止Node.js服务器..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Stop-Process -Name node -Force
    Write-Host "      ✓ 已停止Node.js服务器" -ForegroundColor Green
} else {
    Write-Host "      ✓ 没有运行的Node.js服务器" -ForegroundColor Green
}

# 2. 备份并清空数据库
Write-Host "[2/5] 清理数据库..." -ForegroundColor Yellow
if (Test-Path "memories.db") {
    # 创建备份（可选）
    $backupName = "memories.db.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item "memories.db" $backupName -ErrorAction SilentlyContinue
    Remove-Item "memories.db" -Force
    Write-Host "      ✓ 已删除数据库（备份: $backupName）" -ForegroundColor Green
} else {
    Write-Host "      ✓ 数据库文件不存在" -ForegroundColor Green
}

# 3. 清空上传目录
Write-Host "[3/5] 清空上传目录..." -ForegroundColor Yellow
if (Test-Path "public\uploads") {
    $uploadFiles = Get-ChildItem "public\uploads" -File
    $fileCount = $uploadFiles.Count
    if ($fileCount -gt 0) {
        Remove-Item "public\uploads\*" -Recurse -Force
        Write-Host "      ✓ 已删除 $fileCount 个上传文件" -ForegroundColor Green
    } else {
        Write-Host "      ✓ 上传目录已为空" -ForegroundColor Green
    }
} else {
    New-Item -ItemType Directory -Path "public\uploads" -Force | Out-Null
    Write-Host "      ✓ 已创建上传目录" -ForegroundColor Green
}

# 4. 清理npm缓存
Write-Host "[4/5] 清理npm缓存..." -ForegroundColor Yellow
if (Test-Path ".npm-cache") {
    Remove-Item ".npm-cache" -Recurse -Force
    Write-Host "      ✓ 已删除npm缓存" -ForegroundColor Green
} else {
    Write-Host "      ✓ npm缓存目录不存在" -ForegroundColor Green
}

# 5. 可选：删除node_modules（如果需要重新安装依赖）
Write-Host "[5/5] 检查node_modules..." -ForegroundColor Yellow
$cleanModules = Read-Host "    是否删除node_modules重新安装依赖? (y/N)"
if ($cleanModules -eq 'y' -or $cleanModules -eq 'Y') {
    if (Test-Path "node_modules") {
        Remove-Item "node_modules" -Recurse -Force
        Write-Host "      ✓ 已删除node_modules" -ForegroundColor Green
    }
    Write-Host "      提示: 运行 'npm install' 重新安装依赖" -ForegroundColor Cyan
} else {
    Write-Host "      ✓ 保留node_modules" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  清理完成！项目已准备好发布" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "发布前检查清单：" -ForegroundColor Yellow
Write-Host "  □ 确认数据库已清空" -ForegroundColor White
Write-Host "  □ 确认上传目录已清空" -ForegroundColor White
Write-Host "  □ 测试应用能正常启动" -ForegroundColor White
Write-Host "  □ 检查配置文件是否正确" -ForegroundColor White
Write-Host ""

# 显示当前目录大小
$dirSize = (Get-ChildItem -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "当前项目大小: $([math]::Round($dirSize, 2)) MB" -ForegroundColor Cyan
