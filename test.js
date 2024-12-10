const endpoints = ['/api/burned', '/api/total', '/api/total-vesting', '/api/circulating-supply', '/api/roi'];

const test = async () => {
  for (const endpoint of endpoints) {
    const res = await fetch(new URL(endpoint, 'http://127.0.0.1:3000'));

    if (!res.ok) {
      throw new Error(`Failed to fetch ${endpoint}`);
    }

    const data = await res.text();

    if (Number(data) === NaN) {
      throw new Error(`Failed to parse ${endpoint}. ${data}`);
    }

    console.log(endpoint, '- ok');
  }
};

test()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .then(() => process.exit(0));
