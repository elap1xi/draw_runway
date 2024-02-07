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

    var RWY_num=[], RWY_dir=[];
    var RWY_lat=[], RWY_lon=[];

    function getHeading(RWY_num, RWY_hdg){
        if(RWY_hdg==''){
            RWY_num = RWY_num.replace(/[A-Za-z]/g, ''); // Remove Alphabet
            if (RWY_num.startsWith('0')) { RWY_num = RWY_num.substring(1) * 10; }
            else {RWY_num = RWY_num * 10; }

            return RWY_num;
        } else { return RWY_hdg; } 
    }

    for(i=0; i<json_ADB.runways.length; i++){
        let data = json_ADB.runways[i];
        // Latitude
        RWY_lat.push(data.le_latitude_deg);
        RWY_lat.push(data.he_latitude_deg);
        // Longitude
        RWY_lon.push(data.le_longitude_deg);
        RWY_lon.push(data.he_longitude_deg);
        // Runway Number
        RWY_num.push(data.le_ident);
        RWY_num.push(data.he_ident);
        // Runway Heading
        let RWYHDG_le = json_ADB.runways[i].le_heading_degT;
        let RWYHDG_he = json_ADB.runways[i].he_heading_degT;
        RWY_dir.push(getHeading(data.le_ident, RWYHDG_le));
        RWY_dir.push(getHeading(data.he_ident, RWYHDG_he));
    }
    return [RWY_lat, RWY_lon, RWY_num, RWY_dir];
}

async function logic(RWY_dir, lat, lon, canvasSize){
    // Adjust the position to fit the size of canvas
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

    function logic_(x, y, deg, r){
        const pi = Math.PI;
        if(deg>=0 && deg<=90){
            deg = 90-deg;
            let rad = deg*pi/180;
            return [x+r*Math.cos(rad), y+r*Math.sin(rad)];
        } else if(deg>90 && deg<=180){
            deg = deg-90;
            let rad = deg*pi/180;
            return [x+r*Math.cos(rad), y-r*Math.sin(rad)];
        } else if(deg>180 && deg<=270){
            deg = 270-deg;
            let rad = deg*pi/180;
            return [x-r*Math.cos(rad), y-r*Math.sin(rad)];
        } else if(deg>270 && deg<360){
            deg = deg-270;
            let rad = deg*pi/180;
            return [x-r*Math.cos(rad), y+r*Math.sin(rad)];
        }
    }

    var mark_point=[];
    for(i=0; i<RWY_dir.length; i++){
        let hdg = Math.floor(Number(RWY_dir[i]));
        let opposite_hdg = hdg>180 ? hdg-180 : hdg+180;
        mark_point.push(logic_(adjusted_point[i][0], adjusted_point[i][1], opposite_hdg, 60));
    }
    return [mark_point, adjusted_point];
}

async function draw_runway(RWY_num, RWY_lat, RWY_lon, RWY_dir, ICAO){
    // draw using the canvas
    const cvs = createCanvas(1100, 1100);   // canvas size (Square for better result)
    const ctx = cvs.getContext('2d');
    const gap = 150;    //  white space
    const canvasSize = 1100-2*gap;  // canvas width - 2 x gap

    let point_array = await logic(RWY_dir, RWY_lat, RWY_lon, canvasSize);
    const mark_point = point_array[0];
    const adjusted_point = point_array[1];

    // background color
    ctx.fillStyle = "#4a4c4f";
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    ctx.fillStyle = "#ffffff";
    for(i=0; i<RWY_lat.length; i++){
        if((i+1)%2==0){
            ctx.beginPath();    
            ctx.moveTo(adjusted_point[i-1][0]+gap, 1100-(adjusted_point[i-1][1]+gap));
            ctx.lineTo(adjusted_point[i][0]+gap, 1100-(adjusted_point[i][1]+gap));
            ctx.strokeStyle = '#c2c2c2';
            ctx.lineWidth=5;
            ctx.globalAlpha = 0.3;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.roundRect(adjusted_point[i][0]+gap-7, 1100-(adjusted_point[i][1]+gap)-7, 14, 14);
        ctx.fill();
        try{
            ctx.beginPath();
            ctx.font = '35px Impact';
            let rwy_mark = RWY_num[i];
            let textwidth = ctx.measureText(rwy_mark).width;
            ctx.fillText(RWY_num[i], mark_point[i][0]+gap-textwidth/2, 1100-(mark_point[i][1]+gap))
        } catch {
            continue;
        }
    }

    const buffer = cvs.toBuffer('image/png');
    fs.writeFileSync(path.join(__dirname, `data/img/${ICAO}.png`), buffer); // save image
}

async function main(ICAO){
    let array = await parse(ICAO);
    let RWY_lat = array[0]; // Latitudes of Runways
    let RWY_lon = array[1]; // Longitudes of Runways
    let RWY_num = array[2]; // Runway Number
    let RWY_dir = array[3]; // Runway Heading

    draw_runway(RWY_num, RWY_lat, RWY_lon, RWY_dir, ICAO);
}

main("EDDF");