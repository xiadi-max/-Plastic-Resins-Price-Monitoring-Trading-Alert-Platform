const axios = require('axios');
const https = require('https');

async function fetchPlasway(url) {
  try {
    const agent = new https.Agent({
      rejectUnauthorized: false,
      secureProtocol: 'TLSv1_2_method'
    });
    
    const response = await axios.get(url, {
      httpsAgent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
      },
      timeout: 30000,
      maxRedirects: 5
    });
    
    console.log('Status:', response.status);
    console.log('Content length:', response.data.length);
    
    // Check if HTML contains table
    if (response.data.includes('<table')) {
      console.log('Found table in response!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

fetchPlasway('https://www.plasway.com/shop/dytsj888/price?page=1');
