# SAAS MULTI-REPO ORCHESTRATION SYSTEM

## SYSTEM OVERVIEW

This system consists of 4 independent services:

### 1. LN-NeU (CORE ENGINE)
- AI logic layer
- backend API system
- shared business logic

### 2. Santor (SERVICE LAYER)
- feature-based service app
- consumes LN-NeU API
- UI + business logic extension

### 3. Tictac (AGENT LAYER)
- automation + task execution system
- background job processing
- AI tools / scripts executor

### 4. administration-Manage (CONTROL LAYER)
- admin dashboard
- system monitoring
- user + system control interface

---

## COMMUNICATION RULES

- No direct repo-to-repo file sharing
- All communication must go through API layer (LN-NeU core)
- Each repo is independent deploy unit

---

## DEPLOYMENT MODEL (FUTURE VPS)

- Each repo becomes independent docker service
- LN-NeU = core API service
- Santor = frontend/service UI
- Tictac = worker/agent service
- Admin = dashboard service

---

## DEVELOPMENT RULE

- VS Code → WSL → GitHub per repo
- gsync workflow per repo
- no cross-repo auto sync scripts

