'use strict';
/**
 * Deterministic generator for the Car Marketplace demo inventory.
 * Run: node tools/generate-data.js
 * Output: data/cars.json, data/dealers.json, data/provinces.json
 *
 * Seeded so the dataset is byte-identical on every run - tests depend on it.
 */
const fs = require('fs');
const path = require('path');

// ---- deterministic PRNG (mulberry32) --------------------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260804);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const pickN = (arr, n) => {
  const c = [...arr]; const out = [];
  while (out.length < n && c.length) out.push(c.splice(Math.floor(rnd() * c.length), 1)[0]);
  return out;
};
const int = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
const round = (n, to) => Math.round(n / to) * to;

// ---- Canadian provinces + sales tax ---------------------------------------
// Verified Aug 2026. NS dropped 15% -> 14% on 1 Apr 2025.
const PROVINCES = [
  { code: 'ON', name: 'Ontario',                   gst: 5, pst: 8,     type: 'HST', pstName: 'HST' },
  { code: 'QC', name: 'Quebec',                    gst: 5, pst: 9.975, type: 'GST+QST', pstName: 'QST' },
  { code: 'BC', name: 'British Columbia',          gst: 5, pst: 7,     type: 'GST+PST', pstName: 'PST' },
  { code: 'AB', name: 'Alberta',                   gst: 5, pst: 0,     type: 'GST', pstName: null },
  { code: 'MB', name: 'Manitoba',                  gst: 5, pst: 7,     type: 'GST+RST', pstName: 'RST' },
  { code: 'SK', name: 'Saskatchewan',              gst: 5, pst: 6,     type: 'GST+PST', pstName: 'PST' },
  { code: 'NS', name: 'Nova Scotia',               gst: 5, pst: 9,     type: 'HST', pstName: 'HST' },
  { code: 'NB', name: 'New Brunswick',             gst: 5, pst: 10,    type: 'HST', pstName: 'HST' },
  { code: 'NL', name: 'Newfoundland and Labrador', gst: 5, pst: 10,    type: 'HST', pstName: 'HST' },
  { code: 'PE', name: 'Prince Edward Island',      gst: 5, pst: 10,    type: 'HST', pstName: 'HST' },
  { code: 'YT', name: 'Yukon',                     gst: 5, pst: 0,     type: 'GST', pstName: null },
  { code: 'NT', name: 'Northwest Territories',     gst: 5, pst: 0,     type: 'GST', pstName: null },
  { code: 'NU', name: 'Nunavut',                   gst: 5, pst: 0,     type: 'GST', pstName: null }
].map(p => ({ ...p, totalRate: +(p.gst + p.pst).toFixed(3) }));

// ---- dealer network --------------------------------------------------------
const DEALERS = [
  { id:'D-01', name:'Maple Leaf Auto Group',    city:'Mississauga', province:'ON', address:'2450 Dundas St W',      postal:'L5K 1R8', phone:'(905) 555-0142', regulator:'OMVIC', rating:4.6, reviews:1284 },
  { id:'D-02', name:'Lakeshore Motors',          city:'Toronto',     province:'ON', address:'118 Lakeshore Blvd E',  postal:'M5A 3C4', phone:'(416) 555-0188', regulator:'OMVIC', rating:4.4, reviews:872  },
  { id:'D-03', name:'Rideau Valley Cars',        city:'Ottawa',      province:'ON', address:'900 Bank St',           postal:'K1S 3W4', phone:'(613) 555-0119', regulator:'OMVIC', rating:4.7, reviews:531  },
  { id:'D-04', name:'Auto Saint-Laurent',        city:'Montreal',    province:'QC', address:'5400 Boul Saint-Laurent',postal:'H2T 1S1',phone:'(514) 555-0173', regulator:'AMVOQ', rating:4.3, reviews:944  },
  { id:'D-05', name:'Quebec Nord Automobiles',   city:'Quebec City', province:'QC', address:'1250 Rue de la Couronne',postal:'G1N 4E4',phone:'(418) 555-0155', regulator:'AMVOQ', rating:4.5, reviews:402  },
  { id:'D-06', name:'Pacific Coast Auto',        city:'Vancouver',   province:'BC', address:'3100 Main St',          postal:'V5T 3G7', phone:'(604) 555-0126', regulator:'VSA BC',rating:4.8, reviews:1633 },
  { id:'D-07', name:'Island Motor Sales',        city:'Victoria',    province:'BC', address:'740 Douglas St',        postal:'V8W 3M6', phone:'(250) 555-0164', regulator:'VSA BC',rating:4.5, reviews:318  },
  { id:'D-08', name:'Prairie Sky Motors',        city:'Calgary',     province:'AB', address:'6200 Macleod Trail SW', postal:'T2H 0K4', phone:'(403) 555-0197', regulator:'AMVIC', rating:4.6, reviews:1105 },
  { id:'D-09', name:'Capital Auto Edmonton',     city:'Edmonton',    province:'AB', address:'10820 Jasper Ave',      postal:'T5J 2B1', phone:'(780) 555-0132', regulator:'AMVIC', rating:4.2, reviews:689  },
  { id:'D-10', name:'Red River Auto',            city:'Winnipeg',    province:'MB', address:'1420 Portage Ave',      postal:'R3G 0W1', phone:'(204) 555-0148', regulator:'MPI',   rating:4.4, reviews:276  },
  { id:'D-11', name:'Bluenose Automotive',       city:'Halifax',     province:'NS', address:'3055 Robie St',         postal:'B3K 4P7', phone:'(902) 555-0181', regulator:'NS OCA',rating:4.5, reviews:214  },
  { id:'D-12', name:'Wheat City Motors',         city:'Saskatoon',   province:'SK', address:'820 Circle Dr E',       postal:'S7K 3T8', phone:'(306) 555-0109', regulator:'SGI',   rating:4.3, reviews:187  }
];

// ---- model catalogue -------------------------------------------------------
// basePrice = approx CAD MSRP when new. depr = annual retained-value factor.
const CATALOG = [
  // make, model, body, fuel, drivetrains, trims, engine, hp, [cityL100, hwyL100], seats, doors, basePrice, depr
  ['Toyota','RAV4','SUV','Hybrid',['AWD'],['LE','XLE','XSE','Limited'],'2.5L I4 Hybrid',219,[5.8,6.3],5,4,42500,0.90],
  ['Toyota','Corolla','Sedan','Gasoline',['FWD'],['LE','SE','XSE'],'2.0L I4',169,[7.9,6.1],5,4,25900,0.87],
  ['Toyota','Camry','Sedan','Hybrid',['FWD','AWD'],['LE','SE','XSE'],'2.5L I4 Hybrid',225,[5.3,5.0],5,4,34500,0.88],
  ['Toyota','Highlander','SUV','Gasoline',['AWD'],['LE','XLE','Limited','Platinum'],'2.4L Turbo I4',265,[10.8,8.2],7,4,48900,0.89],
  ['Toyota','Tacoma','Pickup','Gasoline',['4WD'],['SR5','TRD Sport','TRD Off-Road'],'2.4L Turbo I4',278,[11.4,9.6],5,4,47500,0.93],
  ['Toyota','Sienna','Minivan','Hybrid',['AWD'],['LE','XSE','Limited'],'2.5L I4 Hybrid',245,[6.6,6.8],8,4,49900,0.89],
  ['Honda','Civic','Sedan','Gasoline',['FWD'],['LX','Sport','EX-L','Touring'],'2.0L I4',158,[7.9,6.2],5,4,28100,0.89],
  ['Honda','CR-V','SUV','Hybrid',['AWD'],['LX','Sport','EX-L','Touring'],'2.0L I4 Hybrid',204,[6.0,6.9],5,4,41900,0.90],
  ['Honda','Accord','Sedan','Hybrid',['FWD'],['EX','Sport','Touring'],'2.0L I4 Hybrid',204,[5.3,6.2],5,4,39500,0.87],
  ['Honda','Odyssey','Minivan','Gasoline',['FWD'],['EX-L','Touring','Black Edition'],'3.5L V6',280,[12.6,8.4],8,4,52900,0.87],
  ['Ford','F-150','Pickup','Gasoline',['4WD'],['XL','XLT','Lariat','Platinum'],'3.5L EcoBoost V6',400,[12.9,10.1],5,4,58900,0.91],
  ['Ford','Escape','SUV','Gasoline',['AWD','FWD'],['Active','ST-Line','Platinum'],'1.5L EcoBoost I3',181,[9.5,7.3],5,4,36900,0.85],
  ['Ford','Explorer','SUV','Gasoline',['4WD'],['XLT','ST-Line','Platinum'],'2.3L EcoBoost I4',300,[11.9,8.9],7,4,54900,0.86],
  ['Ford','Bronco','SUV','Gasoline',['4WD'],['Big Bend','Black Diamond','Wildtrak'],'2.7L EcoBoost V6',330,[13.5,10.9],5,4,55900,0.94],
  ['Ford','Mustang','Coupe','Gasoline',['RWD'],['EcoBoost','GT','Dark Horse'],'5.0L V8',486,[15.6,10.4],4,2,54900,0.92],
  ['Chevrolet','Silverado 1500','Pickup','Gasoline',['4WD'],['WT','LT','RST','High Country'],'5.3L V8',355,[14.2,10.4],6,4,56900,0.90],
  ['Chevrolet','Equinox','SUV','Gasoline',['AWD','FWD'],['LS','LT','RS'],'1.5L Turbo I4',175,[9.2,7.6],5,4,33900,0.84],
  ['Chevrolet','Bolt EUV','Hatchback','Electric',['FWD'],['LT','Premier'],'Single Motor',200,null,5,4,40900,0.82],
  ['GMC','Sierra 1500','Pickup','Diesel',['4WD'],['Elevation','SLE','AT4','Denali'],'3.0L Duramax I6',305,[11.0,8.6],6,4,64900,0.91],
  ['Ram','1500','Pickup','Gasoline',['4WD'],['Tradesman','Big Horn','Laramie','Limited'],'5.7L HEMI V8',395,[15.1,10.7],6,4,59900,0.89],
  ['Jeep','Wrangler','SUV','Gasoline',['4WD'],['Sport S','Sahara','Rubicon'],'3.6L V6',285,[14.4,11.4],5,4,52900,0.95],
  ['Jeep','Grand Cherokee','SUV','Gasoline',['4WD'],['Laredo','Limited','Overland','Summit'],'3.6L V6',293,[13.0,9.6],5,4,58900,0.87],
  ['Dodge','Charger','Sedan','Gasoline',['RWD','AWD'],['SXT','GT','R/T'],'5.7L HEMI V8',370,[16.1,10.2],5,4,49900,0.88],
  ['Chrysler','Pacifica','Minivan','Plug-in Hybrid',['FWD'],['Select','Pinnacle'],'3.6L V6 PHEV',260,[7.6,7.9],7,4,58900,0.85],
  ['Hyundai','Elantra','Sedan','Gasoline',['FWD'],['Essential','Preferred','Ultimate'],'2.0L I4',147,[7.9,6.0],5,4,24900,0.86],
  ['Hyundai','Tucson','SUV','Hybrid',['AWD'],['Essential','Preferred','Luxury'],'1.6L Turbo Hybrid',231,[6.4,6.5],5,4,38900,0.88],
  ['Hyundai','Kona','SUV','Gasoline',['AWD','FWD'],['Essential','Preferred','N Line'],'2.0L I4',147,[8.6,7.5],5,4,30900,0.86],
  ['Hyundai','IONIQ 5','SUV','Electric',['AWD','RWD'],['Preferred','Preferred Long Range','Limited'],'Dual Motor',320,null,5,4,58900,0.80],
  ['Kia','Forte','Sedan','Gasoline',['FWD'],['LX','EX','GT-Line'],'2.0L I4',147,[8.2,6.0],5,4,23900,0.85],
  ['Kia','Sportage','SUV','Hybrid',['AWD'],['LX','EX','SX'],'1.6L Turbo Hybrid',227,[6.3,6.5],5,4,37900,0.88],
  ['Kia','Seltos','SUV','Gasoline',['AWD'],['LX','EX','SX Turbo'],'1.6L Turbo I4',195,[9.5,8.0],5,4,29900,0.86],
  ['Kia','EV6','SUV','Electric',['AWD'],['Long Range','GT-Line','GT'],'Dual Motor',320,null,5,4,60900,0.80],
  ['Mazda','CX-5','SUV','Gasoline',['AWD'],['GX','GS','GT','Signature'],'2.5L I4',187,[9.8,7.9],5,4,35900,0.89],
  ['Mazda','Mazda3','Sedan','Gasoline',['FWD','AWD'],['GX','GS','GT'],'2.5L I4',191,[8.8,6.6],5,4,27900,0.87],
  ['Mazda','CX-50','SUV','Gasoline',['AWD'],['GS-L','GT','Meridian'],'2.5L Turbo I4',256,[10.6,8.5],5,4,42900,0.90],
  ['Nissan','Rogue','SUV','Gasoline',['AWD'],['S','SV','SL','Platinum'],'1.5L VC-Turbo I3',201,[8.4,6.6],5,4,36900,0.84],
  ['Nissan','Sentra','Sedan','Gasoline',['FWD'],['S','SV','SR'],'2.0L I4',149,[8.2,6.0],5,4,24500,0.84],
  ['Nissan','Frontier','Pickup','Gasoline',['4WD'],['SV','PRO-4X'],'3.8L V6',310,[13.6,10.9],5,4,48900,0.90],
  ['Subaru','Forester','SUV','Gasoline',['AWD'],['Convenience','Touring','Limited'],'2.5L Boxer H4',182,[9.0,7.2],5,4,35900,0.90],
  ['Subaru','Outback','Wagon','Gasoline',['AWD'],['Convenience','Touring','Premier XT'],'2.4L Turbo H4',260,[10.1,7.9],5,4,40900,0.89],
  ['Volkswagen','Tiguan','SUV','Gasoline',['AWD'],['Trendline','Comfortline','Highline'],'2.0L TSI I4',184,[10.5,8.2],7,4,37900,0.85],
  ['Volkswagen','Jetta','Sedan','Gasoline',['FWD'],['Trendline','Comfortline','Highline'],'1.5L TSI I4',158,[7.8,5.8],5,4,26900,0.85],
  ['Tesla','Model 3','Sedan','Electric',['RWD','AWD'],['Standard Range','Long Range','Performance'],'Dual Motor',394,null,5,4,54900,0.81],
  ['Tesla','Model Y','SUV','Electric',['AWD'],['Long Range','Performance'],'Dual Motor',384,null,5,4,64900,0.82],
  ['BMW','X3','SUV','Gasoline',['AWD'],['xDrive30i','M40i'],'2.0L Turbo I4',255,[10.7,8.1],5,4,58900,0.83],
  ['BMW','X7','SUV','Gasoline',['AWD'],['xDrive40i','M60i'],'3.0L Turbo I6',375,[12.5,9.2],7,4,109900,0.80],
  ['Mercedes-Benz','GLC 300','SUV','Gasoline',['AWD'],['4MATIC','AMG Line'],'2.0L Turbo I4',255,[10.9,8.4],5,4,62900,0.82],
  ['Mercedes-Benz','S 580','Sedan','Gasoline',['AWD'],['4MATIC'],'4.0L Twin-Turbo V8',496,[13.9,9.4],5,4,148900,0.76],
  ['Audi','Q5','SUV','Gasoline',['AWD'],['Komfort','Progressiv','Technik'],'2.0L TFSI I4',261,[10.9,8.5],5,4,56900,0.82],
  ['Lexus','RX 350','SUV','Gasoline',['AWD'],['Premium','Luxury','F Sport'],'2.4L Turbo I4',275,[11.1,8.7],5,4,64900,0.86],
  ['Acura','MDX','SUV','Gasoline',['AWD'],['Tech','A-Spec','Type S'],'3.5L V6',290,[12.6,9.4],7,4,64900,0.84],
  ['Volvo','XC60','SUV','Plug-in Hybrid',['AWD'],['Core','Plus','Ultimate'],'2.0L T8 PHEV',455,[8.2,8.6],5,4,71900,0.81],
  ['Genesis','GV70','SUV','Gasoline',['AWD'],['Select','Advanced','Sport'],'2.5L Turbo I4',300,[11.6,9.3],5,4,62900,0.81],
  ['Porsche','Macan','SUV','Gasoline',['AWD'],['Base','S','GTS'],'2.0L Turbo I4',261,[12.3,9.6],5,4,73900,0.85],
  ['Porsche','911 Carrera','Coupe','Gasoline',['RWD','AWD'],['Carrera','Carrera S','Turbo'],'3.0L Twin-Turbo H6',443,[12.4,9.0],4,2,138900,0.88],
  ['Land Rover','Range Rover Sport','SUV','Gasoline',['4WD'],['SE','Dynamic SE','Autobiography'],'3.0L Turbo I6',355,[13.4,10.1],5,4,112900,0.76],
  ['Mitsubishi','Outlander','SUV','Plug-in Hybrid',['AWD'],['ES','SEL','GT'],'2.4L I4 PHEV',248,[9.2,9.0],7,4,49900,0.83]
];

const COLOURS = [
  ['Pearl White','#F2F3F5'], ['Midnight Black','#15171A'], ['Magnetic Grey','#6E7278'],
  ['Silver Metallic','#B9BDC2'], ['Barcelona Red','#A32127'], ['Deep Blue Pearl','#1E3A6E'],
  ['Forest Green','#2A4A38'], ['Lunar Rock','#9DA39B'], ['Bronze Metallic','#7A5C3E'],
  ['Nautical Blue','#2C6E9B'], ['Cement Grey','#8A8880'], ['Ruby Flare','#8E1B2B'],
  ['Ice Cap White','#E7ECEF'], ['Graphite','#3A3D42'], ['Sunset Orange','#C2571E']
];
const INTERIORS = ['Black Cloth','Black Leather','Grey Cloth','Beige Leather','Charcoal Leatherette','Red Leather','Brown Nappa Leather'];

const FEATURE_POOL = {
  base: ['Air Conditioning','Bluetooth','Backup Camera','Cruise Control','Power Windows','USB Ports','Keyless Entry'],
  mid:  ['Apple CarPlay','Android Auto','Heated Front Seats','Heated Steering Wheel','Blind Spot Monitoring','Lane Keep Assist','Adaptive Cruise Control','Remote Start','Alloy Wheels','Dual-Zone Climate Control'],
  high: ['Panoramic Sunroof','Leather Upholstery','Ventilated Seats','360° Camera','Head-Up Display','Premium Audio System','Wireless Charging','Power Liftgate','Adaptive Headlights','Memory Seats','Navigation System','Tow Package'],
  ev:   ['Fast Charging (DC)','Heat Pump','One-Pedal Driving','Vehicle-to-Load (V2L)','Preconditioning']
};

const CONDITIONS = ['New', 'Used', 'Certified Pre-Owned'];
const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'; // no I, O, Q

function makeVin() {
  let v = '';
  for (let i = 0; i < 17; i++) v += VIN_CHARS[Math.floor(rnd() * VIN_CHARS.length)];
  return v;
}

const CURRENT_YEAR = 2026;
const cars = [];

for (let i = 0; i < 100; i++) {
  const [make, model, bodyType, fuelType, drivetrains, trims, engine, hp, econ, seats, doors, basePrice, depr] = pick(CATALOG);

  const isNew = rnd() < 0.18;
  const year = isNew ? CURRENT_YEAR : int(2015, CURRENT_YEAR - 1);
  const age = Math.max(0, CURRENT_YEAR - year);
  const condition = isNew ? 'New' : (age <= 4 && rnd() < 0.45 ? 'Certified Pre-Owned' : 'Used');

  const kmPerYear = int(9000, 24000);
  const odometerKm = isNew ? int(5, 60) : Math.max(1200, round(age * kmPerYear + int(-6000, 8000), 10));

  // price: depreciate from MSRP, then adjust for mileage and condition
  let price = basePrice * Math.pow(depr, age);
  const expectedKm = age * 16000;
  price *= 1 + Math.max(-0.18, Math.min(0.10, (expectedKm - odometerKm) / 260000));
  if (condition === 'Certified Pre-Owned') price *= 1.035;
  price *= 0.94 + rnd() * 0.12;
  price = round(Math.max(6995, price), 5) - 5; // e.g. 34995

  const trim = pick(trims);
  const drivetrain = pick(drivetrains);
  const [colourName, colourHex] = pick(COLOURS);
  const isEv = fuelType === 'Electric';

  const featureCount = { 'LX':0, 'Base':0 }[trim] !== undefined ? 8 : int(9, 16);
  let features = [...FEATURE_POOL.base, ...pickN(FEATURE_POOL.mid, int(4, 8))];
  if (price > 45000 || ['Limited','Platinum','Touring','Denali','Summit','Signature','Ultimate','Technik','Autobiography','GT','Type S','Limited'].includes(trim)) {
    features = features.concat(pickN(FEATURE_POOL.high, int(4, 7)));
  }
  if (isEv) features = features.concat(pickN(FEATURE_POOL.ev, int(2, 4)));
  features = [...new Set(features)].slice(0, featureCount);

  const accidents = isNew ? 0 : (rnd() < 0.72 ? 0 : int(1, 2));
  const previousOwners = isNew ? 0 : Math.max(1, Math.min(4, Math.ceil(age / 3) + (rnd() < 0.3 ? 1 : 0)));
  const dealer = pick(DEALERS);

  const badges = [];
  if (accidents === 0 && !isNew) badges.push('No Accidents');
  if (previousOwners === 1) badges.push('One Owner');
  if (!isNew && odometerKm < age * 12000) badges.push('Low Kilometres');
  if (condition === 'Certified Pre-Owned') badges.push('Certified Pre-Owned');
  if (isEv) badges.push('Zero Emission');
  if (fuelType === 'Hybrid' || fuelType === 'Plug-in Hybrid') badges.push('Fuel Efficient');
  if (price > 100000) badges.push('Luxury Tax Applies');

  const daysOnLot = int(2, 145);
  const listed = new Date(Date.UTC(2026, 7, 4) - daysOnLot * 86400000);

  cars.push({
    id: `CM-${1000 + i + 1}`,
    stockNumber: `CM-${1000 + i + 1}`,
    vin: makeVin(),
    make, model, trim, year, bodyType, condition,
    price,
    msrpWhenNew: basePrice,
    odometerKm,
    exteriorColour: colourName,
    exteriorColourHex: colourHex,
    interiorColour: pick(INTERIORS),
    fuelType, transmission: isEv ? 'Single-Speed' : (bodyType === 'Coupe' && rnd() < 0.25 ? 'Manual' : 'Automatic'),
    drivetrain, engine, horsepower: hp,
    fuelEconomy: econ ? { cityL100: econ[0], highwayL100: econ[1], combinedL100: +(((econ[0]*0.55)+(econ[1]*0.45))).toFixed(1) } : null,
    electricRangeKm: isEv ? int(380, 540) : (fuelType === 'Plug-in Hybrid' ? int(40, 85) : null),
    seats, doors,
    features,
    history: {
      accidents,
      accidentDamageCad: accidents ? int(1200, 9500) : 0,
      previousOwners,
      serviceRecords: isNew ? 0 : int(2, 5) * Math.max(1, age),
      carfaxAvailable: !isNew,
      lienStatus: 'Clear',
      registeredProvinces: [dealer.province],
      safetyCertified: !isNew,
      winterTiresIncluded: rnd() < 0.35,
      importedFromUs: !isNew && rnd() < 0.08
    },
    dealerId: dealer.id,
    city: dealer.city,
    province: dealer.province,
    listedOn: listed.toISOString().slice(0, 10),
    daysOnLot,
    status: 'available',
    badges,
    description: `${year} ${make} ${model} ${trim} finished in ${colourName} with ${pick(INTERIORS).toLowerCase()} interior. ` +
      `${isNew ? 'Brand new, never registered.' : `${odometerKm.toLocaleString('en-CA')} km, ${accidents === 0 ? 'accident free' : `${accidents} reported accident${accidents > 1 ? 's' : ''}`}.`} ` +
      `${drivetrain} ${engine} producing ${hp} hp. Available at ${dealer.name} in ${dealer.city}, ${dealer.province}.`
  });
}

const out = (name, obj) => {
  const p = path.join(__dirname, '..', 'data', name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
  console.log(`wrote ${name}  (${JSON.stringify(obj).length.toLocaleString()} bytes)`);
};
out('cars.json', cars);
out('dealers.json', DEALERS);
out('provinces.json', PROVINCES);

// quick sanity summary
const by = (k) => [...new Set(cars.map(c => c[k]))].length;
console.log(`\n${cars.length} cars · ${by('make')} makes · ${by('model')} models · ${by('bodyType')} body types · ${by('province')} provinces`);
console.log(`price  $${Math.min(...cars.map(c=>c.price)).toLocaleString()} – $${Math.max(...cars.map(c=>c.price)).toLocaleString()}`);
console.log(`years  ${Math.min(...cars.map(c=>c.year))} – ${Math.max(...cars.map(c=>c.year))}`);
console.log(`over $100k (luxury tax): ${cars.filter(c=>c.price>100000).length}`);
console.log(`new: ${cars.filter(c=>c.condition==='New').length}  CPO: ${cars.filter(c=>c.condition==='Certified Pre-Owned').length}  used: ${cars.filter(c=>c.condition==='Used').length}`);
