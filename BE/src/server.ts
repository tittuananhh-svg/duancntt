import app from './app';
import { ENV } from './config/env';

const PORT = ENV.API_PORT;

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
