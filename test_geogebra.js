const geogebra = require('./geogebra/generator');
const fs = require('fs');

async function test() {
    try {
        console.log("Starting GeoGebra generation test...");

        // Example: Two parallel lines
        const commands = [
            "d1 = Line((0,0), (4,2))",
            "d2 = Line((0,2), (4,4))",
            "SetColor(d1, \"red\")",
            "SetColor(d2, \"blue\")",
            "Text(\"Droites parallèles\", (1, 3))"
        ];

        const options = {
            hideCommandZone: true
        };

        console.log("Generating image with commands:", commands);
        console.log("Options:", options);

        const imageBuffer = await geogebra.generate(commands, options);

        const outputDir = 'content/geogebra_images';
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const outputPath = `${outputDir}/parallel_lines.png`;
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`Success! Image saved to ${outputPath}`);

    } catch (error) {
        console.error("Error during generation:", error);
    } finally {
        await geogebra.close();
    }
}

test();
