## rebuild.ps1 — Rebuild index.html from source files
## Run from the project folder:  powershell -ExecutionPolicy Bypass -File rebuild.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- Read head section (lines 1-518) from current bundle (HTML + CSS) ---
$allLines  = [IO.File]::ReadAllLines("$root\index.html", [Text.Encoding]::UTF8)
$headLines = $allLines[0..517]   # 0-indexed; lines 1-518

# --- Helper to read a source file ---
function Src($rel) { [IO.File]::ReadAllText("$root\$rel", [Text.Encoding]::UTF8) }

# --- Write new bundle ---
$out = "$root\index.html"
$sw  = [IO.StreamWriter]::new($out, $false, [Text.Encoding]::UTF8)

# 1. HTML head + CSS
foreach ($ln in $headLines) { $sw.WriteLine($ln) }

# 2. CDN dependencies
$sw.WriteLine('<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" crossorigin="anonymous"></script>')
$sw.WriteLine('<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" crossorigin="anonymous"></script>')
$sw.WriteLine('<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin="anonymous"></script>')
$sw.WriteLine('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js" crossorigin="anonymous"></script>')

# 3. data.jsx  (plain <script>, not Babel — it is already plain JS)
$sw.WriteLine('<script>')
$sw.Write($(Src 'data.jsx'))
$sw.WriteLine('</script>')

# 4. JSX modules (Babel-transpiled)
foreach ($f in @(
    'icons.jsx',
    'ui.jsx',
    'tweaks-panel.jsx',
    'screens\receipt.jsx',
    'screens\importexport.jsx',
    'screens\dashboard.jsx',
    'screens\prices.jsx',
    'screens\receipts.jsx',
    'screens\pos.jsx',
    'screens\products.jsx',
    'app.jsx'
)) {
    $sw.WriteLine('<script type="text/babel">')
    $sw.Write($(Src $f))
    $sw.WriteLine('</script>')
}

# 5. Boot
$sw.WriteLine('<script type="text/babel" data-presets="react">')
$sw.WriteLine('  const App=window.JPApp; const root=ReactDOM.createRoot(document.getElementById(''root'')); root.render(<App/>);')
$sw.WriteLine('</script></body></html>')

$sw.Close()
$kb = [Math]::Round((Get-Item $out).Length / 1KB)
Write-Host "Done: index.html rebuilt - $kb KB" -ForegroundColor Green
