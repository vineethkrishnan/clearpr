# GitHub App Setup

## Create the App

1. Go to **GitHub Settings > Developer Settings > GitHub Apps > New GitHub App**
2. Fill in:
   - **App name:** `ClearPR` (or your preferred name)
   - **Homepage URL:** Your server URL
   - **Webhook URL:** `https://your-server.com/webhook`
   - **Webhook secret:** Generate a strong secret and save it for `.env`

## Set Permissions

| Permission | Access | Why |
|---|---|---|
| **Pull requests** | Read & Write | Read PR metadata/diff, post review comments |
| **Contents** | Read | Fetch file contents for AST parsing |
| **Metadata** | Read | Required for all GitHub Apps |
| **Issues** | Read | Read comments for @clearpr commands |

## Subscribe to Events

Check these event subscriptions:

- `pull_request`
- `pull_request_review_comment`
- `issue_comment`
- `installation`
- `installation_repositories`

## Generate Private Key

1. Scroll to the bottom of the app settings
2. Click **Generate a private key**
3. Save the downloaded `.pem` file
4. Set `GITHUB_PRIVATE_KEY` in `.env` to the file path or the key content

## Install the App

1. Go to **Install App** in the sidebar
2. Select the organizations/repos you want ClearPR to review
3. Approve the permissions

## Verify

After starting ClearPR, open a PR in any installed repo. You should see:

1. A webhook delivery in the app's **Advanced** tab
2. ClearPR posting a review comment on the PR

::: tip
Check ClearPR logs if reviews aren't appearing:
```bash
docker compose logs app --tail 50
```
:::
