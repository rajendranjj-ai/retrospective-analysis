# Step-by-Step Guide to Fix Git Push Authentication

## Problem
Git push is failing with "Permission denied (publickey)" error.

## Solution Steps

### Step 1: Add your SSH key to the SSH agent

Open Terminal and run:
```bash
ssh-add ~/.ssh/id_ed25519_rajendranjj_ai
```

If you get a "Could not open a connection to your authentication agent" error, start the SSH agent first:
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_rajendranjj_ai
```

### Step 2: Verify the key is added

Check that your key is loaded:
```bash
ssh-add -l
```

You should see your key listed.

### Step 3: Test SSH connection to GitHub

Test the connection:
```bash
ssh -T git@github-rajendranjj-ai
```

You should see a message like:
- "Hi rajendranjj-ai! You've successfully authenticated..." (Success!)
- Or "Permission denied" (continue to Step 4)

### Step 4: Verify your SSH key is added to GitHub

1. **Get your public key:**
   ```bash
   cat ~/.ssh/id_ed25519_rajendranjj_ai.pub
   ```
   Copy the entire output (starts with `ssh-ed25519`)

2. **Add it to GitHub:**
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste your public key
   - Click "Add SSH key"

### Step 5: Try pushing again

```bash
cd "/Users/rajendran/Documents/Retrospective Analysis"
git push origin main
```

## Alternative: Use HTTPS with Personal Access Token

If SSH continues to have issues, you can switch to HTTPS:

### Step 1: Change remote URL to HTTPS
```bash
cd "/Users/rajendran/Documents/Retrospective Analysis"
git remote set-url origin https://github.com/rajendranjj-ai/retrospective-analysis.git
```

### Step 2: Create a Personal Access Token
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "Retrospective Analysis")
4. Select scopes: `repo` (full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

### Step 3: Push using the token
```bash
git push origin main
```

When prompted:
- Username: `rajendranjj-ai`
- Password: **Paste your personal access token** (not your GitHub password)

## Quick Fix (Recommended)

Run these commands in order:

```bash
# 1. Start SSH agent and add key
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_rajendranjj_ai

# 2. Test connection
ssh -T git@github-rajendranjj-ai

# 3. Push to GitHub
cd "/Users/rajendran/Documents/Retrospective Analysis"
git push origin main
```

## Troubleshooting

### If "Permission denied" persists:
1. Verify the key is in GitHub: https://github.com/settings/keys
2. Check key permissions: `ls -l ~/.ssh/id_ed25519_rajendranjj_ai` (should be 600)
3. Try regenerating the key if needed

### If you prefer HTTPS:
- Use the Personal Access Token method above
- Consider using GitHub CLI: `gh auth login`
