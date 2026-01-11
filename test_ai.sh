#!/bin/bash

# Configuration
BASE_URL="http://localhost:3000"
LA_BASE_URL="http://localhost:3001"

echo "=== PROFESSEUR VIRTUEL INTELLIGENT - API TESTS (UPGRADED) ==="

# 1. Test Planning API with forceGeneratePath
echo -e "\n1. Testing Planning API with forceGeneratePath (POST /api/planning)..."
PLANNING_RES=$(curl -s -X POST "$BASE_URL/api/planning" \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Introduction aux fractions pour CM2",
    "forceGeneratePath": true,
    "count": 2
  }')
echo "$PLANNING_RES" | json_pp | grep -E "title|parcours|url|id"

echo -e "\n---------------------------------------------------\n"

# 2. Test Batch API
echo "2. Testing Batch Generation API (POST /api/generate-batch)..."
BATCH_RES=$(curl -s -X POST "$BASE_URL/api/generate-batch" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Module de test Batch",
    "forceGeneratePath": true,
    "modules": [
      { "type": "h5p", "module": "H5P.TrueFalse 1.8", "topic": "La Terre est ronde", "count": 1 },
      { "type": "learningapps", "module": "Qcm", "topic": "Capitales de France", "count": 1 }
    ]
  }')
echo "$BATCH_RES" | json_pp | grep -E "success|parcours|url|id"

echo -e "\n---------------------------------------------------\n"

# 3. Test Parcours with res=json
echo "3. Testing Parcours with res=json (GET /parcours?modules=h5p:test&res=json)..."
# Just a fake ID and module for structure check
PARCOURS_JSON=$(curl -s "$BASE_URL/parcours?modules=h5p:test&res=json")
echo "$PARCOURS_JSON" | json_pp | head -n 10

echo -e "\n---------------------------------------------------\n"

# 4. Legacy H5P Generation check
echo "4. Testing Legacy H5P AI Generation..."
H5P_RES=$(curl -s -X POST "$BASE_URL/api/h5p/generate-ai" \
  -H "Content-Type: application/json" \
  -d '{
    "library": "H5P.MultiChoice 1.16",
    "topic": "Les animaux",
    "count": 1
  }')
echo "$H5P_RES" | json_pp | grep -E "success|id|url"

echo -e "\n---------------------------------------------------\n"

echo "Tests completed (Simplified view)."
