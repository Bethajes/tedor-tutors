#!/usr/bin/env bash
# End-to-end verification of the registration flow. Run from repo root.
set -u
API="http://localhost:4000/api/v1"
WEB="http://localhost:3000/api/v1"
EMAIL="e2e-reg-$RANDOM@example.com"

step() { echo; echo "=== $1 ==="; }

step "1. Valid registration (direct to :4000)"
curl -s --max-time 15 -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"E2E Direct Test\",\"email\":\"$EMAIL\",\"password\":\"Password123\",\"role\":\"CLIENT\"}" \
  -w "\nHTTP %{http_code}\n" | tail -2

step "2. Duplicate email -> expect EMAIL_IN_USE 409"
curl -s --max-time 15 -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"E2E Dup\",\"email\":\"$EMAIL\",\"password\":\"Password123\",\"role\":\"CLIENT\"}" \
  -w "\nHTTP %{http_code}\n"

step "3. Invalid payload -> expect VALIDATION_FAILED 400 with details"
curl -s --max-time 15 -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"","email":"not-an-email","password":"short","role":"CLIENT"}' \
  -w "\nHTTP %{http_code}\n"

step "4. Same registration through the Next.js proxy (:3000)"
curl -s --max-time 20 -X POST "$WEB/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"E2E Proxy Test\",\"email\":\"e2e-proxy-$RANDOM@example.com\",\"password\":\"Password123\",\"role\":\"TUTOR\"}" \
  -w "\nHTTP %{http_code}\n" | tail -2

step "5. Proxy with unreachable-API simulation (login to wrong backend is not possible; proxy test is pass-through)"
curl -s --max-time 20 -X POST "$WEB/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e-nobody@example.com","password":"WrongPass123"}' \
  -w "\nHTTP %{http_code}\n"
