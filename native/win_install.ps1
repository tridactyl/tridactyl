Param (
    [switch]$debug = $false
)

#
# Constants
#
$win_tridactyl_dir_name = ".tridactyl"
$batch_file_name = "native_main.bat"
$manifest_file_name = "tridactyl.json"
$manifest_replace_str = "REPLACE_ME_WITH_SED"
$native_messenger_binary_name = "native_main.py"

$native_messenger_files_http_base = `
    "https://raw.githubusercontent.com/cmcaine/tridactyl/master/native"

$manifest_registry_path = `
    "HKCU:\Software\Mozilla\NativeMessagingHosts\tridactyl"


function Check-Path()
{
    Param($Path)
    if((Test-Path $Path))
    {
        Write-Host "    - $Path created successfully!"
    }
    else
    {
        Write-Host "    - $Path creating failed, quitting ..."
    }
}

#
# Prepare `.tridactyl` directory
#
$win_tridactyl_dir_path = "$env:USERPROFILE\$win_tridactyl_dir_name"
Write-Host "[+] Preparing $win_tridactyl_dir_name ..."

if ($debug)
{
    Write-Host "    - [debug] Removing $win_tridactyl_dir_path"
    Remove-Item `
        -Force `
        -Recurse `
        -Path $win_tridactyl_dir_path
}

If(!(test-path $win_tridactyl_dir_path))
{
    New-Item -ItemType Directory `
        -Force `
        -Path $win_tridactyl_dir_path | Out-Null

    Check-Path -Path $win_tridactyl_dir_path
}
else
{
    Write-Host "    - $win_tridactyl_dir_path exists, moving on ..."
}

#
# Prepare `native_main.py`
#
$download_start_time = [long] (Get-Date `
    -Date ((Get-Date).ToUniversalTime()) `
    -UFormat %s)

$native_messenger_binary_path = [string]::Format("{0}\{1}",
    $win_tridactyl_dir_path,
    $native_messenger_binary_name)

$native_messenger_binary_url = [string]::Format("{0}/{1}?{2}",
    $native_messenger_files_http_base,
    $native_messenger_binary_name,
    $download_start_time)

Write-Host "[+] Downloading $native_messenger_binary_url ..."

try {
    $retval = Invoke-WebRequest `
        -Uri $native_messenger_binary_url `
        -OutFile $native_messenger_binary_path
} catch {
    Write-Host `
      "Invoke-WebRequest StatusCode:" `
      $_.Exception.Response.StatusCode.value__

    Write-Host `
        "Invoke-WebRequest StatusDescription:" `
        $_.Exception.Response.StatusDescription

    Write-Host "[+] Downloading failed, quitting ..."
    exit
}

Check-Path -Path $native_messenger_binary_path

#
# Prepare `win_tridactyl.bat`
#
$batch_file_path = [string]::Format("{0}\{1}",
    $win_tridactyl_dir_path,
    $batch_file_name)
Write-Host "[+] Preparing $batch_file_path ..."

$batch_file_content = @"
@echo off

call python -u $win_tridactyl_dir_path\native_main.py
"@

$batch_file_content `
    | Out-File `
    -Encoding ascii `
    -FilePath $batch_file_path

Check-Path -Path $batch_file_path

#
# Prepare `tridactyl.json`
#
$download_start_time = [long] (Get-Date `
    -Date ((Get-Date).ToUniversalTime()) `
    -UFormat %s)

$manifest_file_path = [string]::Format("{0}\{1}",
    $win_tridactyl_dir_path,
    $manifest_file_name)

Write-Host "[+] Preparing $manifest_file_path ..."

#$manifest_file_content = @"
#{
#    "name": "tridactyl",
#    "description": "Tridactyl native command handler",
#    "path": "win_tridactyl.bat",
#    "type": "stdio",
#    "allowed_extensions": [
#      "tridactyl.vim@cmcaine.co.uk",
#      "tridactyl.vim.betas@cmcaine.co.uk"
#    ]
#}
#"@
#
#$manifest_file_content `
#    | Out-File `
#    -Encoding ascii `
#    -FilePath $manifest_file_path

$manifest_file_url = [string]::Format("{0}/{1}?{2}",
    $native_messenger_files_http_base,
    $manifest_file_name,
    $download_start_time)

Write-Host "[+] Downloading $manifest_file_url ..."

try {
    $retval = Invoke-WebRequest `
        -Uri $manifest_file_url `
        -OutFile $manifest_file_path
} catch {
    Write-Host `
      "Invoke-WebRequest StatusCode:" `
      $_.Exception.Response.StatusCode.value__

    Write-Host `
        "Invoke-WebRequest StatusDescription:" `
        $_.Exception.Response.StatusDescription

    Write-Host "[+] Downloading failed, quitting ..."
    exit
}

Check-Path -Path $manifest_file_path

(Get-Content `
    $manifest_file_path).replace($manifest_replace_str, $batch_file_name) `
    | Set-Content -Encoding ascii $manifest_file_path

$found_pattern = (Select-String `
    -Path $manifest_file_path `
    -Pattern $manifest_replace_str `
    -CaseSensitive `
    | select Line)

if (! $found_pattern)
{
    Write-Host "    - $manifest_file_path patched successfully!"
}

#
# Add registry entry
#
Write-Host "[+] Adding registry key $manifest_registry_path ..."
New-Item `
    -Path $manifest_registry_path `
    -Force | Out-Null

New-ItemProperty `
    -Path $manifest_registry_path `
    -Name "(Default)" `
    -Value $manifest_file_path `
    -Force | Out-Null

#Get-ItemProperty `
#    -Path $manifest_registry_path `
#    -Name "(Default)"

if ((Get-ItemProperty `
    -Path $manifest_registry_path)."(Default)" = $manifest_file_path)
{
    Write-Host "    - Registry key looks good!"
}
