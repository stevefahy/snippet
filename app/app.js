var express = require('express');
var app = express();

app.get('/', function (req, res) {
  res.send('Snippet!');
});

app.listen(3010, function () {
  console.log('Snippet app listening on port 3010!');
});