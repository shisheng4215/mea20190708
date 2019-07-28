var main  = require('./main.js');
var admin = require('./admin.js');
var customerController = require('./controllers/customer.js');

module.exports=function(app){

	app.get('/main',main.home);
	
	
	app.get('/admin',admin.home);
	
	customerController.registerRoutes(app);

};