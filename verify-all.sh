#!/bin/bash
set -e

# Private Cross-Chain RFQ - Master Verification Script
# This script builds the circuit, program, and relayer, then runs the E2E demo.

echo "=========================================================="
echo "🛡️  PRIVATE CROSS-CHAIN RFQ - VERIFICATION SUITE 🛡️"
echo "=========================================================="

# 1. Environment Check
echo -e "\n[1/5] Checking environment..."
node -v
cargo --version
solana --version

# 2. Build FHE Circuit
echo -e "\n[2/5] Building Encrypt FHE Circuit..."
cd encrypt-circuit
cargo build --lib
cd ..

# 3. Build Solana Program (Pinocchio v0.10.x)
echo -e "\n[3/5] Building Solana SBF Program..."
cd programs/private_rfq
cargo build-sbf
cd ../..

# 4. Build Relayer
echo -e "\n[4/5] Building TypeScript Relayer..."
cd relayer
npm install --silent
npm run build
cd ..

# 5. Run E2E Demo (Mocked Network)
echo -e "\n[5/5] Running End-to-End Demo..."
# Note: Using ts-node to run the demo script. 
# In a real environment, we'd deploy to devnet first.
npx ts-node scripts/e2e-demo.ts

echo -e "\n=========================================================="
echo "✅ ALL SYSTEMS VERIFIED & READY FOR SUBMISSION"
echo "=========================================================="
