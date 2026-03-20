const app = require('./app');

const PORT = process.env.PORT || 5005;

app.listen(PORT, () => {
  console.log(`PeerFlow server running on port ${PORT}`);
});
