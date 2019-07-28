var express = require('express');
var fortune = require('./lib/fortune.js');
var credentials = require('./credentials.js');
var app=express();
var http=require('http');
//设置handlebars 视图引擎
var handlebars = require('express-handlebars').create({defaultLayout:'main',extname:'.hbs'});
var morgan = require('morgan');
var mongoose = require('mongoose');
var opts={useNewUrlParser:true,keepAlive:1};
var Vacation = require('./models/vacation.js');
var rest = require('connect-rest');
var https=require('https');



/**
app.engine('handlebars',handlebars.engine);
app.set('view engine','handlebars');
*/

//设置 文件后缀 .hbs
app.engine('.hbs',handlebars.engine);
app.set('view engine','.hbs');


app.set('port',process.env.PORT ||3000);

app.use('/api',require('cors')());

app.use(function(req,res,next){
	//为这个请求创建一个域
	var domain = require('domain').create();
	//处理这个域中的错误
	domain.on('error',function(err){
		console.error('DOMAIN ERROR CAUGHT 域error 捕获到：\n',err.stack);
		try{
			//在5秒内进行故障保护关机
			setTimeout(function(){
				console.log('Failsafe shutdown 安全关机.');
				process.exit(1);
			},5000);
			//从集群中断开
			var worker = require('cluster').worker;
			if(worker) worker.disconnect();
			//停止接收新请求
			server.close();
			
			try{
				//尝试使用Express错误路由
				next(err);
			}catch(error){
				//如果Express错误路由失效，尝试返回普通文本响应
				console.error('Express error mechanism failed. Express Error机制失败\n',err.stack);
				res.statusCode=500;
				res.setHeader('content-type','text/plain');
				res.end('Server error.');
			}
		}catch(error){
			console.error('Unable to send 500 response. 无法发送500响应\n',err.stack);
		}
	});
	//向域中添加请求和响应对象
	domain.add(req);
	domain.add(res);
	
	//执行该域中剩余的请求链
	domain.run(next);
});





app.use(function(req,res,next){
	res.locals.showTests=app.get('env')!=='production'&& req.query.test==='1';
	next();
});


switch(app.get('env')){
	case 'development':
		app.use(require('morgan')('dev'));
		mongoose.connect(credentials.mongo.development.connectionString,opts);
		break;
	case 'production':
		app.use(require('express-logger')({
			path:__dirname + '/log/requests.log'
		}));
		mongoose.connect(credentials.mongo.production.connectionString,opts);
		break;
	default:
		throw new Error('Unknown execution environment: '+app.get('env'));
}



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


app.use(require('cookie-parser')(credentials.cookieSecret));


app.use(require('./lib/tourRequiresWaiver.js'));



const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const connection = mongoose.connection;

app.use(session({
	secret:'keyboard cat',
	saveUninitialized:false,
	resave:false,
	cart:'',
	store: new MongoStore({mongooseConnection:connection})
})); 



app.use(function(req,res,next){
		
	if(!res.locals.partials)
		res.locals.partials={};
	res.locals.partials.weatherContext=getWeatherData();
	next();
});





function getWeatherData(){
	return{
		locations:[
			{name:'Portland',forecastUrl:'http://www.wunderground.com/US/OR/Portland.html',iconUrl:'http://icons-ak.wxug.com/i/c/k/cloudy.gif',weather:'Overcast',temp:'54.1 F (12.3 C)',},
			{name:'Bend',forecastUrl:'http://www.wunderground.com/US/OR/Bend.html',iconUrl:'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',weather:'Partly Cloudy',temp:'55.0 F (12.8 C)',},
			{name:'Manzanita',forecastUrl:'http://www.wunderground.com/US/OR/Manzantita.html',iconUrl:'http://icons-ak.wxug.com/i/c/k/rain.gif',weather:'Light Rain',temp:'55.0 F (12.8 C)',},
		],
	};
}




app.disable('x-powered-by');


//使用flash

app.use(function(req,res,next){
	
	//如果有即显消息，把它传到上下文中，然后清除它
	res.locals.flash=req.session.flash;
	delete req.session.flash;
	next();
});



app.use(function(req,res,next){
	var cluster = require('cluster');
	if(cluster.isWorker) 
		console.log('Worker %d received request',cluster.worker.id);
	next();
});



//--------路由
app.use(express.static(__dirname+'/public'));


app.get('/fail',function(req,res){
	throw new Error('Nope!');
});

app.get('/epic-fail',function(req,res){
	process.nextTick(function(){
		throw new Error('Kaboom!');
	});
});

app.get('/',function(req,res){
	console.log('=====================\n'+session.secret);  //输出session
	res.cookie('monster','nom nom',{signed:true});
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


app.post('/newsletter',function(req,res){
	var name = req.body.name || '',email=req.body.email || '';
	//输入验证
	if(!email.match(VALID_EMAIL_REGEX)){
		if(req.xhr) return res.json({error:'Invalid name email address.'});
		req.session.flash={
						type:'danger',
						intro:'Validation error',
						message:'The email address you entered was not valid.',
		};
		return res.redirect(303,'/newsletter/archive');
	}
	new NewsletterSignup({name:name,email:email}).save(function(err){
		if(err){
			if(req.xhr) return res.json({error:'Database error'});
			req.session.flash = {
				type:'danger',
				intro:'Database error!',
				message:'There was a database error; please try again later.',
			};
			return res.redirect(303,'/newsletter/archive');
		}
		if(req.xhr) return res.json({success:true});
		req.session.flash={
			type:'success',
			intro:'Thank you!',
			message:'You have now been signed up for the newsletter.',
		};
		return res.redirect(303,'/newsletter/archive');
	});
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

app.get('/set-currency/:currency',function(req,res){
	req.session.currency=req.params.currency;
	console.log(req.session);
	return res.redirect(303,'/vacations');
	
});


app.get('/user(name)?/:id',function(req,res){
	var users={
				0:{name:'张三',sex:'男'},
				1:{name:'李四',sex:'女'},				
				};
	res.render('user',{user:users[req.params.id]
	});
});

function convertFromUSD(value,currency){
	switch(currency){
		case 'USD':
			return value*1;
		case 'GBP':
			return value*0.6;
		case 'BTC':
			return value*0.0023707918444761;
		default:
			return NaN;
	}
}

var routes = require('./routes.js')(app);

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

app.get('/cookie-test1',function(req,res){
	var monster = req.signedCookies.monster;
	req.session.userName = '111Anonymous';
	//var colorScheme = req.sesson.colorScheme|| 'dark';
	console.log('monster: '+monster);
	res.send('monster: '+monster);

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


app.get('/vacations',function(req,res){
	Vacation.find({available:true},function(err,results){
		var currency=req.session.currency || 'USD';
	var context={
			currency:currency,
			vacations:results.map(function(vacation){
				return{
					sku:vacation.sku,
					name:vacation.name,
					description:vacation.description,
					inSeason:vacation.inSeasion,
					price:convertFromUSD(vacation.priceInCents/100,currency),
					qty:vacation.qty,
				};
			})
		};
		switch(currency){
			case 'USD': context.currencyUSD='selected';break;
			case 'GBP': context.currencyGBP='selected';break;
			case 'BTC': context.currencyBTC='selected';break;
				
			
		}
		res.render('vacations',context);
	});

});

var VacationInSeasonListener = require('./models/vacationInSeasonListener.js');

app.get('/notify-me-when-in-season',function(req,res){
	res.render('notify-me-when-in-season',{sku:req.query.sku});
});

app.post('/notify-me-when-in-season',function(req,res){
	VacationInSeasonListener.update(
		{email:req.body.email},
		{$push:{skus:req.body.sku}},
		{upsert:true},function(err){
			if(err){
				console.error(err.stack);
				req.session.flash={
					type:'danger',
					intro:'Ooops!',
					message:'There was an error proccessing your request.',
				};
				return res.redirect(303,'/vacations');
			}
			req.session.flash={
				type:'success',
				intro:'Thank you!',
				message:'You will be notified when this vacation is in season.',
			};
			return res.redirect(303,'/vacations');
		}
	);
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

app.delete('app/tour/:id',function(req,res){
	var i;
	for(i=tours.length-1;i>=0;i--){
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



var Attraction = require('./models/attraction.js');

app.get('/api/attractions',function(req,res){
	Attraction.find({approved:true},function(err,attractions){
		if(err) return res.send(500,'Error occurred:database error.');
		res.json(attractions.map(function(a){
			return{
				name:a.name,
				id:a._id,
				description:a.description,
				location:a.location,
			};
		}));
	});
});


app.post('/api/attraction',function(req,res){
	var a = new Attraction({
		name:req.body.name,
		description:req.body.description,
		location:{lat:req.body.lat,lng:req.body.lng},
		history:{
			event:'created',
			email:'req.body.email',
			date:new Date(),
		},
		approved:false,
	});
	a.save(function(err,a){
		if(err) return res.send(500,'Error occurred:database error.');
		res.json({id:a._id});
	});
});


app.get('/api/attraction/:id',function(req,res){
	Attraction.findById(req.params.id,function(err,a){
		if(err) return res.send(500,'Error occurred:database error.');
		res.json({
			name:a.name,
			id:a._id,
			description:a.description,
			location:a.location,
		});
	});
});


var apiOptions = {
	context:'/api',
	domain:require('domain').create(),
};

//app.use(rest.rester(apiOptions));



//定制404页面
app.use(function(req,res){
	res.status(404);
	res.render('404');
});

//定制500页面
app.use(function(err,req,res,next){
	console.error(err.stack);
	res.status(500).render('500');
});


// initialize vacations
Vacation.find(function(err, vacations){
    if(vacations.length) return;

    new Vacation({
        name: 'Hood River Day Trip',
        slug: 'hood-river-day-trip',
        category: 'Day Trip',
        sku: 'HR199',
        description: 'Spend a day sailing on the Columbia and ' + 
            'enjoying craft beers in Hood River!',
        priceInCents: 9995,
        tags: ['day trip', 'hood river', 'sailing', 'windsurfing', 'breweries'],
        inSeason: true,
        maximumGuests: 16,
        available: true,
        packagesSold: 0,
    }).save();

    new Vacation({
        name: 'Oregon Coast Getaway',
        slug: 'oregon-coast-getaway',
        category: 'Weekend Getaway',
        sku: 'OC39',
        description: 'Enjoy the ocean air and quaint coastal towns!',
        priceInCents: 269995,
        tags: ['weekend getaway', 'oregon coast', 'beachcombing'],
        inSeason: false,
        maximumGuests: 8,
        available: true,
        packagesSold: 0,
    }).save();

    new Vacation({
        name: 'Rock Climbing in Bend',
        slug: 'rock-climbing-in-bend',
        category: 'Adventure',
        sku: 'B99',
        description: 'Experience the thrill of rock climbing in the high desert.',
        priceInCents: 289995,
        tags: ['weekend getaway', 'bend', 'high desert', 'rock climbing', 'hiking', 'skiing'],
        inSeason: true,
        requiresWaiver: true,
        maximumGuests: 4,
        available: false,
        packagesSold: 0,
        notes: 'The tour guide is currently recovering from a skiing accident.',
    }).save();
});

var fs = require('fs');
var options= {
	key: fs.readFileSync(__dirname + '/ssl/meadowlark.pem'),
	cert: fs.readFileSync(__dirname + '/ssl/meadowlark.crt'),
};

function startServer(){
	https.createServer(options,app).listen(app.get('port'),function(){
		console.log('Express started in '+ app.get('env') +'mode on https://localhost:'+
						app.get('port')+';press Ctrl-C to terminate.');
	});
}

if(require.main===module){
	startServer();
}else{
	module.exports=startServer;
}



