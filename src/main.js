import { connect } from './node.js';
import { runServer } from './server.js';

const main = async () => {
  await connect();
  runServer();
};

main().catch((error) => {
  console.log(error);
  process.exit(1);
});
