# H5P Backend API Reference

This document provides exact CURL commands and real JSON responses for the pedagogical planning and generation system.

---

## 1. Planning API
**Endpoint:** `POST /api/planning`

Generates a structured pedagogical plan based on 6 levels of Bloom's Taxonomy.

### CURL Request
```bash
curl -s -X POST http://localhost:3000/api/planning \
  -H "Content-Type: application/json" \
  -d '{
    "request": "La cellule végétale",
    "subject": "SVT",
    "chapter": "Biologie",
    "forceGeneratePath": false
  }' | json_pp
```

### Response Example
```json
{
   "subject" : "Les équations",
   "generation_tool" : "H5P",
   "sub_chapters" : [
      {
         "title" : "Introduction aux variables",
         "bloom_taxonomy" : [
            {
               "level" : 1,
               "name" : "remember",
               "objective" : "Identifier les termes d'une équation simple.",
               "modules" : [
                  {
                     "module_group" : "CHOICE",
                     "title" : "Quiz sur les termes",
                     "count" : 5
                  }
               ]
            },
            ...
         ]
      },
      {
         "title" : "Résolution d'équations simples",
         "bloom_taxonomy" : [
            {
               "level" : 1,
               "name" : "remember",
               "objective" : "Reconnaître l'opération inverse nécessaire.",
               "modules" : [
                  {
                     "module_group" : "CHOICE",
                     "title" : "Identification d'opérations",
                     "count" : 3
                  }
               ]
            },
            ...
         ]
      }
   ]
}
```

> [!NOTE]
> - `chapter` and `sub_chapter` are optional: they will only appear in the response if provided in the request.
> - `competency` has been removed and is no longer part of the API.
> - If `forceGeneratePath` is set to `true`, each module object inside the `modules` array will also contain an `id` and `url`. A `parcours` object will be added at the root level.

---

## 2. Module Generation API (AI)
**Endpoint:** `POST /api/h5p/generate-ai`

Generates a specific H5P module based on a topic.

### CURL Request
```bash
curl -s -X POST http://localhost:3000/api/h5p/generate-ai \
  -H "Content-Type: application/json" \
  -d '{
    "library": "H5P.MultiChoice 1.16",
    "topic": "Le système solaire",
    "count": 2
  }' | json_pp
```

### Response Example
```json
{
   "success" : true,
   "count" : 2,
   "results" : [
      {
         "id" : "1768774307270",
         "url" : "https://h5p.sara.education/view/h5p-multi-choice/1768774307270"
      },
      {
         "id" : "1768774307273",
         "url" : "https://h5p.sara.education/view/h5p-multi-choice/1768774307273"
      }
   ]
}
```

---

## 3. Raw H5P Generation
**Endpoint:** `POST /api/h5p/generate`

Generates an H5P module from raw parameters (no AI).

### CURL Request
```bash
curl -s -X POST http://localhost:3000/api/h5p/generate \
  -H "Content-Type: application/json" \
  -d '{
    "library": "H5P.TrueFalse 1.8",
    "params": {
      "question": "La chlorophylle est rouge ?",
      "correct": "false"
    }
  }' | json_pp
```
