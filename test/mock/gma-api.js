
var path = require('path');
var fs = require('fs');
var AD = require('ad-utils');
var async = require('async');



var currentOptions = {
    loginCorrect:true,
    key:'mockGMA'
}

var GMA = function(options) {

    this.data={
        assignments:[],
        measurements:[]
    };

    this.lookup = {
        assignmentID_measurementID:{}       // hash of assignment_id : measurement_ids
    }


    this.options = AD.sal.extend({}, { loginCorrect:true, }, options);


    this.key = currentOptions.key+'';
}



module.exports = GMA;


var _assignments = [];
GMA.setAssignments = function( assignments ) {

    var list = [];
    assignments.forEach(function(entry){
        list.push( new Assignment(entry) );
    })
    _assignments = list;

}



var _measurements = [];
GMA.setMeasurements = function( measurements ) {

    _measurements = measurements;
}


// able to allow setting of options :
// .options()               : returns the current option settings
// .options({ key:value })  : sets the current options settings
GMA.options = function(options) {

    if (typeof options == 'undefined'){
        return currentOptions;
    } else {
        var newOptions = {};
        for (var c in currentOptions) {

            if (typeof options[c] != 'undefined') newOptions[c] = options[c];
            else newOptions[c] = currentOptions[c];
        }
        currentOptions = newOptions;
    }

}





//-----------------------------------------------------------------------------
// gma-api methods
//-----------------------------------------------------------------------------
GMA.prototype.loginWithTicket = function( ticket ) {
    var dfd = AD.sal.Deferred();

    if (currentOptions.loginCorrect) {
        dfd.resolve();
    } else {
        dfd.reject(new Error('MockObject: invalid loginWithTicket'));
    }


    return dfd;
}



// getAssignments returns 3 values:  byID, byName, array
GMA.prototype.getAssignments = function () {
    var dfd = AD.sal.Deferred();

    var byID =   { /* nodeId : shortName */ };
    var byName = { /* shortName : nodeId */ };
    _assignments.forEach(function(entry){
        byID[entry.nodeId] = entry.shortName;
        byName[entry.shortName] = entry.nodeId;
    })

    dfd.resolve(byID, byName, _assignments);
    return dfd; 
}




//-----------------------------------------------------------------------------
// mock Assignment
//-----------------------------------------------------------------------------
var Assignment = function(data) {

    this.gma = data.gma;

    this.nodeId = data.nodeId;
    this.shortName = data.shortName;
    this.role = data.role; // staff vs director

};



Assignment.prototype.getMeasurements = function(role) {
    var dfd = AD.sal.Deferred();

    dfd.resolve(_measurements);
    return dfd; 
}