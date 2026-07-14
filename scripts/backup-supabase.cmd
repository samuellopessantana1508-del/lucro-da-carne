@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup-supabase.ps1" %*
