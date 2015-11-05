var redis = require('redis')
var multer  = require('multer')
var express = require('express')
var fs      = require('fs')
var app = express()
var init = true;
var httpProxy = require('http-proxy');
// REDIS
var client = redis.createClient(6379, '127.0.0.1', {})

if(init){
  client.rpush("proxy", "{ host: 'localhost', port: 3000 }");
  client.rpush("proxy", "{ host: 'localhost', port: 3001 }");
  init = false;
}
///////////// WEB ROUTES

app.use(function(req, res, next) 
{
  console.log(req.headers.host);
	console.log(req.method, req.url);
	client.lpush("list", req.url);
	client.ltrim("list", 0,4);

	next(); // Passing the request to the next handler in the stack.
});


app.post('/upload',[ multer({ dest: './uploads/'}), function(req, res){
   console.log(req.body) // form fields
   console.log(req.files) // form files

   if( req.files.image )
   {
	   fs.readFile( req.files.image.path, function (err, data) {
	  		if (err) throw err;
	  		var img = new Buffer(data).toString('base64');
	  		console.log(img);
	  		client.lpush("cats", img);
		});
	}

   res.status(204).end()
}]);

app.get('/meow', function(req, res) {
	{
		res.writeHead(200, {'content-type':'text/html'});
		var imagedata;
		client.lpop("cats", function(err,value){
			if(err) throw err;
			imagedata = value;
			res.write("<h1>\n<img src='data:my_pic.jpg;base64,"+imagedata+"'/>");
   			res.end();
		});
		
	}
})
app.get('/', function(req, res) {
  res.send('hello world')
})

app.get('/get', function(req, res) {
    client.get("misssionimpossible", function(err,value){
      if(err){
        res.send("No known key");
      }
      else{
        res.send(value);
      }
  });
})

app.get('/set', function(req, res) {
    client.set("misssionimpossible", "this message will self-destruct in 10 seconds");
  client.expire("misssionimpossible", 10);
  res.send("Setting misssionimpossible");
})

// Add hook to make it easier to get all visited URLS.
app.get('/recent', function(req, res) {
    var str = client.lrange("list", 0, -1, function(err,value){
      if(err){
        res.send("Problem on deck");
      }
      else{
        res.send(value);
      }
    });
})


//HTTP SERVER
var server = app.listen(3000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)
})

var server2 = app.listen(3001, function () {

  var host2 = server2.address().address
  var port2 = server2.address().port

  console.log('Example app listening at http://%s:%s', host2, port2)
})
var proxy = httpProxy.createProxyServer({target:'http://localhost:3000'}).listen(80);

