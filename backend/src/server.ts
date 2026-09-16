import 'dotenv/config';
import app from './app';
import { logger } from './lib/logger';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
