import "dotenv/config";
import app from './app.js';

const port = process.env.PORT || 3000;

// 서버 실행
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});