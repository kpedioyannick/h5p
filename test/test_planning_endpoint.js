const express = require('express');
const bodyParser = require('body-parser');
const planningRoutes = require('./routes/planning');

const app = express();
app.use(bodyParser.json());
app.use('/api/planning', planningRoutes);

const port = 3001;
app.listen(port, () => {
    console.log(`Test server running on port ${port}`);
    console.log(`Try: curl -X POST http://localhost:${port}/api/planning -H "Content-Type: application/json" -d '{"classroom":"CM1", "subject":"Maths", "chapter":"Additions", "type":"exercise"}'`);
});
