var http=require('http');
var fs=require('fs');

function serverStaticFile(res,path,contentType,responseCode){
	if(!responseCode)
		responseCode= 200;
	fs.readFile(__dirname + path,function(err,data){
		if(err){
			res.writeHead(500,{'Context-Type':'text/plain'});
			res.end('500 - Internal Error');
		}else{
			res.writeHead(responseCode,{'Context-Type':contentType});
			res.end(data);
		}
		
	});
}

http.createServer(function(req,res){
	
	var path = req.url.replace(/\/?(?:\?.*)?$/,'').toLowerCase();
	console.log(path);
	switch(path){
		case '':
			serverStaticFile(res,'/public/home.html','text/html');
			break;
		
		case '/about':
			serverStaticFile(res,'/public/about.html','text/html');
			break;
		
		case '/img/logo.png':
			serverStaticFile(res,'/public/img/logo.png','image/png');
			break;
			
		default:
			serverStaticFile(res,'public/404.html','text/html',404);
			break;
	}
}).listen(3000);

console.log('Server started on localhost:3000; press Ctrl-C to terminate....');