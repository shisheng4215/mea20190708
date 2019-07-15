var express = require('express');
var fortune = require('./lib/fortune.js');

var app=express();

//设置handlebars 视图引擎
var handlebars = require('express-handlebars').create({defaultLayout:'main',extname:'.hbs'});



/**
app.engine('handlebars',handlebars.engine);
app.set('view engine','handlebars');
*/

//设置 文件后缀 .hbs
app.engine('.hbs',handlebars.engine);
app.set('view engine','.hbs');


app.set('port',process.env.PORT ||3000);

app.use(function(req,res,next){
	res.locals.showTests=app.get('env')!=='production'&& req.query.test==='1';
	next();
});

var bodyParser=require('body-parser');
app.use(bodyParser.urlencoded({extended:false}));

var formidable = require('formidable');

//JQuery-file-upload-middleware
var jqupload=require('jquery-file-upload-middleware');
app.use('/upload',function(req,res,next){
	var now=Date.now();
	jqupload.fileHandler({
		uploadDir:function(){
			return __dirname+'/public/uploads/'+now;
		},
		uploadUrl:function(){
			return '/upload/'+now;
		},
	})(req,res,next);
});



app.disable('x-powered-by');
//--------路由
app.use(express.static(__dirname+'/public'));

app.get('/',function(req,res){
	res.render('home');
});

app.get('/about',function(req,res){
		var randomFortune = fortune.getFortune();
		res.render('about',{fortune:randomFortune,pageTestScript:'/qa/tests-about.js'});		
});

app.get('/tours/hood-river',function(req,res){
	res.render('tours/hood-river');
});

app.get('/tours/request-group-rate',function(req,res){
	res.render('tours/request-group-rate');
});

app.get('/headers',function(req,res){
	res.set('Content-Type','text/plain');
	var s='';
	for(var name in req.headers)
		s+=name+':'+req.headers[name]+'\n';
	s+=req.ip+'\n';
	s+=req.host+'\n';
	s+=req.xhr+'\n';
	s+='secure:'+req.secure+'\n';
	
	res.redirect('http://localhost:3000');
	//res.send(s);
	res.end();
});

app.get('/greeting',function(req,res){
	res.render('about',{
		message:'welcome',
		style:req.query.style,
		userid:req.cookie.userid,
		username:req.session.username,
	});
});



app.get('/newsletter',function(req,res){
	res.render('newsletter',{csrf:'CSRF token goes here'});
});

app.post('/process',function(req,res){
	if(req.xhr || req.accepts('json,html')==='json'){
		//如果发生错误，应该发送{error:'error description'}
		res.send({success:true});
	}else{
		res.redirect(303,'/thank-you');
	}
	/*
	console.log('Form (from querystring):'+req.query.form);
	console.log('CSRF token (from hidden form field):'+req.body._csrf);
	console.log('Name (from visible form field):'+req.body.name);
	console.log('Email (from visible form field):' +req.body.email);
	res.redirect(303,'/thank-you');
	*/
});



app.get('/contest/vacation-photo',function(req,res){
	var now = new Date();
	res.render('contest/vacation-photo',{year:now.getFullYear,month:now.getMonth});
});

app.post('/contest/vacation-photo/:year/:month',function(req,res){
	var form= new formidable.IncomingForm();
	form.parse(req,function(err,fields,files){
		if(err)
			return res.redirect(303,'/error');
		
		console.log('received fields:');
		console.log(fields);
		console.log('received files:');
		console.log(files);
		res.redirect(303,'/thank-you');

	});
});




//无布局的视图渲染
app.get('/no-layout',function(req,res){
	res.render('no-layout',{layout:null});
});

//使用定制布局渲染视图
app.get('/custom-layout',function(req,res){
	res.render('cumstom-layout',{layout:'custom'});
});

//渲染纯文本输出
app.get('/test',function(req,res){
	res.render('test1',{
						name:'石胜',
						email:'shisheng4215@qq.com',
						sex:'男'

	});
});


app.post('/process-contact',function(req,res){
	var bodyParser=require('body-parser');
	app.use(bodyParser.urlencoded({extended:false}));
	console.log('Recevied contact from '+req.body.name+'<'+req.body.email+'>');
	//保存到数据库
	res.redirect(303,'/thank-you');
});

app.get('/thank-you',function(req,res){
	res.send('Thank You ! ');
	res.end();
});

var tours=
[
	{id:0,name:'Hood River',price:99.99},
	{id:1,name:'Oregon Coast',price:149.95},
];

app.get('/api/tours',function(req,res){
	res.json(tours);
});



app.put('/api/tours/:id',function(req,res){
	var p = tours.some(function(p){
		return p.id==req.params.id;
	});
	if(p){
		if(req.query.name) p.name=req.query.name;
		if(req.query.price) p.price=req.query.price;
		res.json({success:true});
	}else{
		res.json({error:'No such tour exists.'});
	}
});

app.del('app/tour/:id',function(req,res){
	var i;
	for(var i=tours.length-1;i>=0;i--){
		if(tours[i].id==req.param.id) 
			break;
	}
	if(i>=0){
		tours.splice(i,1);
		res.json({success:true});
	}else{
		res.json({error:'No such tour exists.'});
	}
});

//定制404页面
app.use(function(req,res){
	res.status(404);
	res.render('404');
});

//定制500页面
app.use(function(err,req,res,next){
	console.error(err.stack);
	res.status(500);
	res.render('500');
});

app.use(function(req,res,next){
	if(!res.locals.partials)
		res.locals.partials={};
	res.locals.partials.weather=getWeatherData();
	next();
});

function getWeatherData(){
	return{
		locations:[
			{name:'Portland',forecastUrl:'http://www.wunderground.com/US/OR/Portland.html',iconUrl:'http://icons-as.wxug.com/i/c/k/cloudy.gif',weather:'Overcast',temp:'54.1 F (12.3 C)',},
			{name:'Bend',forecastUrl:'http://www.wunderground.com/US/OR/Bend.html',iconUrl:'http://icons-ak.wxug.com/i/c/k/partycloudy.gif',weather:'Partly Cloudy',temp:'55.0 F (12.8 C)',},
			{name:'Manzanita',forecastUrl:'http://www.wunderground.com/US/OR/Manzantita.html',iconUrl:'http://icons-ak.wxug.com/i/c/k/rain.gif',weather:'Light Rain',temp:'55.0 F (12.8 C)',},
		],
	};
}


app.listen(app.get('port'),function(){
	console.log('Express started on http://localhost:'+app.get('port')+'; press Ctrl-C to termainate.');
});

