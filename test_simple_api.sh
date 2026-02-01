#!/bin/bash
BASE_URL="http://localhost:3000"

echo "1. Testing H5P Generation (Type Mapping)..."
# Using "qcm" should resolve to H5P.MultiChoice 1.16
curl -s -X POST "$BASE_URL/api/generate/h5p" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "qcm",
    "prompt": "Capitales de l'\''Europe",
    "count": 2
  }' | jq .

echo ""
echo "2. Testing LearningApps Generation..."
curl -s -X POST "$BASE_URL/api/generate/learningapps" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Qcm",
    "prompt": "Mathématiques de base",
    "count": 2
  }' | jq .
