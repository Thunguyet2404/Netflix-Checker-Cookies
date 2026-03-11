/**
 * Netflix Account Checker
 * Multi-threaded & Folder Cookie Selection
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');
const { execSync } = require('child_process');

let stats = {
    total: 0,
    totalFiles: 0,
    live: 0,
    dead: 0,
    bad: 0,
    unknown: 0,
    plans: {}
};

// Function to open folder selection dialog using Python/PowerShell
function showFolderSelectDialog() {
    try {
        const pythonCommand = `python -c "import tkinter as tk; from tkinter import filedialog; root = tk.Tk(); root.attributes('-topmost', True); root.withdraw(); folder = filedialog.askdirectory(title='Chọn thư mục chứa các file .txt Cookie Netflix'); print(folder)"`;
        const result = execSync(pythonCommand, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
        if (result) return result;
    } catch (e) {
        try {
            const psCommand = `
                Add-Type -AssemblyName System.windows.forms
                $ofd = New-Object System.Windows.Forms.OpenFileDialog
                $ofd.Title = "Chọn thư mục chứa các file .txt Cookie Netflix"
                $ofd.FileName = "Folder Selection."
                $ofd.CheckFileExists = $false
                $ofd.CheckPathExists = $true
                $ofd.ValidateNames = $false
                $ofd.Filter = "Folders|*.none"
                if ($ofd.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
                    Write-Output (Split-Path $ofd.FileName)
                }
            `.replace(/\n/g, ';');
            const result = execSync(`powershell -NoProfile -Command "${psCommand}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
            if (result) return result;
        } catch (err) {
            try {
                const psCommand2 = `
                    Add-Type -AssemblyName System.windows.forms
                    $f = New-Object System.Windows.Forms.FolderBrowserDialog
                    $f.Description = "Chọn thư mục chứa các file .txt Cookie Netflix"
                    $f.ShowNewFolderButton = $false
                    if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
                        $f.SelectedPath
                    }
                `.replace(/\n/g, ';');
                return execSync(`powershell -NoProfile -Command "${psCommand2}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
            } catch (err2) {
                return null;
            }
        }
    }
    return null;
}

// Function to parse Netscape format TXT to Cookie String
function parseCookies(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split(/\r?\n/);
        let cookiesArray = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 7) {
                const name = parts[5];
                const value = parts[6];
                cookiesArray.push(`${name}=${value}`);
            } else if (trimmed.includes('=')) {
                cookiesArray.push(trimmed);
            }
        }
        return cookiesArray.join('; ');
    } catch (e) {
        return '';
    }
}

// Ensure results dir exists
function setupStructure() {
    const resDir = path.join(process.cwd(), 'results');
    const fullDir = path.join(resDir, 'full');
    const cookiesDir = path.join(resDir, 'cookies');
    
    if (!fs.existsSync(resDir)) fs.mkdirSync(resDir);
    if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir);
    if (!fs.existsSync(cookiesDir)) fs.mkdirSync(cookiesDir);
    
    return { resDir, fullDir, cookiesDir };
}

// Helper to Capitalize plan names
function capitalizePlan(planStr) {
    if (!planStr) return 'Unknown';
    return planStr.charAt(0).toUpperCase() + planStr.slice(1).toLowerCase();
}

function checkNetflix(cookieString, fileName) {
    return new Promise((resolve) => {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
            'Cookie': cookieString.trim()
        };

        const options = {
            hostname: 'www.netflix.com',
            port: 443,
            path: '/account',
            method: 'GET',
            headers: headers
        };

        const req = https.request(options, (res) => {
            if (res.headers.location && (res.headers.location.includes('/login') || res.headers.location.includes('/clearcookies'))) {
                resolve({ status: 'DEAD', file: fileName });
                return;
            }

            let html = '';
            res.on('data', (chunk) => {
                html += chunk;
            });

            res.on('end', () => {
                const emailMatch = html.match(/"emailAddress":"([^"]+)"/) || html.match(/"email":\s*"([^"]+)"/) || html.match(/"userEmail":\s*"([^"]+)"/) || html.match(/data-uia="account-email">([^<]+)</);
                const email = emailMatch ? emailMatch[1].replace(/\\x40/g, '@') : '';

                const emailVerified = html.includes('"isEmailVerified":true') || html.includes('"emailVerified":true') || html.includes('Đã xác minh') ? 'true' : 'false';

                const countryMatch = html.match(/"currentCountry":"([^"]+)"/) || html.match(/"countryOfSignup":"([^"]+)"/) || html.match(/"country":\s*"([^"]+)"/) || html.match(/"countryOfOrigin":\s*"([^"]+)"/);
                const country = countryMatch ? countryMatch[1] : '';

                const billingMatch = html.match(/"nextBillingDate":\{"fieldType":"String","value":"([^"]+)"\}/) || html.match(/Ngày thanh toán tiếp theo:\s*([^<]+)<\/p>/i) || html.match(/Next billing date:\s*([^<]+)<\/p>/i) || html.match(/data-uia="next-billing-date"[^>]*>([^<]+)<\/p>/i) || html.match(/"nextBillingDate":\s*"([^"]+)"/);
                const nextBilling = billingMatch ? billingMatch[1].replace(/\\x20/g, ' ').trim() : '';

                if (!email || !country || !nextBilling) {
                    resolve({ status: 'BAD', file: fileName });
                    return;
                }

                const planMatch = html.match(/data-uia="plan-name"[^>]*>([^<]+)<\/h3>/i) || html.match(/data-uia="plan-label"[^>]*>([^<]+)<\/h3>/i) || html.match(/<h3[^>]*class="[^"]*e1devdx32[^"]*"[^>]*>([^<]+)<\/h3>/i) || html.match(/"localizedPlanName":\s*"([^"]+)"/) || html.match(/"planName":\s*"([^"]+)"/) || html.match(/"planName":\{"fieldType":"String","value":"([^"]+)"\}/);
                let plan = planMatch ? planMatch[1].replace('Gói ', '') : 'Unknown';
                plan = capitalizePlan(plan);

                let payments = "0";
                if (html.match(/"paymentMethod":\{"fieldType":"String","value":"([^"]+)"\}/) || html.includes('paymentMethod') || html.includes('data-uia="payment-method"') || html.includes('Quản lý phương thức thanh toán')) {
                    payments = '1';
                }

                let extraMembers = 'Unknown';
                const profilesJsonMatch = html.match(/\\"profiles\\":\[(.*?)\]/);
                if (profilesJsonMatch) {
                    extraMembers = (profilesJsonMatch[1].match(/\{"summary"/g) || []).length.toString();
                } else {
                    const profilesTextMatch = html.match(/<p[^>]*class="[^"]*eawouyh4[^"]*"[^>]*>(\d+)\s*profiles?<\/p>/i) || html.match(/(\d+)\s*profiles?/i) || html.match(/"extraMemberCount":(\d+)/i);
                    if (profilesTextMatch) {
                        extraMembers = profilesTextMatch[1];
                    }
                }

                resolve({ 
                    status: 'LIVE', 
                    file: fileName,
                    cookieString,
                    email, country, nextBilling, plan, payments, extraMembers, emailVerified
                });
            });
        });

        req.on('error', (e) => {
            resolve({ status: 'UNKNOWN', file: fileName });
        });

        req.end();
    });
}

function updateConsole() {
    // Update Title
    let titleStr = `Netflix Checker | Total: ${stats.total}/${stats.totalFiles} | Live: ${stats.live} | Bad: ${stats.bad + stats.dead} | Unknown: ${stats.unknown}`;
    if (stats.live > 0) {
        let planStrings = [];
        for (const [plan, count] of Object.entries(stats.plans)) {
            planStrings.push(`${plan}: ${count}`);
        }
        if (planStrings.length > 0) {
            titleStr += ` | ${planStrings.join(', ')}`;
        }
    }
    process.title = titleStr;

    // Update Console
    process.stdout.write(`\r> Progress: ${stats.total}/${stats.totalFiles} | Live: ${stats.live} | Bad: ${stats.bad + stats.dead} | Unknown: ${stats.unknown}`);
}

async function asyncPool(poolLimit, array, iteratorFn) {
    const ret = [];
    const executing = [];
    for (const item of array) {
        const p = Promise.resolve().then(() => iteratorFn(item));
        ret.push(p);
        if (poolLimit <= array.length) {
            const e = p.then(() => {
                executing.splice(executing.indexOf(e), 1);
            });
            executing.push(e);
            if (executing.length >= poolLimit) {
                await Promise.race(executing);
            }
        }
    }
    return Promise.all(ret);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const paths = setupStructure();
process.title = "Netflix Checker";

console.clear();
console.log('Netflix checker cookies');

rl.question('[+] Thread > ', async (threadsInput) => {
    rl.close();
    
    let threadCount = parseInt(threadsInput);
    if (isNaN(threadCount) || threadCount <= 0) threadCount = 5;
    
    const folderPath = showFolderSelectDialog();
    if (!folderPath || !fs.existsSync(folderPath)) {
        console.log('> Lỗi: Thư mục không tồn tại.');
        process.exit(1);
    }
    
    const txtFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.txt')).map(f => path.join(folderPath, f));
    stats.totalFiles = txtFiles.length;
    
    if (txtFiles.length === 0) {
        console.log('> Lỗi: Không có file .txt nào.');
        process.exit();
    }

    const processFile = async (filePath) => {
        const fileName = path.basename(filePath);
        const cookieString = parseCookies(filePath);
        
        if (!cookieString) {
            stats.total++;
            stats.bad++;
            updateConsole();
            return;
        }
        
        const result = await checkNetflix(cookieString, fileName);
        
        stats.total++;
        if (result.status === 'LIVE') {
            stats.live++;
            stats.plans[result.plan] = (stats.plans[result.plan] || 0) + 1;
            
            // Format horizontal output
            process.stdout.write('\r' + ' '.repeat(110) + '\r'); 
            console.log(`> LIVE | ${result.email} | ${result.plan} | ${result.country.toUpperCase()} | Billing: ${result.nextBilling} | Pay: ${result.payments} | Prof: ${result.extraMembers} | Verf: ${result.emailVerified} | File: ${result.file}`);
            
            // Save to Results Full
            const cleanEmail = result.email.replace(/[/\\?%*:|"<>]/g, '-');
            const cleanPlan = result.plan.replace(/[/\\?%*:|"<>]/g, '-');
            const saveFullFileName = `[ ${cleanEmail} ] ${cleanPlan}.txt`;
            const saveFullPath = path.join(paths.fullDir, saveFullFileName);
            
            const fullContent = `Cookie: ${result.cookieString}\n\n======================================\nEmail: ${result.email}\nCountry: ${result.country.toUpperCase()}\nPlan: ${result.plan}\nNext Billing: ${result.nextBilling}\nPayments: ${result.payments}\nProfiles: ${result.extraMembers}\nEmail Verified: ${result.emailVerified}\n======================================\n`;
            fs.writeFileSync(saveFullPath, fullContent, 'utf-8');

            // Save to Results Cookies
            const cookiesFilePath = path.join(paths.cookiesDir, 'cookie.txt');
            fs.appendFileSync(cookiesFilePath, `Cookie: ${result.cookieString}\n`, 'utf-8');

        } else if (result.status === 'DEAD') {
            stats.dead++;
        } else if (result.status === 'BAD') {
            stats.bad++;
        } else {
            stats.unknown++;
        }
        
        updateConsole();
    };

    await asyncPool(threadCount, txtFiles, processFile);
    
    process.stdout.write('\r' + ' '.repeat(110) + '\r'); 
    console.log('\n===========================================');
    console.log('> HOÀN THÀNH KIỂM TRA MỌI TÀI KHOẢN');
    console.log('===========================================');
    console.log(`> Tổng file TXT . : ${stats.totalFiles}`);
    console.log(`> Tài khoản Good  : ${stats.live}`);
    console.log(`> Tài khoản Bad   : ${stats.bad + stats.dead}`);
    console.log(`> Lỗi Unknown     : ${stats.unknown}`);
    if (stats.live > 0) {
        console.log('\n> Thống kê Plan <');
        for (const [plan, count] of Object.entries(stats.plans)) {
            console.log(`  - ${plan}: ${count}`);
        }
    }
    console.log('===========================================');
    console.log(`> Kết quả đã được xuất ra thư mục "results"!`);
});
