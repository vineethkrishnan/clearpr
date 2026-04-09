# Security Policy

## Supported Versions

Only the latest release is actively supported with security fixes.

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |
| older   | ❌        |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report vulnerabilities via [GitHub Security Advisories](https://github.com/vineethkrishnan/ClearPR/security/advisories/new) (private).

We aim to acknowledge reports within **48 hours** and coordinate a fix before public disclosure.

## Scope

### In scope

- Webhook signature validation bypass (allowing forged GitHub events)
- Injection vulnerabilities in AI prompt construction from untrusted PR data
- Path traversal or arbitrary file read in diff processing
- Credential or token exposure in logs, error messages, or API responses
- Authentication/authorization bypass in the REST API
- Insecure storage of GitHub App private keys or installation tokens
- Repository data leakage across GitHub App installations

### Out of scope

- Vulnerabilities in third-party dependencies (please report to the upstream project)
- Denial-of-service via resource exhaustion from legitimate GitHub webhook volume
- Social engineering or phishing attacks
- Physical access issues

## Disclosure Policy

We follow a coordinated disclosure model. We ask that you:

1. Report privately via Security Advisories
2. Allow reasonable time to develop and release a fix
3. Avoid disclosing publicly until a fix is released or 90 days have passed

We will credit researchers in the release notes unless anonymity is requested.
