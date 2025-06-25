# Fix GitHub Remote Configuration

## 1. Check your current remote configuration

```bash
git remote -v
```

This will show you the current remote URLs.

## 2. If the URL is incorrect, update it

```bash
git remote set-url origin https://github.com/sofiaborden/crm-action-figure-generator.git
```

## 3. If you want to remove and add a new remote

```bash
git remote remove origin
git remote add origin https://github.com/sofiaborden/crm-action-figure-generator.git
```

## 4. Now push your code

```bash
git push -u origin main
```

If your branch is not called "main", you might need to use:

```bash
git push -u origin master
```

Or check your current branch name with:

```bash
git branch
```

And then push to that branch:

```bash
git push -u origin YOUR_BRANCH_NAME
```