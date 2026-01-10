#!/bin/bash

# Test Essay Generation
echo "1. Generating Essay (Sujet: L'écologie)..."
curl -s -X POST http://localhost:3000/api/h5p/generate-ai \
  -H "Content-Type: application/json" \
  -d '{
    "library": "H5P.Essay 1.2",
    "topic": "L'\''importance de l'\''écologie et du recyclage",
    "count": 1
  }' | json_pp

echo -e "\n---------------------------------------------------\n"

# Test QCM (MultiChoice) Generation
echo "2. Generating QCM (Sujet: Culture Générale)..."
curl -s -X POST http://localhost:3000/api/h5p/generate-ai \
  -H "Content-Type: application/json" \
  -d '{
    "library": "H5P.MultiChoice 1.16",
    "topic": "Culture générale et histoire de France",
    "count": 1
  }' | json_pp

echo -e "\nDone."
