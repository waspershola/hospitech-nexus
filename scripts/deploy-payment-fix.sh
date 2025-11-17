#!/bin/bash

# Payment→Folio RPC Fix Deployment Script
# Ensures V2.2.1 is deployed and running correctly

set -e  # Exit on error

PROJECT_REF="akchmpmzcupzjaeewdui"
REQUIRED_VERSION="V2.2.1"

echo "========================================"
echo "Payment→Folio RPC Fix Deployment"
echo "Version: $REQUIRED_VERSION"
echo "Project: $PROJECT_REF"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Pre-deployment checks
echo "Step 1: Pre-deployment checks..."
echo ""

echo "Checking import consistency..."
MIXED_VERSIONS=$(grep -r "@supabase/supabase-js@" supabase/functions/*/index.ts | grep -v "@2.46.1" || true)
if [ -n "$MIXED_VERSIONS" ]; then
  echo -e "${YELLOW}⚠️  WARNING: Mixed Supabase SDK versions found${NC}"
  echo "$MIXED_VERSIONS"
  echo ""
  echo "Consider standardizing all imports to @2.46.1"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo -e "${GREEN}✅ All imports use consistent version${NC}"
fi

echo ""
echo "Checking deno.json..."
if [ -f "supabase/functions/deno.json" ]; then
  if grep -q "nodeModulesDir" supabase/functions/deno.json; then
    echo -e "${GREEN}✅ deno.json is configured correctly${NC}"
  else
    echo -e "${RED}❌ deno.json missing nodeModulesDir${NC}"
    exit 1
  fi
else
  echo -e "${RED}❌ deno.json not found${NC}"
  exit 1
fi

echo ""
echo "========================================" 
echo ""

# Step 2: Deploy functions
echo "Step 2: Deploying critical functions..."
echo ""

FUNCTIONS=("create-payment" "checkin-guest" "complete-checkout" "qr-request" "generate-folio-pdf")

for func in "${FUNCTIONS[@]}"; do
  echo "Deploying $func..."
  if supabase functions deploy "$func" --project-ref "$PROJECT_REF"; then
    echo -e "${GREEN}✅ $func deployed successfully${NC}"
  else
    echo -e "${RED}❌ $func deployment failed${NC}"
    exit 1
  fi
  echo ""
done

echo "========================================" 
echo ""

# Step 3: Verification
echo "Step 3: Verifying deployment..."
echo ""
echo "Waiting 5 seconds for functions to initialize..."
sleep 5

echo ""
echo "Checking create-payment logs for version marker..."
LOGS=$(supabase functions logs create-payment --project-ref "$PROJECT_REF" --limit 50)

if echo "$LOGS" | grep -q "$REQUIRED_VERSION"; then
  echo -e "${GREEN}✅ $REQUIRED_VERSION is deployed and running${NC}"
else
  echo -e "${RED}❌ ERROR: $REQUIRED_VERSION not found in logs${NC}"
  echo ""
  echo "Recent logs:"
  echo "$LOGS" | head -20
  echo ""
  echo "This means the old code is still running despite successful deployment."
  echo "Possible causes:"
  echo "1. Build cache not cleared"
  echo "2. Dependency resolution failure"
  echo "3. Import version mismatch"
  echo ""
  echo "See docs/DEPLOYMENT-VERIFICATION.md for troubleshooting"
  exit 1
fi

echo ""
echo "Checking for RPC failures..."
RPC_FAILURES=$(echo "$LOGS" | grep -c "RPC FAILED" || true)
RPC_SUCCESS=$(echo "$LOGS" | grep -c "RPC SUCCESS" || true)

echo "RPC Success: $RPC_SUCCESS"
echo "RPC Failures: $RPC_FAILURES"

if [ "$RPC_FAILURES" -gt 0 ]; then
  echo -e "${RED}⚠️  WARNING: $RPC_FAILURES RPC failures detected${NC}"
  echo ""
  echo "Recent failures:"
  echo "$LOGS" | grep "RPC FAILED" | head -5
  echo ""
  read -p "Deployment succeeded but RPC errors exist. Continue? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo -e "${GREEN}✅ No RPC failures detected${NC}"
fi

echo ""
echo "========================================" 
echo ""

# Step 4: Next steps
echo "Step 4: Manual verification required"
echo ""
echo "Please complete these checks:"
echo ""
echo "1. Test Payment Flow:"
echo "   - Go to Front Desk"
echo "   - Open any checked-in booking (Room 202, 109, etc.)"
echo "   - Record a test payment (₦10,000, Cash method)"
echo "   - Verify: No 500 error, balance updates immediately"
echo ""
echo "2. Check Database:"
echo "   Run verification queries from docs/PAYMENT-FOLIO-VERIFICATION-QUERIES.sql"
echo ""
echo "3. UI Verification:"
echo "   ✓ Payment history loads instantly"
echo "   ✓ Folio balance updates in real-time"
echo "   ✓ Generate PDF includes payments"
echo "   ✓ No infinite spinners"
echo ""
echo "4. Monitor for 24 hours:"
echo "   Watch for any RPC failures:"
echo "   supabase functions logs create-payment --project-ref $PROJECT_REF --limit 200 | grep 'RPC FAILED'"
echo ""
echo "========================================" 
echo ""
echo -e "${GREEN}✅ Deployment script completed successfully${NC}"
echo ""
echo "See docs/DEPLOYMENT-VERIFICATION.md for detailed verification steps"
echo "See docs/PAYMENT-FOLIO-RPC-FIX.md for technical details"
echo ""
