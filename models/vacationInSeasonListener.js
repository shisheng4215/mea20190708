var mongoose = require('mongoose');

var vacationInSeasonListenerSchema = mongoose.Schema({
	email:String,
	skus:[String],
});

var VacationInSeasonListener = mongoose.model('VacationInSeason',vacationInSeasonListenerSchema);

module.exports=VacationInSeasonListener;