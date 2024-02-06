const { createCanvas } = require('canvas');
const { api_key } = require('./data/config/config.json');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function parse(ICAO){
    const URL_ADB = `https://airportdb.io/api/v1/airport/${ICAO}?apiToken=${api_key}`;
    const json_ADB = await axios.get(URL_ADB)
    .then(res => res.data)
    .catch(error => console.log(error));

    var RWY_lat=[], RWY_lon=[];
    for(i=0; i<json_ADB.runways.length; i++){
        let data = json_ADB.runways[i];
        RWY_lat.push(data.le_latitude_deg);
        RWY_lat.push(data.he_latitude_deg);
        RWY_lon.push(data.le_longitude_deg);
        RWY_lon.push(data.he_longitude_deg);
    }
    return [RWY_lat, RWY_lon];
}

function draw_runway(lat, lon, ICAO){
    // draw using the canvas
    const cvs = createCanvas(1100, 1100);   // canvas size (Square for better result)
    const ctx = cvs.getContext('2d');
    const gap = 100;    //  white space
    const canvasSize = 1100-2*gap;  // canvas width - 2 x gap

    let longitudes = lon.map(Number);
    let latitudes = lat.map(Number);

    let minLongitude = Math.min(...longitudes);
    let maxLongitude = Math.max(...longitudes);
    let minLatitude = Math.min(...latitudes);
    let maxLatitude = Math.max(...latitudes);

    let adjusted_point = longitudes.map((longitude, index) => {
        let x = (longitude - minLongitude) / (maxLongitude - minLongitude) * canvasSize;
        let y = (latitudes[index] - minLatitude) / (maxLatitude - minLatitude) * canvasSize;
        return [x, y];
    });

    ctx.fillStyle = "#ffffff";
    for(i=0; i<adjusted_point.length; i++){
        if((i+1)%2==0){
            ctx.beginPath();    
            ctx.moveTo(adjusted_point[i-1][0]+gap, 1100-(adjusted_point[i-1][1]+gap));
            ctx.lineTo(adjusted_point[i][0]+gap, 1100-(adjusted_point[i][1]+gap));
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth=3;
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.roundRect(adjusted_point[i][0]+gap-7, 1100-(adjusted_point[i][1]+gap)-7, 14, 14);
        ctx.fill();
    }

    const buffer = cvs.toBuffer('image/png');
    fs.writeFileSync(path.join(__dirname, `data/img/${ICAO}.png`), buffer); // save image
}

async function main(ICAO){
    let array = await parse(ICAO);
    let RWY_lat = array[0];  // Latitudes of Runways
    let RWY_lon = array[1];  // Longitudes of Runways
    draw_runway(RWY_lat, RWY_lon, ICAO);
}

main("EDDF");