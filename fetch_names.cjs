const https = require('https');
const fs = require('fs');

const url = 'https://raw.githubusercontent.com/dimddev/bulgarian-names/master/bgnames.json';

https.get(url, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const data = JSON.parse(rawData);

            let dictObj = {};
            let count = 0;

            // Expected struct mostly: { "Иван": { "name_day": { "title": "...", "date": "..." } } } ?? 
            // We need to see the structure of an item with a name day.
            for (const key of Object.keys(data)) {
                if (data[key] && data[key].nameDays) {
                    // Let's just dump the first valid one to see the struct
                    console.log("Found nameDays:", JSON.stringify(data[key].nameDays));
                    break;
                }
                if (data[key] && data[key].name_day) {
                    // Let's just dump the first valid one to see the struct
                    console.log("Found name_day:", JSON.stringify(data[key]));
                    break;
                }
            }

            // Let's just print a few raw objects to see the schema
            const keys = Object.keys(data);
            console.log("Sample 1:", JSON.stringify(data[keys[0]]));
            console.log("Sample 2 (Иван):", JSON.stringify(data['Иван']));
            console.log("Sample 3 (Георги):", JSON.stringify(data['Георги']));

        } catch (e) {
            console.error(e.message);
        }
    });
});
