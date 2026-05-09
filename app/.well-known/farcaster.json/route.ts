export async function GET() {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  
  return Response.json({
    "accountAssociation": {
      "header": "eyJmaWQiOjkxNTIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgwMmVmNzkwRGQ3OTkzQTM1ZkQ4NDdDMDUzRURkQUU5NDBEMDU1NTk2In0",
      "payload": "eyJkb21haW4iOiJhaXMtZGV2LXRwbmI0dmhlb3N0bW9naWpzNDJrdjctNjE1NjAxODAzOTAwLmFzaWEtc291dGhlYXN0MS5ydW4uYXBwIn0",
      "signature": "MHgwMDFkNDA4YzQ2ZWY3MzQ4ZDRhZTAzYmE3NjdjOTNmODQ3ODE1NjVlZjU5MjI5MmY2OWEyZDc0Y2I1MTcwYjI2MzAzNmQ4YTZiNzhjODM1ZGYyZTk3ZDVmNjE4MTQxOGI2NzExZTkxN2UxMzU3MmVkMWIwYzNkYzEyM2Q1ODAwMDAw"
    },
    "miniapp": {
      "version": "1",
      "name": "Snap Tool",
      "homeUrl": appUrl,
      "iconUrl": `${appUrl}/icon.png`,
      "splashImageUrl": `${appUrl}/splash.png`,
      "splashBackgroundColor": "#000000",
      "subtitle": "Capture & Annotate",
      "description": "Easily capture and annotate screenshots in a snap.",
      "primaryCategory": "productivity",
      "tags": ["social", "utility", "tool"],
      "heroImageUrl": `${appUrl}/hero.png`,
      "tagline": "Doodle on your data",
      "ogTitle": "Snap Tool",
      "ogDescription": "Capture and annotate screenshots directly in Farcaster.",
      "ogImageUrl": `${appUrl}/hero.png`,
      "noindex": false
    }
  });
}
