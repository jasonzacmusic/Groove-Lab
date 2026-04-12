import https from "https";

const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
if (!BUNNY_API_KEY) { console.error('Set BUNNY_API_KEY'); process.exit(1); }

function bunnyApi(method: string, path: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const options = {
      hostname: 'api.bunny.net',
      path,
      method,
      headers: {
        'AccessKey': BUNNY_API_KEY!,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve(body); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Creating Bunny Storage Zone...');
  const zone = await bunnyApi('POST', '/storagezone', {
    Name: 'groovelab-loops',
    Region: 'SG',
  });
  console.log('Storage Zone:', JSON.stringify(zone, null, 2));

  if (zone.Id) {
    console.log('\nCreating Pull Zone...');
    const pullZone = await bunnyApi('POST', '/pullzone', {
      Name: 'groovelab-loops-cdn',
      OriginType: 2,
      StorageZoneId: zone.Id,
    });
    console.log('Pull Zone:', JSON.stringify(pullZone, null, 2));

    console.log('\n=== SAVE THESE VALUES ===');
    console.log(`BUNNY_CDN_HOST=${pullZone.Hostnames?.[0]?.Value || 'groovelab-loops-cdn.b-cdn.net'}`);
    console.log(`BUNNY_STORAGE_PASSWORD=${zone.Password}`);
    console.log(`BUNNY_STORAGE_ZONE=${zone.Name}`);
  }
}

main().catch(console.error);
