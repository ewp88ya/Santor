# SAAS MULTI-REPO WORKFLOW STANDARD

## 1. Development Rule
- Semua coding dilakukan di VS Code (WSL workspace)
- Tidak ada auto-commit system
- Semua perubahan harus intentional

## 2. Git Rule
- main = production ready
- dev = development branch (optional)
- commit harus represent logical change

## 3. Sync Rule
- gunakan gsync.sh untuk push ke GitHub
- tidak boleh direct force push

## 4. Repo Independence
- setiap repo berdiri sendiri
- tidak ada shared runtime antar repo
- komunikasi antar service via API (nanti)

## 5. Production Rule
- VPS deployment dilakukan per repo
- tidak ada monolithic deploy kecuali docker compose orchestration
