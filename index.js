const express = require('express');
const app = express();

app.disable('x-powered-by');

app.get('/', (req, res) => {
  res.send('DevSecOps pipeline is working!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/* istanbul ignore next */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
  });
}

module.exports = app;