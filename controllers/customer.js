var Customer = require('../models/customer.js');
var customerViewModel=require('../viewModels/customer.js');

module.exports={
	registerRoutes:function(app){
		app.post('/customer/',this.insert);
		app.get('/customer/:id',this.home);
		app.get('/customer/:id/preferences',this.preferences);
		app.get('/orders/:id',this.orders);
		app.post('/customer/:id/update',this.ajaxUpdate);
	},
	insert:function(req,res){

		var customer = new Customer({
					firstName:req.body.firstName,
		});
			if(!customer)  return res.json({error:'value error.'});
			console.log(customer);
			customer.save(function(err){
				if(err) return next(err);
					res.redirect(303,'/customer/'+customer._id);
			});
	},
	
	home:function(req,res,next){

		var customerId = req.params.id;
		if(!customerId) return next();
		console.log(customerId);
		res.render('customer/home',customerViewModel(customerId));
	},
	
	preferences:function(req,res,next){
		var customer = Customer.findById(req.params.id);
		if(!customer) return next();
		res.render('customer/perferences',customerViewModel(customer));
	},
	
	orders:function(req,res,next){
		var customer = Customer.findById(req.params.id);
		if(!customer) return next;
		res.render('customer/preferences',customerViewModel(customer));
	},
	ajaxUpdate:function(req,res){
		var customer = Customer.findById(req.params.id);
		if(!customer) return res.json({error:'Invalid ID.'});
		if(req.body.firstName){
			if(typeof req.body.firstName !=='string' || req.body.firstName.trim()==='')
				return res.json({error:'Invalid name.'});
			customer.firstName=req.body.firstName;
		}
		customer.save();
		return res.json({success:true});
	}
}