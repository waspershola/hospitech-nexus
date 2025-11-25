# Offline Desktop App - Deployment Guide

## Overview
This guide covers building, signing, and deploying the LuxuryHotelPro offline desktop app for Windows.

---

## Prerequisites

### Development Environment
- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **Windows**: For building Windows installers (or use CI/CD)
- **Git**: For version control and GitHub integration

### Accounts & Credentials
- **GitHub Account**: For hosting releases
- **Code Signing Certificate** (optional but recommended):
  - Windows Authenticode certificate (.pfx file)
  - Certificate password

---

## Build Configuration

### 1. Update `package.json`

Ensure your `package.json` has the correct configuration:

```json
{
  "name": "luxuryhotelpro-desktop",
  "version": "1.0.0",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "dev:electron": "concurrently \"vite\" \"wait-on http://localhost:8080 && electron .\"",
    "build": "tsc && vite build",
    "build:electron": "npm run build && tsc -p tsconfig.electron.json",
    "dist": "electron-builder",
    "dist:portable": "electron-builder --win portable"
  },
  "build": {
    "appId": "com.luxuryhotelpro.desktop",
    "productName": "LuxuryHotelPro",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*",
      "package.json"
    ],
    "publish": {
      "provider": "github",
      "owner": "your-github-username",
      "repo": "luxury-hotel-pro"
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        },
        {
          "target": "portable",
          "arch": ["x64"]
        }
      ],
      "icon": "build/icon.ico",
      "certificateFile": "path/to/cert.pfx",
      "certificatePassword": "env:CSC_KEY_PASSWORD"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "LuxuryHotelPro",
      "installerIcon": "build/icon.ico",
      "uninstallerIcon": "build/icon.ico",
      "installerHeaderIcon": "build/icon.ico"
    }
  }
}
```

### 2. Add App Icon

Place your app icon at `build/icon.ico` (256x256 px minimum, .ico format).

---

## Local Build Process

### Step 1: Build the App

```bash
# Install dependencies
npm ci

# Build frontend and Electron
npm run build:electron

# Create Windows installer
npm run dist
```

This generates:
- `release/LuxuryHotelPro-Setup-1.0.0.exe` (NSIS installer)
- `release/LuxuryHotelPro-1.0.0-win.zip` (portable version)
- `release/latest.yml` (auto-updater metadata)

### Step 2: Test Installer Locally

1. Install the app: Run `LuxuryHotelPro-Setup-1.0.0.exe`
2. Launch the app from Start Menu or Desktop shortcut
3. Test all offline features:
   - Check-in/checkout
   - Payment collection
   - Folio charging
   - Printing receipts/folios
   - Sync when online

---

## Code Signing (Recommended)

Code signing prevents Windows SmartScreen warnings and builds user trust.

### Option 1: Self-Signed Certificate (Testing Only)

```bash
# Generate self-signed certificate (Windows only)
New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=LuxuryHotelPro" -CertStoreLocation Cert:\CurrentUser\My

# Export to .pfx
$cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert
Export-PfxCertificate -Cert $cert -FilePath "cert.pfx" -Password (ConvertTo-SecureString -String "password" -Force -AsPlainText)
```

### Option 2: Commercial Certificate (Production)

Purchase from a trusted CA:
- **DigiCert**: $474/year (standard)
- **Sectigo**: $179/year
- **GlobalSign**: $249/year

### Configure Signing in `package.json`

```json
{
  "build": {
    "win": {
      "certificateFile": "./certs/cert.pfx",
      "certificatePassword": "env:CSC_KEY_PASSWORD",
      "signingHashAlgorithms": ["sha256"]
    }
  }
}
```

Set environment variable before building:

```bash
# Windows
set CSC_KEY_PASSWORD=your-password-here
npm run dist

# Linux/Mac
export CSC_KEY_PASSWORD=your-password-here
npm run dist
```

---

## GitHub Releases & Auto-Updates

### 1. Setup GitHub Repository

1. Create GitHub repository (public or private)
2. Generate Personal Access Token:
   - Go to GitHub → Settings → Developer settings → Personal access tokens
   - Create token with `repo` scope
   - Save token securely

### 2. Configure GitHub Actions

Create `.github/workflows/electron-build.yml`:

```yaml
name: Build & Release Electron App

on:
  push:
    tags:
      - 'v*.*.*'
  workflow_dispatch:

jobs:
  build-windows:
    runs-on: windows-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Electron app
        run: |
          npm run build:electron
          npm run dist
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: windows-installer
          path: |
            release/*.exe
            release/*.exe.blockmap
            release/latest.yml

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: |
            release/*.exe
            release/latest.yml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 3. Add Secrets to GitHub

Go to repository Settings → Secrets → Actions:

- `CSC_KEY_PASSWORD`: Your certificate password (if using code signing)

### 4. Create Release

```bash
# Tag version
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will automatically:
# 1. Build Windows installer
# 2. Create GitHub release
# 3. Upload installer files
```

### 5. Release Notes Template

When creating a GitHub release, use this markdown template:

```markdown
## What's New in v1.0.0

### 🎉 Features
- Offline payment collection with auto-sync
- Local folio charging and balance calculations
- Receipt and folio printing without internet
- Auto-launch on Windows startup

### 🐛 Bug Fixes
- Fixed sync conflicts during reconnection
- Resolved folio balance calculation edge cases

### ⚡ Performance
- 40% faster room grid loading
- Reduced memory usage by 25%

### 📦 Installation
Download `LuxuryHotelPro-Setup-1.0.0.exe` and run the installer.

### 🔄 Auto-Update
Existing users will be notified of this update automatically.
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Update version number in `package.json`
- [ ] Test all offline features locally
- [ ] Run data integrity checks
- [ ] Verify printing works (receipts & folios)
- [ ] Test auto-update mechanism (if upgrading)
- [ ] Code signing certificate valid and configured
- [ ] GitHub repository set up with Actions enabled

### Build & Release
- [ ] Run local build: `npm run build:electron && npm run dist`
- [ ] Test installer on clean Windows machine
- [ ] Verify app launches and authenticates
- [ ] Check auto-launch registry entry created
- [ ] Create Git tag: `git tag v1.0.0`
- [ ] Push tag: `git push origin v1.0.0`
- [ ] Verify GitHub Actions workflow succeeds
- [ ] Check GitHub release created with artifacts

### Post-Deployment
- [ ] Download installer from GitHub release
- [ ] Install on test machine and verify functionality
- [ ] Test auto-update from previous version (if applicable)
- [ ] Monitor error logs in production
- [ ] Document any deployment issues

---

## Troubleshooting

### Build Fails with "electron-builder" Error

**Solution**: Clear cache and rebuild
```bash
rm -rf node_modules release dist dist-electron
npm ci
npm run build:electron
npm run dist
```

### Auto-Updater Not Working

**Check**:
1. `latest.yml` exists in GitHub release
2. `publish` config in `package.json` is correct
3. App is not in development mode
4. Internet connection is active

**Solution**: Verify `electron-updater` logs in app console

### Code Signing Certificate Not Found

**Solution**: Check certificate path and password
```bash
# Verify certificate exists
dir certs\cert.pfx

# Test with explicit password (Windows)
set CSC_KEY_PASSWORD=your-password
npm run dist
```

### Installer Triggers SmartScreen Warning

**Solution**: Use a commercial code signing certificate from a trusted CA. Self-signed certificates will always trigger warnings.

### Auto-Launch Not Working

**Check**:
1. App installed in correct location (not portable)
2. Registry entry created in `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`

**Solution**: Reinstall app with NSIS installer (not portable)

---

## Production Monitoring

### Error Logging

Electron logs are stored in:
- **Windows**: `%USERPROFILE%\AppData\Roaming\LuxuryHotelPro\logs\main.log`

Monitor for:
- Sync failures
- Database errors
- Print errors
- Update failures

### Performance Metrics

Track in diagnostics dashboard:
- IndexedDB read/write latency
- Sync queue size
- Offline operation count
- Update adoption rate

### User Support

Provide users with:
- Installation guide (separate doc)
- Troubleshooting FAQ
- Support email/contact
- Version check instructions

---

## Version Management

### Semantic Versioning

Follow semver: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (e.g., database schema change)
- **MINOR**: New features (e.g., new offline capability)
- **PATCH**: Bug fixes only

### Release Cadence

Recommended:
- **Patch releases**: Weekly or as needed for critical bugs
- **Minor releases**: Monthly for new features
- **Major releases**: Quarterly or for major architecture changes

### Rollback Strategy

If a release has critical issues:

1. Create hotfix tag from previous stable version
2. Push new release with incremented patch version
3. Users will auto-update to fixed version
4. Communicate issue and resolution to users

---

## Security Considerations

### Certificate Storage

- **Never commit** certificate files to Git
- Store certificates in secure location
- Use environment variables for passwords
- Rotate certificates before expiry

### API Keys & Secrets

- Store in GitHub Secrets (never in code)
- Use separate keys for dev/staging/production
- Rotate keys periodically

### Update Integrity

- electron-updater verifies signatures automatically
- `latest.yml` includes SHA-512 checksums
- GitHub releases are tamper-proof

---

## Next Steps

After successful deployment:

1. **Monitor first 48 hours** for critical issues
2. **Collect user feedback** via support channels
3. **Plan next release** based on feedback
4. **Update documentation** with any deployment lessons learned

---

**Deployment Guide Complete** ✅  
**Questions?** Contact the development team or refer to [electron-builder docs](https://www.electron.build/)
