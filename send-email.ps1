# send-email.ps1  - Safeguard Securities campaign sender (Resend API)

$resendApiKey = "re_bYa6Dkvc_BHQtbTz187XFiwdEobN237Qv"
$fromAddress  = "Safeguard Securities <info@safeguardsecurities.us>"
$replyTo      = "info@safeguardsecurities.us"

$contactsPath = "D:\safeguardsecurities.us\recipients.csv"
$companyPath  = "D:\safeguardsecurities.us\company-details.json"
$sendDelayMs  = 750

$subject      = "Gold Outlook: Institutional Forecast Through 2027"
$templatePath = "D:\safeguardsecurities.us\email-template.html"

if (-not (Test-Path $templatePath)) { Write-Error "Template not found."; exit 1 }
if (-not (Test-Path $contactsPath)) { Write-Error "Contacts file not found: $contactsPath"; exit 1 }
if (-not (Test-Path $companyPath)) { Write-Error "Company details file not found: $companyPath"; exit 1 }

$contacts = Import-Csv -Path $contactsPath
if (-not $contacts -or $contacts.Count -eq 0) { Write-Error "No contacts found in recipients.csv"; exit 1 }

$company = Get-Content $companyPath -Raw | ConvertFrom-Json
if (-not $company.name -or -not $company.address -or -not $company.phone -or -not $company.website_url -or -not $company.website_text -or -not $company.default_advisor_name) {
    Write-Error "company-details.json must contain: name, address, phone, website_url, website_text, default_advisor_name"
    exit 1
}

$validContacts = @($contacts | Where-Object { $_.email -and $_.email.Trim().Length -gt 3 })
if ($validContacts.Count -eq 0) { Write-Error "No valid email rows found in recipients.csv (expected column: email)"; exit 1 }

$htmlTemplate = Get-Content $templatePath -Raw

$headers = @{
    "Authorization" = "Bearer $resendApiKey"
    "Content-Type"  = "application/json"
}

Write-Host "Sending to $($validContacts.Count) recipient(s)..." -ForegroundColor Cyan

foreach ($contact in $validContacts) {
    $to = $contact.email.Trim()
    $firstName = if ($contact.first_name -and $contact.first_name.Trim().Length -gt 0) { $contact.first_name.Trim() } else { "Valued Client" }
    $advisorName = if ($contact.advisor_name -and $contact.advisor_name.Trim().Length -gt 0) { $contact.advisor_name.Trim() } else { $company.default_advisor_name }
    $html = ($htmlTemplate `
        -replace '\{\{first_name\}\}',      [Regex]::Escape($firstName).Replace('\\', '\') `
        -replace '\{\{advisor_name\}\}',    [Regex]::Escape($advisorName).Replace('\\', '\') `
        -replace '\{\{company_name\}\}',    [Regex]::Escape($company.name).Replace('\\', '\') `
        -replace '\{\{company_address\}\}', [Regex]::Escape($company.address).Replace('\\', '\') `
        -replace '\{\{company_phone\}\}',   [Regex]::Escape($company.phone).Replace('\\', '\') `
        -replace '\{\{company_website_url\}\}',  [Regex]::Escape($company.website_url).Replace('\\', '\') `
        -replace '\{\{company_website_text\}\}', [Regex]::Escape($company.website_text).Replace('\\', '\') `
        -replace '\{\{unsubscribe_url\}\}', 'https://safeguardsecurities.us')

    try {
        $body = @{
            from     = $fromAddress
            to       = @($to)
            reply_to = $replyTo
            subject  = $subject
            html     = $html
        } | ConvertTo-Json -Depth 5

        $r = Invoke-RestMethod -Method Post -Uri "https://api.resend.com/emails" -Headers $headers -Body $body
        Write-Host "SUCCESS - Sent to: $to  (id: $($r.id))" -ForegroundColor Green
    }
    catch {
        Write-Host "FAILED for $to - $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "API details: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        }
    }

    Start-Sleep -Milliseconds $sendDelayMs
}
Write-Host "Done." -ForegroundColor Cyan
